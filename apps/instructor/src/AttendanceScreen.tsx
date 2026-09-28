import { useEffect, useState } from "react";
import { AppShell, Button, EmptyState, ErrorState, LoadingState, type AppNavItem } from "@emeris/ui";
import { getAttendance, recordAttendance, type AttendanceClass, type InstructorSession } from "./api";
import "./roster.css";

type AttendanceScreenProps = {
  session: InstructorSession;
  nav: AppNavItem[];
  onSignOut: () => void;
};

export function AttendanceScreen({ session, nav, onSignOut }: AttendanceScreenProps) {
  const [classes, setClasses] = useState<AttendanceClass[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAttendance(session.accessToken)
      .then((next) => {
        if (active) {
          setClasses(next.classes);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load attendance.";
        if (message === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setError(message);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [session.accessToken, onSignOut]);

  async function onMark(classId: number, userId: number, mark: "Attended" | "Absent") {
    setBusyKey(`${classId}-${userId}`);
    setError(null);
    try {
      await recordAttendance(session.accessToken, classId, userId, mark);
      const next = await getAttendance(session.accessToken);
      setClasses(next.classes);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not record attendance.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setError(message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <AppShell area="Instructor" nav={nav} onSignOut={onSignOut}>
      <header className="roster-heading">
        <h1>Attendance</h1>
        <p>Mark who attended once the class has started. Only a booked place can be marked.</p>
      </header>
      {loading ? <LoadingState title="Loading attendance" message="Finding classes that have started." /> : null}
      {error ? <ErrorState title="Attendance not saved" message={error} /> : null}
      {classes && classes.length === 0 ? (
        <EmptyState title="No classes to mark" message="Attendance opens after a scheduled class has started." />
      ) : null}
      {classes && classes.length > 0 ? (
        <ul className="roster-list">
          {classes.map((item) => (
            <li key={item.id}>
              <h2>{item.title}</h2>
              <p>{item.location}</p>
              {item.members.length === 0 ? <p>No booked members.</p> : null}
              {item.members.length > 0 ? (
                <ul>
                  {item.members.map((member) => (
                    <li key={member.userId}>
                      <span>
                        {member.firstName} {member.lastName}
                        {member.status !== "Booked" ? ` · ${member.status}` : ""}
                      </span>
                      {member.status === "Booked" ? (
                        <span className="attendance-actions">
                          <Button
                            type="button"
                            disabled={busyKey === `${item.id}-${member.userId}`}
                            onClick={() => void onMark(item.id, member.userId, "Attended")}
                          >
                            Attended
                          </Button>
                          <Button
                            type="button"
                            disabled={busyKey === `${item.id}-${member.userId}`}
                            onClick={() => void onMark(item.id, member.userId, "Absent")}
                          >
                            Absent
                          </Button>
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
