import { useMemo, useState, type FormEvent } from 'react';
import { CatIcon, HandHeart, Pencil, Plus, Tag, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useCategories } from '../lib/categories';
import { errMsg, useAsync, usePaged } from '../lib/hooks';
import { fmtDate, fmtQty, num } from '../lib/format';
import type { ResourceRequest } from '../lib/types';
import { Button, Card, CardSkeletons, ConfirmDialog, Detail, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, Progress, SearchInput, StatusBadge } from '../components/ui';
import { useToast } from '../components/Toast';

const KNOWN = ['OPEN', 'PARTIAL', 'FULFILLED', 'CANCELLED'];
const editable = (r: ResourceRequest) => !['CANCELLED', 'FULFILLED'].includes(r.status);
const remaining = (r: ResourceRequest) => Math.max(0, num(r.requested_quantity) - num(r.fulfilled_quantity));

// The backend defines priority as an integer 1–5 (default 3) but doesn’t say which end is “urgent”,
// so the UI shows the raw level instead of inventing labels.
const Priority = ({ n }: { n: number }) => (
  <span title={`Priority ${n} of 5`} aria-label={`Priority ${n} of 5`}><span className="dots">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</span> <span className="small muted">{n}/5</span></span>
);

export default function Requests() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(api.myRequests);
  const categories = useAsync(api.categories);        // only used to resolve category names
  const cats = useCategories(categories.data || []);
  const catName = (id: number) => cats.find((c) => c.category_id === id)?.category_name || `Category #${id}`;
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [sort, setSort] = useState('newest');
  const [form, setForm] = useState<{ r?: ResourceRequest } | null>(null);
  const [view, setView] = useState<ResourceRequest | null>(null);
  const [cancelling, setCancelling] = useState<ResourceRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const r = (data || []).filter((x) => (!t || x.item_name.toLowerCase().includes(t)) && (!status || x.status === status));
    const by: Record<string, (a: ResourceRequest, b: ResourceRequest) => number> = {
      newest: (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      priority: (a, b) => b.priority - a.priority, remaining: (a, b) => remaining(b) - remaining(a),
    };
    return r.sort(by[sort]);
  }, [data, q, status, sort]);
  const pg = usePaged(filtered, 9);
  const statuses = [...new Set([...KNOWN, ...(data || []).map((d) => d.status)])];

  async function doCancel() {
    if (!cancelling) return;
    setBusy(true);
    try { await api.cancelRequest(cancelling.request_id); toast.success('Request cancelled'); setCancelling(null); setView(null); reload(); }
    catch (e) { toast.error(errMsg(e)); setCancelling(null); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="My requests" subtitle="Ask the community for what you need and track how it’s going."
        actions={<Button onClick={() => setForm({})}><Plus size={17} />New request</Button>} />
      <div className="toolbar">
        <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search your requests" />
        <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); pg.setPage(1); }}>
          <option value="">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest first</option><option value="priority">Priority level (5 → 1)</option><option value="remaining">Most remaining</option>
        </select>
      </div>

      {loading ? <CardSkeletons /> : error ? <ErrorState message={error} onRetry={reload} /> : filtered.length === 0 ? (
        <EmptyState icon={<HandHeart size={26} />} title={data?.length ? 'No requests match your filters' : 'You haven’t made any requests'}
          text={data?.length ? 'Try a different search or status.' : 'Tell the community what you need and coordinators will match it with available donations.'}
          action={!data?.length ? <Button onClick={() => setForm({})}><Plus size={16} />Make your first request</Button> : undefined} />
      ) : (<>
        <div className="grid">
          {pg.slice.map((r) => (
            <Card key={r.request_id} className="item card-hover">
              <div className="item-top"><span className="chip"><Tag size={12} />{catName(r.category_id)}</span><StatusBadge status={r.status} /></div>
              <h3>{r.item_name}</h3>
              <div className="qty"><span className="muted">Fulfilled</span><strong>{fmtQty(r.fulfilled_quantity)} / {fmtQty(r.requested_quantity)} {r.unit}</strong></div>
              <Progress value={num(r.fulfilled_quantity)} max={num(r.requested_quantity)} label="Fulfilment progress" />
              <div className="meta"><div>Remaining: <strong style={{ color: 'var(--text)' }}>{fmtQty(remaining(r))} {r.unit}</strong></div><div><Priority n={r.priority} /></div><div>Requested {fmtDate(r.created_at)}</div></div>
              <div className="item-actions">
                <Button variant="secondary" size="sm" onClick={() => setView(r)}>View details</Button>
                {editable(r) && <Button variant="ghost" size="sm" onClick={() => setForm({ r })}><Pencil size={14} />Edit</Button>}
              </div>
            </Card>
          ))}
        </div>
        <Pagination {...pg} onChange={pg.setPage} />
      </>)}

      <Modal open={!!view} onClose={() => setView(null)} title={view?.item_name || ''} footer={view && editable(view) ? <>
        <Button variant="danger" onClick={() => setCancelling(view)}><XCircle size={16} />Cancel request</Button>
        <Button onClick={() => { setForm({ r: view }); setView(null); }}><Pencil size={16} />Edit</Button></> : undefined}>
        {view && <><dl className="detail-list">
          <Detail label="Status"><StatusBadge status={view.status} /></Detail><Detail label="Category">{catName(view.category_id)}</Detail>
          <Detail label="Requested">{fmtQty(view.requested_quantity)} {view.unit}</Detail><Detail label="Fulfilled">{fmtQty(view.fulfilled_quantity)} {view.unit}</Detail>
          <Detail label="Remaining">{fmtQty(remaining(view))} {view.unit}</Detail><Detail label="Priority"><Priority n={view.priority} /></Detail>
          <Detail label="Created">{fmtDate(view.created_at, true)}</Detail><Detail label="Request ID">#{view.request_id}</Detail></dl>
          <div style={{ marginTop: 18 }}><Progress value={num(view.fulfilled_quantity)} max={num(view.requested_quantity)} label="Fulfilment progress" /></div></>}
      </Modal>

      {form && <RequestForm key={form.r?.request_id ?? 'new'} r={form.r} cats={cats} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      <ConfirmDialog open={!!cancelling} danger title="Cancel this request?" confirmLabel="Cancel request" loading={busy} onClose={() => setCancelling(null)} onConfirm={doCancel}
        message={<>“{cancelling?.item_name}” will be marked as cancelled and can no longer be allocated to.</>} />
    </>
  );
}

