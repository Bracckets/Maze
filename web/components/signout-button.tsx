"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignOut() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });
      if (!response.ok) {
        setMessage("Unable to sign out right now.");
        setIsSubmitting(false);
        return;
      }
      router.push("/signin");
      router.refresh();
    } catch {
      setMessage("Unable to sign out right now.");
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button className="btn btn-ghost" type="button" onClick={handleSignOut} disabled={isSubmitting}>
        {isSubmitting ? "Signing out..." : "Sign out"}
      </button>
      {message ? <p style={{ fontSize: "0.8rem", color: "var(--red)" }}>{message}</p> : null}
    </div>
  );
}
