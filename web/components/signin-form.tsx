"use client";

import { useState } from "react";

export function SignInForm() {
  const [email, setEmail] = useState("team@maze.ai");
  const [password, setPassword] = useState("maze-demo-123");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setMessage(null);

    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? "")
    };

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      setMessage(response.ok ? `Signed in as ${data.user.email}. Provider: ${data.mode ?? "connected"}.` : data.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="field-grid">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
      </div>
      <button className="button primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Sign in to Maze"}
      </button>
      {message ? <p className="status-copy">{message}</p> : null}
    </form>
  );
}
