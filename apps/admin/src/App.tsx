import { AppShell, EmptyState } from "@emeris/ui";

export function App() {
  return (
    <AppShell area="Admin">
      <EmptyState
        title="Operations home"
        message="Membership, access logs, and the utilisation dashboard will appear here."
      />
    </AppShell>
  );
}
