"use client";

import { useState } from "react";

import { useI18n } from "@/components/locale-provider";

type Props = {
  initialSettings: {
    apiBaseUrl: string;
    authProvider: string;
    ingestionMode: string;
    masking: string;
  } | null;
};

export function WorkspaceSettingsEditor({ initialSettings }: Props) {
  const { locale } = useI18n();
  const [apiBaseUrl, setApiBaseUrl] = useState(initialSettings?.apiBaseUrl ?? "");
  const [authProvider, setAuthProvider] = useState(initialSettings?.authProvider ?? "maze-backend");
  const [ingestionMode, setIngestionMode] = useState(initialSettings?.ingestionMode ?? "batched");
  const [masking, setMasking] = useState(initialSettings?.masking ?? "strict");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    setSaving(true);
    setStatus(null);
    const response = await fetch("/api/workspace/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiBaseUrl, authProvider, ingestionMode, masking }),
    });
    const data = await response.json();
    setSaving(false);
    setStatus(response.ok ? (locale === "ar" ? "طھظ… ط­ظپط¸ ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ." : "Settings saved.") : data.error ?? (locale === "ar" ? "طھط¹ط°ط± ط­ظپط¸ ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ." : "Unable to save settings."));
  }

  return (
    <div className="pollex-form-stack">
      <div className="field">
        <label>{locale === "ar" ? "ظ†ظ‚ط·ط© ط¥ط¯ط®ط§ظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ" : "Ingestion endpoint"}</label>
        <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} />
      </div>
      <div className="field">
        <label>{locale === "ar" ? "ظ…ظˆظپط± ط§ظ„ظ…طµط§ط¯ظ‚ط©" : "Auth provider"}</label>
        <input value={authProvider} onChange={(event) => setAuthProvider(event.target.value)} />
      </div>
      <div className="field">
        <label>{locale === "ar" ? "ظˆط¶ط¹ ط§ظ„ط¥ط¯ط®ط§ظ„" : "Ingestion mode"}</label>
        <input value={ingestionMode} onChange={(event) => setIngestionMode(event.target.value)} />
      </div>
      <div className="field">
        <label>{locale === "ar" ? "ظ‚ظˆط§ط¹ط¯ ط¥ط®ظپط§ط، ط§ظ„ط¨ظٹط§ظ†ط§طھ" : "Data masking rules"}</label>
        <textarea value={masking} onChange={(event) => setMasking(event.target.value)} rows={3} />
      </div>
      <div className="pollex-form-actions">
        <button className="btn btn-primary" type="button" onClick={saveSettings} disabled={saving}>
          {saving ? (locale === "ar" ? "ط¬ط§ط±ظچ ط§ظ„ط­ظپط¸..." : "Saving...") : (locale === "ar" ? "ط­ظپط¸ ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ" : "Save settings")}
        </button>
        {status ? <p className="pollex-inline-status">{status}</p> : null}
      </div>
    </div>
  );
}
