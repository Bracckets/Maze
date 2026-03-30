"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  initialEmail: string;
  initialWorkspaceName: string;
};

export function ProfileEditor({ initialEmail, initialWorkspaceName }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function saveProfile() {
    setIsSaving(true);
    setIsError(false);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, workspace_name: workspaceName }),
      });
      const data = await response.json();
      if (!response.ok) {
        setIsError(true);
        setMessage(data.error ?? "Unable to update profile.");
      } else {
        setMessage("Profile updated.");
        router.refresh();
      }
    } catch {
      setIsError(true);
      setMessage("Unable to reach the backend right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label htmlFor="profile-email">Email address</label>
        <input id="profile-email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="profile-workspace">Workspace name</label>
        <input id="profile-workspace" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
      </div>

      <button className="btn btn-primary" type="button" onClick={saveProfile} disabled={isSaving} style={{ alignSelf: "flex-start" }}>
        {isSaving ? "Saving..." : "Save profile"}
      </button>

      {message ? (
        <p style={{ fontSize: "0.82rem", color: isError ? "var(--red)" : "var(--text-2)" }}>{message}</p>
      ) : null}
    </div>
  );
}
