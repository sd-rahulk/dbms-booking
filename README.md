# AERIDE

**Every journey, beautifully connected.**

AERIDE is a SQLite-backed ride-sharing and cab booking management system built for a rigorous university DBMS project. It combines a polished responsive interface with real authentication, database persistence, transactional booking, driver assignment, trip state transitions, payments, receipts, audit events, analytics, and an admin SQL Query Lab.

## What is included

- Passenger workspace: book a ride, inspect the route, view trip history, cancel active trips, and pay after completion.
- Driver workspace: view assigned trips and move them through `ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED`.
- Admin workspace: live metrics, schema explorer, controlled record management, and allow-listed SQL Query Lab.
- SQLite database through Prisma, with 12 core academic relations plus physical application extensions.
- Leaflet/OpenStreetMap map view with deterministic Chennai distance calculation for reproducible demos.
- Bcrypt password hashing, signed HTTP-only cookies, Zod validation, server-side role authorization, idempotent payments, and downloadable receipts.

## Technology

Next.js App Router · TypeScript · Tailwind CSS · Prisma · SQLite · React Hook Form · Zod · Leaflet/OpenStreetMap · Recharts · Lucide · Motion for React.

## Requirements

- Node.js 20 or newer: `node --version`
- npm 9 or newer: `npm --version`
- Git, if cloning from a repository
- SQLite CLI is optional. Prisma creates and manages the database file.

No PostgreSQL server, Docker, API key, payment gateway, or external authentication provider is required for the current build.

## Clone and install

```bash
git clone <your-repository-url>
cd DBMS
npm install
```

On Windows PowerShell, the same commands work in a terminal opened at the project root.

## Environment variables

Copy the example file:

```powershell
Copy-Item .env.example .env
```

The default local `.env` should be:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`file:./dev.db` is resolved relative to the Prisma schema, so the local database is created at `prisma/dev.db`. Use a long random value for `SESSION_SECRET`; do not commit `.env`.

Generate a secret with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## First local run

```bash
npm install
npm run db:generate
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The seed is deterministic and safe to run repeatedly. It creates the SQLite file, academic IDs, demo accounts, vehicles, policies, Chennai routes, payments, reviews, and audit snapshots.

### Useful commands

```bash
npm run dev             # development server
npm run build           # production build
npm start               # serve the production build
npm run typecheck       # TypeScript verification
npm run test:domain     # fare and trip-state checks
npm run db:generate     # regenerate Prisma Client
npm run db:push         # sync schema to SQLite
npm run db:seed         # idempotent demo data
npm run db:studio       # Prisma Studio
```

## Demo accounts

All seeded passengers and drivers use `aeride123`. The admin account uses `admin1234`.

| Role | Email | Password | ID |
| --- | --- | --- | --- |
| Passenger | `ananya@aeride.local` | `aeride123` | U001 |
| Passenger | `vikram@aeride.local` | `aeride123` | U002 |
| Driver | `karthik@aeride.local` | `aeride123` | D001 |
| Driver | `mohan@aeride.local` | `aeride123` | D003 |
| Admin | `admin@aeride.local` | `admin1234` | — |

## Demo walkthrough

### Passenger booking

1. Sign in as `ananya@aeride.local`.
2. Select **Book a ride**.
3. Enter pickup and destination, then choose Hatchback, Sedan, or SUV.
4. Submit the ride request. The server calculates and persists the quoted fare.
5. Open **Trip history** to see assignment and status.

### Driver completion

1. Sign out and sign in as `karthik@aeride.local`.
2. Open **Trip history**.
3. For an assigned trip, use **Accept request**, then **Start trip**, then **Mark complete**.
4. Every transition is validated by the server and recorded in `trip_event`.

The seeded `T003` trip is already `IN_PROGRESS` and assigned to D001, so it is useful for demonstrating **Mark complete** immediately.

### Payment and receipt

After the passenger’s trip is `COMPLETED`, the history card shows `CARD`, `UPI`, and `CASH` options. Select a method, click **Pay now**, and download the generated receipt. Payment retries return the existing record for the same trip and method.

### Admin SQL Query Lab

1. Sign in as `admin@aeride.local`.
2. Open `/admin/sql-lab` from the sidebar.
3. Choose a query and click **Run query**.

The browser can select only server-side allow-listed queries. It cannot submit arbitrary SQL, which prevents destructive statements and SQL injection from the admin interface. The DBMS Explorer at `/admin/explorer` provides the schema inventory and the same analytics showcase.

## Database model

The 12 academic relations remain conceptually distinct and are represented with safe SQLite identifiers such as `app_user`. Physical extensions are `auth_account`, operational trip columns, driver/vehicle verification fields, payment status/reference fields, and `trip_event`.

SQLite does not have PostgreSQL’s native `NUMERIC`, enum, stored-procedure, or row-lock features. The implementation uses validated string state domains, REAL storage with paise-safe server-side fare arithmetic, SQLite serialized write transactions, and a server function for guarded trip completion. The academic explanation of normalization and BCNF remains in [`PROJECT_REPORT.md`](PROJECT_REPORT.md).

## SQL deliverables

The ordered files in `sql/` are SQLite-compatible examples:

1. `01_schema.sql` — core DDL
2. `02_extensions.sql` — application tables and columns
3. `03_constraints.sql` — additional checks and unique indexes
4. `04_seed.sql` — SQL seed examples
5. `05_dml_examples.sql` — transaction-wrapped DML
6. `06_queries.sql` — required queries
7. `07_joins.sql` — joins
8. `08_subqueries.sql` — subqueries
9. `09_aggregations.sql` — aggregations
10. `10_views.sql` — views
11. `11_triggers_procedures.sql` — audit trigger and SQLite limitation note
12. `12_indexes.sql` — indexes

See [`DATABASE_SETUP.md`](DATABASE_SETUP.md) for SQL CLI commands.

## Production deployment with SQLite

SQLite is a file database. The host must provide a persistent disk and the deployment must run as one application instance. Do not deploy this SQLite build to a standard serverless filesystem: Vercel’s own guidance explains that serverless storage is ephemeral and separate function instances cannot share one SQLite file ([Vercel SQLite guidance](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)).

### Recommended: Fly.io with a persistent volume

Fly.io is a good fit for this SQLite-only version because its volumes are persistent storage for Fly Machines and are explicitly applicable to SQLite ([Fly volumes documentation](https://fly.io/docs/js/the-basics/volumes/)). Volumes are machine-local, so keep one machine for this academic demo and back up the file regularly.

1. Install `flyctl`, create an account, and log in:

```bash
fly auth login
```

2. From the project root, create an app configuration:

```bash
fly launch --no-deploy
```

Choose a region close to your teammates. Keep the generated app name; it becomes part of the public URL.

3. Create a persistent volume in the same region:

```bash
fly volumes create aeride_data --size 1 --region <region>
```

4. In the generated `fly.toml`, ensure the relevant sections contain:

```toml
[env]
  DATABASE_URL = "file:/data/aeride.db"
  NEXT_PUBLIC_APP_URL = "https://<your-app>.fly.dev"

