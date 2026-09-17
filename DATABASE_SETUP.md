# AERIDE database setup

The scripts in `sql/` are ordered so that each file demonstrates one DBMS concept while remaining executable on SQLite. The normal application path uses Prisma and creates `prisma/dev.db` automatically.

```bash
sqlite3 prisma/dev.db < sql/01_schema.sql
for f in sql/02_extensions.sql sql/03_constraints.sql sql/04_seed.sql sql/05_dml_examples.sql sql/06_queries.sql sql/07_joins.sql sql/08_subqueries.sql sql/09_aggregations.sql sql/10_views.sql sql/11_triggers_procedures.sql sql/12_indexes.sql; do sqlite3 prisma/dev.db < "$f"; done
```

On PowerShell:

```powershell
Get-ChildItem sql\*.sql | Sort-Object Name | ForEach-Object { Get-Content $_.FullName | sqlite3 prisma\dev.db }
```

| File | Purpose |
| --- | --- |
| 01_schema.sql | 12 core relations, primary/foreign keys, checks |
| 02_extensions.sql | AUTH_ACCOUNT plus payment operational columns |
| 03_constraints.sql | Enumerated operational domains |
| 04_seed.sql | Idempotent starter rows |
| 05_dml_examples.sql | Transaction-wrapped DML examples |
| 06_queries.sql | Required passenger, driver, revenue, rating, and cancellation queries |
| 07_joins.sql | Inner and outer join examples |
| 08_subqueries.sql | Scalar and correlated subqueries |
| 09_aggregations.sql | GROUP BY, HAVING, FILTER, conditional totals |
| 10_views.sql | Read-only trip and driver earnings views |
| 11_triggers_procedures.sql | Audit trigger; server-side completion procedure note |
| 12_indexes.sql | Operational access paths |

The Prisma path is:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

SQLite has no stored procedure language and no PostgreSQL row-level lock syntax. Those parts are implemented in the server transaction layer. The seed is fully deterministic and safe to run repeatedly through `prisma/seed.ts`.
