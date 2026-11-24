import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Workflow } from 'lucide-react';
import { api } from '../lib/api';
import { errMsg, useAsync, usePaged } from '../lib/hooks';
import { fmtDate, fmtQty, num } from '../lib/format';
import type { Allocation } from '../lib/types';
import { Button, Detail, EmptyState, ErrorState, Field, Modal, Notice, PageHeader, Pagination, SearchInput, Skeleton, StatusBadge, Card } from '../components/ui';
import { Tracker } from '../components/Tracker';
import { useToast } from '../components/Toast';

export default function Allocations() {
  const { data, loading, error, reload } = useAsync(api.allocations);
  const [q, setQ] = useState(''); const [status, setStatus] = useState('');
  const [create, setCreate] = useState(false); const [view, setView] = useState<Allocation | null>(null);

  const statuses = useMemo(() => [...new Set(['RESERVED', 'PICKED_UP', 'DELIVERED', 'FAILED', ...(data || []).map((a) => a.allocation_status)])], [data]);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data || []).filter((a) => (!status || a.allocation_status === status) && (!t ||
      [a.donated_item, a.requested_item, a.volunteer_name, String(a.allocation_id)].some((x) => x?.toLowerCase().includes(t))));
  }, [data, q, status]);
  const pg = usePaged(rows, 10);

  return (
    <>
      <PageHeader title="Allocations" subtitle="Match donations to requests and assign volunteers." actions={<Button onClick={() => setCreate(true)}><Plus size={17} />New allocation</Button>} />
      <div className="toolbar">
        <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search item, volunteer or ID" />
        <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); pg.setPage(1); }}>
          <option value="">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}</option>)}
        </select>
      </div>
      {loading ? <Card className="stack">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={36} />)}</Card> : error ? <ErrorState message={error} onRetry={reload} /> : rows.length === 0 ? (
        <EmptyState icon={<Workflow size={26} />} title={data?.length ? 'No allocations match' : 'No allocations yet'} text={data?.length ? 'Try clearing your search or filter.' : 'Create an allocation to match a donation with a request and assign a volunteer.'}
          action={!data?.length ? <Button onClick={() => setCreate(true)}><Plus size={16} />New allocation</Button> : undefined} />
      ) : (<>
        <div className="table-wrap"><table className="rtable">
          <thead><tr><th>ID</th><th>Donation</th><th>Request</th><th>Quantity</th><th>Volunteer</th><th>Allocated</th><th>Status</th><th /></tr></thead>
          <tbody>{pg.slice.map((a) => (
            <tr key={a.allocation_id}>
              <td data-label="ID">#{a.allocation_id}</td>
              <td data-label="Donation"><strong>{a.donated_item || '—'}</strong><div className="muted small">Donation #{a.donation_id}</div></td>
              <td data-label="Request"><strong>{a.requested_item || '—'}</strong><div className="muted small">Request #{a.request_id}</div></td>
              <td data-label="Quantity">{fmtQty(a.allocated_quantity)}</td>
              <td data-label="Volunteer">{a.volunteer_name || `#${a.volunteer_id}`}</td>
              <td data-label="Allocated">{fmtDate(a.allocated_at)}</td>
              <td data-label="Status"><StatusBadge status={a.allocation_status} /></td>
              <td><Button variant="ghost" size="sm" onClick={() => setView(a)}>Details</Button></td>
            </tr>))}</tbody></table></div>
        <Pagination {...pg} onChange={pg.setPage} />
      </>)}

      <Modal open={!!view} onClose={() => setView(null)} wide title={view ? `Allocation #${view.allocation_id}` : ''}>
        {view && <div className="stack" style={{ gap: 20 }}>
          <Tracker status={view.allocation_status} pickedUpAt={view.picked_up_at} deliveredAt={view.delivered_at} allocatedAt={view.allocated_at} />
          <dl className="detail-list">
            <Detail label="Status"><StatusBadge status={view.allocation_status} /></Detail><Detail label="Quantity">{fmtQty(view.allocated_quantity)}</Detail>
            <Detail label="Donation">{view.donated_item || '—'} (#{view.donation_id})</Detail><Detail label="Request">{view.requested_item || '—'} (#{view.request_id})</Detail>
            <Detail label="Volunteer">{view.volunteer_name || `#${view.volunteer_id}`}</Detail><Detail label="Allocated">{fmtDate(view.allocated_at, true)}</Detail>
            <Detail label="Pickup outcome">{view.pickup_outcome ? <StatusBadge status={view.pickup_outcome} /> : '—'}</Detail><Detail label="Notes">{view.notes || '—'}</Detail>
          </dl></div>}
      </Modal>
      {create && <AllocationForm onClose={() => setCreate(false)} onSaved={() => { setCreate(false); reload(); }} />}
    </>
  );
}

function AllocationForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const donations = useAsync(api.donations); const members = useAsync(api.members);
  const open = (donations.data || []).filter((d) => ['AVAILABLE', 'PARTIAL'].includes(d.status) && num(d.available_quantity) > 0);
  const volunteers = (members.data || []).filter((m) => m.role === 'VOLUNTEER' && m.active !== false && m.active !== 0);
  const [f, setF] = useState({ donation_id: '', request_id: '', volunteer_id: '', qty: '' });
  const [errs, setErrs] = useState<Record<string, string>>({}); const [formErr, setFormErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const don = open.find((d) => String(d.donation_id) === f.donation_id);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!don) er.donation_id = 'Choose a donation';
    if (!(Number.isInteger(Number(f.request_id)) && Number(f.request_id) > 0)) er.request_id = 'Enter a valid request ID';
    if (!f.volunteer_id) er.volunteer_id = 'Assign a volunteer';
    if (!(Number(f.qty) > 0)) er.qty = 'Quantity must be greater than zero';
    else if (don && Number(f.qty) > num(don.available_quantity)) er.qty = `Only ${fmtQty(don.available_quantity)} ${don.unit} available`;
    setErrs(er); setFormErr('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api.createAllocation({ donation_id: Number(f.donation_id), request_id: Number(f.request_id), volunteer_id: Number(f.volunteer_id), allocated_quantity: Number(f.qty) });
      toast.success('Allocation created — volunteer assigned'); onSaved();
    } catch (err) { setFormErr(errMsg(err)); } finally { setBusy(false); }
  }
  const loadingLists = donations.loading || members.loading;

  return (
    <Modal open onClose={onClose} title="New allocation" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={loadingLists} type="submit" form="alloc-form">Allocate</Button></>}>
      <form id="alloc-form" className="stack" style={{ gap: 14 }} onSubmit={submit} noValidate>
        {formErr && <div className="form-error" role="alert">{formErr}</div>}
        {(donations.error || members.error) && <div className="form-error">{donations.error || members.error}</div>}
        <Field label="Donation" required error={errs.donation_id}>{(id, d) => <select id={id} aria-describedby={d} aria-invalid={!!errs.donation_id} value={f.donation_id} onChange={(e) => set('donation_id')(e.target.value)}>
          <option value="">{loadingLists ? 'Loading…' : open.length ? 'Select a donation…' : 'No donations with stock available'}</option>
          {open.map((x) => <option key={x.donation_id} value={x.donation_id}>#{x.donation_id} · {x.item_name} — {fmtQty(x.available_quantity)} {x.unit} left</option>)}</select>}</Field>
        <Field label="Request ID" required error={errs.request_id} hint="The backend doesn’t expose a list of all requests to admins, so enter the request’s ID.">{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.request_id} inputMode="numeric" value={f.request_id} onChange={(e) => set('request_id')(e.target.value)} />}</Field>
        <Field label="Volunteer" required error={errs.volunteer_id}>{(id, d) => <select id={id} aria-describedby={d} aria-invalid={!!errs.volunteer_id} value={f.volunteer_id} onChange={(e) => set('volunteer_id')(e.target.value)}>
          <option value="">{loadingLists ? 'Loading…' : volunteers.length ? 'Select a volunteer…' : 'No active volunteers'}</option>
          {volunteers.map((v) => <option key={v.member_id} value={v.member_id}>{v.full_name}{v.area ? ` · ${v.area}` : ''}</option>)}</select>}</Field>
        <Field label={`Quantity${don ? ` (${don.unit})` : ''}`} required error={errs.qty} hint={don ? `Up to ${fmtQty(don.available_quantity)} available` : undefined}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.qty} type="number" min="0" step="any" value={f.qty} onChange={(e) => set('qty')(e.target.value)} />}</Field>
        <Notice>The server checks the request’s remaining need and the donation’s stock when you submit.</Notice>
      </form>
    </Modal>
  );
}
