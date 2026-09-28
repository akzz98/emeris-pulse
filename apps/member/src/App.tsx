import { AppShell, EmptyState } from "@emeris/ui";

export function App() {
  return (
    <AppShell area="Member">
      <EmptyState
        title="Member home"
        message="Sign-in, membership, and the access pass are the next screens."
      />
    </AppShell>
  );
}
