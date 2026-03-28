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
  const [status, setStatus] = useState("Loading keys...");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/workspace/api-keys", { cache: "no-store" });
      const data = await response.json();
      setKeys(data.keys ?? []);
      setStatus("Keys ready");
    })();
  }, []);

  async function createKey(formData: FormData) {
    setStatus("Generating key...");

    const response = await fetch("/api/workspace/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        environment: String(formData.get("environment") ?? "live")
      })
    });

    const data = await response.json();
    if (response.ok) {
      setKeys((current) => [data.key, ...current]);
      setStatus(`New ${data.mode ?? "mock"} key generated: ${data.key.token}`);
      return;
    }

    setStatus(data.error ?? "Unable to generate key.");
  }

  return (
    <div className="stack">
      <form action={createKey} className="field-grid">
        <div className="field">
          <label htmlFor="name">Key name</label>
          <input id="name" name="name" onChange={(event) => setName(event.target.value)} value={name} />
        </div>
        <div className="field">
          <label htmlFor="environment">Environment</label>
          <select
            id="environment"
            name="environment"
            onChange={(event) => setEnvironment(event.target.value as "test" | "live")}
            value={environment}
          >
            <option value="live">Live</option>
            <option value="test">Test</option>
          </select>
        </div>
        <button className="button primary" type="submit">
          Generate API key
        </button>
      </form>

      <p className="status-copy">{status}</p>

      <div className="clean-list">
        {keys.map((key) => (
          <article className="clean-item" key={key.id}>
            <div>
              <strong>{key.name}</strong>
              <p className="panel-copy">{key.token ?? `${key.prefix}••••••••••••`} · created {new Date(key.createdAt).toLocaleDateString()}</p>
            </div>
            <span className="inline-note">{key.lastUsedAt ? `last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : "new key"}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
