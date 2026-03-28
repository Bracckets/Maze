"use client";

import { useState } from "react";

export function SignInForm() {
  const [email, setEmail] = useState("team@maze.ai");
  const [password, setPassword] = useState("maze-demo-123");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);

    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(`Welcome back, ${data.user.email}`);
      } else {
        setIsError(true);
        setMessage(data.error ?? "Sign in failed. Please try again.");
      }
    } catch {
      setIsError(true);
      setMessage("Something went wrong. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <button
        className="btn btn-primary"
        style={{ width: "100%", height: 44, marginTop: 4, fontSize: "0.95rem" }}
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      {message && (
        <p
          style={{
            fontSize: "0.84rem",
            color: isError ? "var(--red)" : "var(--green)",
            textAlign: "center",
            padding: "10px 14px",
            background: isError ? "var(--red-dim)" : "var(--green-dim)",
            borderRadius: "var(--r-md)",
            border: `1px solid ${isError ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.2)"}`,
          }}
        >
          {message}
        </p>
      )}
    </form>
  );
}
