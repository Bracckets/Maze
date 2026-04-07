"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/locale-provider";

export function SignUpForm() {
  const { locale } = useI18n();
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
        setMessage(locale === "ar" ? `تم إنشاء مساحة العمل لـ ${data.user.email}` : `Workspace created for ${data.user.email}`);
        router.push("/dashboard");
        router.refresh();
      } else {
        setIsError(true);
        setMessage(data.error ?? (locale === "ar" ? "فشل إنشاء الحساب. حاول مرة أخرى." : "Sign up failed. Please try again."));
      }
    } catch {
      setIsError(true);
      setMessage(locale === "ar" ? "حدث خطأ ما. تحقق من الاتصال." : "Something went wrong. Check your connection.");
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
        <label htmlFor="workspace_name">{locale === "ar" ? "اسم مساحة العمل" : "Workspace name"}</label>
        <input
          id="workspace_name"
          name="workspace_name"
          autoComplete="organization"
          required
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder={locale === "ar" ? "Acme Growth" : "Acme Growth"}
        />
      </div>
      <div className="field">
        <label htmlFor="email">{locale === "ar" ? "البريد الإلكتروني" : "Email address"}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>
      <div className="field">
        <label htmlFor="password">{locale === "ar" ? "كلمة المرور" : "Password"}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={locale === "ar" ? "استخدم 8 أحرف على الأقل" : "Use at least 8 characters"}
        />
      </div>

      <button
        className="btn btn-primary"
        style={{ width: "100%", height: 44, marginTop: 4, fontSize: "0.95rem" }}
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (locale === "ar" ? "جارٍ إنشاء الحساب..." : "Creating account...") : (locale === "ar" ? "إنشاء الحساب" : "Create account")}
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
        {locale === "ar" ? "لديك حساب بالفعل؟ " : "Already have an account? "}
        <Link href="/signin" style={{ color: "var(--text)" }}>
          {locale === "ar" ? "سجّل الدخول" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
