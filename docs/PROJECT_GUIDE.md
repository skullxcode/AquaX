# AquaX — Project and Viva Guide

## 1. Problem and objective

AquaX is a web-based water infrastructure and operations management platform for Gram Panchayats. It centralises village and scheme records, physical assets, maintenance, stores and procurement, household consumers, billing, collections, finance and operational reporting.

## 2. Architecture

- **React + Vite:** responsive browser-based UI.
- **React Router:** client-side navigation, nested layouts and protected routes.
- **Tailwind CSS + shadcn/ui:** consistent component styling and accessible UI primitives.
- **Axios:** API calls with browser credentials enabled for the HTTP-only auth cookie.
- **Express:** REST API, middleware and route/controller/service separation.
- **Zod:** request payload validation at the API boundary.
- **JWT + HTTP-only cookie:** authenticated session token; JavaScript cannot read the cookie.
- **bcrypt:** one-way password hashing.
- **Prisma + PostgreSQL:** typed data access and relational persistence.
- **Neon:** hosted PostgreSQL deployment option.

## 3. Main data relationships

- A Panchayat owns users, villages, schemes, consumers, suppliers, inventory items and financial entries.
- A village belongs to one Panchayat and can have multiple schemes and consumers.
- A scheme belongs to a village and a Panchayat; it can contain multiple assets.
- An asset can have multiple maintenance records.
- An inventory item has a chronological stock-movement history. Purchase movements can reference a supplier and the user who recorded them.
- A consumer belongs to a village and Panchayat and can have multiple bills.
- A bill can have multiple payment records.
- Successful bill payments create linked finance receipts. Reversals create a corresponding opposite ledger entry and point back to the original entry.

## 4. Key workflows

### Authentication and access

1. User submits email and password.
2. API validates input and compares the password with its bcrypt hash.
3. API creates a signed JWT in an HTTP-only cookie.
4. `AuthContext` restores the signed-in user by requesting `/api/auth/me` on load.
5. `protect` verifies the token and checks that the user is active.
6. `authorize` enforces role permissions.

### Panchayat data isolation

The API takes `panchayatId` from the authenticated user. It does not trust a Panchayat ID submitted by the browser for operational records. Related IDs (village, scheme, asset, consumer, supplier and bill) are checked to ensure they belong to the same Panchayat before writes are committed.

### Inventory procurement

1. Register a supplier.
2. Register an item and optional opening quantity. Opening quantity is recorded as an adjustment movement, not silently added to stock.
3. Record purchases with a supplier, quantity, optional unit cost and invoice/challan reference.
4. Record consumption or positive/negative adjustments.
5. All movement creation and item quantity updates occur in a database transaction. Stock cannot become negative.

### Billing and payments

1. Generate a bill for a consumer and billing period.
2. Record one or more partial payments.
3. API checks that a payment does not exceed the outstanding amount.
4. A successful payment creates a finance receipt in the same transaction.
5. Administrators can reverse a successful payment with a reason. The payment is marked reversed, a linked finance reversal is created, and the bill balance/status is recalculated.

### Cash-book correction

Posted finance entries are immutable. Administrators reverse an incorrect manual entry by creating an opposite-type ledger entry linked to the original. Bill-payment receipts are reversed through the billing endpoint so the payment and bill remain consistent.

## 5. Role matrix

| Capability | Panchayat Administrator | Operator |
|---|---:|---:|
| View Panchayat operational records | Yes | Yes |
| Manage villages, schemes, assets and consumers | Yes | View only for admin-managed CRUD modules |
| Record maintenance and stock movements | Yes | Yes |
| Manage suppliers and inventory catalogue | Yes | View only |
| Generate bills | Yes | View only |
| Record payments | Yes | Yes |
| Record manual finance entry | Yes | Yes |
| Edit finance entries after posting | No | No |
| Reverse finance entries or payments | Yes | No |
| Manage Panchayat users | Yes | No |

## 6. Local setup

See the repository `README.md`. The important steps are:

1. Copy `server/.env.example` to `server/.env` and set Neon pooled/direct URLs plus a strong JWT secret.
2. Run `npm ci` in `server/`.
3. Run `npm run db:validate`, `npm run db:generate` and `npm run db:deploy`.
4. Start the server with `npm run dev`.
5. Copy `client/.env.example` to `client/.env`.
6. Run `npm ci` and `npm run dev` in `client/`.

For local development, public registration is allowed because `NODE_ENV=development`. In production, set `ALLOW_PUBLIC_REGISTRATION=false` unless an approved onboarding workflow is available.

## 7. Suggested viva questions

**Why Prisma?** It maps relational database models to application objects and provides a consistent query API while PostgreSQL enforces relations and constraints.

**Why Zod?** It validates incoming data at the API boundary so invalid data is rejected before business logic runs.

**What is multi-tenancy?** Multiple Panchayats share one application and database, while each operational query is filtered by the signed-in user's Panchayat ID.

**Why use database transactions for stock and payments?** A stock movement and its quantity update must either both succeed or both fail. Likewise, a payment, bill status update and financial receipt must remain consistent.

**Why are finance entries immutable?** Silent changes destroy the audit trail. A reversal preserves the original record and records the correcting financial effect separately.

**What is the difference between authentication and authorization?** Authentication verifies identity; authorization checks whether that identity is permitted to perform an operation.

## 8. Demo checklist

- Register a test Panchayat in development.
- Add a village, scheme and geolocated asset.
- Open the asset map and view its marker.
- Report maintenance and move it to completed.
- Add a supplier and inventory item with opening quantity.
- Record supplier-linked purchase, consumption and an adjustment; inspect movement history.
- Add a consumer, generate a bill, record a partial payment, download a receipt and record the balance payment.
- Reverse a test payment as the administrator and confirm the bill balance and cash book update.
- Add a manual finance entry, reverse it and inspect the linked reversal.
- Create an operator, log in as the operator and confirm admin-only controls are unavailable.
- Test the English/Hindi toggle and export a report as CSV and PDF.

## 9. Known boundaries

- Payment methods are recorded manually; no bank, UPI or payment-gateway integration is connected.
- GIS uses latitude/longitude markers and OpenStreetMap tiles. It is not a full network-routing or pipeline hydraulic model.
- SMS/email notifications, offline sync and hardware/IoT telemetry are not included.
- Production deployment still requires live database testing, automated integration tests, backups, monitoring, HTTPS and a security review.
