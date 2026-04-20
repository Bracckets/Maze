import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { PollexLandingCursor } from "@/components/pollex-landing-cursor";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/service-gateway";

export async function PollexLandingShell({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;
  const navLinks: Array<{ href: Route; label: string }> = [
    { href: "/pricing" as Route, label: messages.nav.pricing },
    { href: "/docs" as Route, label: messages.nav.docs },
    ...(user ? [{ href: "/dashboard" as Route, label: messages.nav.dashboard }] : []),
  ];

  return (
    <div className="pollex-home-shell">
      <PollexLandingCursor />

      <header className="site-shell-header pollex-home-header-shell">
        <div className="site-shell-brand">
          <Brand href={user ? "/dashboard" : "/"} />
        </div>

        <nav className="site-shell-nav">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-shell-actions">
          {!user ? (
            <>
              <Link className="btn btn-ghost btn-sm" href="/signin">
                {messages.auth.signIn}
              </Link>
              <Link className="btn btn-primary btn-sm" href="/signup">
                {messages.auth.signUp}
              </Link>
            </>
          ) : (
            <Link className="btn btn-ghost btn-sm" href="/profile">
              {messages.auth.profile}
            </Link>
          )}
          <LocaleSwitcher />
        </div>

        <MobileNavMenu
          brandHref={user ? "/dashboard" : "/"}
          sections={[
            {
              items: navLinks.map((item) => ({ href: item.href, label: item.label })),
            },
            {
              items: [
                { href: user ? "/profile" : "/signin", label: user ? messages.auth.profile : messages.auth.signIn },
                { href: user ? "/dashboard" : "/signup", label: user ? messages.auth.dashboard : messages.auth.signUp, tone: "primary" },
              ],
            },
          ]}
          summary={
            user
              ? {
                  title: user.workspace_name ?? "Workspace",
                  subtitle: user.plan_name ?? "Pollex workspace",
                }
              : undefined
          }
        />
      </header>

      <main className="pollex-home-main">{children}</main>

      <footer className="site-shell-footer pollex-home-footer">
        <div>
          <Brand compact href={user ? "/dashboard" : "/"} />
          <p className="footer-copy">{messages.nav.footerTagline}</p>
        </div>
        <nav className="footer-links">
          <Link href="/pricing">{messages.nav.pricing}</Link>
          <Link href="/docs">{messages.nav.docs}</Link>
          <Link href="/privacy">{locale === "ar" ? "الخصوصية" : "Privacy"}</Link>
          <Link href="/terms">{locale === "ar" ? "الشروط" : "Terms"}</Link>
        </nav>
      </footer>
    </div>
  );
}
