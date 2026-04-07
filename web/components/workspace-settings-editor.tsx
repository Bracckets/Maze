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
    setStatus(response.ok ? (locale === "ar" ? "تم حفظ الإعدادات." : "Settings saved.") : data.error ?? (locale === "ar" ? "تعذر حفظ الإعدادات." : "Unable to save settings."));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label>{locale === "ar" ? "نقطة إدخال البيانات" : "Ingestion endpoint"}</label>
        <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} />
      </div>
      <div className="field">
        <label>{locale === "ar" ? "موفر المصادقة" : "Auth provider"}</label>
        <input value={authProvider} onChange={(event) => setAuthProvider(event.target.value)} />
      </div>
      <div className="field">
        <label>{locale === "ar" ? "وضع الإدخال" : "Ingestion mode"}</label>
        <input value={ingestionMode} onChange={(event) => setIngestionMode(event.target.value)} />
      </div>
      <div className="field">
        <label>{locale === "ar" ? "قواعد إخفاء البيانات" : "Data masking rules"}</label>
        <textarea value={masking} onChange={(event) => setMasking(event.target.value)} rows={3} />
      </div>
      <button className="btn btn-primary" type="button" onClick={saveSettings} disabled={saving} style={{ alignSelf: "flex-start" }}>
        {saving ? (locale === "ar" ? "جارٍ الحفظ..." : "Saving...") : (locale === "ar" ? "حفظ الإعدادات" : "Save settings")}
      </button>
      {status ? (
        <p style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{status}</p>
      ) : null}
    </div>
  );
}
