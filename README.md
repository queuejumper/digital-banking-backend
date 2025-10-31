## Digital Bank Backend

Multi-currency digital banking API with KYC, role-based access (account holder, admin), deposits/withdrawals, currency conversion, reconciliation, idempotency, and auditing. Built with TypeScript, Express, Prisma, and Postgres. Frontend(s) consume these REST endpoints.

### Quick start (Docker)
1) Start services (API + Postgres dev + Postgres test):
   - `docker compose up --build`
2) API will run at `http://localhost:3001/api/v1`.
3) Seeded users (created automatically on start):
   - Admin: `admin@test.com` / `AdminPass123!`
   - Holder: `demo@test.com` / `DemoPass123!`

### Run tests locally
- Ensure test DB is up (via compose): `docker compose up -d db_test`
- Run from host against the test DB:
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/digital_bank_test?schema=public npm run test:integration`

### Tech stack
- TypeScript, Node.js (Express)
- Prisma ORM, PostgreSQL
- Jest + Supertest (integration tests)
- Docker + docker-compose

### Auth and roles
- JWT-based: access/refresh tokens; `/auth/refresh` rotates refresh tokens.
- Roles: `ACCOUNT_HOLDER`, `ADMIN` (admin-only for KYC approvals, reconcile, audits, and managed lists).

### KYC
- Holder submits KYC; admin sets status (PENDING | VERIFIED | REJECTED).
- Holder must be VERIFIED to open accounts, deposit, withdraw, or convert.

### API endpoints (summary)
- Auth
  - `POST /auth/signup` → `{ user, tokens }`
  - `POST /auth/login` → `{ user, tokens }`
  - `POST /auth/refresh` → `{ accessToken, refreshToken }`
  - `POST /auth/logout` → `{ success: true }`
  - `GET /auth/me` → `{ user }`
- KYC
  - `POST /kyc/submit` (holder) → `{ user }`
  - `GET /kyc/status` (holder) → `{ user }`
  - `PATCH /kyc/admin/:userId/status` (admin) → `{ user }`
- Accounts (holder: own; admin: must pass `?userId=`)
  - `POST /accounts` `{ currency }` → `{ account }`
  - `GET /accounts` `[?userId=]` → `{ accounts }` (admin requires userId)
  - `GET /accounts/:accountId` → `{ account }`
  - `DELETE /accounts/:accountId` → `{ account }` (balance must be zero)
  - `PATCH /accounts/:accountId` (admin) `{ status }` → `{ account }`
- Transactions
  - `POST /accounts/:id/deposits` (Idempotency-Key) `{ amount_minor: "<digits>" }` → `{ transaction, balanceMinor }`
  - `POST /accounts/:id/withdrawals` (Idempotency-Key) `{ amount_minor: "<digits>" }` → `{ transaction, balanceMinor }`
  - `GET /accounts/:id/transactions?page=&pageSize=` → `{ items, total, page, pageSize }`
  - `POST /accounts/:id/convert` (Idempotency-Key) `{ to_currency, amount_minor: "<digits>" }` → `{ transaction, balanceMinor }`
- Admin
  - `GET /admin/users?page=&pageSize=&search=` → holders list
  - `GET /admin/users/:userId` → holder detail (+ accounts)
  - `POST /admin/reconcile/run` → `{ mismatches, checked }`
  - `GET /admin/reconcile/status` → `{ mismatches, checked }`
  - `GET /admin/audit?actorId=&action=&from=&to=&page=&pageSize=` → audit logs

### Handled guarantees and safeguards
- Idempotency on balance-changing POSTs
  - Client sends `Idempotency-Key`; server scopes by account and stores a request hash.
  - Duplicate key with same request → original response; with different request → 409.
- KYC enforcement (financial compliance)
  - Holder must be VERIFIED for account open, deposit, withdraw, convert.
- Ownership and RBAC
  - Holders can access their own data only; admin-only routes guarded.
- Amounts and currencies
  - Amounts in minor units (strings) to avoid float errors; currency allow-list.
- Serialization and error model
  - BigInt → string; Date → ISO; errors follow `{ error: { code, message, [debug] } }`.
- Rate limiting and CORS
  - Global + stricter auth rate limits; CORS restricted by origin in production.
- Auditing and reconciliation
  - Audit entries for KYC, account changes, and transactions; admin can list audits.
  - Reconciliation computes balances from transactions and flags mismatches.

### Notes on FX conversion
- Backend requires a stored FX rate for the pair; rejects if missing.
- Frontend may fetch indicative rates from a third-party provider and confirm with user; backend records the rate it uses.

### Environment (key vars)
- `DATABASE_URL`: Postgres connection
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: JWT secrets
- `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`: lifetimes (e.g., `15m`, `7d`)
- `FRONTEND_ORIGIN`: allowed origin in prod

## Digital Bank Backend (TypeScript, Node.js, Express, Postgres/MySQL, Docker)

This repository contains the backend for a simple digital bank supporting multi-currency accounts, deposits, withdrawals, reconciliation, currency conversion, and KYC. It exposes a REST API used by two front-ends: account holder dashboard (blue theme) and admin dashboard (green theme).

### Key Features
- Multi-tenant user accounts with KYC and role-based access (account holder, bank staff)
- CRUD bank accounts with multiple currencies per user
- Deposits and withdrawals with strong validation and idempotency
- Transaction history per account and per user
- Currency conversion/exchange with pluggable FX providers and historical rates
- Reconciliation jobs to ensure ledger and balances consistency
- Secure authentication (JWT) and fine-grained authorization (RBAC)
- Auditing, idempotency keys, pagination, filtering, and safe error handling

### Tech Stack
- Language: TypeScript (Node.js)
- Framework: Express
- Database: Postgres (default) or MySQL (switch via env)
- ORM/Query: Prisma or Knex (TBD at implementation confirmation)
- AuthN/AuthZ: JWT (access/refresh), RBAC middleware
- Containerization: Docker + docker-compose
- Background jobs/scheduling: node-cron or BullMQ (TBD)
- Testing: Jest + Supertest (TBD)

Note: Exact library selections marked "TBD" will be finalized before coding starts.

---

## Architecture Overview

- API Layer (Express): request validation (celebrate/zod), authentication, authorization, controllers
- Service Layer: business logic (accounts, transactions, FX, KYC, reconciliation)
- Data Layer: repository/ORM models, migrations, database access
- Jobs/Scheduler: reconciliation, FX rates sync, KYC status checks
- Integrations: FX rate provider (e.g., ECB/openexchangerates), KYC provider (mock or pluggable)
- Observability: structured logging, request tracing IDs

Data modeling (high level):
- User: id, email, password_hash, roles [ACCOUNT_HOLDER|STAFF|ADMIN], kyc_status
- Account: id, user_id, currency (ISO 4217), status [OPEN|CLOSED], balance_minor
- Transaction: id, account_id, type [DEPOSIT|WITHDRAW|FX_CONVERT|ADJUSTMENT], amount_minor, currency, fx_rate_used, related_transaction_id, created_at
- LedgerEntry (optional double-entry): id, transaction_id, debit_account_id, credit_account_id, amount_minor, currency
- FXRate: base, quote, rate, effective_at, source
- IdempotencyKey: key, request_hash, response_snapshot, status, created_at
- AuditLog: actor_id, action, resource, metadata, created_at

All monetary values are stored in minor units (e.g., cents) as integers.

---

## Security and Compliance
- KYC: Users must be VERIFIED before opening or operating accounts (configurable per action)
- Roles: ACCOUNT_HOLDER can only access own resources; STAFF/ADMIN can manage users and accounts
- Auth: JWT access tokens (short-lived) + refresh tokens; secure cookie or Authorization header
- Idempotency: Supported for deposit/withdraw/convert endpoints via `Idempotency-Key` header
- Input validation: strict schemas; reject on invalid currencies or amounts <= 0
- Rate limiting: Per-IP and per-user (implementation TBD)
- Audit logs: Mutating operations written with actor, resource, and timestamp

---

## API Design

Base URL: `/api/v1`

Auth
- POST `/auth/signup` — create user (ACCOUNT_HOLDER). KYC initiated.
- POST `/auth/login` — email/password; returns access and refresh tokens.
- POST `/auth/refresh` — refresh access token.
- POST `/auth/logout` — invalidate refresh token.

KYC
- POST `/kyc/submit` — submit KYC data (ACCOUNT_HOLDER).
- GET `/kyc/status` — retrieve current user KYC status.
- PATCH `/admin/kyc/:userId/status` — STAFF/ADMIN updates status (e.g., VERIFIED/REJECTED).

Accounts (ACCOUNT_HOLDER scopes; STAFF/ADMIN can view/manage all)
- POST `/accounts` — open account { currency } (requires KYC VERIFIED if enforced).
- GET `/accounts` — list own accounts (admin: list all with filters).
- GET `/accounts/:accountId` — get account details and summary balance.
- PATCH `/accounts/:accountId` — STAFF/ADMIN update limited fields (e.g., status).
- DELETE `/accounts/:accountId` — close account (status CLOSED) if balance is zero.

Transactions
- POST `/accounts/:accountId/deposits` — deposit { amount_minor, currency? }.
- POST `/accounts/:accountId/withdrawals` — withdraw { amount_minor } (insufficient funds check).
- POST `/accounts/:accountId/convert` — convert between currencies { to_currency, amount_minor }.
- GET `/accounts/:accountId/transactions` — list with pagination/filtering.

Reconciliation
- POST `/admin/reconcile/run` — trigger reconciliation job now (ADMIN).
- GET `/admin/reconcile/status` — last runs, mismatches, summaries.

Users/Admin
- GET `/admin/users` — list users with filters (ADMIN/STAFF).
- GET `/admin/users/:userId` — details including accounts and recent transactions.
- PATCH `/admin/users/:userId` — update roles or KYC flags.
- DELETE `/admin/users/:userId` — deactivate user (soft delete).

Common Query Params
- Pagination: `page`, `pageSize` (defaults 1 / 20; max 100)
- Sorting: `sortBy`, `sortOrder`
- Filtering: by `status`, `currency`, `type`, date ranges

Idempotency
- For POSTs that mutate balances, send header: `Idempotency-Key: <uuid>`

Example: Deposit

```http
POST /api/v1/accounts/acc_123/deposits
Idempotency-Key: 1c1e2b8a-1b2c-4eab-9e9f-123456789abc
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "amount_minor": 125000,
  "currency": "USD"
}
```

Response

```json
{
  "transaction_id": "txn_456",
  "account_id": "acc_123",
  "type": "DEPOSIT",
  "amount_minor": 125000,
  "currency": "USD",
  "balance_minor": 325000,
  "created_at": "2025-10-31T12:00:00Z"
}
```

Error Model (example)

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Withdrawal amount exceeds available balance",
    "request_id": "req_abc123"
  }
}
```

