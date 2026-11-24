import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { titleCase } from '../lib/format';

/* ---------- Button ---------- */
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; loading?: boolean;
}
export function Button({ variant = 'primary', size = 'md', loading, children, disabled, className = '', ...p }: BtnProps) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} disabled={disabled || loading} {...p}>
      {loading && <Loader2 size={16} className="spin" />}{children}
    </button>
  );
}

/* ---------- Layout bits ---------- */
export const Card = ({ children, className = '', ...p }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) =>
  <div className={`card ${className}`} {...p}>{children}</div>;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

/* ---------- Status badges ---------- */
// Tones only for status values that appear in the backend code; anything else falls back to neutral.
const TONES: Record<string, string> = {
  AVAILABLE: 'green', OPEN: 'blue', PARTIAL: 'amber', RESERVED: 'blue', PICKED_UP: 'amber', PENDING: 'amber',
  DELIVERED: 'green', FULFILLED: 'green', FAILED: 'red', CANCELLED: 'gray',
};
export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="badge badge-gray">—</span>;
  return <span className={`badge badge-${TONES[status] || 'gray'}`}><i />{titleCase(status)}</span>;
}

export function Progress({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------- Loading / empty / error ---------- */
export const Skeleton = ({ h = 16, w = '100%', r = 8 }: { h?: number; w?: number | string; r?: number }) =>
  <span className="skel" style={{ height: h, width: w, borderRadius: r }} aria-hidden />;

export function CardSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="stack"><Skeleton h={14} w="40%" /><Skeleton h={22} w="75%" /><Skeleton h={10} /><Skeleton h={34} w="55%" /></Card>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3>{text && <p>{text}</p>}{action}</div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty error">
      <div className="empty-icon"><AlertTriangle size={26} /></div>
      <h3>We couldn’t load this</h3><p>{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warn'; title?: string; children: ReactNode }) {
  return <div className={`notice notice-${tone}`}>{title && <strong>{title}</strong>}<div>{children}</div></div>;
}

/* ---------- Form fields ---------- */
export function Field({ label, error, hint, children, required }: { label: string; error?: string; hint?: string; required?: boolean; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId();
  const dId = error || hint ? `${id}-d` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required && <span aria-hidden> *</span>}</label>
      {children(id, dId)}
      {error ? <p id={dId} className="field-error" role="alert">{error}</p> : hint ? <p id={dId} className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="search"><Search size={17} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

/* ---------- Modal + Confirm ---------- */
export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head"><h2 id={titleId}>{title}</h2><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, loading, onConfirm, onClose }: {
  open: boolean; title: string; message: ReactNode; confirmLabel: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose}>Keep as is</Button>
      <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
    </>}>
      <p className="muted">{message}</p>
    </Modal>
  );
}

/* ---------- Pagination ---------- */
export function Pagination({ page, pages, total, onChange }: { page: number; pages: number; total: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <span className="muted">{total} results</span>
      <div>
        <Button variant="secondary" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={16} /></Button>
        <span className="pager-n">Page {page} of {pages}</span>
        <Button variant="secondary" size="sm" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page"><ChevronRight size={16} /></Button>
      </div>
    </nav>
  );
}

export function Avatar({ name }: { name: string }) {
  const i = name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
  return <span className="avatar" aria-hidden>{i}</span>;
}

export function Stat({ label, value, icon, tone = 'green', loading, hint }: { label: string; value: ReactNode; icon: ReactNode; tone?: string; loading?: boolean; hint?: string }) {
  return (
    <Card className="stat">
      <div className={`stat-icon tone-${tone}`}>{icon}</div>
      <div><p className="stat-label">{label}</p>{loading ? <Skeleton h={28} w={60} /> : <p className="stat-value">{value}</p>}{hint && <p className="stat-hint">{hint}</p>}</div>
    </Card>
  );
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="detail"><dt>{label}</dt><dd>{children}</dd></div>;
}
