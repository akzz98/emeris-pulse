# Emeris Pulse

Digital platform for the Emeris campus gym. Members use a phone app for access, classes, equipment, and challenges. Instructors run their classes from a web app. Gym staff run the floor, the timetable, and the facility from a third web app. One API serves all three.

Membership, door access, class bookings, equipment, maintenance, challenges, and notices all live in the same system. Notices stay inside the app. They are not sent by email or text.

Task 2 implementation walkthrough: https://youtu.be/DALwdxsRzwE

## Who uses it

| App | Who signs in | What they can do |
| --- | --- | --- |
| Member | Students and staff. An instructor can also sign in here with their personal membership. | Register, see activity, enter with a QR pass, book classes, use machines, join challenges, read notices, update contact details. |
| Instructor | Instructor accounts only. Any other role is turned away at sign-in. | See today's roster, mark attendance, cancel a class, message booked members, and report unsafe studio equipment. |
| Admin | Gym admin, facility manager, and system admin. | Depends on the role. The facility manager sees crowding, reports, maintenance, and closure notices. Gym admins and system admins also run the desk, memberships, timetable, challenges, and broadcasts. Only a system admin can change roles. |

Sign-in is email and password. The API issues a 15-minute JWT and a hashed refresh token. Using the refresh token revokes it and issues a new pair. Campus Microsoft Entra ID is not available to this group, so the app issues its own tokens. Each person still has a campus identifier. QR access is implemented. NFC stays a future hardware step.

The member app opens with a short splash, then sign-in. Returning members who already have a session skip the splash. It is installable on a phone (standalone display, Emeris icon). A service worker keeps a cached copy of the shell and falls back to it when the network drops. Gym actions still need the API. Signed-in screens use path URLs (`/access`, `/classes`, and so on) so the browser Back button returns to the previous screen. The admin and instructor apps do the same.

Signed-in member navigation is **Home · Access · Classes · More**. More opens Equipment, Challenges, Notifications, Membership, and Profile.

## Member app

Live: https://emeris-pulse-member.azurewebsites.net

### Create a profile and sign in

A new member registers with first name, last name, email, campus identifier, an optional phone, and a password of at least 8 characters. They choose student or staff.

- A student membership is created for 120 days.
- A staff membership is created for 365 days.
- The membership starts as **Pending**. An admin has to activate it before the person can enter, book, use a machine, or join a challenge.
- Email and campus identifier must be unique.

### Home

The home screen greets the member and summarises their gym life:

- **Streak** — consecutive days with a granted visit or a class. If today has no activity yet, the streak still counts when it runs through yesterday.
- **Visits, classes, equipment sessions, and challenges joined.**
- **Recent activity** — the latest visits, booked or attended classes, equipment sessions, and challenge joins.

Staff memberships also get **workday prompts**. These suggest up to two upcoming classes that start between 06:00 and 17:00, and one open challenge. A class the member has already booked is labelled as booked. Tapping a prompt opens Classes or Challenges. Students do not see these prompts. Quick actions on Home are Show QR, Browse classes, and Use equipment.

### Membership

Shows status, type, start date, and expiry, and says whether entry is allowed. Open Membership from More.

Entry is allowed only while the membership is **Active** and the expiry date has not passed. Pending, frozen, and expired memberships cannot enter. An active membership that has passed its expiry date is recorded as **Expired** the next time it is loaded.

### Access

An active member can issue a signed pass. The phone shows it as a QR code with a countdown. Open Access from the primary nav, or Show QR from Home.

- The pass lasts **60 seconds**.
- Students and staff get the same kind of pass.
- The code is single-use. A second scan is refused and stored as “Pass already used.”
- A pending, frozen, or expired membership cannot get a pass. If a signed code is presented after the membership is no longer active, the scan is refused and logged.
- After the countdown hits zero, the member can issue a new pass.
- The on-screen countdown updates every second. Screen-reader announcements fire when the pass is issued, at selected thresholds, and when it expires.

### Classes

One screen lists the timetable with day chips. Each class shows time, studio, instructor, seats left, and a status badge (Booked, Waitlisted, Full, or seats remaining). Book, Join waitlist, and Cancel sit on the same card.

Booking rules:

