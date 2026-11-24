import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarClock, Gift, Pencil, Plus, Tag, User, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCategories } from '../lib/categories';
import { errMsg, useAsync, usePaged } from '../lib/hooks';
import { fmtDate, fmtQty, isExpired, num, toDateInput } from '../lib/format';
import type { Donation } from '../lib/types';
import { Button, Card, CardSkeletons, ConfirmDialog, Detail, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, Progress, SearchInput, StatusBadge } from '../components/ui';
import { useToast } from '../components/Toast';

// Statuses the backend code is known to use for donations.
const KNOWN_STATUS = ['AVAILABLE', 'PARTIAL', 'CANCELLED'];
// Backend rules: update only if status AVAILABLE/PARTIAL and nothing allocated yet; cancel only if AVAILABLE.
const canEdit = (d: Donation) => ['AVAILABLE', 'PARTIAL'].includes(d.status) && num(d.available_quantity) === num(d.quantity);
const canCancel = (d: Donation) => d.status === 'AVAILABLE';

export default function Donations() {
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useAsync(api.donations);
const categories = useAsync(api.categories);
const cats = useCategories(categories.data || []);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [mine, setMine] = useState(false);
  const category = params.get('category') || '';
  const [form, setForm] = useState<{ mode: 'create' } | { mode: 'edit'; d: Donation } | null>(null);
  const [view, setView] = useState<Donation | null>(null);
  const [cancelling, setCancelling] = useState<Donation | null>(null);
  const [busy, setBusy] = useState(false);
  const isDonor = user?.role === 'DONOR';

  const statuses = useMemo(() => [...new Set([...KNOWN_STATUS, ...(data || []).map((d) => d.status)])], [data]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let r = (data || []).filter((d) =>
      (!t || d.item_name.toLowerCase().includes(t) || d.donor_name.toLowerCase().includes(t) || d.category_name.toLowerCase().includes(t)) &&
      (!category || String(d.category_id) === category) && (!status || d.status === status) && (!mine || d.donor_id === user?.member_id));
    const by: Record<string, (a: Donation, b: Donation) => number> = {
      newest: (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      oldest: (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
      qty: (a, b) => num(b.available_quantity) - num(a.available_quantity),
      expiry: (a, b) => (a.expiry_at ? +new Date(a.expiry_at) : Infinity) - (b.expiry_at ? +new Date(b.expiry_at) : Infinity),
      name: (a, b) => a.item_name.localeCompare(b.item_name),
    };
    return [...r].sort(by[sort]);
  }, [data, q, category, status, mine, sort, user]);
  const pg = usePaged(filtered, 9);

  async function doCancel() {
    if (!cancelling) return;
    setBusy(true);
    try { await api.cancelDonation(cancelling.donation_id); toast.success('Donation cancelled'); setCancelling(null); setView(null); reload(); }
    catch (e) { toast.error(errMsg(e)); setCancelling(null); } finally { setBusy(false); }
  }
  const resetFilters = () => { setQ(''); setStatus(''); setMine(false); setParams({}); };

  return (
    <>
      <PageHeader title="Donations" subtitle="Browse what’s available in your community."
        actions={isDonor && <Button onClick={() => setForm({ mode: 'create' })}><Plus size={17} />New donation</Button>} />

      <div className="toolbar">
        <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search item, donor or category" />
        <select aria-label="Filter by category" value={category} onChange={(e) => { e.target.value ? setParams({ category: e.target.value }) : setParams({}); pg.setPage(1); }}>
          <option value="">All categories</option>{cats.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>
        <select aria-label="Filter by availability" value={status} onChange={(e) => { setStatus(e.target.value); pg.setPage(1); }}>
          <option value="">Any availability</option>{statuses.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')}</option>)}
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="qty">Most available</option><option value="expiry">Expiring soonest</option><option value="name">Name A–Z</option>
        </select>
        {isDonor && <Button variant={mine ? 'primary' : 'secondary'} onClick={() => { setMine(!mine); pg.setPage(1); }} aria-pressed={mine}>My donations</Button>}
      </div>

      {loading ? <CardSkeletons /> : error ? <ErrorState message={error} onRetry={reload} /> :
        filtered.length === 0 ? (
          <EmptyState icon={<Gift size={26} />} title={data?.length ? 'No donations match your filters' : 'No donations yet'}
            text={data?.length ? 'Try a different search or clear the filters.' : isDonor ? 'Be the first to share something with your community.' : 'Check back soon — new donations appear here as donors list them.'}
            action={data?.length ? <Button variant="secondary" onClick={resetFilters}>Clear filters</Button> : isDonor ? <Button onClick={() => setForm({ mode: 'create' })}><Plus size={16} />New donation</Button> : undefined} />
        ) : (
          <>
            <div className="grid">
              {pg.slice.map((d) => {
                const expired = isExpired(d.expiry_at);
                return (
                  <Card key={d.donation_id} className="item card-hover">
                    <div className="item-top"><span className="chip"><Tag size={12} />{d.category_name}</span><StatusBadge status={d.status} /></div>
                    <h3>{d.item_name}</h3>
                    <div className="qty"><span className="muted">Available</span><strong>{fmtQty(d.available_quantity)} / {fmtQty(d.quantity)} {d.unit}</strong></div>
                    <Progress value={num(d.available_quantity)} max={num(d.quantity)} label="Share still available" />
                    <div className="meta">
                      <div><User size={14} />{d.donor_name}{d.donor_id === user?.member_id && ' (you)'}</div>
                      <div><CalendarClock size={14} />{d.expiry_at ? <span style={expired ? { color: 'var(--red)' } : undefined}>{expired ? 'Expired' : 'Expires'} {fmtDate(d.expiry_at)}</span> : 'No expiry date'}</div>
                    </div>
                    <div className="item-actions">
                      <Button variant="secondary" size="sm" onClick={() => setView(d)}>View details</Button>
                      {isDonor && d.donor_id === user?.member_id && canEdit(d) && <Button variant="ghost" size="sm" onClick={() => setForm({ mode: 'edit', d })}><Pencil size={14} />Edit</Button>}
                    </div>
                  </Card>
                );
              })}
            </div>
            <Pagination {...pg} onChange={pg.setPage} />
          </>
        )}

      <Modal open={!!view} onClose={() => setView(null)} title={view?.item_name || ''} footer={view && isDonor && view.donor_id === user?.member_id ? <>
        {canCancel(view) && <Button variant="danger" onClick={() => setCancelling(view)}><XCircle size={16} />Cancel donation</Button>}
        {canEdit(view) && <Button onClick={() => { setForm({ mode: 'edit', d: view }); setView(null); }}><Pencil size={16} />Edit</Button>}
      </> : undefined}>
        {view && <dl className="detail-list">
          <Detail label="Status"><StatusBadge status={view.status} /></Detail><Detail label="Category">{view.category_name}</Detail>
          <Detail label="Total quantity">{fmtQty(view.quantity)} {view.unit}</Detail><Detail label="Available">{fmtQty(view.available_quantity)} {view.unit}</Detail>
          <Detail label="Donor">{view.donor_name}</Detail><Detail label="Listed">{fmtDate(view.created_at, true)}</Detail>
          <Detail label="Expiry">{fmtDate(view.expiry_at)}</Detail><Detail label="Donation ID">#{view.donation_id}</Detail>
        </dl>}
        {view && isDonor && view.donor_id === user?.member_id && !canEdit(view) && view.status !== 'CANCELLED' &&
          <p className="muted small" style={{ marginTop: 16 }}>This donation can no longer be edited because part of it has been allocated.</p>}
      </Modal>

      {form && <DonationForm key={form.mode === 'edit' ? form.d.donation_id : 'new'} state={form} cats={cats} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      <ConfirmDialog open={!!cancelling} danger title="Cancel this donation?" confirmLabel="Cancel donation" loading={busy} onClose={() => setCancelling(null)} onConfirm={doCancel}
        message={<>“{cancelling?.item_name}” will no longer be available to recipients. This can’t be undone.</>} />
    </>
  );
}

function DonationForm({ state, cats, onClose, onSaved }: { state: { mode: 'create' } | { mode: 'edit'; d: Donation }; cats: { category_id: number; category_name: string }[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const edit = state.mode === 'edit' ? state.d : null;
  const [f, setF] = useState({ category_id: edit ? String(edit.category_id) : '', item_name: edit?.item_name || '', quantity: edit ? String(num(edit.quantity)) : '', unit: edit?.unit || '', expiry_at: toDateInput(edit?.expiry_at) });
  const [errs, setErrs] = useState<Record<string, string>>({}); const [formErr, setFormErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const today = toDateInput(new Date().toISOString());

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!edit && !(Number.isInteger(Number(f.category_id)) && Number(f.category_id) > 0)) er.category_id = cats.length ? 'Choose a category' : 'Enter a valid category ID';
    if (!f.item_name.trim()) er.item_name = 'Item name is required'; else if (f.item_name.trim().length > 100) er.item_name = 'Max 100 characters';
    if (!(Number(f.quantity) > 0)) er.quantity = 'Quantity must be greater than zero';
    if (!f.unit.trim()) er.unit = 'Unit is required'; else if (f.unit.trim().length > 20) er.unit = 'Max 20 characters';
    if (f.expiry_at && f.expiry_at < today && f.expiry_at !== toDateInput(edit?.expiry_at)) er.expiry_at = 'Expiry date can’t be in the past';
    setErrs(er); setFormErr('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const body = { item_name: f.item_name.trim(), quantity: Number(f.quantity), unit: f.unit.trim(), expiry_at: f.expiry_at || null };
      if (edit) await api.updateDonation(edit.donation_id, body); else await api.createDonation({ ...body, category_id: Number(f.category_id) });
      toast.success(edit ? 'Donation updated' : 'Donation listed — thank you!');
      onSaved();
    } catch (err) { setFormErr(errMsg(err)); } finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title={edit ? 'Edit donation' : 'New donation'} footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} type="submit" form="donation-form">{edit ? 'Save changes' : 'List donation'}</Button></>}>
      <form id="donation-form" className="stack" style={{ gap: 14 }} onSubmit={submit} noValidate>
        {formErr && <div className="form-error" role="alert">{formErr}</div>}
        {edit ? <Field label="Category">{(id) => <input id={id} value={edit.category_name} disabled />}</Field> :
          cats.length ? (
            <Field label="Category" required error={errs.category_id}>{(id, d) => <select id={id} aria-describedby={d} aria-invalid={!!errs.category_id} value={f.category_id} onChange={(e) => set('category_id')(e.target.value)}>
              <option value="">Select a category…</option>{cats.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}</select>}</Field>
          ) : (
            <Field label="Category ID" required error={errs.category_id} hint="Choose a category from the available database categories.">{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.category_id} inputMode="numeric" value={f.category_id} onChange={(e) => set('category_id')(e.target.value)} />}</Field>
          )}
        <Field label="Item name" required error={errs.item_name}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.item_name} maxLength={100} value={f.item_name} onChange={(e) => set('item_name')(e.target.value)} />}</Field>
        <div className="form-grid">
          <Field label="Quantity" required error={errs.quantity}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.quantity} type="number" min="0" step="any" value={f.quantity} onChange={(e) => set('quantity')(e.target.value)} />}</Field>
          <Field label="Unit" required error={errs.unit} hint="e.g. kg, packs, boxes">{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.unit} maxLength={20} value={f.unit} onChange={(e) => set('unit')(e.target.value)} />}</Field>
        </div>
        <Field label="Expiry date" error={errs.expiry_at} hint="Optional">{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.expiry_at} type="date" value={f.expiry_at} onChange={(e) => set('expiry_at')(e.target.value)} />}</Field>
        {edit && <p className="muted small">Changing the quantity resets the available quantity to match, since nothing has been allocated yet.</p>}
      </form>
    </Modal>
  );
}
