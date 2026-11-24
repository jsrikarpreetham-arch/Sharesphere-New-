// Types mirror the columns returned by the existing Express/MySQL backend.
// Enum-like fields are typed as string because the backend does not publish
// a complete list; known values (seen in controller code) are in `known`.
export type Role = 'ADMIN' | 'DONOR' | 'RECIPIENT' | 'VOLUNTEER';

export interface Member {
  member_id: number;
  full_name: string;
  email: string;
  role: Role;
  phone?: string;
  area?: string | null;
  active?: boolean | number;
  created_at?: string;
}

export interface Donation {
  donation_id: number;
  donor_id: number;
  donor_name: string;
  category_id: number;
  category_name: string;
  item_name: string;
  quantity: number | string;
  available_quantity: number | string;
  unit: string;
  created_at: string;
  expiry_at: string | null;
  status: string;
}

export interface ResourceRequest {
  request_id: number;
  requester_id: number;
  category_id: number;
  item_name: string;
  requested_quantity: number | string;
  fulfilled_quantity: number | string;
  unit: string;
  priority: number;
  created_at: string;
  status: string;
}

export interface Allocation {
  allocation_id: number;
  donation_id: number;
  request_id: number;
  volunteer_id: number;
  allocated_quantity: number | string;
  allocated_at: string;
  allocation_status: string;
  donated_item: string | null;
  requested_item: string | null;
  volunteer_name?: string | null;
  pickup_id: number | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  pickup_outcome: string | null;
  notes: string | null;
}

export interface PickupRecord {
  pickup_id: number;
  allocation_id: number;
  picked_up_at: string | null;
  delivered_at: string | null;
  outcome: string;
  notes: string | null;
  donation_id: number;
  request_id: number;
  volunteer_id: number;
  allocated_quantity: number | string;
  allocation_status: string;
  donated_item: string | null;
  requested_item: string | null;
  volunteer_name: string | null;
}

export interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
}