- An active membership is required.
- A free seat is booked immediately, and a class reminder is written into Notifications.
- A full class puts the member on the waitlist. Waitlist does not send a reminder, because they do not have a seat yet.
- One place per member per class. A cancelled place can be booked again.
- Booking closes once the class has started.
- Cancelling a booked place asks for confirmation first (a waitlisted member may be promoted). Before the class starts, that seat goes to the earliest person on the waitlist and they get a class reminder.
- Cancelling a waitlist place frees nobody.

### Equipment

Open Equipment from More. The floor lists every machine, its code, location, and whether it is available or out of service. The member types the code on the machine, or picks **Use this code**, to start a session.

- An active membership is required.
- A machine that is out of service cannot be started.
- A machine someone else is already using cannot be started.
- A member can have only one open session. They end it before starting another. Ending asks for confirmation and names the machine.
- While a session is open they can describe a fault. That opens a maintenance ticket. A second open ticket for the same machine is refused.
- Reporting a fault does not by itself take the machine off the floor. Facility staff do that from the maintenance queue.

### Challenges

Open Challenges from More. Open campus challenges are listed with their description and dates. An active member can join each challenge once, and only while today falls inside its start and end dates. The app records the join. It does not score progress or close the challenge on its own.

### Notifications

Open Notifications from More. Class reminders, class changes, cancellations, instructor notes, gym-closure notices, and broadcasts appear here. An unread notice is marked **New**. Nothing is emailed or texted. The More item shows an unread badge when there are unread notices.

### Profile

Open Profile from More. The member can change first name, last name, and phone (optional). Email and campus identifier stay as they were at registration. Phone is a contact field on the profile. Notices are not sent to it.

## Instructor app

Live: https://emeris-pulse-instructor.azurewebsites.net

An instructor teaches the classes assigned to them. They cannot open another instructor’s class. Primary navigation is **Today · Studio equipment**.

### Today

Today’s scheduled classes. Opening a class reaches class detail with Roster, Attendance, and Message tabs. Waitlisted people are left off the roster. Back to Today returns to the hub; Today stays current in the nav while a class is open.

Under the list, **attendance trends** show classes this instructor has already taken: how many were marked attended, how many absent, and the percentage attended. The percentage is attended divided by attended plus absent.

### Attendance

After a scheduled class has started, the instructor marks each booked member **Attended** or **Absent** from the Attendance tab. A waitlisted place cannot be marked. Attendance cannot be recorded before the start time.

### Class details

From Today, each open class shows time, location, capacity, and booked or waitlisted counts. The instructor can:

- **Send a note** to booked members only. Waitlisted members are not included. The note arrives as a “Class message” in Notifications.
- **Cancel the class.** A confirmation names how many booked and waitlisted members will be told. The notice says the class will not run. A class that has already ended cannot be cancelled.

### Studio equipment

Lists machines whose location is a studio. The instructor reports kit that is unsafe by code and description. That opens a maintenance ticket without starting a member session. Floor machines such as the cardio row stay on the member equipment screen. A machine that already has an open ticket cannot be reported again.

An instructor may also hold a personal student membership. That membership is how they use the member app and enter the gym. It does not change their Instructor role.

## Admin app

Live: https://emeris-pulse-admin.azurewebsites.net

The header reads **Facility** for a facility manager and **Admin** for a gym admin or system admin.

Gym admin and system admin navigation is grouped: **Dashboard · Desk · People · Schedule · Facility · Comms**. Desk opens Scan entry, Access logs, and Temporary pass. People opens Members (and Roles for system admin only). Schedule opens Timetable. Facility opens Maintenance and Reports. Comms opens Challenges and Broadcast. Gym closure stays on the Dashboard. They land on **Dashboard**.

Facility manager navigation stays flat: **Dashboard · Reports · Maintenance** only.

| Screen | Gym admin | System admin | Facility manager |
| --- | --- | --- | --- |
| Dashboard | Yes. Landing screen. | Yes. Landing screen. | Yes. Landing screen. |
| Reports | Yes | Yes | Yes |
| Maintenance | Yes | Yes | Yes |
| Scan entry | Yes | Yes | |
| Access logs | Yes | Yes | |
| Members | Yes | Yes | |
| Temporary pass | Yes | Yes | |
| Timetable | Yes | Yes | |
| Challenges | Yes | Yes | |
| Broadcast | Yes | Yes | |
| Roles | | Yes | |