---

## Authorization Model (RBAC)

Roles
- ACCOUNT_HOLDER: self-service accounts, deposits, withdrawals, KYC submission
- STAFF: read/write on accounts/users except destructive actions (policy-based)
- ADMIN: full control including reconciliation and role changes

Enforcement
- Middleware checks JWT, loads user, assigns roles/permissions
- Resource-ownership checks: account.user_id must match requester for holder routes
- Admin/staff routes guarded by role checks

---

## Currency Conversion

- All balances stored in account native currency as integer minor units
- FX conversions use provider rate at request time; logged to `Transaction.fx_rate_used`
- Optional spread/fee configuration
- Historical rates stored in `FXRate` to support audits and reproducibility

---

## Reconciliation

- Periodic job compares sum of transactions to account balances
- Optionally enforces double-entry ledger integrity (if `LedgerEntry` is enabled)
- Reports mismatches, can generate adjustment transactions for admin review

---

## Database

Supported: Postgres (default), MySQL

Migrations
- Will be provided via ORM tool (Prisma/Knex) and executed on container start or via npm script

Data Integrity
- Constraints: foreign keys, unique indexes (email, idempotency keys), check constraints (amount > 0, status enums)

---

## Project Structure (proposed)

```
backend/
  src/
    app.ts
    server.ts
    config/
    routes/
    controllers/
    services/
    repositories/
    middlewares/
    jobs/
    libs/ (fx, kyc, auth)
    utils/
    types/
  prisma|db/
  tests/
  docker/
  package.json
```

