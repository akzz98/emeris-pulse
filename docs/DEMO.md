# Emeris Pulse demo script

Spoken lines are in quotes. Walk this on the local apps (or the hosted sites). The password for every seeded account is `Pulse123!`.

| App | Local | Hosted | Who signs in |
| --- | --- | --- | --- |
| Member | http://localhost:5173 | https://emeris-pulse-member.azurewebsites.net | `student@emeris.test`, then `pending@emeris.test` and `frozen@emeris.test` |
| Instructor | http://localhost:5174 | https://emeris-pulse-instructor.azurewebsites.net | `instructor@emeris.test` |
| Admin | http://localhost:5175 | https://emeris-pulse-admin.azurewebsites.net | `admin@emeris.test`, then `facility@emeris.test`, then `sysadmin@emeris.test` |

Keep three browser windows open, one per app. Do not cancel Morning Cycle or Lunch Yoga. Do not freeze Lindiwe, Johan, or Ayesha. Do not change a seeded role. When a confirmation dialog opens, use **Keep…** / Cancel to leave seeded data alone unless the step says otherwise.

Classes were seeded for the day after the database was loaded. If Today’s instructor roster is empty, the scheduled classes are still ahead of “now.” After a class start time has passed, Today lists it and Attendance can be marked.

## 1. Member, active student

Sign in as Lindiwe Nkosi, `student@emeris.test`. Primary nav is **Home · Access · Classes · More**.

**Home.** "This is the member home. Lindiwe has a visit streak, quick actions for QR, classes, and equipment, and recent activity."

Show QR / Browse classes / Use equipment. Open More and point out Equipment, Challenges, Notifications, Membership, and Profile.

**Access.** From Home press Show QR, or open Access. "The pass is a QR code that expires in about 60 seconds, and it can be scanned once." Leave this window open for the admin scan. If the countdown hits zero, press New pass.

**Classes.** "One screen for the timetable. Day chips, seats, and Book, Join waitlist, or Cancel on the card." Show Morning Cycle and Lunch Yoga. "Cancelling a booked place asks first, because a waitlisted member may get the seat. I will leave her bookings as they are."

**Equipment.** More → Equipment. "Treadmill 2, TREAD-02, is out of service." Enter `TREAD-02` and Start session. The screen refuses. Press Use this code on Spin bike 1 or the squat rack if available, Start session, then End session. Confirm ending when asked. Do not report a fault during the demo.

**Challenges.** More → Challenges. "Lindiwe has joined Semester Steps and Evening Walk. Each challenge can be joined once while it is open."

**Notifications.** More → Notifications. "Notices stay in the app: reminders, instructor notes, closures, and broadcasts."

**Membership / Profile.** More → Membership, then Profile. "Active student membership, 120 days. Phone is optional. Email and campus identifier stay fixed."

## 2. Member, pending and frozen

Sign out. Sign in as Sam Patel, `pending@emeris.test`.

**Membership.** "Pending until a gym administrator approves. Sam cannot enter."

**Access.** "The pass is refused: the membership must be active."

Sign out. Sign in as Elena Jacobs, `frozen@emeris.test`.

**Membership.** "Frozen also blocks entry until an administrator activates her."

## 3. Instructor

Sign in as Ayesha Khan, `instructor@emeris.test`. Nav is **Today · Studio equipment**.

**Today.** "Today’s classes. Open a card for roster, attendance, and messages. Waitlisted people are not on the roster." If the list is empty, the classes have not started yet for “today.”

Open an upcoming class if one is listed. Show Roster / Attendance / Message. "Attendance opens only after the class has started."

Type a short note on a class with booked members and send it. "The note goes only to booked members. The waitlist is not included."

Do not press Cancel class. If you open Cancel, choose Keep class so the timetable stays intact.

**Studio equipment.** "Studio kit can be reported without a member session. A floor machine is refused." Enter `TREAD-01` and a short description, then Report. The screen refuses floor kit. Mention BIKE-01 as the studio machine if you show a successful path on a later run.

## 4. Admin desk (gym admin)

Sign in as Peter Naidoo, `admin@emeris.test`. He lands on **Dashboard**. Nav groups are **Dashboard · Desk · People · Schedule · Facility · Comms**. There is no Roles item.

**Dashboard.** "On the floor for 90 minutes after a granted scan. Utilisation is granted visits only. Quick actions reach scan, pending members, and tickets. Gym closure asks for confirmation before it notifies members with a class that day. I will not send another closure."

**Desk → Scan entry.** "Camera or paste. Start camera if a webcam is available; otherwise paste." Copy the pass from Lindiwe’s Access screen and Redeem pass (or let the camera read the QR). "Entry granted." Paste or scan the same code again. "Already used." If the 60 seconds passed, issue a new pass on her phone first.

**Desk → Access logs.** "Granted and refused scans, 15 per page, with result filter and member search."

**People → Members.** "Pending, Active, and Frozen tabs, plus search. Approve Sam if you want a live activation; otherwise leave seeded accounts. Freeze asks for confirmation first—choose Keep active."

**Desk → Temporary pass.** Enter `pending@emeris.test` — refused. Enter `student@emeris.test` — "Pass issued for Lindiwe."

**Schedule → Timetable.** "Publish or Edit. Capacity cannot drop below booked places. A change that would notify members asks first. I will not save an edit."

**Comms → Challenges.** "Open challenges show phase and join counts. Edit or End use confirmation for End. Members join from Challenges in the member app."

**Comms → Broadcast.** Tick Student. "The form estimates how many people will receive this. Confirm summarises the audience. Keep drafting so we do not spam Lindiwe."

**Facility → Reports.** "Class fill, downtime, and wellness participation, 15 rows per page."

**Facility → Maintenance.** "Out of service and Close ticket both confirm first. Leave TREAD-02 as it is."

## 5. Facility manager

Sign out. Sign in as Nomsa Dlamini, `facility@emeris.test`.

"The facility manager sees Dashboard, Reports, and Maintenance only."

Open Maintenance and show the TREAD-02 ticket. Do not close it. If you open Take out of service or Close, choose Keep…

## 6. System administrator

Sign out. Sign in as Chris Jacobs, `sysadmin@emeris.test`.

"Same desk groups as the gym admin, plus Roles under People. Chris cannot change his own role."

People → Roles. Search for `Lindiwe` to narrow the list. Clear the search. Chris’s row says this is your account. Do not save a role change.

## If a screen looks empty

- Today’s roster stays empty until a class start time has passed.
- The floor count drops to zero 90 minutes after the last granted scan. Issue a new QR and redeem it.
- A QR older than about 60 seconds will not redeem. Issue a new one on Access.
- Signing out of the member app returns to sign-in. Use Create a profile only when you mean to register.
- Browser Back moves between screens because each app uses path URLs (`/access`, `/classes`, `/scan`, `/studio`).