### Dashboard

- **On the floor** — people with a granted entry in the last **90 minutes**, and the time they entered. The count refreshes every 30 seconds. Quick actions reach Scan entry, pending memberships, and open tickets.
- **Utilisation** — granted visits today and across the last 7 days, grouped by hour in campus time. The busiest hour is called out. If two hours tie, both are shown. The full hour list can be expanded. Refused scans are not counted.
- **Gym closure** — a start date, end date, and reason. A confirmation summarises who will be told before the notice is sent. Members who have a class on those days are told. Everyone else is left alone. A closure that should reach the whole campus is a broadcast instead.

### Reports

Three paged reports. Each report uses **15 rows per page**, with previous and next.

- **Class fill rate** — held seats against capacity. A waitlisted member does not count as a held seat. The summary is the fill across scheduled classes.
- **Equipment downtime** — machines that are out of service, how long they have been down, and how many tickets are still open. Downtime is counted from the earliest ticket that is still open.
- **Wellness participation** — each challenge, whether it is open, and how many people joined. A person is counted on every challenge they joined.

### Scan entry

The desk can point a webcam at the member’s QR pass (**Start camera**), or paste the signed code from the phone or a temporary pass. A decoded QR redeems automatically. The scan does not sign in as the member. Each attempt is stored:

- **Granted** when the pass is valid, unused, and the membership can enter.
- **Refused** when the membership is not active, or the pass was already used.

Login attempts are limited to 10 a minute per caller. Pass redemptions are limited to 30 a minute, so a class can arrive together while repeated guesses of a token are slowed down.

### Access logs

A paged table of granted and refused scans: when, member, result, and reason. Filters cover Granted/Refused and member search. The desk view shows **15 rows** per page. On a phone the rows stack with column labels.

### Members

Tabs for Pending, Active, and Frozen, plus search by name, email, or campus identifier. Empty states show when a tab or search has no rows.

- **Pending** — Approve sets the membership to Active, if it has not already expired.
- **Active** — Freeze asks for confirmation first, then stops entry until someone activates them again.
- **Frozen** — Activate puts them back to Active.

Only a pending or frozen membership can be activated. Only an active membership can be frozen. A membership whose expiry date has already passed cannot be activated. There is no screen to extend an expiry date.

### Temporary pass

For a lost phone. The desk enters the member’s email and gets a QR code.

- The membership must still be active.
- The pass lasts **15 minutes** and is single-use.
- It is redeemed on Scan entry the same way as a phone pass.

### Timetable

Publish a class with title, instructor, start, end, capacity, and location. The instructor must already have the Instructor role. The class must end after it starts.

An existing scheduled class can be edited inline. Capacity cannot drop below the number of places already booked. If the title, time, location, or instructor changes, a confirmation warns that booked and waitlisted members will be told, then they get a “Class changed” notice. A capacity-only change does not send a notice.

### Challenges

Publish a campus challenge with a title, description, and start and end dates. The end date can be the same day as the start, and cannot be earlier. An existing challenge can be edited, or ended (with confirmation) so members can no longer join. Members join it from Challenges in the member app while it is open. The admin list shows each challenge and how many people have joined.

### Broadcast

One title and message, sent to every account in the roles that are ticked: Student, Staff, Instructor, Gym admin, Facility manager, System admin. Other roles are skipped. Inactive memberships are included. Before send, the form shows an estimated recipient count for the chosen roles. A confirmation summarises the audience. The notice appears in each recipient’s Notifications.

### Maintenance

The open ticket queue: machine, location, description, who reported it, and when.

- If the machine is still available, **Take out of service** asks for confirmation, then marks it out of service so members cannot start it.
- **Close ticket** asks for confirmation. If the machine is out of service and this was its last open ticket, closing it puts the machine back in service. Another open fault keeps it off the floor.

### Roles

System admin only, under People. Every account is listed with name, email, and campus identifier. Search narrows the list; an empty directory or no matches shows an empty state. The admin picks a new role and saves it. They cannot change their own role. Assignable roles are Student, Staff, Instructor, Gym admin, Facility manager, and System admin.