[[mounts]]
  source = "aeride_data"
  destination = "/data"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1
```

5. Set the production session secret. Generate a value locally, then pass it to Fly:

```bash
fly secrets set SESSION_SECRET=<long-random-value>
```

6. Deploy:

```bash
fly deploy
```

The included [`Dockerfile`](Dockerfile) builds Next.js and starts the container with `prisma db push`, the idempotent seed, and `next start`. Open the URL printed by Fly:

```bash
fly open
```

7. Check logs if needed:

```bash
fly logs
```

Important: a Fly volume is not automatically shared or replicated between machines. Use one machine for this SQLite deployment. For multiple app instances or high concurrency, the architecture should migrate to a server database.

### Alternative: Render with a persistent disk

Render web services have ephemeral filesystems by default. A persistent disk is required for SQLite, and Render documents that persistent disks are available for paid web services ([Render persistent disks](https://render.com/docs/disks)).

Configure a Render Web Service as follows:

- Build command: `npm ci && npx prisma generate && npm run build`
- Start command: `npx prisma db push && npm run db:seed && npm start`
- Persistent disk mount path: `/opt/render/project/src/storage`
- `DATABASE_URL`: `file:/opt/render/project/src/storage/aeride.db`
- `NEXT_PUBLIC_APP_URL`: your Render service URL
- `SESSION_SECRET`: a long random secret

The included Dockerfile can also be used if you choose Render’s Docker deployment path. Because the disk is attached to one service instance, keep the service at one instance for SQLite.

## Backups

Back up the SQLite file before redeployments or schema changes. With the SQLite CLI:

```bash
sqlite3 prisma/dev.db ".backup 'aeride-backup.db'"
```

On Fly.io, run the equivalent command inside the machine and copy the backup to a secure storage location. Never commit database files containing real user data.

## Troubleshooting

### `Environment variable not found: DATABASE_URL`

Make sure `.env` is in the project root beside `package.json`, contains `DATABASE_URL="file:./dev.db"`, and restart `npm run dev` after editing it.

### `P1001` or a PostgreSQL connection error

This build no longer uses PostgreSQL. Replace any old PostgreSQL URL in `.env` with:

```env
DATABASE_URL="file:./dev.db"
```

Then run `npx prisma db push` again.

### Login returns `401`

Run `npm run db:seed` and verify the demo credentials. Passwords are case-sensitive.

### A trip remains `REQUESTED`

The booking engine assigns only an active, verified, available seeded driver. Seed again, then retry. Once assigned, the driver changes the state from the driver’s **Trip history** page.

### Map tiles are blank

The map needs network access to load OpenStreetMap tiles. Booking and fare calculation still work with the deterministic Chennai fallback if tiles are unavailable.

## Verification before sharing

```bash
npx prisma validate
npm run typecheck
npm run test:domain
npm run build
```

Before sharing publicly, change the seeded passwords, rotate `SESSION_SECRET`, attach persistent storage, enable HTTPS, and avoid using the academic payment simulation for real payments.

## Documentation

- [`DATABASE_SETUP.md`](DATABASE_SETUP.md) — SQLite setup and 12 SQL files
- [`PROJECT_REPORT.md`](PROJECT_REPORT.md) — academic report, normalization, ER/EER diagrams, schema, and testing
- [`VIVA_QUESTIONS.md`](VIVA_QUESTIONS.md) — presentation guide
- [`docs/er-diagram.svg`](docs/er-diagram.svg) — Chen notation ER diagram
- [`docs/eer-diagram.svg`](docs/eer-diagram.svg) — EER diagram



  
