USE emeris_pulse;
GO

-- Demo password for every seeded account: Pulse123!
-- Change these accounts before a real deployment.

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = N'student@emeris.test')
BEGIN
    DECLARE @hash NVARCHAR(255) = N'$2b$10$6psskBvsE6zf8og27r0kF.Z31kr5Re91x5IkmPI/EYJWW.PwiHO9u';

    INSERT INTO dbo.Users (Email, PasswordHash, Role, CampusIdentifier, FirstName, LastName, Phone)
    VALUES
        (N'student@emeris.test', @hash, N'Student', N'ST100001', N'Lindiwe', N'Nkosi', N'0820000001'),
        (N'staff@emeris.test', @hash, N'Staff', N'SF200001', N'Johan', N'Botha', N'0820000002'),
        (N'instructor@emeris.test', @hash, N'Instructor', N'IN300001', N'Ayesha', N'Khan', N'0820000003'),
        (N'admin@emeris.test', @hash, N'GymAdmin', N'GA400001', N'Peter', N'Naidoo', N'0820000004'),
        (N'facility@emeris.test', @hash, N'FacilityManager', N'FM500001', N'Nomsa', N'Dlamini', N'0820000005'),
        (N'sysadmin@emeris.test', @hash, N'SystemAdmin', N'SA600001', N'Chris', N'Jacobs', N'0820000006'),
        (N'pending@emeris.test', @hash, N'Student', N'ST100002', N'Sam', N'Patel', NULL),
        (N'frozen@emeris.test', @hash, N'Student', N'ST100003', N'Elena', N'Jacobs', N'0820000008');

    DECLARE @studentId INT = (SELECT Id FROM dbo.Users WHERE Email = N'student@emeris.test');
    DECLARE @staffId INT = (SELECT Id FROM dbo.Users WHERE Email = N'staff@emeris.test');
    DECLARE @instructorId INT = (SELECT Id FROM dbo.Users WHERE Email = N'instructor@emeris.test');
    DECLARE @adminId INT = (SELECT Id FROM dbo.Users WHERE Email = N'admin@emeris.test');
    DECLARE @pendingId INT = (SELECT Id FROM dbo.Users WHERE Email = N'pending@emeris.test');
    DECLARE @frozenId INT = (SELECT Id FROM dbo.Users WHERE Email = N'frozen@emeris.test');

    INSERT INTO dbo.Memberships (UserId, MemberType, Status, StartDate, ExpiryDate)
    VALUES
        (@studentId, N'Student', N'Active', CAST(GETDATE() AS DATE), DATEADD(DAY, 120, CAST(GETDATE() AS DATE))),
        (@staffId, N'Staff', N'Active', CAST(GETDATE() AS DATE), DATEADD(DAY, 365, CAST(GETDATE() AS DATE))),
        (@instructorId, N'Student', N'Active', CAST(GETDATE() AS DATE), DATEADD(DAY, 120, CAST(GETDATE() AS DATE))),
        (@pendingId, N'Student', N'Pending', CAST(GETDATE() AS DATE), DATEADD(DAY, 120, CAST(GETDATE() AS DATE))),
        (@frozenId, N'Student', N'Frozen', CAST(GETDATE() AS DATE), DATEADD(DAY, 120, CAST(GETDATE() AS DATE)));

    INSERT INTO dbo.ClassSessions (Title, InstructorUserId, StartsAt, EndsAt, Capacity, Status, Location)
    VALUES
        (N'Morning Cycle', @instructorId, DATEADD(HOUR, 31, CAST(CAST(GETDATE() AS DATE) AS DATETIME2)), DATEADD(HOUR, 32, CAST(CAST(GETDATE() AS DATE) AS DATETIME2)), 2, N'Scheduled', N'Studio A'),
        (N'Lunch Yoga', @instructorId, DATEADD(HOUR, 36, CAST(CAST(GETDATE() AS DATE) AS DATETIME2)), DATEADD(HOUR, 37, CAST(CAST(GETDATE() AS DATE) AS DATETIME2)), 20, N'Scheduled', N'Studio B'),
        (N'Evening Boxing', @instructorId, DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -2, DATEADD(HOUR, 1, SYSUTCDATETIME())), 12, N'Cancelled', N'Studio A');

    DECLARE @cycleId INT = (SELECT Id FROM dbo.ClassSessions WHERE Title = N'Morning Cycle');
    DECLARE @yogaId INT = (SELECT Id FROM dbo.ClassSessions WHERE Title = N'Lunch Yoga');

    INSERT INTO dbo.Bookings (ClassSessionId, UserId, Status)
    VALUES
        (@cycleId, @studentId, N'Booked'),
        (@cycleId, @staffId, N'Booked'),
        (@cycleId, @instructorId, N'Waitlisted'),
        (@yogaId, @studentId, N'Booked');

    INSERT INTO dbo.Equipment (Code, Name, Location, Status)
    VALUES
        (N'TREAD-01', N'Treadmill 1', N'Cardio row', N'Available'),
        (N'TREAD-02', N'Treadmill 2', N'Cardio row', N'OutOfService'),
        (N'BIKE-01', N'Spin bike 1', N'Studio A', N'Available'),
        (N'RACK-01', N'Squat rack', N'Free weights', N'Available');

    DECLARE @tread1 INT = (SELECT Id FROM dbo.Equipment WHERE Code = N'TREAD-01');
    DECLARE @tread2 INT = (SELECT Id FROM dbo.Equipment WHERE Code = N'TREAD-02');

    INSERT INTO dbo.EquipmentSessions (EquipmentId, UserId, StartedAt, EndedAt)
    VALUES (@tread1, @studentId, DATEADD(HOUR, -5, SYSUTCDATETIME()), DATEADD(HOUR, -4, SYSUTCDATETIME()));

    INSERT INTO dbo.MaintenanceTickets (EquipmentId, ReportedByUserId, Status, Description, OpenedAt)
    VALUES (@tread2, @studentId, N'Open', N'Belt slips when the speed goes above 8 km/h.', DATEADD(DAY, -1, SYSUTCDATETIME()));

    INSERT INTO dbo.AccessEvents (UserId, OccurredAt, Result, Reason)
    VALUES
        (@studentId, DATEADD(DAY, -1, SYSUTCDATETIME()), N'Granted', NULL),
        (@staffId, DATEADD(HOUR, -3, SYSUTCDATETIME()), N'Granted', NULL),
        (@frozenId, DATEADD(HOUR, -2, SYSUTCDATETIME()), N'Refused', N'Membership is frozen.');

    INSERT INTO dbo.Challenges (Title, Description, StartsOn, EndsOn, CreatedByUserId)
    VALUES (
        N'Semester Steps',
        N'Visit the gym eight times before the end of the semester.',
        CAST(GETDATE() AS DATE),
        DATEADD(DAY, 90, CAST(GETDATE() AS DATE)),
        @adminId
    );

    DECLARE @challengeId INT = (SELECT Id FROM dbo.Challenges WHERE Title = N'Semester Steps');

    INSERT INTO dbo.ChallengeEnrolments (ChallengeId, UserId)
    VALUES (@challengeId, @studentId), (@challengeId, @staffId);

    INSERT INTO dbo.Notifications (UserId, Title, Body)
    VALUES (
        @studentId,
        N'Class reminder',
        N'Morning Cycle is on tomorrow. Arrive a few minutes early.'
    );
END
GO
