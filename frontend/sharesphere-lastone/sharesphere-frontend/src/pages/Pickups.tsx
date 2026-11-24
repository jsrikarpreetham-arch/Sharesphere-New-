import { useMemo, useState } from 'react';
import { CheckCircle2, PackageCheck, Truck, TriangleAlert } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { errMsg, useAsync, usePaged } from '../lib/hooks';
import { fmtDate, fmtQty } from '../lib/format';
import type { Allocation } from '../lib/types';
import { Button, Card, CardSkeletons, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, StatusBadge, Notice, Detail } from '../components/ui';
import { Tracker } from '../components/Tracker';
import { useToast } from '../components/Toast';

// Normalised row so ADMIN (pickup records) and VOLUNTEER (assignments) share one UI.
interface Row { id: number; donated: string | null; requested: string | null; qty: number | string; volunteer?: string | null; status: string; pickedUpAt: string | null; deliveredAt: string | null; allocatedAt?: string | null; outcome: string | null; notes: string | null; pickupId: number | null }
const fromAlloc = (a: Allocation): Row => ({ id: a.allocation_id, donated: a.donated_item, requested: a.requested_item, qty: a.allocated_quantity, volunteer: a.volunteer_name, status: a.allocation_status, pickedUpAt: a.picked_up_at, deliveredAt: a.delivered_at, allocatedAt: a.allocated_at, outcome: a.pickup_outcome, notes: a.notes, pickupId: a.pickup_id });