## Status values

These are enforced in the database.

| Record | Values |
| --- | --- |
| User role | Student, Staff, Instructor, GymAdmin, FacilityManager, SystemAdmin |
| Membership | Pending, Active, Frozen, Expired. Type is Student (120 days) or Staff (365 days). |
| Class | Scheduled, Cancelled, Completed |
| Booking | Booked, Waitlisted, Cancelled, Attended, Absent. One row per member per class. |
| Access event | Granted, Refused |
| Access pass | Standard (60 seconds, from the phone) or Temporary (15 minutes, from the desk). Both are single-use. |
| Equipment | Available, OutOfService |
| Maintenance ticket | Open, InProgress, Closed. A member or instructor report starts as Open. Closing it is what the desk does today. |

## Demo accounts

Demo password for every seeded account: `Pulse123!`

| Email | Who they are |
| --- | --- |
| student@emeris.test | Lindiwe Nkosi, student, active membership |
| staff@emeris.test | Johan Botha, staff, active staff membership. Home shows workday prompts. |
| instructor@emeris.test | Ayesha Khan, instructor, plus a personal student membership |
| admin@emeris.test | Peter Naidoo, gym admin |
| facility@emeris.test | Nomsa Dlamini, facility manager |
| sysadmin@emeris.test | Chris Jacobs, system admin |
| pending@emeris.test | Sam Patel, student, membership waiting for approval |
| frozen@emeris.test | Elena Jacobs, student, frozen membership. A refused scan is in the access log. |

Seeded gym data, dates relative to the day the seed ran:

- **Morning Cycle**, Studio A, capacity 2. Lindiwe and Johan are booked. Ayesha is on the waitlist.
- **Lunch Yoga**, Studio B, capacity 20. Lindiwe is booked.
- A cancelled **Evening Boxing** remains in the history.
- Machines: TREAD-01 Treadmill 1 (cardio row, available), TREAD-02 Treadmill 2 (out of service, open ticket: the belt slips above 8 km/h), BIKE-01 Spin bike 1 (Studio A), RACK-01 Squat rack (free weights).
- **Semester Steps** — visit the gym eight times before the end of the semester. Lindiwe and Johan have joined.
- Lindiwe has a class reminder for Morning Cycle, a past treadmill session, and a granted visit. Johan has a granted visit. Elena has a refused visit.

Running `database/seed.sql` again does not duplicate that data. The diagram of the tables is in `docs/erd.md`.

## Live sites

Every live address is HTTPS. Azure terminates TLS on `azurewebsites.net`.

| App | URL |
| --- | --- |
| API health | https://emeris-pulse-api.azurewebsites.net/health |
| Member | https://emeris-pulse-member.azurewebsites.net |
| Instructor | https://emeris-pulse-instructor.azurewebsites.net |
| Admin | https://emeris-pulse-admin.azurewebsites.net |

`GET /health` returns `{"status":"ok","service":"emeris-pulse-api"}`.

The database is Azure SQL Standard S0 (10 DTU, 100 MB). That size stays on the student subscription’s free S0 meter, which covers one S0 database for 31 days a month. The API and the three web apps share one Linux B1 App Service plan, paid from the Azure for Students credit of $100. Extra apps on that plan do not add a second plan charge.

Static Web Apps Free was not used. That service can only be created in Central US, East US 2, West US 2, West Europe, and East Asia. This student subscription can create resources only in Austria East, Brazil South, Italy North, Spain Central, and Central India, so the two lists do not overlap. The four sites therefore sit on one Linux B1 plan in Spain Central. The database stays a separate Azure SQL server, so publishing a web app does not replace the data. `GET /health` is the check that the API process is up and answering.

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

| App | URL |
| --- | --- |
| API health | http://localhost:4000/health |
| Member | http://localhost:5173 |
| Instructor | http://localhost:5174 |
| Admin | http://localhost:5175 |

`.env.example` sets the API port, the three local web origins, the JWT secret, and the local SQL connection string. The API reads `CORS_ORIGINS` and only those origins may call it.

## Stack