function RequestForm({ r, cats, onClose, onSaved }: { r?: ResourceRequest; cats: { category_id: number; category_name: string }[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ category_id: r ? String(r.category_id) : '', item_name: r?.item_name || '', requested_quantity: r ? String(num(r.requested_quantity)) : '', unit: r?.unit || '', priority: String(r?.priority ?? 3) });
  const [errs, setErrs] = useState<Record<string, string>>({}); const [formErr, setFormErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const hasCurrent = r && !cats.some((c) => c.category_id === r.category_id);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!(Number.isInteger(Number(f.category_id)) && Number(f.category_id) > 0)) er.category_id = cats.length ? 'Choose a category' : 'Enter a valid category ID';
    if (!f.item_name.trim()) er.item_name = 'Item name is required'; else if (f.item_name.trim().length > 100) er.item_name = 'Max 100 characters';
    if (!(Number(f.requested_quantity) > 0)) er.requested_quantity = 'Quantity must be greater than zero';
    else if (r && Number(f.requested_quantity) < num(r.fulfilled_quantity)) er.requested_quantity = `Can’t be less than the ${fmtQty(r.fulfilled_quantity)} already fulfilled`;
    if (!f.unit.trim()) er.unit = 'Unit is required'; else if (f.unit.trim().length > 20) er.unit = 'Max 20 characters';
    setErrs(er); setFormErr('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const body = { category_id: Number(f.category_id), item_name: f.item_name.trim(), requested_quantity: Number(f.requested_quantity), unit: f.unit.trim(), priority: Number(f.priority) };
      if (r) await api.updateRequest(r.request_id, body); else await api.createRequest(body);
      toast.success(r ? 'Request updated' : 'Request submitted');
      onSaved();
    } catch (err) { setFormErr(errMsg(err)); } finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title={r ? 'Edit request' : 'New request'} footer={<>
      <Button variant="secondary" onClick={onClose}>Close</Button><Button loading={busy} type="submit" form="request-form">{r ? 'Save changes' : 'Submit request'}</Button></>}>
      <form id="request-form" className="stack" style={{ gap: 14 }} onSubmit={submit} noValidate>
        {formErr && <div className="form-error" role="alert">{formErr}</div>}
        {cats.length ? (
          <Field label="Category" required error={errs.category_id}>{(id, d) => <select id={id} aria-describedby={d} aria-invalid={!!errs.category_id} value={f.category_id} onChange={(e) => set('category_id')(e.target.value)}>
            <option value="">Select a category…</option>{hasCurrent && <option value={r!.category_id}>Category #{r!.category_id}</option>}{cats.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}</select>}</Field>
        ) : (
          <Field label="Category ID" required error={errs.category_id} hint="Choose a category from the available database categories.">{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.category_id} inputMode="numeric" value={f.category_id} onChange={(e) => set('category_id')(e.target.value)} />}</Field>
        )}
        <Field label="Item needed" required error={errs.item_name}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.item_name} maxLength={100} value={f.item_name} onChange={(e) => set('item_name')(e.target.value)} />}</Field>
        <div className="form-grid">
          <Field label="Quantity" required error={errs.requested_quantity}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.requested_quantity} type="number" min="0" step="any" value={f.requested_quantity} onChange={(e) => set('requested_quantity')(e.target.value)} />}</Field>
          <Field label="Unit" required error={errs.unit}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.unit} maxLength={20} value={f.unit} onChange={(e) => set('unit')(e.target.value)} />}</Field>
        </div>
        <Field label="Priority level" hint="1–5 (default 3)">{(id, d) => <select id={id} aria-describedby={d} value={f.priority} onChange={(e) => set('priority')(e.target.value)}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>}</Field>
      </form>
    </Modal>
  );
}
