# AERIDE

**Every journey, beautifully connected.**

AERIDE is a production-style ride-sharing and cab booking management system for a university DBMS project. It uses Next.js App Router, TypeScript, Tailwind CSS, and Supabase PostgreSQL. The application has real authentication, role authorization, database-backed booking, driver assignment, trip state transitions, simulated payments, downloadable receipts, audit events, analytics, and an admin DBMS Explorer.

## Features

- Passenger portal for booking, route estimates, trip history, cancellation, profile, and emergency contacts.
- Driver portal for availability, assigned request acceptance, trip execution, and completion.
- Admin portal for live metrics, controlled CRUD, schema inventory, and PostgreSQL query showcase.
- Supabase PostgreSQL database with the 12 original academic relations and documented physical extensions.
- PostgreSQL transactions and row-level locking inside Supabase RPC functions for booking, assignment, trip transitions, registration, and idempotent payments.
- Fare quote persistence using `Base_Fare + Distance_Km × Per_Km_Rate` with paise-safe server arithmetic.
- Leaflet/OpenStreetMap route interface with deterministic Chennai fallback distance calculation.
- Bcrypt password hashing, signed HTTP-only cookies, Zod validation, server-side authorization, and no stored card credentials or UPI PINs.
- Admin-only SQL Lab with allow-listed PostgreSQL queries executed through a Supabase RPC function. Arbitrary browser SQL is intentionally disabled.
- Responsive editorial interface with loading states, empty states, error messages, accessible labels, and reduced-motion support.

## Architecture

```text
Browser UI
  → Next.js App Router pages and server route handlers
  → lib/supabase.ts using the server-only Supabase service-role client
  → Supabase PostgreSQL tables, constraints, indexes, triggers, and RPC functions
```

The browser never receives `SUPABASE_SERVICE_ROLE_KEY`. Current authentication remains the project’s custom `AUTH_ACCOUNT` model with bcrypt and signed HTTP-only cookies. Supabase is the database platform; Supabase Auth is not required by this implementation.

## Technology

Next.js App Router · TypeScript · Tailwind CSS · Supabase PostgreSQL · `@supabase/supabase-js` · React Hook Form · Zod · Leaflet/OpenStreetMap · Recharts · Lucide · Motion for React.

## Requirements

- Node.js 20 or newer
- npm 9 or newer
- A Supabase project
- Network access for Supabase and OpenStreetMap tiles

No local PostgreSQL server, Prisma installation, SQLite file, payment gateway, or browser database key is required.

## Supabase project setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the project’s **SQL Editor**.
3. Run [`supabase/schema.sql`](supabase/schema.sql). This creates the 12 academic relations, physical extensions, indexes, audit trigger, transaction functions, and safe SQL Lab function.
4. Copy the project URL and the server-only **service_role** key from **Project Settings → API**.
5. Add the values to `.env` as shown below.

The service-role key is intentionally used only inside Next.js server code and the seed script. Never add it to a `NEXT_PUBLIC_` variable, commit it, or paste it into browser code.

## Clone and install

```bash
git clone <your-repository-url>
cd DBMS
npm install
```

## Environment variables

Copy the example file:

```powershell
Copy-Item .env.example .env
```

Set these values:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-server-only-service-role-key"
SESSION_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Generate a session secret with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The current server-side architecture does not need a Supabase anonymous key. If you later add direct browser-to-Supabase features such as Realtime, use a separate RLS-reviewed client and keep the service-role client server-only.

## Seed deterministic demo data

After running the schema in Supabase SQL Editor:

```bash
npm run db:seed
```