- Member, instructor, and admin apps: React, TypeScript, Vite
- Shared Emeris visual system in `packages/ui` (logo, shell, navigation, forms, loading and error states)
- Shared roles in `packages/shared`
- API: Node.js, Express, TypeScript
- Database: Azure SQL. Locally this is Azure SQL Edge via Docker. See `database/README.md`.
- Member QR codes are drawn in the browser from the signed token. The scanner reads that token, not a membership number.

## Repository layout

- `apps/member` — installable member experience
- `apps/instructor` — instructor web
- `apps/admin` — gym admin, facility manager, and system admin
- `apps/api` — HTTP API
- `packages/ui` — Emeris visual system
- `packages/shared` — roles and types shared by the apps and the API
- `database` — Azure SQL schema and seed
- `docs` — data model (`docs/erd.md`), hosted demo script (`docs/DEMO.md`), and the project attendance register
- `.github/workflows` — pull-request checks and the deploy to Azure

## API

Authenticated routes expect `Authorization: Bearer`. The door redeem route is the exception: the signed pass is the credential.

| Method | Path | Who |
| --- | --- | --- |
| GET | `/health` | Anyone |
| POST | `/auth/register` | Anyone. Body: email, password, role (`Student` or `Staff`), campus identifier, first name, last name, optional phone. |
| POST | `/auth/login` | Anyone. Rate limited. |
| POST | `/auth/refresh` | Anyone with a live refresh token. |
| GET | `/me` | Signed-in user |
| PATCH | `/me` | Signed-in user. First name, last name, phone. |
| GET | `/users` | System admin |
| PATCH | `/users/:userId/role` | System admin. Cannot target themselves. |
| GET | `/memberships/me` | Signed-in user |
| GET | `/memberships/pending`, `/memberships/active`, `/memberships/frozen` | Gym admin, system admin |
| POST | `/memberships/:userId/activate`, `/memberships/:userId/freeze` | Gym admin, system admin |
| GET | `/activity/me` | Signed-in user |
| POST | `/access/passes` | Signed-in user with an active membership |
| POST | `/access/passes/temporary` | Gym admin, system admin. Body: member email. |
| POST | `/access/redeem` | Anyone with a pass token. Rate limited. |
| GET | `/access/events` | Gym admin, system admin |
| GET | `/access/occupancy`, `/access/utilisation` | Facility manager, gym admin, system admin |
| GET | `/classes/timetable` | Signed-in user |
| POST | `/classes/:classId/bookings` | Signed-in user with an active membership |
| DELETE | `/classes/:classId/bookings/me` | Signed-in user |
| GET | `/classes/roster`, `/classes/attendance`, `/classes/trends`, `/classes/mine` | Instructor |
| POST | `/classes/:classId/attendance` | Instructor. Body: user id and `Attended` or `Absent`. |
| POST | `/classes/:classId/message` | Instructor |
| POST | `/classes/:classId/cancel` | Instructor |
| GET | `/classes/manage` | Gym admin, system admin |
| POST | `/classes` | Gym admin, system admin |
| PATCH | `/classes/:classId` | Gym admin, system admin |
| GET | `/equipment`, `/equipment/sessions/current` | Signed-in user |
| POST | `/equipment/sessions` | Signed-in user. Body: machine code. |
| POST | `/equipment/sessions/current/fault` | Signed-in user |
| POST | `/equipment/sessions/current/end` | Signed-in user |
| GET | `/equipment/studio` | Instructor |
| POST | `/equipment/studio/tickets` | Instructor |
| GET | `/equipment/tickets` | Facility manager, gym admin, system admin |
| POST | `/equipment/:equipmentId/out-of-service` | Facility manager, gym admin, system admin |
| POST | `/equipment/tickets/:ticketId/close` | Facility manager, gym admin, system admin |
| GET | `/challenges` | Signed-in user |
| POST | `/challenges/:challengeId/join` | Signed-in user with an active membership |
| GET | `/challenges/manage` | Gym admin, system admin |
| POST | `/challenges` | Gym admin, system admin |
| PATCH | `/challenges/:challengeId` | Gym admin, system admin |
| POST | `/challenges/:challengeId/end` | Gym admin, system admin |
| GET | `/notices/me` | Signed-in user |
| POST | `/notices/broadcast/estimate` | Gym admin, system admin |
| POST | `/notices/broadcast` | Gym admin, system admin |
| POST | `/notices/closure` | Gym admin, facility manager, system admin |
| GET | `/reports/class-fill`, `/reports/equipment-downtime`, `/reports/wellness` | Facility manager, gym admin, system admin |

