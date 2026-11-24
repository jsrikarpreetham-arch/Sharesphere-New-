# Backend gaps found while building the UI

The frontend only calls routes that exist in `backend/src/routes/*.js`. These features from the brief need backend work; the UI degrades honestly instead of faking them.

| Feature | What's missing | How the UI copes today | Suggested endpoint |
|---|---|---|---|
| Category list / descriptions | No `Category` routes | Categories are derived from the joined `category_name` on `GET /donations`; create/edit forms use that list (falls back to a numeric ID input when no donations exist); descriptions not shown | `GET /api/categories` → `{ categories: [{category_id, category_name, description}] }` |
| Forgot password | No reset route | `/forgot-password` explains it's unavailable | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Notifications | None | Dashboard "Recent activity" is built from real donations / requests / allocations | `GET /api/notifications` |
| Dashboard stats | None | Computed client-side from list endpoints (fine for small data) | `GET /api/dashboard/summary` |
| Admin view of all requests | `GET /requests/*` is RECIPIENT-only | Admin enters a request ID when allocating; allocation list shows `requested_item` | `GET /api/requests` (ADMIN) |
| Donor / recipient view of allocations | `GET /allocations` is ADMIN-only | Donors and recipients see donation/request status & quantities only | `GET /api/allocations/mine` |
| Member status in login payload | `phone`, `area` not returned by login | UI calls `GET /members/me` right after login | — |
| Enum values | `donation.status` beyond AVAILABLE/PARTIAL/CANCELLED unknown | Unknown statuses render as neutral badges and still appear in filters | — |
| Request priority meaning | 1–5 but not documented which is urgent | Shown as "n/5" without labels | — |

## Run it
```bash
cd backend && npm i && npm run dev        # API on :5000 (needs .env with DB_* and JWT_SECRET)
cd ../frontend && npm i && npm run dev     # UI on :5173, /api proxied to :5000
```
