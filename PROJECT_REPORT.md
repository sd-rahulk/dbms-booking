# AERIDE — Academic DBMS Project Report

## Abstract

AERIDE is a database-driven ride-sharing and cab booking management system for Chennai. It combines an academically faithful relational model with application extensions needed for authentication, operational state, auditing, analytics, and idempotent payment records. The application uses Next.js and Prisma over SQLite, with role-aware portals for passengers, drivers, and administrators.

## Problem statement

Manual cab coordination scatters passenger identity, driver availability, vehicle compliance, route fares, assignment history, and payment evidence across disconnected records. AERIDE centralizes these facts while maintaining referential integrity, historical fare quotes, and auditable trip transitions.

## Architecture

The browser renders responsive App Router pages. Client forms call server route handlers. Route handlers validate payloads with Zod, read a signed HTTP-only cookie, authorize the role, and call Prisma transactions. SQLite owns constraints, relations, indexes, views, and audit triggers. The map uses Leaflet/OpenStreetMap; the deterministic Chennai resolver keeps academic demos reproducible.

## ER and EER diagrams

- [ER diagram — Chen notation](docs/er-diagram.svg)
- [EER diagram — specialization/generalization](docs/eer-diagram.svg)

The ER diagram models the 12 original relations. `USER_PHONE` and `DRIVER_PHONE` represent multivalued phone attributes. `USER books TRIP`, `TRIP uses FARE_POLICY`, `TRIP is assigned through ASSIGNED_TO`, `TRIP receives REVIEW`, and `TRIP has PAYMENT` are the important relationships. The EER diagram adds the academic `PERSON` supertype with overlapping `USER` and `DRIVER` subtypes and the conceptual `CARD`, `UPI`, and `CASH` payment specializations. Those are conceptual extensions and are not physical tables.

## Relational schema and data dictionary

The 12 relations are:

1. USER(`User_ID` PK, `First_Name` NN, `Last_Name`, `Email` U NN)
2. USER_PHONE(`User_ID` FK, `Phone_Number`, PK(`User_ID`,`Phone_Number`))
3. EMERGENCY_CONTACT(`Contact_ID` PK, `User_ID` FK, `Name` NN, `Phone_Number` NN)
4. DRIVER(`Driver_ID` PK, `First_Name` NN, `Last_Name`, `Email` U NN)
5. DRIVER_PHONE(`Driver_ID` FK, `Phone_Number`, PK(`Driver_ID`,`Phone_Number`))
6. VEHICLE(`Vehicle_ID` PK, `Driver_ID` FK, `Type` NN, `Model` NN, `Capacity` CHECK > 0)
7. VEHICLE_DOCUMENT(`Document_ID` PK, `Vehicle_ID` FK, `Issue_Date` NN, `Expiry_Date` NN CHECK > `Issue_Date`)
8. FARE_POLICY(`Policy_ID` PK, `Vehicle_Type` NN, `Base_Fare` NN CHECK >= 0, `Per_Km_Rate` NN CHECK >= 0)
9. TRIP(`Trip_ID` PK, `User_ID` FK, `Policy_ID` FK, locations NN, booking date/time NN)
10. ASSIGNED_TO(`Trip_ID` FK, `Driver_ID` FK, PK(`Trip_ID`,`Driver_ID`))
11. PAYMENT(`Payment_ID` PK, `User_ID` FK, `Driver_ID` FK, `Trip_ID` FK, date, method, amount >= 0)
12. REVIEW(`Review_ID` PK, `Trip_ID` FK, `Rating` 1–5, `Comment`)

Physical extensions are `AUTH_ACCOUNT`, trip operational columns (`Status`, `Distance_Km`, `Estimated_Fare`, `Final_Fare`, timestamps, cancellation reason), driver/vehicle verification and registration fields, payment status/reference/created time, and `TRIP_EVENT` audit rows. Admin accounts intentionally have neither `User_ID` nor `Driver_ID`.

## Functional dependencies and normalization

All listed dependencies assume the stated uniqueness constraints and semantic rules.

