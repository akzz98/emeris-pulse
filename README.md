# Emeris Pulse

Digital platform for the Emeris campus gym. Members use a phone app for access, classes, equipment, and wellness. Instructors and gym staff use separate web apps. One API serves all three.

## Stack

- Member, instructor, and admin apps: React, TypeScript, Vite
- API: Node.js, Express, TypeScript
- Database: Azure SQL. Locally this is Azure SQL Edge via Docker. See `database/README.md`.
- Hosting: one Linux B1 App Service plan in Spain Central, plus Azure SQL Standard S0
- Pipeline (next): GitHub Actions

Login is email and password with a 15-minute JWT and a hashed refresh token. Campus Microsoft Entra ID is not available to this group, so the app issues its own tokens. Each user still has a campus identifier. QR access is implemented. NFC stays a future hardware step.

## Live sites

Every live address is HTTPS. Azure terminates TLS on `azurewebsites.net`.

| App | URL |
| --- | --- |
| API health | https://emeris-pulse-api.azurewebsites.net/health |
| Member | https://emeris-pulse-member.azurewebsites.net |
| Instructor | https://emeris-pulse-instructor.azurewebsites.net |
| Admin | https://emeris-pulse-admin.azurewebsites.net |

The database is Azure SQL Standard S0 (10 DTU, 100 MB). That size stays on the student subscription’s free S0 meter, which covers one S0 database for 31 days a month. The API and the three web apps share one Linux B1 App Service plan, paid from the Azure for Students credit of $100. Extra apps on that plan do not add a second plan charge.

Static Web Apps Free was not used. That service can only be created in Central US, East US 2, West US 2, West Europe, and East Asia. This student subscription can create resources only in Austria East, Brazil South, Italy North, Spain Central, and Central India, so the two lists do not overlap.

## Run locally

Requires Node.js 22 or newer, and Docker Desktop for the local database.

```bash
npm install
copy .env.example .env
docker compose up -d
sqlcmd -S localhost,1433 -U sa -P "Emeris_Pulse_Dev1" -C -i database/schema.sql
sqlcmd -S localhost,1433 -U sa -P "Emeris_Pulse_Dev1" -C -i database/seed.sql
npm run dev:api
npm run dev:member
npm run dev:instructor
npm run dev:admin
```

Demo password for seeded accounts: `Pulse123!`. Accounts are listed in `database/README.md`.

| App | URL |
| --- | --- |
| API health | http://localhost:4000/health |
| Member | http://localhost:5173 |
| Instructor | http://localhost:5174 |
| Admin | http://localhost:5175 |

Auth routes: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`. Membership routes require `Authorization: Bearer`. Only a system admin can change a role, via `PATCH /users/:userId/role`.

## Repository layout

- `apps/member` — installable member experience
- `apps/instructor` — instructor web
- `apps/admin` — gym admin, facility manager, and system admin
- `apps/api` — HTTP API
- `packages/ui` — Emeris visual system
- `packages/shared` — roles and types shared by the apps and the API
- `database` — Azure SQL scripts
- `docs` — attendance register and, later, the demo and presentation

## Branches

`feature/*` merges into `develop` through a pull request. `develop` merges into `main`, which will deploy.
