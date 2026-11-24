import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, ArrowRight, Ban, Boxes, CheckCircle2, Gift, HandHeart, Hourglass, PackageCheck, Plus, Route, Truck, Users, Workflow } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAsync } from '../lib/hooks';
import { fmtDate, fmtQty, isExpired, num, timeAgo } from '../lib/format';
import type { Allocation, Donation, ResourceRequest } from '../lib/types';
import { Card, ErrorState, Notice, PageHeader, Progress, Skeleton, Stat, StatusBadge } from '../components/ui';

const open = (d: Donation) => ['AVAILABLE', 'PARTIAL'].includes(d.status) && num(d.available_quantity) > 0;
const isMonthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

function trend(donations: Donation[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  return months.map((m) => ({ label: m.toLocaleString(undefined, { month: 'short' }), n: donations.filter((d) => isMonthKey(new Date(d.created_at)) === isMonthKey(m)).length }));
}

export default function Dashboard() {
  const { user } = useAuth();
  const role = user!.role;
  const donations = useAsync(api.donations);
  const requests = useAsync(api.myRequests, [], role === 'RECIPIENT');
  const assignments = useAsync(api.myAssignments, [], role === 'VOLUNTEER');
  const allocations = useAsync(api.allocations, [], role === 'ADMIN');

  const don = donations.data || [];
  const reqs: ResourceRequest[] = requests.data || [];
  const asg: Allocation[] = role === 'VOLUNTEER' ? assignments.data || [] : allocations.data || [];
  const mine = don.filter((d) => d.donor_id === user!.member_id);
  const roleLoading = (role === 'RECIPIENT' && requests.loading) || (role === 'VOLUNTEER' && assignments.loading) || (role === 'ADMIN' && allocations.loading);
  const loading = donations.loading || roleLoading;
  const error = donations.error || (role === 'RECIPIENT' && requests.error) || (role === 'VOLUNTEER' && assignments.error) || (role === 'ADMIN' && allocations.error) || null;
  const reload = () => { donations.reload(); requests.reload(); assignments.reload(); allocations.reload(); };
  const by = (s: string) => asg.filter((a) => a.allocation_status === s).length;

  const stats = useMemo(() => {
    const avail = don.filter(open).length;
    switch (role) {
      case 'DONOR': return [
        { label: 'My donations', value: mine.length, icon: <Gift size={21} />, tone: 'green' },
        { label: 'Available in community', value: avail, icon: <Boxes size={21} />, tone: 'navy' },
        { label: 'My active listings', value: mine.filter(open).length, icon: <CheckCircle2 size={21} />, tone: 'green' },
        { label: 'Partially allocated', value: mine.filter((d) => d.status === 'PARTIAL').length, icon: <Hourglass size={21} />, tone: 'amber' },
        { label: 'Cancelled', value: mine.filter((d) => d.status === 'CANCELLED').length, icon: <Ban size={21} />, tone: 'red' }];
      case 'RECIPIENT': return [
        { label: 'Active requests', value: reqs.filter((r) => ['OPEN', 'PARTIAL'].includes(r.status)).length, icon: <HandHeart size={21} />, tone: 'blue' },
        { label: 'Partially fulfilled', value: reqs.filter((r) => r.status === 'PARTIAL').length, icon: <Hourglass size={21} />, tone: 'amber' },
        { label: 'Fulfilled', value: reqs.filter((r) => r.status === 'FULFILLED').length, icon: <CheckCircle2 size={21} />, tone: 'green' },
        { label: 'Total requests', value: reqs.length, icon: <Workflow size={21} />, tone: 'navy' },
        { label: 'Available donations', value: avail, icon: <Boxes size={21} />, tone: 'green' }];
      case 'VOLUNTEER': return [
        { label: 'Assigned to me', value: asg.length, icon: <Route size={21} />, tone: 'navy' },
        { label: 'Awaiting pickup', value: by('RESERVED'), icon: <PackageCheck size={21} />, tone: 'blue' },
        { label: 'In transit', value: by('PICKED_UP'), icon: <Truck size={21} />, tone: 'amber' },
        { label: 'Delivered', value: by('DELIVERED'), icon: <CheckCircle2 size={21} />, tone: 'green' },
        { label: 'Failed', value: by('FAILED'), icon: <Ban size={21} />, tone: 'red' }];
      default: return [
        { label: 'Total donations', value: don.length, icon: <Gift size={21} />, tone: 'green' },
        { label: 'Available resources', value: avail, icon: <Boxes size={21} />, tone: 'navy' },
        { label: 'Allocations', value: asg.length, icon: <Workflow size={21} />, tone: 'blue' },
        { label: 'Completed allocations', value: by('DELIVERED'), icon: <CheckCircle2 size={21} />, tone: 'green' },
        { label: 'Pending pickups', value: by('RESERVED') + by('PICKED_UP'), icon: <Truck size={21} />, tone: 'amber' }];
    }
  }, [role, don, mine, reqs, asg]); // eslint-disable-line

  const expiring = don.filter((d) => open(d) && d.expiry_at && !isExpired(d.expiry_at) && +new Date(d.expiry_at) - Date.now() < 7 * 864e5).sort((a, b) => +new Date(a.expiry_at!) - +new Date(b.expiry_at!)).slice(0, 4);
  const recentDon = [...don].filter(open).slice(0, 5);
  const t = trend(don); const max = Math.max(1, ...t.map((x) => x.n));

  const activity = useMemo(() => {
    const items: { when: string; text: string; icon: React.ReactNode; tone: string }[] = [];
    don.slice(0, 8).forEach((d) => items.push({ when: d.created_at, text: `${d.donor_id === user!.member_id ? 'You' : d.donor_name} listed ${fmtQty(d.quantity)} ${d.unit} of ${d.item_name}`, icon: <Gift size={16} />, tone: 'green' }));
    reqs.slice(0, 8).forEach((r) => items.push({ when: r.created_at, text: `You requested ${fmtQty(r.requested_quantity)} ${r.unit} of ${r.item_name}`, icon: <HandHeart size={16} />, tone: 'blue' }));
    asg.slice(0, 8).forEach((a) => items.push({ when: a.delivered_at || a.picked_up_at || a.allocated_at, text: `Allocation #${a.allocation_id} (${a.donated_item || 'item'}) is ${a.allocation_status.toLowerCase().replace('_', ' ')}`, icon: <Truck size={16} />, tone: 'amber' }));
    return items.sort((a, b) => +new Date(b.when) - +new Date(a.when)).slice(0, 6);
  }, [don, reqs, asg, user]);

  const actions: { to: string; label: string; icon: React.ReactNode }[] = {
    DONOR: [{ to: '/app/donations', label: 'Manage donations', icon: <Plus size={16} /> }, { to: '/app/categories', label: 'Browse categories', icon: <Boxes size={16} /> }],
    RECIPIENT: [{ to: '/app/requests', label: 'New request', icon: <Plus size={16} /> }, { to: '/app/donations', label: 'Explore donations', icon: <Gift size={16} /> }],
    VOLUNTEER: [{ to: '/app/pickups', label: 'My pickups', icon: <Truck size={16} /> }, { to: '/app/donations', label: 'Browse donations', icon: <Gift size={16} /> }],
    ADMIN: [{ to: '/app/allocations', label: 'New allocation', icon: <Plus size={16} /> }, { to: '/app/pickups', label: 'Track pickups', icon: <Route size={16} /> }, { to: '/app/members', label: 'Members', icon: <Users size={16} /> }],
  }[role];

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader title={`${greet}, ${user!.full_name.split(' ')[0]}`} subtitle="Here’s what’s happening in your community." actions={actions.map((a, i) => <Link key={a.to} to={a.to} className={`btn btn-md ${i === 0 ? 'btn-primary' : 'btn-secondary'}`}>{a.icon}{a.label}</Link>)} />
      {error ? <ErrorState message={error} onRetry={reload} /> : <>
        <div className="grid-stats">{stats.map((s) => <Stat key={s.label} {...s} loading={loading} />)}</div>

        <div className="grid-2" style={{ marginTop: 16 }}>
          <Card>
            <div className="row spread" style={{ marginBottom: 6 }}><h2>Donation activity</h2><span className="muted small">Last 6 months</span></div>
            {loading ? <Skeleton h={150} /> : don.length === 0 ? <p className="muted" style={{ padding: '36px 0', textAlign: 'center' }}>No donations yet — the chart appears once donations are listed.</p> :
              <div className="bars" role="img" aria-label={`Donations per month: ${t.map((x) => `${x.label} ${x.n}`).join(', ')}`}>{t.map((x) => <div className="bar" key={x.label}><b>{x.n}</b><div style={{ height: `${(x.n / max) * 100}%` }} /><span>{x.label}</span></div>)}</div>}
          </Card>
          <Card>
            <h2 style={{ marginBottom: 6 }}>Recent activity</h2>
            {loading ? <div className="stack">{[0, 1, 2].map((i) => <Skeleton key={i} h={36} />)}</div> : activity.length === 0 ? <p className="muted" style={{ padding: '24px 0' }}>Nothing yet. Activity shows up here as things happen.</p> :
              <ul className="feed">{activity.map((a, i) => <li key={i}><span className={`dot tone-${a.tone}`}>{a.icon}</span><div><p style={{ fontSize: '.9rem' }}>{a.text}</p><p className="muted small">{timeAgo(a.when)}</p></div></li>)}</ul>}
          </Card>
        </div>

        <div className="grid-2" style={{ marginTop: 16 }}>
          <Card>
            <div className="row spread"><h2>Available donations</h2><Link to="/app/donations" className="small row">View all <ArrowRight size={14} /></Link></div>
            {loading ? <div className="stack" style={{ marginTop: 14 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={44} />)}</div> : recentDon.length === 0 ? <p className="muted" style={{ padding: '24px 0' }}>No donations are available right now.</p> :
              <div>{recentDon.map((d) => (
                <div className="link-row" key={d.donation_id}>
                  <div style={{ minWidth: 0 }}><strong>{d.item_name}</strong><div className="muted small">{d.category_name} · {d.donor_name}</div></div>
                  <div className="right"><strong>{fmtQty(d.available_quantity)} {d.unit}</strong><div><StatusBadge status={d.status} /></div></div>
                </div>))}</div>}
          </Card>
          {role === 'RECIPIENT' ? (
            <Card>
              <div className="row spread"><h2>Your recent requests</h2><Link to="/app/requests" className="small row">View all <ArrowRight size={14} /></Link></div>
              {loading ? <Skeleton h={90} /> : reqs.length === 0 ? <p className="muted" style={{ padding: '24px 0' }}>You haven’t made a request yet.</p> :
                reqs.slice(0, 4).map((r) => <div key={r.request_id} className="stack" style={{ gap: 6, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="row spread"><strong>{r.item_name}</strong><StatusBadge status={r.status} /></div>
                  <Progress value={num(r.fulfilled_quantity)} max={num(r.requested_quantity)} label="Fulfilment" />
                  <span className="muted small">{fmtQty(r.fulfilled_quantity)} of {fmtQty(r.requested_quantity)} {r.unit} fulfilled</span></div>)}
            </Card>
          ) : (
            <Card>
              <div className="row" style={{ gap: 8 }}><AlarmClock size={18} color="#b45309" /><h2>Expiring soon</h2></div>
              {loading ? <Skeleton h={90} /> : expiring.length === 0 ? <p className="muted" style={{ padding: '24px 0' }}>No available donations expire in the next 7 days.</p> :
                expiring.map((d) => <div className="link-row" key={d.donation_id}><div><strong>{d.item_name}</strong><div className="muted small">{fmtQty(d.available_quantity)} {d.unit} left</div></div><span className="badge badge-amber">{fmtDate(d.expiry_at)}</span></div>)}
            </Card>
          )}
        </div>
        <div style={{ marginTop: 16 }}><Notice>Live notifications aren’t available yet — the backend has no notifications endpoint. The activity feed above is built from your real records.</Notice></div>
      </>}
    </>
  );
}
