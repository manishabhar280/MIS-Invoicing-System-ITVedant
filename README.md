# MIS Invoicing System

A web-based **Management Information System (MIS) & Invoice Generation System** developed as part of the **IT Vedant Internship Project**.

---

## Project Overview

The **MIS Invoicing System** is a web-based application designed to help organizations manage clients, invoices, payments, estimates, users, and other business-related information through a centralized system.

The project follows a **frontend-backend architecture** using REST APIs.

### Architecture

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Java Spring Boot
* **Database:** MySQL
* **API:** REST APIs
* **Build Tool:** Maven
* **Backend Deployment:** Railway
* **Database Hosting:** Aiven MySQL
* **Version Control:** Git & GitHub

---

## Main Features

### User Management

* Database-backed sign-in for invoice/payment operations
* ADMIN and USER role-based permissions for the invoice module
* No public registration endpoint; users must be provisioned by an authorized process

### Client Management

* Add new clients
* View client list
* View client details
* Manage client information
* Store client information in MySQL database

### Invoice Management

* Generate one invoice from an eligible Estimate
* View invoices and download invoice PDFs
* Snapshot company GST and customer details
* Calculate exact DECIMAL totals and GST on the server
* Track outstanding balances and invoice payment status

### Payment Management

* Record idempotent partial and full payments
* View payment information
* Derive invoice payment status from posted amounts

### Other Modules

* Groups
* Chains
* Brands
* Subzones
* Estimates

---

## Technology Stack

| Layer            | Technology            |
| ---------------- | --------------------- |
| Frontend         | HTML, CSS, JavaScript |
| Backend          | Java, Spring Boot     |
| Database         | MySQL                 |
| API              | REST API              |
| Build Tool       | Maven                 |
| Deployment       | Railway               |
| Database Hosting | Aiven MySQL           |
| IDE              | Visual Studio Code    |
| Version Control  | Git & GitHub          |

---

## Project Structure

```text
MIS-Invoicing-System/
│
├── backend/
│   ├── src/
│   ├── pom.xml
│   ├── railway.json
│   └── ...
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── ...
│
├── database/
│   └── ...
│
├── docs/
│   └── USER_GUIDE.md
│
├── .gitignore
└── README.md
```

---

# Backend Setup

## Requirements

Install the following software before running the backend locally:

* Java JDK
* Maven
* MySQL
* Git

## Database Configuration

The application uses **MySQL** as its database.

Database credentials are configured using environment variables.

Example:

```text
DB_USERNAME=root
DB_PASSWORD=your_password
DB_URL=jdbc:mysql://localhost:3306/ims_db
```

> **Security:** Never upload `.env` files, database passwords, API keys, or other secrets to GitHub.

The project uses environment variables so that sensitive database credentials are not stored directly in the source code.

### Apply database migrations

For an existing local database, back it up first and confirm your MySQL connection
targets `ims_db`. From the repository root, apply the Zone migration with:

```cmd
mysql -u your_mysql_user -p < database\migrations\003_create_zones_table.sql
```

The migration selects `ims_db` and verifies that `brands.brand_id` is a signed
`BIGINT` auto-increment primary key. For an existing `zones` table, it checks
the table shape and Brand references, widens `zones.brand_id` from signed
`INT` to signed `BIGINT` when needed, then adds the Brand index and foreign key
if absent. It does not modify the Brand primary key or delete/reset records.
Stop the backend before applying it to avoid concurrent application access,
then restart the backend after the migration completes.

`database\schema.sql` describes a fresh installation. It is not an upgrade
script and must not be used to recreate or replace tables in an existing
database.

For Task 6 Estimate Management on an existing database, first confirm that its
legacy Estimate, Chain, Client, Brand, and Zone definitions match the
preconditions in `database\migrations\004_estimate_management.sql`. Back up
the database and test the migration on a disposable copy before applying it
manually. The migration adds nullable Estimate fields and Brand/Zone foreign
keys; it does not rename `estimate_id`, modify `amount`, change legacy
nullability, or add an Invoice–Estimate relationship. It stops before table
changes if the preconditions fail or if any Task 6 column already exists;
inspect a partially applied or previously applied migration before repair or
retry. MySQL DDL implicitly commits and is not transactionally rolled back as a
whole, so a backup and post-migration schema check are required.

