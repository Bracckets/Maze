"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/locale-provider";

type Props = {
  initialEmail: string;
  initialWorkspaceName: string;
};

export function ProfileEditor({ initialEmail, initialWorkspaceName }: Props) {
  const { locale } = useI18n();
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
        setMessage(data.error ?? (locale === "ar" ? "طھط¹ط°ط± طھط­ط¯ظٹط« ط§ظ„ظ…ظ„ظپ ط§ظ„ط´ط®طµظٹ." : "Unable to update profile."));
      } else {
        setMessage(locale === "ar" ? "طھظ… طھط­ط¯ظٹط« ط§ظ„ظ…ظ„ظپ ط§ظ„ط´ط®طµظٹ." : "Profile updated.");
        router.refresh();
      }
    } catch {
      setIsError(true);
      setMessage(locale === "ar" ? "طھط¹ط°ط± ط§ظ„ظˆطµظˆظ„ ط¥ظ„ظ‰ ط§ظ„ط®ط§ط¯ظ… ط­ط§ظ„ظٹط§ظ‹." : "Unable to reach the backend right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="pollex-form-stack">
      <div className="field">
        <label htmlFor="profile-email">{locale === "ar" ? "ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ" : "Email address"}</label>
        <input id="profile-email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="profile-workspace">{locale === "ar" ? "ط§ط³ظ… ظ…ط³ط§ط­ط© ط§ظ„ط¹ظ…ظ„" : "Workspace name"}</label>
        <input id="profile-workspace" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
      </div>

      <div className="pollex-form-actions">
        <button className="btn btn-primary" type="button" onClick={saveProfile} disabled={isSaving}>
          {isSaving ? (locale === "ar" ? "ط¬ط§ط±ظچ ط§ظ„ط­ظپط¸..." : "Saving...") : (locale === "ar" ? "ط­ظپط¸ ط§ظ„ظ…ظ„ظپ" : "Save profile")}
        </button>

        {message ? (
          <p className={`pollex-inline-status ${isError ? "is-error" : "is-success"}`.trim()}>{message}</p>
        ) : null}
      </div>
    </div>
  );
}
