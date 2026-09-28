-- Emeris Pulse schema for Azure SQL and local Azure SQL Edge.
-- Safe to run more than once. It creates objects that are missing and does not drop data.

IF DB_ID(N'emeris_pulse') IS NULL
BEGIN
    CREATE DATABASE emeris_pulse;
END
GO

USE emeris_pulse;
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        Role NVARCHAR(32) NOT NULL,
        CampusIdentifier NVARCHAR(64) NOT NULL,
        FirstName NVARCHAR(80) NOT NULL,
        LastName NVARCHAR(80) NOT NULL,
        Phone NVARCHAR(32) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT UQ_Users_CampusIdentifier UNIQUE (CampusIdentifier),
        CONSTRAINT CK_Users_Role CHECK (
            Role IN (N'Student', N'Staff', N'Instructor', N'GymAdmin', N'FacilityManager', N'SystemAdmin')
        )
    );
END
GO

IF OBJECT_ID(N'dbo.Memberships', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Memberships (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Memberships PRIMARY KEY,
        UserId INT NOT NULL,
        MemberType NVARCHAR(16) NOT NULL,
        Status NVARCHAR(16) NOT NULL,
        StartDate DATE NOT NULL,
        ExpiryDate DATE NOT NULL,
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Memberships_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Memberships_UserId UNIQUE (UserId),
        CONSTRAINT FK_Memberships_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
        CONSTRAINT CK_Memberships_MemberType CHECK (MemberType IN (N'Student', N'Staff')),
        CONSTRAINT CK_Memberships_Status CHECK (Status IN (N'Pending', N'Active', N'Frozen', N'Expired')),
        CONSTRAINT CK_Memberships_Dates CHECK (ExpiryDate >= StartDate)
    );
END
GO

IF OBJECT_ID(N'dbo.RefreshTokens', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefreshTokens (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_RefreshTokens PRIMARY KEY,
        UserId INT NOT NULL,
        TokenHash NVARCHAR(128) NOT NULL,
        ExpiresAt DATETIME2 NOT NULL,
        RevokedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_RefreshTokens_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_RefreshTokens_TokenHash UNIQUE (TokenHash),
        CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id)
    );
END
GO

IF OBJECT_ID(N'dbo.AccessPasses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AccessPasses (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_AccessPasses PRIMARY KEY,
        UserId INT NOT NULL,
        Jti NVARCHAR(64) NOT NULL,
        Kind NVARCHAR(16) NOT NULL,
        ExpiresAt DATETIME2 NOT NULL,
        UsedAt DATETIME2 NULL,
        CONSTRAINT UQ_AccessPasses_Jti UNIQUE (Jti),
        CONSTRAINT FK_AccessPasses_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
        CONSTRAINT CK_AccessPasses_Kind CHECK (Kind IN (N'Standard', N'Temporary'))
    );
END
GO

IF OBJECT_ID(N'dbo.AccessEvents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AccessEvents (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_AccessEvents PRIMARY KEY,
        UserId INT NOT NULL,
        PassId INT NULL,
        OccurredAt DATETIME2 NOT NULL,
        Result NVARCHAR(16) NOT NULL,
        Reason NVARCHAR(200) NULL,
        CONSTRAINT FK_AccessEvents_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
        CONSTRAINT FK_AccessEvents_AccessPasses FOREIGN KEY (PassId) REFERENCES dbo.AccessPasses (Id),
        CONSTRAINT CK_AccessEvents_Result CHECK (Result IN (N'Granted', N'Refused'))
    );
    CREATE INDEX IX_AccessEvents_OccurredAt ON dbo.AccessEvents (OccurredAt);
END
GO

IF OBJECT_ID(N'dbo.ClassSessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClassSessions (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_ClassSessions PRIMARY KEY,
        Title NVARCHAR(120) NOT NULL,
        InstructorUserId INT NOT NULL,
        StartsAt DATETIME2 NOT NULL,
        EndsAt DATETIME2 NOT NULL,
        Capacity INT NOT NULL,
        Status NVARCHAR(16) NOT NULL,
        Location NVARCHAR(80) NOT NULL,
        CONSTRAINT FK_ClassSessions_Instructor FOREIGN KEY (InstructorUserId) REFERENCES dbo.Users (Id),
        CONSTRAINT CK_ClassSessions_Status CHECK (Status IN (N'Scheduled', N'Cancelled', N'Completed')),
        CONSTRAINT CK_ClassSessions_Capacity CHECK (Capacity > 0),
        CONSTRAINT CK_ClassSessions_Times CHECK (EndsAt > StartsAt)
    );
END
GO

IF OBJECT_ID(N'dbo.Bookings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Bookings (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Bookings PRIMARY KEY,
        ClassSessionId INT NOT NULL,
        UserId INT NOT NULL,
        Status NVARCHAR(16) NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Bookings_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Bookings_Class_User UNIQUE (ClassSessionId, UserId),
        CONSTRAINT FK_Bookings_ClassSessions FOREIGN KEY (ClassSessionId) REFERENCES dbo.ClassSessions (Id),
        CONSTRAINT FK_Bookings_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id),
        CONSTRAINT CK_Bookings_Status CHECK (Status IN (N'Booked', N'Waitlisted', N'Cancelled', N'Attended', N'Absent'))
    );
    CREATE INDEX IX_Bookings_Class_Status ON dbo.Bookings (ClassSessionId, Status);