To apply Task 6 in MySQL Workbench, connect to the intended MySQL instance,
open `database\migrations\004_estimate_management.sql`, and execute the entire
script once. The script selects `ims_db` and runs its preflight before the
single `ALTER TABLE`. If execution reports an error, stop and inspect the
schema and `m004_estimate_management_preflight` routine before taking any
further action; a failed preflight can leave that helper routine behind, so do
not blindly rerun the script. After success, verify all 12 Task 6 columns and
both new foreign keys, then start the backend. Do not disable Hibernate
validation or run `schema.sql` against an existing database.

The application uses Hibernate schema validation rather than automatic schema
updates. Apply the appropriate schema setup or migration before starting the
backend. Estimate API IDs and money values are serialized as decimal strings
so JavaScript does not round BIGINT identifiers or monetary values. New
Estimates also populate the legacy required `amount` column from the server-
calculated total; edits leave the existing legacy amount untouched.

### Task 7 – Invoice Management migration

Do not run this migration on production as part of Task 7 review or submission.
Rehearse only against the disposable `ims_db_task7_test` database after taking
a fresh backup. The migration relies on the currently selected schema; it does
not contain a hard-coded database guard. Before any manual execution, confirm
`SELECT DATABASE()` reports exactly `ims_db_task7_test`, and configure the
backend to use that same database:

```text
DB_URL=jdbc:mysql://<host>:<port>/ims_db_task7_test
DB_USERNAME=<database-user>
DB_PASSWORD=<database-password>
```

Before applying `database\migrations\005_invoice_management.sql`, inspect
`SHOW CREATE TABLE users`, `clients`, `chains`, `estimates`, `invoices`, and
`payments`, and check all target columns, indexes, the
`fk_invoice_estimate` constraint, and the `m005_invoice_management_preflight_v2`
routine. If any Task 7 object is already present or the state is uncertain,
stop and prepare a reviewed continuation/recovery plan; do not rerun the
migration blindly. Its preflight checks the reviewed signed BIGINT keys,
Estimate columns, legacy DOUBLE invoice/payment amounts, and existing
client/estimate/payment foreign keys. Do not change or bypass those checks to
force an upgrade.

The migration keeps `invoices.id` and `estimates.estimate_id` unchanged, adds
nullable Estimate/snapshot/DECIMAL fields and the nullable
`invoices.estimate_id` foreign key, enforces one invoice per Estimate, adds a
unique payment idempotency key, and adds an authentication username index.
Existing invoices and payments retain their legacy DOUBLE columns and data.
All new columns begin as NULL for legacy records. MySQL DDL commits
individually: if any step fails, stop and inspect the actual schema before
repairing; do not blindly rerun the script.

Only after the read-only checks establish that no Task 7 DDL has been applied,
connect a MySQL client to `ims_db_task7_test` and run the reviewed migration
once. After success, verify `invoices.estimate_id` references
`estimates.estimate_id`, check the new DECIMAL/idempotency columns and indexes,
and inspect the helper procedure before explicitly removing it. The script
does not automatically remove its helper on success or failure. Never run this
migration automatically on startup. For a fresh database created from
`database\schema.sql`, Task 7 columns and constraints are already defined; do
not apply migration 005 on top of that schema.

Invoice API operations use stateless HTTP Basic authentication backed by
`users`. Existing account passwords must be BCrypt hashes, and roles must be
`ADMIN` or `USER` (an optional `ROLE_` prefix is accepted). No public
registration endpoint is provided. Provision accounts using a trusted,
approved process; never store a plaintext password in the database, source,
or browser storage. ADMIN may use all invoice routes, including sending email;
USER may read/create invoices and record payments.

### Task 6 – Estimate Management

The Estimates dashboard supports listing, searching, viewing, creating, and
editing estimates. The form selects an active Chain/Company, then its active
Brand and that Brand's active Zone. Estimate totals are calculated and
validated on the server using `BigDecimal`; generated BIGINT IDs are exposed
as decimal strings to avoid JavaScript precision loss. The REST API is rooted
at `/api/v1/estimates` (`GET`, `GET /{id}`, `POST`, and `PUT /{id}`).

