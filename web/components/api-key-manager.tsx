"use client";

import { useEffect, useState } from "react";

type ApiKey = {
  id: string;
  name: string;
  prefix?: string;
  token?: string;
  createdAt: string;
  lastUsedAt?: string;
};

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("Backend ingestion key");
  const [environment, setEnvironment] = useState<"test" | "live">("live");
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/workspace/api-keys", { cache: "no-store" });
      const data = await response.json();
      setKeys(Array.isArray(data.keys) ? data.keys : []);
      if (!response.ok && data.error) {
        setStatus({ text: data.error, ok: false });
      }
      setLoading(false);
    })();
  }, []);

  async function createKey(formData: FormData) {
    setStatus({ text: "Generating...", ok: true });

    const response = await fetch("/api/workspace/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        environment: String(formData.get("environment") ?? "live"),
      }),
    });

    const data = await response.json();
    if (response.ok) {
      setKeys((current) => [data.key, ...current]);
      setStatus({ text: `Key created: ${data.key.token}`, ok: true });
    } else {
      setStatus({ text: data.error ?? "Unable to generate key.", ok: false });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <form action={createKey} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
          <div className="field">
            <label htmlFor="key-name">Key name</label>
            <input id="key-name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="key-env">Environment</label>
            <select id="key-env" name="environment" value={environment} onChange={(e) => setEnvironment(e.target.value as "test" | "live")}>
              <option value="live">Live</option>
              <option value="test">Test</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}>
          Generate key
        </button>
      </form>

      {status && (
        <p
          style={{
            fontSize: "0.82rem",
            color: status.ok ? "var(--green)" : "var(--red)",
            fontFamily: status.ok ? "var(--font-mono)" : "inherit",
            background: status.ok ? "var(--green-dim)" : "var(--red-dim)",
            padding: "10px 14px",
            borderRadius: "var(--r-md)",
            border: `1px solid ${status.ok ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
            wordBreak: "break-all",
          }}
        >
          {status.text}
        </p>
      )}

      <div>
        <p style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 10 }}>
          {loading ? "Loading..." : `${keys.length} key${keys.length !== 1 ? "s" : ""}`}
        </p>
        {keys.map((key) => (
          <div
            key={key.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
              padding: "12px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{key.name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-3)" }}>
                {key.token ?? `${key.prefix ?? "mz_"}************`}
              </div>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-3)", whiteSpace: "nowrap" }}>
              {key.lastUsedAt
                ? `Used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                : `Created ${new Date(key.createdAt).toLocaleDateString()}`}
            </div>
          </div>
        ))}
        {!loading && keys.length === 0 && (
          <p style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>No keys yet. Generate one above.</p>
        )}
      </div>
    </div>
  );
}