END
GO

IF OBJECT_ID(N'dbo.Equipment', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Equipment (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Equipment PRIMARY KEY,
        Code NVARCHAR(32) NOT NULL,
        Name NVARCHAR(120) NOT NULL,
        Location NVARCHAR(80) NOT NULL,
        Status NVARCHAR(16) NOT NULL,
        CONSTRAINT UQ_Equipment_Code UNIQUE (Code),
        CONSTRAINT CK_Equipment_Status CHECK (Status IN (N'Available', N'OutOfService'))
    );
    CREATE INDEX IX_Equipment_Status ON dbo.Equipment (Status);
END
GO

IF OBJECT_ID(N'dbo.EquipmentSessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EquipmentSessions (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_EquipmentSessions PRIMARY KEY,
        EquipmentId INT NOT NULL,
        UserId INT NOT NULL,
        StartedAt DATETIME2 NOT NULL,
        EndedAt DATETIME2 NULL,
        CONSTRAINT FK_EquipmentSessions_Equipment FOREIGN KEY (EquipmentId) REFERENCES dbo.Equipment (Id),
        CONSTRAINT FK_EquipmentSessions_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id)
    );
END
GO

IF OBJECT_ID(N'dbo.MaintenanceTickets', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MaintenanceTickets (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_MaintenanceTickets PRIMARY KEY,
        EquipmentId INT NOT NULL,
        ReportedByUserId INT NOT NULL,
        Status NVARCHAR(16) NOT NULL,
        Description NVARCHAR(400) NOT NULL,
        OpenedAt DATETIME2 NOT NULL CONSTRAINT DF_MaintenanceTickets_OpenedAt DEFAULT SYSUTCDATETIME(),
        ClosedAt DATETIME2 NULL,
        CONSTRAINT FK_MaintenanceTickets_Equipment FOREIGN KEY (EquipmentId) REFERENCES dbo.Equipment (Id),
        CONSTRAINT FK_MaintenanceTickets_Users FOREIGN KEY (ReportedByUserId) REFERENCES dbo.Users (Id),
        CONSTRAINT CK_MaintenanceTickets_Status CHECK (Status IN (N'Open', N'InProgress', N'Closed'))
    );
END
GO

IF OBJECT_ID(N'dbo.Challenges', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Challenges (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Challenges PRIMARY KEY,
        Title NVARCHAR(120) NOT NULL,
        Description NVARCHAR(400) NOT NULL,
        StartsOn DATE NOT NULL,
        EndsOn DATE NOT NULL,
        CreatedByUserId INT NOT NULL,
        CONSTRAINT FK_Challenges_Users FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users (Id),
        CONSTRAINT CK_Challenges_Dates CHECK (EndsOn >= StartsOn)
    );
END
GO

IF OBJECT_ID(N'dbo.ChallengeEnrolments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChallengeEnrolments (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_ChallengeEnrolments PRIMARY KEY,
        ChallengeId INT NOT NULL,
        UserId INT NOT NULL,
        JoinedAt DATETIME2 NOT NULL CONSTRAINT DF_ChallengeEnrolments_JoinedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_ChallengeEnrolments_Challenge_User UNIQUE (ChallengeId, UserId),
        CONSTRAINT FK_ChallengeEnrolments_Challenges FOREIGN KEY (ChallengeId) REFERENCES dbo.Challenges (Id),
        CONSTRAINT FK_ChallengeEnrolments_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id)
    );
END
GO

IF OBJECT_ID(N'dbo.Notifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications (
        Id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Notifications PRIMARY KEY,
        UserId INT NOT NULL,
        Title NVARCHAR(160) NOT NULL,
        Body NVARCHAR(600) NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSUTCDATETIME(),
        ReadAt DATETIME2 NULL,
        CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id)
    );
END
GO

-- Report pages filter by status or start date, then take one page. These indexes are created
-- even when the tables already exist, so an older database picks them up.
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_ClassSessions_Status_StartsAt' AND object_id = OBJECT_ID(N'dbo.ClassSessions')
)
BEGIN
    CREATE INDEX IX_ClassSessions_Status_StartsAt ON dbo.ClassSessions (Status, StartsAt DESC, Id DESC);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_Challenges_StartsOn' AND object_id = OBJECT_ID(N'dbo.Challenges')
)
BEGIN
    CREATE INDEX IX_Challenges_StartsOn ON dbo.Challenges (StartsOn DESC, Id DESC);
END
GO