---

## Environment Variables

Copy `.env.example` to `.env` and set values:

```
NODE_ENV=development
PORT=3001

DB_CLIENT=postgres # or mysql
DATABASE_URL=postgres://user:password@db:5432/digital_bank

JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me_too
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

KY C_REQUIRED=true
FX_PROVIDER=mock # or ecb|openexchangerates
FX_API_KEY=

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

---

## Running with Docker

Prerequisites: Docker, Docker Compose

Commands (to be provided upon implementation):
- `docker compose up --build` — start API + DB
- API available at `http://localhost:3001/api/v1`

Services (compose):
- api: Node.js service with hot reload in dev
- db: Postgres (or MySQL) with persisted volume
- (optional) redis: queues/rate-limiting if used

---

## Local Development

1) Install Node.js LTS and pnpm/yarn/npm
2) Install deps: `pnpm install` (or `yarn`, `npm i`)
3) Start DB via Docker or local DB
4) Run migrations: `pnpm db:migrate`
5) Start dev server: `pnpm dev`

Common scripts (to be added):
- `dev`: ts-node-dev nodemon server
- `build`: tsc compile
- `start`: node dist/server.js
- `test`: jest
- `db:migrate`: run migrations

---

## Testing Strategy
- Unit tests for services and utilities
- Integration tests for controllers with Supertest against an ephemeral DB
- Seed data for test fixtures

