import type { Allocation, Category,Donation, Member, PickupRecord, ResourceRequest, Role } from './types';

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
const TOKEN_KEY = 'sharesphere.token';
const USER_KEY = 'sharesphere.member';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage blocked */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch { /* noop */ } },
  getUser: (): Member | null => { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } },
  setUser: (m: Member) => { try { localStorage.setItem(USER_KEY, JSON.stringify(m)); } catch { /* noop */ } },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

async function request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('Cannot reach the ShareSphere server. Check that the backend is running.', 0);
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok || data?.success === false) {
    if (res.status === 401 && auth && token) onUnauthorized?.();
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

const get = <T,>(p: string) => request<T>('GET', p);
const post = <T,>(p: string, b?: unknown, auth = true) => request<T>('POST', p, b ?? {}, auth);
const put = <T,>(p: string, b: unknown) => request<T>('PUT', p, b);
const patch = <T,>(p: string, b?: unknown) => request<T>('PATCH', p, b ?? {});

export interface RegisterInput { full_name: string; email: string; password: string; role: Exclude<Role, 'ADMIN'>; phone: string; area?: string }
export interface DonationInput { category_id: number; item_name: string; quantity: number; unit: string; expiry_at?: string | null }
export interface RequestInput { category_id: number; item_name: string; requested_quantity: number; unit: string; priority: number }
export interface AllocationInput { donation_id: number; request_id: number; volunteer_id: number; allocated_quantity: number }

// Every function here maps 1:1 to a route verified in backend/src/routes/*.js.
export const api = {
  login: (email: string, password: string) =>
    post<{ token: string; member: Member }>('/auth/login', { email, password }, false),
  register: (b: RegisterInput) => post<{ member_id: number }>('/auth/register', b, false),
  forgotPassword: (email: string) =>
  post<{ success: boolean; message: string }>(
    '/auth/forgot-password',
    { email },
    false
  ),

resetPassword: (email: string, otp: string, new_password: string) =>
  post<{ success: boolean; message: string }>(
    '/auth/reset-password',
    { email, otp, new_password },
    false
  ),

categories: () =>
  get<{ categories: Category[] }>('/categories').then((r) => r.categories),

  me: () => get<{ member: Member }>('/members/me').then((r) => r.member),
  updateMe: (b: { full_name: string; email: string; phone: string; area?: string | null }) => put('/members/me', b),
  members: () => get<{ members: Member[] }>('/members').then((r) => r.members),                 // ADMIN
  setMemberActive: (id: number, active: boolean) => patch(`/members/${id}/status`, { active }),  // ADMIN

  donations: () => get<{ donations: Donation[] }>('/donations').then((r) => r.donations),
  createDonation: (b: DonationInput) => post<{ donation_id: number }>('/donations', b),          // DONOR
  updateDonation: (id: number, b: Omit<DonationInput, 'category_id'>) => put(`/donations/${id}`, b), // DONOR
  cancelDonation: (id: number) => patch(`/donations/${id}/cancel`),                                // DONOR

  myRequests: () => get<{ requests: ResourceRequest[] }>('/requests/my-requests').then((r) => r.requests), // RECIPIENT
  createRequest: (b: RequestInput) => post<{ request_id: number }>('/requests', b),                         // RECIPIENT
  updateRequest: (id: number, b: RequestInput) => put(`/requests/${id}`, b),                                // RECIPIENT
  cancelRequest: (id: number) => patch(`/requests/${id}/cancel`),                                           // RECIPIENT

  allocations: () => get<{ allocations: Allocation[] }>('/allocations').then((r) => r.allocations),        // ADMIN
  createAllocation: (b: AllocationInput) => post('/allocations', b),                                        // ADMIN

  pickupRecords: () => get<{ records: PickupRecord[] }>('/pickups').then((r) => r.records),                // ADMIN
  myAssignments: () => get<{ assignments: Allocation[] }>('/pickups/my-assignments').then((r) => r.assignments), // VOLUNTEER
  markPickedUp: (allocationId: number) => patch(`/pickups/${allocationId}/pickup`),                          // VOLUNTEER
  markDelivered: (allocationId: number, notes?: string) => patch(`/pickups/${allocationId}/deliver`, notes ? { notes } : {}), // VOLUNTEER
  reportFailure: (allocationId: number, notes: string) => patch(`/pickups/${allocationId}/failure`, { notes }),            // VOLUNTEER
};
