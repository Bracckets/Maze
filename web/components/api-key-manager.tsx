"use client";

import { useEffect, useRef, useState } from "react";

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
  const [isEnvironmentOpen, setIsEnvironmentOpen] = useState(false);
  const environmentRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!isEnvironmentOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!environmentRef.current?.contains(event.target as Node)) {
        setIsEnvironmentOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEnvironmentOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isEnvironmentOpen]);

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
        <div className="api-key-form-grid">
          <div className="field">
            <label htmlFor="key-name">Key name</label>
            <input id="key-name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field api-key-environment-field">
            <label htmlFor="key-env">Environment</label>
            <input id="key-env" name="environment" type="hidden" value={environment} />
            <div className="surface-select" ref={environmentRef}>
              <button
                aria-expanded={isEnvironmentOpen}
                aria-haspopup="menu"
                className={`surface-select-trigger ${isEnvironmentOpen ? "open" : ""}`}
                type="button"
                onClick={() => setIsEnvironmentOpen((open) => !open)}
              >
                <span className="surface-select-value">
                  {environment === "live" ? "Live" : "Test"}
                </span>
                <span className="surface-select-chevron" aria-hidden="true">
                  ▾
                </span>
              </button>

              {isEnvironmentOpen ? (
                <div className="surface-select-popover" role="menu">
                  {[
                    { value: "live" as const, label: "Live" },
                    { value: "test" as const, label: "Test" },
                  ].map((option) => (
                    <button
                      className={`surface-select-option ${option.value === environment ? "active" : ""}`}
                      key={option.value}
                      role="menuitemradio"
                      type="button"
                      onClick={() => {
                        setEnvironment(option.value);
                        setIsEnvironmentOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                      {option.value === environment ? <strong>Current</strong> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <button className="btn btn-primary api-key-submit" type="submit">
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
