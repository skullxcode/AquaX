# AquaX

**AquaX — Water Infrastructure & Operations Management**  
*Manage. Monitor. Sustain.*

AquaX is a multi-Panchayat web application for maintaining village water-supply records, schemes, infrastructure assets, maintenance work, inventory, consumers, bills, payments, financial entries and operational reports.

## Additional documentation

- [`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md) — architecture, workflows, roles, demo checklist and viva preparation.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Vercel, Render and Neon deployment configuration.

## Technology

- **Frontend:** React 19, Vite, JavaScript, React Router, Tailwind CSS v4, shadcn/ui, Lucide, Recharts, React Leaflet, Axios
- **Backend:** Node.js, Express 5, JavaScript ES modules, Zod validation, JWT authentication, bcrypt password hashing
- **Database:** PostgreSQL with Prisma ORM 7 and the PostgreSQL driver adapter
- **Exports:** CSV and PDF (jsPDF + jsPDF AutoTable)

## Project structure

```text
AquaX/
├── client/
│   └── src/
│       ├── components/       # Shared layout, data and UI components
│       ├── config/           # Resource form and table configurations
│       ├── context/          # Authentication and English/Hindi language state
│       ├── layouts/          # Protected dashboard shell
│       ├── pages/            # Dashboard and business modules
│       ├── routes/           # Public and protected application routes
│       └── services/         # Axios API client
└── server/
    ├── prisma/               # Prisma schema and SQL migrations
    └── src/
        ├── config/           # Database adapter and Prisma Client
        ├── controllers/      # HTTP request handlers
        ├── middleware/       # Authentication and role authorization
        ├── routes/           # API endpoints
        ├── services/         # Tenant-scoped business logic
        └── validators/       # Zod request schemas
```

## Requirements

- Node.js `26.13.0` (see `.nvmrc`)
- npm
- PostgreSQL database; Neon is supported

## Setup

### 1. Backend

```bash
cd server
npm ci
cp .env.example .env
```

Set the values in `server/.env`. For Neon, use the pooled connection string for `DATABASE_URL` (application runtime) and the direct, non-pooled connection string for `DIRECT_URL` (Prisma migrations). For a database without pooling, both can use the same connection string. Set `CLIENT_URL` to the exact browser origin used by the frontend:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL="YOUR_NEON_POOLED_CONNECTION_STRING"
DIRECT_URL="YOUR_NEON_DIRECT_CONNECTION_STRING"
JWT_SECRET="USE_A_LONG_RANDOM_SECRET"
ALLOW_PUBLIC_REGISTRATION=true
COOKIE_SAME_SITE=lax
COOKIE_SECURE=false
```

When the browser frontend and API are hosted on different sites, configure HTTPS and set `COOKIE_SAME_SITE=none` plus `COOKIE_SECURE=true`. Keep `CLIENT_URL` set to the exact frontend origin; the API rejects browser requests carrying a different Origin.

Do not commit or share `.env` or database credentials.

Generate Prisma Client and apply the checked-in migration:

```bash
npm run db:validate
npm run db:generate
npm run db:deploy
```

For local schema changes during development, use:

```bash
npm run db:migrate
```

Start the API:

```bash
npm run dev
```

The API defaults to `http://localhost:5000`. Health endpoints:

- `GET /api/health`
- `GET /api/health/db`

### 2. Frontend

In a second terminal:

```bash
cd client
npm ci
cp .env.example .env
```

Set `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start Vite:

```bash
npm run dev
```

Open `http://localhost:5173`, register a Panchayat administrator, and sign in. A new registration creates a Panchayat and its first administrator.

## Implemented modules

### Authentication and access

- Panchayat administrator registration and login
- bcrypt password hashing
- JWT stored in an HTTP-only cookie
- Current-session restore through `/api/auth/me`
- Logout and protected frontend routes
- API role checks for `SUPER_ADMIN`, `PANCHAYAT_ADMIN` and `OPERATOR`; UI controls are hidden when the signed-in role cannot perform the operation
- Authentication rate limiting and same-origin request checks
- Inactive accounts are denied API access; Panchayat administrators can create, edit, reset passwords for and deactivate/reactivate Panchayat users
- Public self-registration is disabled by default in production unless explicitly enabled

### Operations

- **Villages:** create, list, update and delete; deletion is blocked while schemes or consumers depend on a village
- **Schemes:** create and manage schemes linked to a Panchayat village
- **Assets:** manage pumps, pipelines, valves, tanks and treatment plants; optional latitude/longitude coordinates; map view for geolocated assets
- **Maintenance:** report tasks, update status and cost, record completion date, view reported-by user
- **Inventory:** manage item catalogue, opening balances, reorder levels and unit costs; record purchases, consumption and signed stock adjustments; stock movement history; supplier-linked purchase records; weighted-average unit cost updates on purchases; negative stock is rejected
- **Suppliers:** maintain supplier names and contact information; suppliers used in purchase history cannot be deleted
- **Consumers:** create and manage consumer numbers, village links, connection status and monthly charge

### Finance

- Generate consumer bills for a selected billing period
- Use the consumer's monthly charge as the default bill amount or enter an override
- Record cash, UPI, net banking and card payments
- Reject payments greater than the outstanding bill balance
- Automatically add successful bill payments to the Finance ledger as receipts
- Generate downloadable PDF payment receipts
- Record manual receipts and expenses in the cash book
- Preserve payment and cash-book history; successful payments can be reversed by an administrator with a reason, and the bill balance is recalculated
- Cash-book entries are immutable after posting; manual entries are corrected through linked reversal entries rather than silent edits/deletions
- Prevent deletion of records with dependent payment/maintenance/stock history

### Dashboard and reports

- Dashboard totals are fetched from the authenticated Panchayat's database records
- Asset distribution and six-month successful payment collection charts
- Recent maintenance and recently added consumers
- Date-filtered financial and operations report
- CSV transaction export and PDF summary export
- English/Hindi toggle with translations for primary navigation, common management controls, dashboard/report headings and user-management labels

## API overview

All operational endpoints require the HTTP-only authentication cookie and are scoped to the signed-in user's `panchayatId`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/api/villages` | List / create villages |
| GET/PATCH/DELETE | `/api/villages/:id` | Read / update / delete a village |
| GET/POST | `/api/schemes` | List / create schemes |
| PATCH/DELETE | `/api/schemes/:id` | Update / delete a scheme |
| GET/POST | `/api/assets` | List / create assets |
| PATCH/DELETE | `/api/assets/:id` | Update / delete an asset |
| GET/POST | `/api/maintenance` | List / report maintenance |
| PATCH/DELETE | `/api/maintenance/:id` | Update / delete a maintenance record |
| GET/POST | `/api/inventory` | List / create inventory items |
| PATCH/DELETE | `/api/inventory/:id` | Update / delete an inventory item |
| GET/POST | `/api/inventory/:id/movements` | Read / record stock movement history |
| GET/POST | `/api/suppliers` | List / create suppliers |
| PATCH/DELETE | `/api/suppliers/:id` | Update / delete a supplier |
| GET/POST | `/api/consumers` | List / create consumers |
| PATCH/DELETE | `/api/consumers/:id` | Update / delete a consumer |
| GET/POST | `/api/bills` | List / generate bills |
| DELETE | `/api/bills/:id` | Delete a bill without payment history |
| POST | `/api/bills/:id/payments` | Record a bill payment |
| GET/POST | `/api/finance` | List / create finance entries |
| PATCH/DELETE | `/api/finance/:id` | Legacy endpoints return a conflict; posted cash-book entries are immutable |
| POST | `/api/finance/:id/reverse` | Administrator creates a linked correcting entry |
| GET/POST | `/api/users` | Panchayat administrator lists / creates users |
| PATCH/DELETE | `/api/users/:id` | Update user / deactivate user (DELETE is a soft deactivation) |
| POST | `/api/bills/:id/payments/:paymentId/reverse` | Administrator reverses a recorded successful payment |
| GET | `/api/dashboard/summary` | Live dashboard aggregates |
| GET | `/api/reports/summary` | Date-filtered report summary |
| GET | `/api/reports/transactions` | Date-filtered finance transactions for export |

## Recommended data-entry order for a demo

1. Register a Panchayat administrator.
2. Add one or more villages.
3. Create schemes and link them to villages.
4. Create assets and enter latitude/longitude to place them on the GIS map.
5. Add suppliers and inventory items, then record supplier-linked stock purchases or consumption.
6. Create consumers and assign them to villages.
7. Generate a bill, record a payment, and download its receipt.
8. Add an expense in Finance; test a reason-based reversal as an administrator and review Dashboard/Reports.
9. Add an operator account in User Management, then verify that operator permissions are restricted.

## Important behaviour and data safety

- Related-record operations validate that the selected village, scheme, asset, consumer, bill or inventory item belongs to the authenticated Panchayat.
- Stock movement and payment collection use database transactions at serializable isolation.
- A stock movement cannot reduce inventory below zero.
- A bill cannot be overpaid; each successful collection creates a matching receipt entry in the finance ledger.
- Bills past their due date are marked overdue when the bill register is read.
- Village, scheme, asset, consumer, inventory and bill deletion is restricted when dependent records exist.
- The map uses OpenStreetMap tiles and therefore requires an internet connection to display map tiles.

## Validation commands

Frontend:

```bash
cd client
npm run lint
npm run build
```

Backend:

```bash
cd server
npm run db:validate
npm test
```

The included Node test suite covers request validation rules. It is not a replacement for live PostgreSQL integration and end-to-end browser tests.

## Production checklist

This is a project/demo-ready implementation, not a completed production security audit. Before production deployment:

- Restrict public Panchayat registration to an approved onboarding process.
- Use HTTPS, strong secrets, restrictive CORS and production cookie settings.
- Keep `ALLOW_PUBLIC_REGISTRATION=false` in production and onboard Panchayats through a controlled process.
- Keep `CLIENT_URL` restricted to the exact frontend origin. The API checks browser Origin headers on every request; use `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true` for cross-site HTTPS hosting, and review CSRF protection if deployment topology changes.
- Add automated integration tests and database backups.
- Configure monitoring, error reporting and a reviewed data-retention policy.
- Configure the production PostgreSQL connection and run migrations using the production deployment process.

The ZIP includes `.env.example` templates but does not include real credentials or `node_modules`. Copy each template to `.env`, add your own Neon connection strings and secret, and run `npm ci` in both `client/` and `server/`.
