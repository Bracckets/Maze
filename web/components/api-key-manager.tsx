"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/components/locale-provider";

type ApiKey = {
  id: string;
  name: string;
  prefix?: string;
  token?: string;
  createdAt: string;
  lastUsedAt?: string;
};

export function ApiKeyManager() {
  const { locale } = useI18n();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState(locale === "ar" ? "ظ…ظپطھط§ط­ ط¥ط¯ط®ط§ظ„ ط§ظ„ط®ظ„ظپظٹط©" : "Backend ingestion key");
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
    setStatus({ text: locale === "ar" ? "ط¬ط§ط±ظچ ط§ظ„ط¥ظ†ط´ط§ط،..." : "Generating...", ok: true });

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
      setStatus({ text: locale === "ar" ? `طھظ… ط¥ظ†ط´ط§ط، ط§ظ„ظ…ظپطھط§ط­: ${data.key.token}` : `Key created: ${data.key.token}`, ok: true });
    } else {
      setStatus({ text: data.error ?? (locale === "ar" ? "طھط¹ط°ط± ط¥ظ†ط´ط§ط، ط§ظ„ظ…ظپطھط§ط­." : "Unable to generate key."), ok: false });
    }
  }

  return (
    <div className="pollex-form-stack">
      <form action={createKey} className="pollex-form-stack">
        <div className="api-key-form-grid">
          <div className="field">
            <label htmlFor="key-name">{locale === "ar" ? "ط§ط³ظ… ط§ظ„ظ…ظپطھط§ط­" : "Key name"}</label>
            <input id="key-name" name="name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="field api-key-environment-field">
            <label htmlFor="key-env">{locale === "ar" ? "ط§ظ„ط¨ظٹط¦ط©" : "Environment"}</label>
            <input id="key-env" name="environment" type="hidden" value={environment} />
            <div className="surface-select" ref={environmentRef}>
              <button
                aria-expanded={isEnvironmentOpen}
                aria-haspopup="menu"
                className={`surface-select-trigger ${isEnvironmentOpen ? "open" : ""}`.trim()}
                type="button"
                onClick={() => setIsEnvironmentOpen((open) => !open)}
              >
                <span className="surface-select-value">
                  {environment === "live" ? (locale === "ar" ? "ط­ظٹ" : "Live") : (locale === "ar" ? "ط§ط®طھط¨ط§ط±" : "Test")}
                </span>
                <span className="surface-select-chevron" aria-hidden="true">
                  ▾
                </span>
              </button>

              {isEnvironmentOpen ? (
                <div className="surface-select-popover" role="menu">
                  {[
                    { value: "live" as const, label: locale === "ar" ? "ط­ظٹ" : "Live" },
                    { value: "test" as const, label: locale === "ar" ? "ط§ط®طھط¨ط§ط±" : "Test" },
                  ].map((option) => (
                    <button
                      className={`surface-select-option ${option.value === environment ? "active" : ""}`.trim()}
                      key={option.value}
                      role="menuitemradio"
                      type="button"
                      onClick={() => {
                        setEnvironment(option.value);
                        setIsEnvironmentOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                      {option.value === environment ? <strong>{locale === "ar" ? "ط§ظ„ط­ط§ظ„ظٹ" : "Current"}</strong> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <button className="btn btn-primary api-key-submit" type="submit">
          {locale === "ar" ? "ط¥ظ†ط´ط§ط، ظ…ظپطھط§ط­" : "Generate key"}
        </button>
      </form>

      {status ? <p className={`pollex-status-banner ${status.ok ? "ok" : "error"}`.trim()}>{status.text}</p> : null}

      <div>
        <p className="pollex-key-count">
          {loading ? (locale === "ar" ? "ط¬ط§ط±ظچ ط§ظ„طھط­ظ…ظٹظ„..." : "Loading...") : locale === "ar" ? `${keys.length} ظ…ظپطھط§ط­` : `${keys.length} key${keys.length !== 1 ? "s" : ""}`}
        </p>
        <div className="pollex-key-list">
          {keys.map((key) => (
            <div className="pollex-key-row" key={key.id}>
              <div className="pollex-key-copy">
                <div className="pollex-key-name">{key.name}</div>
                <div className="pollex-key-token">{key.token ?? `${key.prefix ?? "mz_"}************`}</div>
              </div>
              <div className="pollex-key-meta">
                {key.lastUsedAt
                  ? locale === "ar" ? `ط§ط³طھظڈط®ط¯ظ… ${new Date(key.lastUsedAt).toLocaleDateString()}` : `Used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                  : locale === "ar" ? `ط£ظڈظ†ط´ط¦ ${new Date(key.createdAt).toLocaleDateString()}` : `Created ${new Date(key.createdAt).toLocaleDateString()}`}
              </div>
            </div>
          ))}
        </div>
        {!loading && keys.length === 0 ? (
          <p className="pollex-inline-status">{locale === "ar" ? "ظ„ط§ طھظˆط¬ط¯ ظ…ظپط§طھظٹط­ ط¨ط¹ط¯. ط£ظ†ط´ط¦ ظˆط§ط­ط¯ط§ظ‹ ط£ط¹ظ„ط§ظ‡." : "No keys yet. Generate one above."}</p>
        ) : null}
      </div>
    </div>
  );
}