export default function Pickups() {
  const { user } = useAuth();
  const isVol = user?.role === 'VOLUNTEER';
  const toast = useToast();
  const { data, loading, error, reload } = useAsync<Row[]>(async () => isVol
    ? (await api.myAssignments()).map(fromAlloc)
    : (await api.pickupRecords()).map((p) => ({ id: p.allocation_id, donated: p.donated_item, requested: p.requested_item, qty: p.allocated_quantity, volunteer: p.volunteer_name, status: p.allocation_status, pickedUpAt: p.picked_up_at, deliveredAt: p.delivered_at, outcome: p.outcome, notes: p.notes, pickupId: p.pickup_id })), [isVol]);
  const [tab, setTab] = useState<'active' | 'done' | 'all'>('active');
  const [act, setAct] = useState<{ kind: 'deliver' | 'fail'; row: Row } | null>(null);
  const [notes, setNotes] = useState(''); const [noteErr, setNoteErr] = useState(''); const [busy, setBusy] = useState<number | 'modal' | null>(null);

  const isDone = (r: Row) => ['DELIVERED', 'FAILED'].includes(r.status);
  const rows = useMemo(() => (data || []).filter((r) => tab === 'all' || (tab === 'done' ? isDone(r) : !isDone(r))), [data, tab]);
  const pg = usePaged(rows, 8);
  const count = (t: typeof tab) => (data || []).filter((r) => t === 'all' || (t === 'done' ? isDone(r) : !isDone(r))).length;

  async function pickup(r: Row) {
    setBusy(r.id);
    try { await api.markPickedUp(r.id); toast.success('Marked as picked up'); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  }
  async function submitAct() {
    if (!act) return;
    if (act.kind === 'fail' && !notes.trim()) { setNoteErr('Please describe what went wrong'); return; }
    if (notes.length > 255) { setNoteErr('Max 255 characters'); return; }
    setBusy('modal');
    try {
      if (act.kind === 'deliver') await api.markDelivered(act.row.id, notes.trim() || undefined); else await api.reportFailure(act.row.id, notes.trim());
      toast.success(act.kind === 'deliver' ? 'Delivery recorded — thank you!' : 'Failure reported');
      setAct(null); setNotes(''); reload();
    } catch (e) { setNoteErr(errMsg(e)); } finally { setBusy(null); }
  }
  const openAct = (kind: 'deliver' | 'fail', row: Row) => { setNotes(''); setNoteErr(''); setAct({ kind, row }); };

  return (
    <>
      <PageHeader title={isVol ? 'My pickups & deliveries' : 'Pickup & delivery tracking'} subtitle={isVol ? 'Collect from donors and deliver to recipients.' : 'Follow every allocation from reservation to delivery.'} />
      <div className="toolbar" role="tablist" aria-label="Filter pickups">
        {(['active', 'done', 'all'] as const).map((t) => (
          <Button key={t} role="tab" aria-selected={tab === t} variant={tab === t ? 'primary' : 'secondary'} size="sm" onClick={() => { setTab(t); pg.setPage(1); }}>
            {t === 'active' ? 'In progress' : t === 'done' ? 'Completed' : 'All'}{data ? ` · ${count(t)}` : ''}</Button>
        ))}
      </div>
      {loading ? <CardSkeletons count={4} /> : error ? <ErrorState message={error} onRetry={reload} /> : rows.length === 0 ? (
        <EmptyState icon={<Truck size={26} />} title={tab === 'active' ? 'Nothing in progress' : 'No pickups here'} text={isVol ? 'When an administrator assigns you an allocation it will show up here.' : 'Pickup records appear once allocations are created.'} />
      ) : (<>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))' }}>
          {pg.slice.map((r) => (
            <Card key={r.id} className="item">
              <div className="item-top"><span className="chip">Allocation #{r.id}</span><StatusBadge status={r.status} /></div>
              <h3>{r.donated || 'Donation'} <span className="muted" style={{ fontWeight: 500 }}>→</span> {r.requested || 'Request'}</h3>
              <p className="muted small">{fmtQty(r.qty)} allocated{r.volunteer ? ` · ${r.volunteer}` : ''}</p>
              <div style={{ margin: '18px 0 8px' }}><Tracker status={r.status} pickedUpAt={r.pickedUpAt} deliveredAt={r.deliveredAt} allocatedAt={r.allocatedAt} /></div>
              {(r.notes || r.outcome) && <p className="small" style={{ background: r.status === 'FAILED' ? 'var(--red-bg)' : '#f6f8fa', padding: '8px 10px', borderRadius: 8, marginTop: 8 }}>
                {r.outcome && <><strong>Outcome:</strong> {r.outcome.charAt(0) + r.outcome.slice(1).toLowerCase()}. </>}{r.notes}</p>}
              {isVol && (r.status === 'RESERVED' || r.status === 'PICKED_UP') && (
                <div className="item-actions">
                  {r.status === 'RESERVED' && <Button size="sm" loading={busy === r.id} onClick={() => pickup(r)}><PackageCheck size={15} />Mark picked up</Button>}
                  {r.status === 'PICKED_UP' && <><Button size="sm" onClick={() => openAct('deliver', r)}><CheckCircle2 size={15} />Mark delivered</Button>
                    <Button size="sm" variant="secondary" onClick={() => openAct('fail', r)}><TriangleAlert size={15} />Report problem</Button></>}
                </div>)}
            </Card>
          ))}
        </div>
        <Pagination {...pg} onChange={pg.setPage} />
      </>)}
      {!isVol && <div style={{ marginTop: 20 }}><Notice>Pickup and delivery updates are made by the assigned volunteer; administrators can monitor progress here.</Notice></div>}

      <Modal open={!!act} onClose={() => setAct(null)} title={act?.kind === 'deliver' ? 'Confirm delivery' : 'Report a delivery problem'} footer={<>
        <Button variant="secondary" onClick={() => setAct(null)}>Back</Button>
        <Button variant={act?.kind === 'fail' ? 'danger' : 'primary'} loading={busy === 'modal'} onClick={submitAct}>{act?.kind === 'deliver' ? 'Confirm delivered' : 'Report failure'}</Button></>}>
        {act && <div className="stack">
          <dl className="detail-list"><Detail label="Allocation">#{act.row.id}</Detail><Detail label="Picked up">{fmtDate(act.row.pickedUpAt, true)}</Detail></dl>
          <Field label={act.kind === 'deliver' ? 'Delivery notes (optional)' : 'What went wrong?'} required={act.kind === 'fail'} error={noteErr}>
            {(id, d) => <textarea id={id} aria-describedby={d} aria-invalid={!!noteErr} maxLength={255} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
          {act.kind === 'fail' && <p className="muted small">This marks the allocation as failed and can’t be undone from here.</p>}
        </div>}
      </Modal>
    </>
  );
}
