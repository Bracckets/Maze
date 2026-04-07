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
        setMessage(data.error ?? (locale === "ar" ? "تعذر تحديث الملف الشخصي." : "Unable to update profile."));
      } else {
        setMessage(locale === "ar" ? "تم تحديث الملف الشخصي." : "Profile updated.");
        router.refresh();
      }
    } catch {
      setIsError(true);
      setMessage(locale === "ar" ? "تعذر الوصول إلى الخادم حالياً." : "Unable to reach the backend right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label htmlFor="profile-email">{locale === "ar" ? "البريد الإلكتروني" : "Email address"}</label>
        <input id="profile-email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="profile-workspace">{locale === "ar" ? "اسم مساحة العمل" : "Workspace name"}</label>
        <input id="profile-workspace" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
      </div>

      <button className="btn btn-primary" type="button" onClick={saveProfile} disabled={isSaving} style={{ alignSelf: "flex-start" }}>
        {isSaving ? (locale === "ar" ? "جارٍ الحفظ..." : "Saving...") : (locale === "ar" ? "حفظ الملف" : "Save profile")}
      </button>

      {message ? (
        <p style={{ fontSize: "0.82rem", color: isError ? "var(--red)" : "var(--text-2)" }}>{message}</p>
      ) : null}
    </div>
  );
}