## Front end

The three apps share one visual system in `packages/ui`: the Emeris logo, teal bar (`#004559`), ink text on a light surface, Segoe UI, and the same shell, navigation, fields, and buttons. A screen in the member app looks like a screen in the admin app. Navigation items are underlined so they read as actions. The current screen sets `aria-current`. Primary actions use the shared button. Forms use a visible label on every field.

Loading, empty, error, and success states come from the same components. They use `role="status"` and `aria-live` so a booking, a scan, or a failed sign-in is announced, not only painted. A skip link is the first control in the shell. Focus uses a visible outline. Body text is `100%`, so browser zoom changes the size. Colour pairs are teal on white, ink on the page surface, and separate danger and success colours for refused and granted outcomes.

The member app is built for a phone. The viewport is set, the column stays narrow, navigation wraps, and the app can be installed (standalone display, Emeris icon). Instructor and admin use the same wrapping navigation at desktop width. The access log rearranges below 40rem so the desk table does not force a sideways scroll on a phone. There is no second layout per device. One column is readable from a phone through a desktop window.

The member shell is cached by a service worker so the frame still opens if the network drops. Gym actions still wait for the API. Screens do not ship large images. The QR is a small data URL drawn on the phone.

## Security

Passwords are hashed with bcrypt (cost 10) and are never returned by the API. Sign-in issues a 15-minute JWT and a refresh token stored only as a hash. Using a refresh token revokes it and issues a new pair. Routes check the role before they run. A student cannot open admin routes. An instructor cannot approve a membership. A system admin cannot change their own role.

Request bodies are checked with Zod before they reach a service. A bad body returns `400`. A broken business rule returns `409`. A missing or refused permission returns `401` or `403`. Unexpected failures return `500` with no internal detail. The door redeem route does not use the signed-in session. The signed pass is the credential, and it is single-use.

The API sends a Helmet content security policy that allows nothing to be loaded from it, because it returns JSON only. Each web app sends its own policy: scripts and styles from that app, images from that app plus the QR data URL, and connections only to itself and the API. `frame-ancestors` is none. CORS allows only the origins in `CORS_ORIGINS`. Login is limited to 10 requests a minute per caller. Pass redemption is limited to 30 a minute. Azure terminates TLS on the live sites. The API trusts one proxy hop so those limits see the caller, not the load balancer.

## Performance

The hosted member home page at https://emeris-pulse-member.azurewebsites.net should answer within 2 seconds. Recent checks returned in under 1 second.

## Data flow

A screen calls the API with the bearer token. The route validates the body, the service applies the business rule, and the repository reads or writes Azure SQL. The JSON result is what the screen shows. A booking, a scan, a ticket, and a challenge join are rows in that database, not state kept only in the browser.

Rules that must stay true live in `apps/api/src/domain` and are unit tested. Each feature is a module under `apps/api/src/modules` with a route, schema, service, and repository. Status values, date order, and capacity are also check constraints in `database/schema.sql`, so a bad row cannot be inserted past the API. Indexes used by the live screens are access events by time, bookings by class and status, equipment by status, classes by status and start, and challenges by start date. The table diagram is `docs/erd.md`.

## POPIA

Membership, access, and wellness data are used only for gym operations. They are not used for marketing or shared outside the gym.

## Pipeline

Changes do not land on `main` directly. A feature branch merges into `develop` through a pull request. `develop` merges into `main` through a pull request. `main` is the release branch.

A pull request into `main` or `develop` runs `.github/workflows/ci.yml` before the merge:

- typecheck across the API and the three apps
- unit tests for the domain rules
- API tests against Azure SQL Edge, with `database/schema.sql` and `database/seed.sql` applied

A push to `main` runs `.github/workflows/cd.yml`. That workflow builds the API and the three web apps and deploys them to the four App Service sites. The web apps are built with `VITE_API_URL` pointing at the live API. Deployment is that workflow. Files are not copied up by hand.