The seed reads the root `.env`, hashes the demo passwords, and is safe to run repeatedly through upserts. It creates U001–U005 passengers, D001–D005 drivers, V001–V005 vehicles, fare policies, Chennai trips, payments, reviews, and audit snapshots.

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm run dev           # development server
npm run build         # production build
npm start             # serve production build
npm run typecheck     # TypeScript verification
npm run test:domain   # fare and trip-state checks
npm run db:seed       # idempotent Supabase seed
```

## Demo accounts

| Role | Email | Password | Academic ID |
| --- | --- | --- | --- |
| Passenger | `ananya@aeride.local` | `aeride123` | U001 |
| Passenger | `vikram@aeride.local` | `aeride123` | U002 |
| Driver | `karthik@aeride.local` | `aeride123` | D001 |
| Driver | `mohan@aeride.local` | `aeride123` | D003 |
| Admin | `admin@aeride.local` | `admin1234` | — |

Change these passwords and rotate `SESSION_SECRET` before public use.

## Demo walkthrough

### Passenger booking

1. Sign in as `ananya@aeride.local`.
2. Open **Book a ride**.
3. Enter pickup and destination and choose Hatchback, Sedan, or SUV.
4. Submit the ride request. The server calculates the distance and persists the quoted fare.
5. Open **Trip history** to see the assigned driver and current status.

### Driver completion

1. Sign in as `karthik@aeride.local`.
2. Open **Trip history**.
3. Use **Accept request**, **Start trip**, and **Mark complete**.
4. Each transition is validated by the PostgreSQL `transition_trip` RPC and recorded in `trip_event`.

The seeded `T003` trip is already assigned and `IN_PROGRESS`, so it is useful for demonstrating completion.

### Payment and receipt

After a trip is `COMPLETED`, the passenger can choose `CARD`, `UPI`, or `CASH`. The `create_payment` RPC is idempotent for a trip and method. A receipt can be downloaded from the history card.

### DBMS Explorer and SQL Lab

1. Sign in as `admin@aeride.local`.
2. Open `/admin/explorer` for the schema inventory and query showcase.
3. Open `/admin/sql-lab` for the dedicated SQL Lab.
4. Select a required academic query and click **Run query**.

The query key is validated in the Next.js route and again handled by a fixed `run_sql_lab_query` PostgreSQL function. The browser cannot submit arbitrary `DROP`, `DELETE`, or injected SQL.

## Database model

The original academic relations remain distinct using safe physical identifiers:

`app_user`, `user_phone`, `emergency_contact`, `driver`, `driver_phone`, `vehicle`, `vehicle_document`, `fare_policy`, `trip`, `assigned_to`, `payment`, and `review`.

Physical extensions are `auth_account`, operational trip fields, driver and vehicle verification fields, payment status and reference fields, and `trip_event`. PostgreSQL uses `NUMERIC(12,2)` for currency, `DATE`/`TIME` for booking schedule, and `TIMESTAMPTZ` for operational logs.

The critical multi-step operations are PostgreSQL functions in [`supabase/schema.sql`](supabase/schema.sql):

- `register_passenger` — atomic user, phone, and account registration.
- `create_trip_with_assignment` — atomic trip creation, fare snapshot, driver selection, assignment, and event logging with `FOR UPDATE SKIP LOCKED`.
- `transition_trip` — row-locked state-machine enforcement and driver availability updates.
- `create_payment` — completed-trip validation and idempotent payment creation.
- `run_sql_lab_query` — fixed analytics query library for the admin UI.

## SQL deliverables

The ordered files in `sql/` demonstrate DDL, extensions, constraints, DML, joins, subqueries, aggregations, views, triggers, procedures, required analytics, and indexes. They are PostgreSQL-oriented for the Supabase target. The authoritative executable application schema and transaction functions are in `supabase/schema.sql`.

The 12 academic SQL topics are:

1. `01_schema.sql` — core relations
2. `02_extensions.sql` — application extensions
3. `03_constraints.sql` — domains and checks
4. `04_seed.sql` — starter row examples
5. `05_dml_examples.sql` — transaction-wrapped DML
6. `06_queries.sql` — required query showcase
7. `07_joins.sql` — inner and outer joins
8. `08_subqueries.sql` — scalar and correlated subqueries
9. `09_aggregations.sql` — grouped analytics
10. `10_views.sql` — read-only views
11. `11_triggers_procedures.sql` — audit trigger and PostgreSQL functions
12. `12_indexes.sql` — operational access paths

## Deployment

Supabase hosts the database, so the Next.js application can run on Vercel, Render, Fly.io, Railway, or any Node-compatible host. The app is stateless apart from Supabase and does not need a persistent local disk.

### Vercel

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, and `NEXT_PUBLIC_APP_URL` under project environment variables.
4. Deploy with the default settings.

Run `npm run db:seed` from a secure local terminal after the schema has been applied. Do not put the service-role key in client-side environment variables.

### Render

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Add the same four environment variables.
- Apply `supabase/schema.sql` once in Supabase SQL Editor and seed separately.

### Docker

The included [`Dockerfile`](Dockerfile) builds and starts the Next.js server. Pass the four environment variables through your host’s secret manager. The container does not run migrations automatically because Supabase schema changes should be reviewed and applied through SQL Editor or a controlled migration pipeline.

## Troubleshooting

### “Supabase is not configured”

Check that `.env` is in the project root beside `package.json`, contains the Supabase URL and service-role key, and restart `npm run dev`.

### Registration fails

Confirm that `supabase/schema.sql` has been run. The `register_passenger` RPC must exist and the email/user ID must be unique.

### Login returns 401

Run `npm run db:seed`, confirm the demo credentials, and verify that the `auth_account` table contains the account.

### SQL Lab returns an RPC error

Re-run the latest `supabase/schema.sql` in Supabase SQL Editor. The `run_sql_lab_query` function must exist and the service-role key must belong to the same project URL.

### Map tiles are blank

OpenStreetMap tiles require network access. Booking and deterministic Chennai fare calculation still work if tiles are unavailable.

## Verification

```bash
npm run typecheck
npm run test:domain
npm run build
```

Then verify manually:

1. Passenger login and registration.
2. Driver availability and trip transitions.
3. Completed-trip payment for CARD, UPI, and CASH.
4. Receipt download.
5. Admin Explorer and every SQL Lab query.
6. Supabase table constraints and `trip_event` audit rows.

## Documentation

- [`DATABASE_SETUP.md`](DATABASE_SETUP.md) — Supabase schema and seed steps
- [`PROJECT_REPORT.md`](PROJECT_REPORT.md) — academic report, normalization, ER/EER diagrams, schema, and testing
- [`VIVA_QUESTIONS.md`](VIVA_QUESTIONS.md) — presentation guide
- [`docs/er-diagram.svg`](docs/er-diagram.svg) — Chen notation ER diagram
- [`docs/eer-diagram.svg`](docs/eer-diagram.svg) — EER diagram
