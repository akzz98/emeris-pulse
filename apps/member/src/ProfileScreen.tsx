import { FormEvent, useEffect, useState } from "react";
import { AppShell, Button, ErrorState, LoadingState, SuccessBanner, TextField, type AppNavItem } from "@emeris/ui";
import { getProfile, updateProfile, type MemberProfile } from "./api";
import "./profile.css";
import type { MemberSession } from "./session";

type ProfileScreenProps = {
  session: MemberSession;
  nav: AppNavItem[];
  onSignOut: () => void;
  onUpdated: (profile: MemberProfile) => void;
};

export function ProfileScreen({ session, nav, onSignOut, onUpdated }: ProfileScreenProps) {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    getProfile(session.accessToken)
      .then((next) => {
        if (!active) {
          return;
        }
        setProfile(next);
        setFirstName(next.firstName);
        setLastName(next.lastName);
        setPhone(next.phone ?? "");
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        const message = caught instanceof Error ? caught.message : "Could not load your profile.";
        if (message === "UNAUTHENTICATED") {
          onSignOut();
          return;
        }
        setLoadError(message);
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setActionError(null);
    setSaved(false);
    try {
      // A blank phone is stored as empty. Phone is a contact field, not where notices are sent.
      const next = await updateProfile(session.accessToken, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
      });
      setProfile(next);
      setPhone(next.phone ?? "");
      setSaved(true);
      onUpdated(next);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not save your profile.";
      if (message === "UNAUTHENTICATED") {
        onSignOut();
        return;
      }
      setActionError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell area="Member" nav={nav} onSignOut={onSignOut}>
      <header className="profile-heading">
        <h1>Profile</h1>
        <p>Your name and phone stay on your profile. Notices are listed in the app.</p>
      </header>
      {loading ? <LoadingState title="Loading profile" message="Fetching your contact details." /> : null}
      {loadError ? <ErrorState title="Could not load profile" message={loadError} /> : null}
      {actionError ? <ErrorState title="Profile not saved" message={actionError} /> : null}
      {profile ? (
        <form className="profile-form" onSubmit={onSubmit}>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>Campus identifier</dt>
              <dd>{profile.campusIdentifier}</dd>
            </div>
          </dl>
          {saved ? <SuccessBanner title="Contact details saved" message="Your name and phone are updated. Notices are not sent by email or text." /> : null}
          <TextField id="profile-first-name" label="First name" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
          <TextField id="profile-last-name" label="Last name" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
          <TextField
            id="profile-phone"
            label="Phone (optional)"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            hint="Notices stay in the app. Leave blank if you prefer not to share a number."
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save contact details"}
          </Button>
        </form>
      ) : null}
    </AppShell>
  );
}
