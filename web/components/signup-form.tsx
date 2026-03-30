"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);

    const payload = {
      workspace_name: String(formData.get("workspace_name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(`Workspace created for ${data.user.email}`);
        router.push("/dashboard");
        router.refresh();
      } else {
        setIsError(true);
        setMessage(data.error ?? "Sign up failed. Please try again.");
      }
    } catch {
      setIsError(true);
      setMessage("Something went wrong. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      action={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div className="field">
        <label htmlFor="workspace_name">Workspace name</label>
        <input
          id="workspace_name"
          name="workspace_name"
          required
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="Acme Growth"
        />
      </div>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          required
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
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Use at least 8 characters"
        />
      </div>

      <button
        className="btn btn-primary"
        style={{ width: "100%", height: 44, marginTop: 4, fontSize: "0.95rem" }}
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Creating account..." : "Create account"}
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

      <p
        style={{
          fontSize: "0.82rem",
          color: "var(--text-3)",
          textAlign: "center",
        }}
      >
        Already have an account?{" "}
        <Link href="/signin" style={{ color: "var(--text)" }}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