Validation recorded during development:

- `mvn -f backend\pom.xml clean compile` — passed.
- `node --check frontend\script.js` — passed.
- Local master-data API responses were checked for the Chain → Brand → Zone
  identifiers and active flags used by the dropdowns.
- `GET /api/v1/estimates` returned HTTP 200 with one estimate during the local
  smoke test; this confirms the endpoint response, not deployment status.
- The user reported successful manual Task 6 testing; the UI test was not
  independently repeated for this review.

### Task 7 – Invoice Management

Invoices are generated from server-loaded Estimates, use a unique
`INV-<database-id>` number, snapshot the Chain company/GST details, and use
`BigDecimal`/DECIMAL totals. The existing application GST default is 18%;
confirm the correct tax treatment before issuing business invoices. One
Estimate can have at most one invoice. Payment requests require an
idempotency key, cannot exceed the outstanding balance, and update status
from the recorded payment total. Existing Invoice and Payment IDs/legacy
columns remain in place. PDFs include invoice, estimate, customer/company,
service, totals, GST, status, and balance details.

Routes (all invoice/payment routes require HTTP Basic authentication):

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/invoices/session` | Verify credentials and return username/roles |
| GET | `/api/v1/invoices/estimates/{estimateId}` | Load eligible Estimate details for invoice creation |
| POST | `/api/v1/invoices` | Create invoice from an Estimate; server computes totals |
| GET | `/api/v1/invoices` | List invoices |
| GET | `/api/v1/invoices/{id}` | View invoice details |
| GET | `/api/v1/invoices/{id}/pdf` | Download invoice PDF |
| POST | `/api/v1/invoices/{id}/email` | Email PDF (ADMIN only; requires SMTP configuration) |
| PUT | `/api/v1/invoices/{id}/status` | Direct status edits are rejected; payment records determine status |
| GET | `/api/v1/payments` | List payment records |
| POST | `/api/v1/payments` | Record an idempotent partial or full payment |

The old `POST /api/v1/invoices/generate` route now returns HTTP 410 because it
accepted browser-submitted invoice totals. Direct status changes through
`PUT /api/v1/invoices/{id}/status` are rejected; status is based on payments.
Invoice quantity and unit price are read from the selected eligible Estimate;
the create request cannot override those values or submit invoice totals.
Users with `USER` or `ADMIN` roles may read/create invoices and record
payments; sending invoice email is restricted to `ADMIN`.

Set these environment variables in the backend environment (never commit
credential values). Java 17, Maven, and a MySQL database that has the matching
fresh schema or manually reviewed migrations are required:

```text
DB_URL=jdbc:mysql://<host>:<port>/ims_db_task7_test
DB_USERNAME=<database-user>
DB_PASSWORD=<database-password>
PORT=8080
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USERNAME=<smtp-user>
SMTP_PASSWORD=<smtp-password>
SMTP_AUTH=true
SMTP_STARTTLS=true
SMTP_FROM=<verified-sender-address>
```

SMTP configuration is optional for startup and PDF download. Email sending
returns an explicit configuration error when SMTP settings are missing. It
reports success only after the configured mail sender accepts the message.
Because no client email column exists, the recipient is entered when creating
or emailing an invoice.

For local testing, set the environment variables above in the backend shell,
then run `mvn -f backend\pom.xml spring-boot:run` from the repository root.
Serve the frontend with `python -m http.server 5500` from `frontend` and open
`http://localhost:5500`. Authenticate with an already provisioned database
account; the app has no public registration flow. To run automated checks:

```cmd
mvn -f backend\pom.xml clean compile
mvn "-Dnet.bytebuddy.experimental=true" -f backend\pom.xml test
node --check frontend\script.js
git diff --check
```

Automated unit/security tests do not replace manual testing against the
disposable database. Verify sign-in and role restrictions, create an invoice
from an eligible estimate, list and view it, download its PDF, record a partial
and full payment, retry an idempotency key, reject an overpayment, and (with
SMTP configured) send the PDF. Verify that direct status edits are rejected.
Do not use production credentials or modify production data during rehearsal.

Task 7 validation status for this checkout:

- `mvn -f backend\pom.xml clean compile` — passed; compiled 57 Java sources.
- `mvn "-Dnet.bytebuddy.experimental=true" -f backend\pom.xml test` — passed
  (15 tests, 0 failures/errors).
