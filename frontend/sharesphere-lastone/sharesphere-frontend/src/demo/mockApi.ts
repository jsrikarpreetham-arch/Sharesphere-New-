// Demo-only: an in-memory stand-in for the ShareSphere REST API so the UI can be previewed without a backend.
// Enabled only when VITE_DEMO is set at build time. Mirrors the real routes, roles and validation rules.
const day = 864e5;
const ago = (d: number) => new Date(Date.now() - d * day).toISOString();
const ahead = (d: number) => new Date(Date.now() + d * day).toISOString();

export const DEMO_PASSWORD = 'demo1234';
export const DEMO_ACCOUNTS = [
  { email: 'admin@sharesphere.demo', role: 'ADMIN', name: 'Asha Menon', blurb: 'Allocate, track pickups, manage members' },
  { email: 'donor@sharesphere.demo', role: 'DONOR', name: 'Dev Kapoor', blurb: 'List and manage donations' },
  { email: 'recipient@sharesphere.demo', role: 'RECIPIENT', name: 'Rina Shah', blurb: 'Request resources, track fulfilment' },
  { email: 'volunteer@sharesphere.demo', role: 'VOLUNTEER', name: 'Vikram Rao', blurb: 'Pick up and deliver allocations' },
];

const members: any[] = [
  { member_id: 1, full_name: 'Asha Menon', email: 'admin@sharesphere.demo', role: 'ADMIN', phone: '9000000001', area: 'Central', active: 1, created_at: ago(120) },
  { member_id: 2, full_name: 'Dev Kapoor', email: 'donor@sharesphere.demo', role: 'DONOR', phone: '9000000002', area: 'Indiranagar', active: 1, created_at: ago(90) },
  { member_id: 3, full_name: 'Rina Shah', email: 'recipient@sharesphere.demo', role: 'RECIPIENT', phone: '9000000003', area: 'Koramangala', active: 1, created_at: ago(70) },
  { member_id: 4, full_name: 'Vikram Rao', email: 'volunteer@sharesphere.demo', role: 'VOLUNTEER', phone: '9000000004', area: 'HSR Layout', active: 1, created_at: ago(60) },
  { member_id: 5, full_name: 'Meera Iyer', email: 'meera@sharesphere.demo', role: 'DONOR', phone: '9000000005', area: 'Jayanagar', active: 1, created_at: ago(30) },
];
const CATS: Record<number, string> = { 1: 'Food & Groceries', 2: 'Clothing', 3: 'Medical Supplies', 4: 'Books & Stationery' };
const D = (id: number, donor: number, cat: number, item: string, q: number, av: number, unit: string, age: number, exp: number | null, status: string) => ({
  donation_id: id, donor_id: donor, donor_name: members.find((m) => m.member_id === donor).full_name, category_id: cat, category_name: CATS[cat],
  item_name: item, quantity: q, available_quantity: av, unit, created_at: ago(age), expiry_at: exp === null ? null : ahead(exp), status,
});
const donations: any[] = [
  D(1, 2, 1, 'Basmati Rice', 50, 30, 'kg', 2, 4, 'PARTIAL'), D(2, 2, 2, 'Winter Jackets', 20, 15, 'pcs', 6, null, 'PARTIAL'),
  D(3, 5, 3, 'First-aid Kits', 12, 10, 'boxes', 12, 200, 'PARTIAL'), D(4, 5, 1, 'Lentils (toor dal)', 40, 40, 'kg', 1, 45, 'AVAILABLE'),
  D(5, 2, 4, 'School notebooks', 200, 200, 'pcs', 20, null, 'AVAILABLE'), D(6, 5, 2, 'Wool blankets', 30, 30, 'pcs', 33, null, 'AVAILABLE'),
  D(7, 2, 1, 'Canned chickpeas', 100, 100, 'cans', 45, 90, 'AVAILABLE'), D(8, 5, 3, 'Paracetamol strips', 60, 60, 'strips', 52, 20, 'AVAILABLE'),
  D(9, 2, 1, 'Fresh bread loaves', 25, 25, 'loaves', 0, 2, 'AVAILABLE'), D(10, 5, 4, 'Story books', 80, 0, 'pcs', 70, null, 'CANCELLED'),
];
const requests: any[] = [
  { request_id: 1, requester_id: 3, category_id: 1, item_name: 'Rice for community kitchen', requested_quantity: 40, fulfilled_quantity: 20, unit: 'kg', priority: 4, created_at: ago(4), status: 'PARTIAL' },
  { request_id: 2, requester_id: 3, category_id: 2, item_name: 'Warm jackets for shelter', requested_quantity: 10, fulfilled_quantity: 0, unit: 'pcs', priority: 3, created_at: ago(2), status: 'OPEN' },
  { request_id: 3, requester_id: 3, category_id: 3, item_name: 'First-aid kits for clinic', requested_quantity: 2, fulfilled_quantity: 2, unit: 'boxes', priority: 5, created_at: ago(11), status: 'FULFILLED' },
];
const A = (id: number, don: number, req: number, q: number, age: number, status: string, pu: number | null, de: number | null, outcome: string, notes: string | null) => ({
  allocation_id: id, donation_id: don, request_id: req, volunteer_id: 4, allocated_quantity: q, allocated_at: ago(age), allocation_status: status,
  donated_item: donations.find((d) => d.donation_id === don).item_name, requested_item: requests.find((r) => r.request_id === req).item_name,
  volunteer_name: 'Vikram Rao', pickup_id: id, picked_up_at: pu === null ? null : ago(pu), delivered_at: de === null ? null : ago(de), pickup_outcome: outcome, notes,
});
const allocs: any[] = [
  A(1, 1, 1, 20, 3, 'RESERVED', null, null, 'PENDING', null), A(2, 2, 2, 5, 5, 'PICKED_UP', 4, null, 'PENDING', null),
  A(3, 3, 3, 2, 10, 'DELIVERED', 9, 8, 'DELIVERED', 'Handed to clinic reception'),
];

