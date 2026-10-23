# AERIDE Supabase database setup

The production database for AERIDE is Supabase PostgreSQL. Prisma and SQLite are not used.

## 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then open **SQL Editor**.

## 2. Apply the authoritative schema

Copy the complete contents of [`supabase/schema.sql`](supabase/schema.sql) into the SQL Editor and run it. The file creates:

- 12 original academic relations with safe identifiers.
- `auth_account` and `trip_event` physical extensions.
- Operational trip, driver, vehicle, document, and payment columns.
- Primary keys, unique constraints, foreign keys, checks, indexes, and audit trigger.
- Atomic RPC functions for registration, booking and assignment, state transitions, payments, and SQL Lab analytics.

The schema is safe to re-run because tables, indexes, functions, and triggers use `IF NOT EXISTS` or `CREATE OR REPLACE`.

## 3. Configure the application

Copy `.env.example` to `.env` and set:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-server-only-service-role-key"
SESSION_SECRET="a-long-random-value"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

The service-role key is used only by Next.js server routes and the seed script. Never expose it through browser code or a `NEXT_PUBLIC_` variable.

## 4. Seed deterministic rows

From the project root:

```bash
npm install
npm run db:seed
```

The seed script is [`supabase/seed.ts`](supabase/seed.ts). It uses Supabase upserts and bcrypt hashes, so it can be run repeatedly without creating duplicate demo records.

Demo credentials:

```text
Admin:     admin@aeride.local / admin1234
Passenger: ananya@aeride.local / aeride123
Driver:    karthik@aeride.local / aeride123
```

## 5. Start the app

```bash
npm run dev
```

The application connects through `lib/supabase.ts`, which creates a server-only `@supabase/supabase-js` client. Database reads use Supabase PostgREST queries. Multi-step writes use PostgreSQL RPC functions defined in `supabase/schema.sql`.

## SQL deliverables

The `sql/` directory contains the academic 12-file sequence:

| File | Purpose |
| --- | --- |
| `01_schema.sql` | 12 core relations, keys, and foreign keys |
| `02_extensions.sql` | Application tables and operational columns |
| `03_constraints.sql` | State, payment, date, and data-quality checks |
| `04_seed.sql` | Deterministic starter-row examples |
| `05_dml_examples.sql` | Transaction-wrapped insert/update/delete examples |
| `06_queries.sql` | Required passenger, driver, revenue, rating, and cancellation queries |
| `07_joins.sql` | Inner, left, and relationship joins |
| `08_subqueries.sql` | Scalar, correlated, and `EXISTS` subqueries |
| `09_aggregations.sql` | `GROUP BY`, `HAVING`, conditional totals, and monthly metrics |
| `10_views.sql` | Read-only reporting views |
| `11_triggers_procedures.sql` | Audit trigger and PostgreSQL transaction functions |
| `12_indexes.sql` | Operational access paths |

For the running application, apply `supabase/schema.sql` first. The numbered files are academic demonstrations and can be run selectively in Supabase SQL Editor after checking for duplicate object names.

## Supabase dashboard checks

After setup, verify in **Table Editor**:

1. `app_user` contains U001–U005.
2. `driver` contains D001–D005.
3. `vehicle`, `fare_policy`, and `trip` contain seeded rows.
4. `auth_account` contains passenger, driver, and admin accounts.
5. `trip_event` contains seed snapshots and status audit events.
6. The database linter shows the expected keys and indexes.

## Resetting demo data

The seed is idempotent and is the preferred reset path for a demo. If a full reset is needed, use Supabase’s SQL Editor to remove application rows in dependency order, then run `supabase/schema.sql` and `npm run db:seed` again. Do not reset a project containing real user data.
