# Emeris Pulse data model

Azure SQL stores operational data for the member, instructor, and admin apps. A person has one login (`Users`) and at most one gym membership. An instructor keeps the Instructor role and may also hold a personal membership, which is how they enter the gym as a member.

```mermaid
erDiagram
    Users ||--o| Memberships : holds
    Users ||--o{ RefreshTokens : rotates
    Users ||--o{ AccessPasses : carries
    Users ||--o{ AccessEvents : generates
    AccessPasses ||--o{ AccessEvents : redeems
    Users ||--o{ ClassSessions : instructs
    ClassSessions ||--o{ Bookings : contains
    Users ||--o{ Bookings : makes
    Equipment ||--o{ EquipmentSessions : logs
    Users ||--o{ EquipmentSessions : starts
    Equipment ||--o{ MaintenanceTickets : raises
    Users ||--o{ MaintenanceTickets : reports
    Users ||--o{ Challenges : creates
    Challenges ||--o{ ChallengeEnrolments : has
    Users ||--o{ ChallengeEnrolments : joins
    Users ||--o{ Notifications : receives

    Users {
        int Id PK
        string Email UK
        string PasswordHash
        string Role
        string CampusIdentifier UK
        string FirstName
        string LastName
        string Phone
    }
    Memberships {
        int Id PK
        int UserId FK
        string MemberType
        string Status
        date StartDate
        date ExpiryDate
    }
    Bookings {
        int Id PK
        int ClassSessionId FK
        int UserId FK
        string Status
    }
    AccessEvents {
        int Id PK
        int UserId FK
        datetime OccurredAt
        string Result
    }
    Equipment {
        int Id PK
        string Code UK
        string Status
    }
    MaintenanceTickets {
        int Id PK
        int EquipmentId FK
        string Status
    }
```

Status values are enforced with check constraints.

- User role: Student, Staff, Instructor, GymAdmin, FacilityManager, SystemAdmin
- Membership: Pending, Active, Frozen, Expired. Member type is Student (about 120 days) or Staff (about 365 days)
- Booking: Booked, Waitlisted, Cancelled, Attended, Absent. One row per member per class
- Equipment: Available, OutOfService
- Maintenance ticket: Open, InProgress, Closed

Indexes used by the live screens: access events by time, bookings by class and status, equipment by status.
