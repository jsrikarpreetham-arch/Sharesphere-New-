export const num = (v: number | string | null | undefined) => (v === null || v === undefined ? 0 : Number(v));
export const fmtQty = (v: number | string) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(num(v));

export function fmtDate(v?: string | null, withTime = false): string {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(v?: string | null): string {
  if (!v) return '';
  const diff = Date.now() - new Date(v).getTime();
  if (isNaN(diff)) return '';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(v);
}

// yyyy-mm-dd in the viewer's local time, for <input type="date">
export function toDateInput(v?: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const isExpired = (v?: string | null) => !!v && new Date(v).getTime() < Date.now();
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
export const titleCase = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
