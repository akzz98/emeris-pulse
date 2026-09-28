# Database

`schema.sql` creates the `emeris_pulse` database, keys, checks, and indexes. `seed.sql` loads demo accounts and sample classes, equipment, tickets, and a challenge. Running either script again does not duplicate that data.

Local SQL is Azure SQL Edge:

```bash
docker compose up -d
sqlcmd -S localhost,1433 -U sa -P "Emeris_Pulse_Dev1" -C -i database/schema.sql
sqlcmd -S localhost,1433 -U sa -P "Emeris_Pulse_Dev1" -C -i database/seed.sql
```

Demo password for every seeded account: `Pulse123!`

| Email | Role |
| --- | --- |
| student@emeris.test | Student, active membership |
| staff@emeris.test | Staff, active staff membership |
| instructor@emeris.test | Instructor, plus a personal student membership |
| admin@emeris.test | Gym admin |
| facility@emeris.test | Facility manager |
| sysadmin@emeris.test | System admin |
| pending@emeris.test | Student, pending membership |
| frozen@emeris.test | Student, frozen membership |

The diagram is in `docs/erd.md`.
