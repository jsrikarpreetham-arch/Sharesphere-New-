# ShareSphere frontend

React + TypeScript + Vite.

## Run with your real backend
    npm install
    npm run dev          # http://localhost:5173, /api proxied to http://localhost:5000
Log in with an account from your Member table, or register a new one (Donor / Recipient / Volunteer).
Admins must be created directly in the database.

## Run the demo (no backend needed)
    npm install
    npm run dev:demo
Uses an in-memory mock API. Password for every demo account: `demo1234`

| Role | Email |
|---|---|
| Admin | admin@sharesphere.demo |
| Donor | donor@sharesphere.demo |
| Recipient | recipient@sharesphere.demo |
| Volunteer | volunteer@sharesphere.demo |

The login page shows these as one-click buttons in demo mode only. Normal builds never include them.

See API_GAPS.md for backend endpoints the UI needs but your API doesn't have yet.