- `node --check frontend\script.js` and `git diff --check` — passed.
- MySQL migration, live DB compatibility, end-to-end invoice/payment/PDF/SMTP,
  and Railway deployment — not executed or verified for Task 7.

---

## Run Backend Locally

Open Command Prompt inside the `backend` folder:

```cmd
mvn spring-boot:run
```

The backend runs locally on:

```text
http://localhost:8080
```

---

# Frontend Setup

Open Command Prompt inside the `frontend` folder and run:

```cmd
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

The frontend communicates with the backend through REST APIs.
To target another backend in a deployed static frontend, set the
`ims-api-base` meta tag in `frontend\index.html` to that backend's `/api/v1`
base URL before publishing the frontend.

---

# API Examples

## Client API

### Get All Clients

```text
GET /api/v1/clients
```

### Get Client By ID

```text
GET /api/v1/clients/{id}
```

### Create Client

```text
POST /api/v1/clients
```

---

# Deployment configuration

The repository contains Railway/Aiven URLs from earlier project
configuration. Task 7 has not been deployed or verified against those services.
Configure backend and frontend environment variables in the target platform
before deploying.

## Configured frontend URL

**Frontend URL:**

https://frontend-production-267e4.up.railway.app

## Configured backend URL

**Backend URL:**

https://mis-invoicing-system-production-c653.up.railway.app

## Configured Client API URL

```text
https://mis-invoicing-system-production-c653.up.railway.app/api/v1/clients
```

## GitHub Repository

https://github.com/manishabhar280/MIS-Invoicing-System-ITVedant

---

# Intended deployment architecture

```text
User
  │
  ▼
Railway Frontend
  │
  │ REST API
  ▼
Railway Spring Boot Backend
  │
  │ JDBC / JPA
  ▼
Aiven MySQL Database
```

The frontend and backend can be deployed as separate services. The backend
database connection must be supplied through environment variables.

---

# Testing

The following are historical project test notes; they do not verify the Task 7
invoice changes or the current deployed services:

### Backend

* Spring Boot application startup
* Prior backend startup and Client/Invoice/Payment API testing (as recorded by
  the project owner in earlier documentation)

### Frontend

* Prior UI/API communication checks (as recorded in earlier documentation)

### Production Testing

Task 7's live database, migration, API, PDF, SMTP, and frontend flow still
require testing in a non-production environment before deployment.

---

# Local URLs

### Frontend

```text
http://localhost:5500
```

### Backend

```text
http://localhost:8080
```

### Client API

```text
http://localhost:8080/api/v1/clients
```

---

# Security

Sensitive configuration is handled using environment variables.

The project follows these basic security practices:

* Database credentials are not stored in source code.
* `.env` files are excluded using `.gitignore`.
* Passwords and other secrets should not be committed to GitHub.
* Production database credentials are configured through Railway environment variables.
* Environment-specific configuration is separated from application code.

---

# Documentation

Detailed end-user instructions are available in:

```text
docs/USER_GUIDE.md
```

The user guide covers:

* System requirements
* Application startup
* User registration
* Login
* Role-based access
* Client management
* Invoice generation
* Payment management
* Estimates
* Other modules
* Logout
* Troubleshooting

---

# Internship Project

This project is developed as part of the **IT Vedant Internship Program**.

The project demonstrates practical implementation of:

* Frontend development
* Backend development
* REST API integration
* Database management
* Git & GitHub
* Cloud deployment
* Environment variable configuration
* End-to-end application testing

---

# Developer

**Manisha Bhardwaj**

BTech Computer Science and Engineering

---

# Repository

GitHub Repository:

https://github.com/manishabhar280/MIS-Invoicing-System-ITVedant

---

## Project Status

Task 7 local backend compilation, unit/security tests, JavaScript syntax, and
diff whitespace checks have passed. Task 7 migration execution, live database
compatibility, end-to-end invoice/payment/PDF/SMTP behavior, and deployment
have not been verified. Any earlier Railway/Aiven status below is historical
project context and does not confirm that this Task 7 version is deployed.

**Documentation:** Available in `docs/USER_GUIDE.md`