type Res = { status: number; body: any };
const ok = (body: any = {}, status = 200): Res => ({ status, body: { success: true, ...body } });
const fail = (status: number, message: string): Res => ({ status, body: { success: false, message } });
const tokenOf = (m: any) => `demo-${m.member_id}`;

function handle(method: string, path: string, b: any, auth: string | null): Res {
  if (path === '/auth/login') {
    const m = members.find((x) => x.email.toLowerCase() === String(b.email || '').toLowerCase());
    if (!m || !m.active || b.password !== (m.password || DEMO_PASSWORD)) return fail(401, 'Invalid email or password');
    return ok({ message: 'Login successful', token: tokenOf(m), member: { member_id: m.member_id, full_name: m.full_name, email: m.email, role: m.role } });
  }
  if (path === '/auth/register') {
    if (!b.full_name || !b.email || !b.password || !b.role || !b.phone) return fail(400, 'Please provide all required fields');
    if (b.password.length < 8) return fail(400, 'Password must contain at least 8 characters');
    if (!['DONOR', 'RECIPIENT', 'VOLUNTEER'].includes(b.role)) return fail(400, 'Invalid registration role');
    if (members.some((m) => m.email === b.email || m.phone === b.phone)) return fail(409, 'Email or phone number already registered');
    const id = members.length + 1;
    members.push({ member_id: id, full_name: b.full_name, email: b.email, role: b.role, phone: b.phone, area: b.area || null, active: 1, created_at: new Date().toISOString(), password: b.password });
    return ok({ message: 'Member registered successfully', member_id: id }, 201);
  }
  const me = members.find((m) => auth === `Bearer ${tokenOf(m)}`);
  if (!me) return fail(401, 'Access denied. Token required.');
  const only = (...r: string[]) => (r.includes(me.role) ? null : fail(403, 'Forbidden. You do not have permission.'));
  const id = (re: RegExp) => Number(path.match(re)?.[1]);
  let g: Res | null;

  if (path === '/members/me') {
    if (method === 'GET') return ok({ member: me });
    if (!b.full_name || !b.email || !b.phone) return fail(400, 'Name, email and phone are required');
    if (members.some((m) => m !== me && (m.email === b.email || m.phone === b.phone))) return fail(409, 'Email or phone already in use');
    Object.assign(me, { full_name: b.full_name, email: b.email, phone: b.phone, area: b.area || null });
    return ok({ message: 'Profile updated successfully' });
  }
  if (path === '/members' && method === 'GET') return (g = only('ADMIN')) || ok({ count: members.length, members: [...members].reverse() });
  if (/^\/members\/\d+\/status$/.test(path)) {
    if ((g = only('ADMIN'))) return g;
    const m = members.find((x) => x.member_id === id(/^\/members\/(\d+)/)); if (!m) return fail(404, 'Member not found');
    m.active = Number(b.active); return ok({ message: 'Member status updated successfully' });
  }

  if (path === '/donations' && method === 'GET') return ok({ count: donations.length, donations: [...donations].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)) });
  if (path === '/donations' && method === 'POST') {
    if ((g = only('DONOR'))) return g;
    if (!b.category_id || !b.item_name || b.quantity === undefined || !b.unit) return fail(400, 'Category, item name, quantity and unit are required');
    if (Number(b.quantity) <= 0) return fail(400, 'Quantity must be greater than zero');
    if (!CATS[b.category_id]) return fail(400, 'Category does not exist');
    const nid = Math.max(...donations.map((d) => d.donation_id)) + 1;
    donations.push({ donation_id: nid, donor_id: me.member_id, donor_name: me.full_name, category_id: b.category_id, category_name: CATS[b.category_id], item_name: b.item_name.trim(), quantity: b.quantity, available_quantity: b.quantity, unit: b.unit.trim(), created_at: new Date().toISOString(), expiry_at: b.expiry_at ? new Date(b.expiry_at).toISOString() : null, status: 'AVAILABLE' });
    return ok({ message: 'Donation created successfully', donation_id: nid }, 201);
  }
  if (/^\/donations\/\d+$/.test(path) && method === 'PUT') {
    if ((g = only('DONOR'))) return g;
    const d = donations.find((x) => x.donation_id === id(/(\d+)$/)); if (!d) return fail(404, 'Donation not found');
    if (d.donor_id !== me.member_id) return fail(403, 'You can only update your own donations');
    if (!['AVAILABLE', 'PARTIAL'].includes(d.status) || Number(d.available_quantity) !== Number(d.quantity)) return fail(400, 'This donation cannot be updated after allocation or closure');
    Object.assign(d, { item_name: b.item_name.trim(), quantity: b.quantity, available_quantity: b.quantity, unit: b.unit.trim(), expiry_at: b.expiry_at ? new Date(b.expiry_at).toISOString() : null });
    return ok({ message: 'Donation updated successfully' });
  }
  if (/^\/donations\/\d+\/cancel$/.test(path)) {
    if ((g = only('DONOR'))) return g;
    const d = donations.find((x) => x.donation_id === id(/^\/donations\/(\d+)/)); if (!d) return fail(404, 'Donation not found');
    if (d.donor_id !== me.member_id) return fail(403, 'You can only cancel your own donations');
    if (d.status !== 'AVAILABLE') return fail(400, 'Only available donations can be cancelled');
    d.status = 'CANCELLED'; return ok({ message: 'Donation cancelled successfully' });
  }

  if (path === '/requests/my-requests') return (g = only('RECIPIENT')) || ok({ requests: requests.filter((r) => r.requester_id === me.member_id).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)) });
  if (path === '/requests' && method === 'POST') {
    if ((g = only('RECIPIENT'))) return g;
    if (!CATS[b.category_id]) return fail(400, 'Category does not exist');
    requests.push({ request_id: requests.length + 1, requester_id: me.member_id, category_id: b.category_id, item_name: b.item_name.trim(), requested_quantity: b.requested_quantity, fulfilled_quantity: 0, unit: b.unit.trim(), priority: b.priority ?? 3, created_at: new Date().toISOString(), status: 'OPEN' });
    return ok({ message: 'Resource request created successfully', request_id: requests.length }, 201);
  }
  if (/^\/requests\/\d+$/.test(path) && method === 'PUT') {
    if ((g = only('RECIPIENT'))) return g;
    const r = requests.find((x) => x.request_id === id(/(\d+)$/) && x.requester_id === me.member_id); if (!r) return fail(404, 'Resource request not found');
    if (['CANCELLED', 'FULFILLED'].includes(r.status)) return fail(400, 'Cancelled or fulfilled requests cannot be updated');
    if (Number(b.requested_quantity) < Number(r.fulfilled_quantity)) return fail(400, 'Requested quantity cannot be less than fulfilled quantity');
    Object.assign(r, { category_id: b.category_id, item_name: b.item_name.trim(), requested_quantity: b.requested_quantity, unit: b.unit.trim(), priority: b.priority });
    return ok({ message: 'Resource request updated successfully' });
  }
  if (/^\/requests\/\d+\/cancel$/.test(path)) {
    if ((g = only('RECIPIENT'))) return g;
    const r = requests.find((x) => x.request_id === id(/^\/requests\/(\d+)/) && x.requester_id === me.member_id); if (!r) return fail(404, 'Resource request not found');
    if (r.status === 'CANCELLED') return fail(400, 'Resource request is already cancelled');
    if (r.status === 'FULFILLED') return fail(400, 'Fulfilled requests cannot be cancelled');
    r.status = 'CANCELLED'; return ok({ message: 'Resource request cancelled successfully' });
  }

  if (path === '/allocations' && method === 'GET') return (g = only('ADMIN')) || ok({ count: allocs.length, allocations: [...allocs].reverse() });
  if (path === '/allocations' && method === 'POST') {
    if ((g = only('ADMIN'))) return g;
    const d = donations.find((x) => x.donation_id === Number(b.donation_id)); const r = requests.find((x) => x.request_id === Number(b.request_id));
    const v = members.find((x) => x.member_id === Number(b.volunteer_id) && x.role === 'VOLUNTEER');
    if (!d) return fail(400, 'Donation not found'); if (!r) return fail(400, 'Request not found'); if (!v) return fail(400, 'Volunteer not found');
    if (['CANCELLED', 'FULFILLED'].includes(r.status)) return fail(400, 'Request is not open for allocation');
    const q = Number(b.allocated_quantity);
    if (q > Number(d.available_quantity)) return fail(400, 'Allocated quantity exceeds available donation quantity');
    const open = Number(r.requested_quantity) - Number(r.fulfilled_quantity);
    if (q > open) return fail(400, `Allocated quantity exceeds the request’s remaining need (${open})`);
    d.available_quantity = Number(d.available_quantity) - q; d.status = d.available_quantity === 0 ? 'ALLOCATED' : 'PARTIAL';
    const nid = allocs.length + 1;
    allocs.push({ allocation_id: nid, donation_id: d.donation_id, request_id: r.request_id, volunteer_id: v.member_id, allocated_quantity: q, allocated_at: new Date().toISOString(), allocation_status: 'RESERVED', donated_item: d.item_name, requested_item: r.item_name, volunteer_name: v.full_name, pickup_id: nid, picked_up_at: null, delivered_at: null, pickup_outcome: 'PENDING', notes: null });
    return ok({ message: 'Resource allocated successfully', allocation: { allocation_id: nid, allocated_quantity: q, status: 'RESERVED' } }, 201);
  }
  if (path === '/pickups' && method === 'GET') {
    if ((g = only('ADMIN'))) return g;
    return ok({ count: allocs.length, records: [...allocs].reverse().map((a) => ({ ...a, outcome: a.pickup_outcome })) });
  }
  if (path === '/pickups/my-assignments') return (g = only('VOLUNTEER')) || ok({ assignments: allocs.filter((a) => a.volunteer_id === me.member_id).reverse() });
  const pm = path.match(/^\/pickups\/(\d+)\/(pickup|deliver|failure)$/);
  if (pm) {
    if ((g = only('VOLUNTEER'))) return g;
    const a = allocs.find((x) => x.allocation_id === Number(pm[1])); if (!a) return fail(404, 'Allocation not found');
    if (a.volunteer_id !== me.member_id) return fail(403, 'You are not assigned to this allocation');
    if (pm[2] === 'pickup') {
      if (a.allocation_status !== 'RESERVED') return fail(400, `Cannot pick up an allocation with status ${a.allocation_status}`);
      a.allocation_status = 'PICKED_UP'; a.picked_up_at = new Date().toISOString(); return ok({ message: 'Resources marked as picked up successfully' });
    }
    if (a.allocation_status !== 'PICKED_UP') return fail(400, pm[2] === 'deliver' ? 'Resources must be picked up before delivery' : 'Only picked-up allocations can be reported as failed');
    if (pm[2] === 'deliver') {
      a.allocation_status = 'DELIVERED'; a.delivered_at = new Date().toISOString(); a.pickup_outcome = 'DELIVERED'; a.notes = b.notes || a.notes;
      const r = requests.find((x) => x.request_id === a.request_id); r.fulfilled_quantity = Number(r.fulfilled_quantity) + Number(a.allocated_quantity);
      r.status = r.fulfilled_quantity >= r.requested_quantity ? 'FULFILLED' : 'PARTIAL';
      return ok({ message: 'Resources delivered successfully' });
    }
    if (!b.notes || !String(b.notes).trim()) return fail(400, 'Please provide a failure reason (maximum 255 characters)');
    a.allocation_status = 'FAILED'; a.pickup_outcome = 'FAILED'; a.notes = String(b.notes).trim(); return ok({ message: 'Delivery failure reported successfully' });
  }
  return fail(404, 'Not found');
}

export function installMockApi() {
  const real = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const i = url.indexOf('/api/');
    if (i === -1) return real(input, init);
    await new Promise((r) => setTimeout(r, 220));   // feel like a network round trip
    const headers = new Headers(init?.headers);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const res = handle((init?.method || 'GET').toUpperCase(), url.slice(i + 4).split('?')[0], body, headers.get('Authorization'));
    return new Response(JSON.stringify(res.body), { status: res.status, headers: { 'Content-Type': 'application/json' } });
  };
}