| Relation | Candidate key(s) | Functional dependencies | Result |
| --- | --- | --- | --- |
| USER | User_ID; Email | User_ID → First_Name, Last_Name, Email; Email → User_ID, First_Name, Last_Name | 1NF, 2NF, 3NF, BCNF |
| USER_PHONE | (User_ID, Phone_Number) | (User_ID, Phone_Number) → all attributes | 1NF, 2NF, 3NF, BCNF |
| EMERGENCY_CONTACT | Contact_ID | Contact_ID → User_ID, Name, Phone_Number | 1NF, 2NF, 3NF, BCNF |
| DRIVER | Driver_ID; Email | Driver_ID → First_Name, Last_Name, Email; Email → Driver_ID, First_Name, Last_Name | 1NF, 2NF, 3NF, BCNF |
| DRIVER_PHONE | (Driver_ID, Phone_Number) | (Driver_ID, Phone_Number) → all attributes | 1NF, 2NF, 3NF, BCNF |
| VEHICLE | Vehicle_ID; Registration_Number | Vehicle_ID → Driver_ID, Type, Model, Capacity; Registration_Number → same | 1NF, 2NF, 3NF, BCNF |
| VEHICLE_DOCUMENT | Document_ID | Document_ID → Vehicle_ID, Issue_Date, Expiry_Date | 1NF, 2NF, 3NF, BCNF |
| FARE_POLICY | Policy_ID | Policy_ID → Vehicle_Type, Base_Fare, Per_Km_Rate; Vehicle_Type → Per_Km_Rate (assumption) | 3NF as authored; BCNF decomposition below |
| TRIP | Trip_ID | Trip_ID → User_ID, Policy_ID, locations, booking date/time | 1NF, 2NF, 3NF, BCNF |
| ASSIGNED_TO | (Trip_ID, Driver_ID) | composite key → Assigned relationship facts | 1NF, 2NF, 3NF, BCNF |
| PAYMENT | Payment_ID | Payment_ID → User_ID, Driver_ID, Trip_ID, date, method, amount | 1NF, 2NF, 3NF, BCNF |
| REVIEW | Review_ID; Trip_ID | Review_ID → Trip_ID, Rating, Comment; Trip_ID → Review_ID, Rating, Comment | 1NF, 2NF, 3NF, BCNF |

1NF holds because all values are atomic and repeating phone attributes are decomposed. 2NF holds because relations with composite keys have no non-key partial dependencies. 3NF holds where every non-key attribute depends on a key, the whole key, and nothing but the key; the fare assumption is isolated as the one intentional transitive dependency.

### Fare Policy BCNF demonstration

Given `Policy_ID → Vehicle_Type, Base_Fare` and `Vehicle_Type → Per_Km_Rate`, the determinant `Vehicle_Type` is not a superkey of `FARE_POLICY`, so the authored relation is not BCNF. Decompose into:

`FARE_POLICY_BASE(Policy_ID, Vehicle_Type, Base_Fare)` and `VEHICLE_FARE_RATE(Vehicle_Type, Per_Km_Rate)`.

The decomposition is lossless because the common attribute `Vehicle_Type` functionally determines all attributes of `VEHICLE_FARE_RATE`, making it a key there. It is dependency-preserving because the first dependency is represented in `FARE_POLICY_BASE` and the second in `VEHICLE_FARE_RATE`. The implementation keeps the original-compatible Prisma structure for straightforward historical policy lookup; the SQL/report layer documents the BCNF decomposition and can expose a compatibility view if physical normalization is selected later.

## Core engine

The quote formula is `Base_Fare + (Distance_Km × Per_Km_Rate)`. SQLite stores the fare as REAL, while the server calculates in paise before persisting a two-decimal value. Distance is captured at request time and the quote is persisted on `TRIP`. Assignment is transactional and uses SQLite’s serialized write model. Transition validation permits `REQUESTED → ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED`, with cancellation from active states. Every transition creates `TRIP_EVENT`.

## Security and accessibility

Passwords are bcrypt-hashed. Sessions are signed, HTTP-only, same-site cookies. Payloads are Zod validated on the server. DB calls use Prisma or a server-side allow-list of fixed SQLite analytics statements. Sensitive payment credentials are never persisted. Interfaces include labels, focusable controls, readable contrast, responsive layouts, empty/error/loading states, and reduced-motion CSS support.

## SQL deliverables

`sql/01_schema.sql` through `sql/12_indexes.sql` cover DDL, DML, joins, subqueries, aggregations, views, triggers, procedures, transactions, required analytics, and indexes. `prisma/seed.ts` adds deterministic U001–U005, D001–D005, V001–V005 records with Chennai locations.

## Test plan and results

| Area | Validation | Result |
| --- | --- | --- |
| Auth | Invalid payload, bad password, role redirect | Implemented in route handlers |
| Fare | Paise-safe formula and persisted quote | Implemented in `lib/fare.ts` and trip transaction |
| Concurrency | Serializable transaction + locked driver candidate | Implemented in `POST /api/trips` |
| State machine | Invalid transitions rejected server-side | Implemented in `lib/state-machine.ts` |
| Integrity | PK, UQ, FK, capacity/date/rating checks | Prisma schema and SQL constraints |
| Rollback | Booking transaction throws before assignment | SQLite transaction rolls back trip/event/assignment together |
| Build | Typecheck, Prisma validation, production build | Run with README verification commands |

## Conclusion

AERIDE demonstrates how a normalized academic model can support a polished, real application without collapsing the conceptual schema into UI-shaped data. The database remains the source of truth for identity, operational state, relationships, integrity, and analytics.
