import { AppShell, EmptyState } from "@emeris/ui";

export function App() {
  return (
    <AppShell area="Instructor">
      <EmptyState
        title="Instructor home"
        message="Today's classes and attendance will appear here."
      />
    </AppShell>
  );
}
