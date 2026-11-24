import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { errMsg, useAsync, usePaged } from '../lib/hooks';
import { fmtDate, titleCase } from '../lib/format';
import type { Member } from '../lib/types';
import { Avatar, Button, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, SearchInput, Skeleton } from '../components/ui';
import { useToast } from '../components/Toast';

export default function Members() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(api.members);
  const [q, setQ] = useState(''); const [role, setRole] = useState('');
  const [target, setTarget] = useState<Member | null>(null); const [busy, setBusy] = useState(false);
  const isActive = (m: Member) => m.active === true || m.active === 1;
  const rows = useMemo(() => { const t = q.trim().toLowerCase(); return (data || []).filter((m) => (!role || m.role === role) && (!t || [m.full_name, m.email, m.area, m.phone].some((x) => x?.toLowerCase().includes(t)))); }, [data, q, role]);
  const pg = usePaged(rows, 10);

  async function toggle() {
    if (!target) return;
    setBusy(true);
    try { await api.setMemberActive(target.member_id, !isActive(target)); toast.success(`${target.full_name} ${isActive(target) ? 'deactivated' : 'activated'}`); setTarget(null); reload(); }
    catch (e) { toast.error(errMsg(e)); setTarget(null); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Members" subtitle="Everyone in your ShareSphere community." />
      <div className="toolbar">
        <SearchInput value={q} onChange={(v) => { setQ(v); pg.setPage(1); }} placeholder="Search name, email, phone or area" />
        <select aria-label="Filter by role" value={role} onChange={(e) => { setRole(e.target.value); pg.setPage(1); }}>
          <option value="">All roles</option>{['ADMIN', 'DONOR', 'RECIPIENT', 'VOLUNTEER'].map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}</select>
      </div>
      {loading ? <Card className="stack">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={40} />)}</Card> : error ? <ErrorState message={error} onRetry={reload} /> : rows.length === 0 ? (
        <EmptyState icon={<Users size={26} />} title="No members found" text="Try a different search or role." />
      ) : (<>
        <div className="table-wrap"><table className="rtable">
          <thead><tr><th>Member</th><th>Role</th><th>Phone</th><th>Area</th><th>Joined</th><th>Status</th><th /></tr></thead>
          <tbody>{pg.slice.map((m) => (
            <tr key={m.member_id}>
              <td data-label="Member"><div className="row" style={{ flexWrap: 'nowrap' }}><Avatar name={m.full_name} /><div style={{ textAlign: 'left' }}><strong>{m.full_name}</strong><div className="muted small">{m.email}</div></div></div></td>
              <td data-label="Role">{titleCase(m.role)}</td><td data-label="Phone">{m.phone || '—'}</td><td data-label="Area">{m.area || '—'}</td><td data-label="Joined">{fmtDate(m.created_at)}</td>
              <td data-label="Status"><span className={`badge badge-${isActive(m) ? 'green' : 'gray'}`}><i />{isActive(m) ? 'Active' : 'Inactive'}</span></td>
              <td>{m.member_id !== user?.member_id && <Button variant="ghost" size="sm" onClick={() => setTarget(m)}>{isActive(m) ? 'Deactivate' : 'Activate'}</Button>}</td>
            </tr>))}</tbody></table></div>
        <Pagination {...pg} onChange={pg.setPage} />
      </>)}
      <ConfirmDialog open={!!target} danger={!!target && isActive(target)} loading={busy} onClose={() => setTarget(null)} onConfirm={toggle}
        title={target && isActive(target) ? 'Deactivate this member?' : 'Activate this member?'} confirmLabel={target && isActive(target) ? 'Deactivate' : 'Activate'}
        message={target && isActive(target) ? <>{target.full_name} won’t be able to sign in until reactivated.</> : <>{target?.full_name} will be able to sign in again.</>} />
    </>
  );
}