---

## Error Codes (examples)
- AUTH_INVALID_CREDENTIALS
- AUTH_FORBIDDEN
- KYC_REQUIRED
- ACCOUNT_NOT_FOUND
- ACCOUNT_CLOSED
- INSUFFICIENT_FUNDS
- CURRENCY_NOT_SUPPORTED
- IDEMPOTENCY_KEY_REPLAY

---

## Non-Functional Requirements
- Performance: p95 < 150ms under nominal load
- Reliability: idempotent balance mutations, transactions ACID-compliant
- Observability: correlation/request IDs, structured logs
- Security: OWASP best practices, input validation, secrets management

---

## Frontend Alignment
This backend serves two SPAs:
- Account Holder dashboard (blue): overview, account switcher, history, deposit/withdraw CTA
- Admin dashboard (green): manage users and accounts; view transaction history

---

## Roadmap to Implementation (high level)
1) Finalize libraries: ORM, validator, job/queue
2) Scaffold project and folder structure
3) Define schema and migrations
4) Implement auth (JWT), RBAC middleware, KYC flow (mock)
5) Implement accounts CRUD and ownership checks
6) Implement deposit/withdraw with idempotency and transactions
7) Implement currency conversion with FX provider
8) Implement reconciliation job + reporting endpoints
9) Add pagination, sorting, filtering; audit logs
10) Tests, Dockerization, CI hooks

---

## Confirmation
This README captures the intended backend scope and interfaces. Please confirm the choices marked TBD (ORM, validator, job runner) and any API adjustments before coding begins.


