import Link from "next/link";
import { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/service-gateway";

export async function SiteShell({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;
  const navLinks = [
    { href: "/dashboard", label: messages.nav.dashboard, public: false },
    { href: "/usage", label: messages.nav.usage, public: false },
    { href: "/heatmap", label: messages.nav.heatmap, public: false },
    { href: "/pricing", label: messages.nav.pricing, public: true },
    { href: "/docs", label: messages.nav.docs, public: true },
    { href: "/profile", label: messages.nav.profile, public: false },
  ] as const;

  return (
    <div className="site-frame">
      <header className="topbar">
        <Brand href={user ? "/dashboard" : "/"} />
        <nav className="topnav">
          {navLinks
            .filter((item) => item.public || user)
            .map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          <Link
            className="btn btn-ghost btn-sm"
            href={user ? "/profile" : "/signin"}
          >
            {user ? messages.auth.profile : messages.auth.signIn}
          </Link>
          <Link
            className="btn btn-primary btn-sm"
            href={user ? "/dashboard" : "/signup"}
          >
            {user ? messages.auth.dashboard : messages.auth.signUp}
          </Link>
          <LocaleSwitcher />
        </nav>
        <MobileNavMenu
          brandHref={user ? "/dashboard" : "/"}
          sections={[
            {
              items: navLinks
                .filter((item) => item.public || user)
                .map((item) => ({ href: item.href, label: item.label })),
            },
            {
              items: [
                { href: user ? "/profile" : "/signin", label: user ? messages.auth.profile : messages.auth.signIn },
                { href: user ? "/dashboard" : "/signup", label: user ? messages.auth.dashboard : messages.auth.signUp, tone: "primary" },
              ],
            },
          ]}
        />
      </header>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {children}
      <footer className="site-footer">
        <div>
          <Brand compact href={user ? "/dashboard" : "/"} />
          <p className="footer-copy" style={{ marginTop: 8 }}>
            {messages.nav.footerTagline}
          </p>
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

export async function DashboardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const navItems = [
    { href: "/dashboard", label: messages.nav.dashboard },
    { href: "/usage", label: messages.nav.usage },
    { href: "/heatmap", label: messages.nav.heatmap },
    { href: "/settings", label: messages.nav.settings },
    { href: "/profile", label: messages.nav.profile },
  ] as const;

  const marketingItems = [
    { href: "/pricing", label: messages.nav.pricing },
    { href: "/docs", label: messages.nav.docs },
  ] as const;

  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;
  const initials = user?.email.slice(0, 2).toUpperCase() ?? "NA";

  return (
    <div className="sidebar-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand sidebar href="/dashboard" />
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-label">{messages.nav.product}</p>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="sidebar-link">
              {item.label}
            </Link>
          ))}

          <p className="sidebar-label">{messages.nav.resources}</p>
          {marketingItems.map((item) => (
            <Link key={item.href} href={item.href} className="sidebar-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link href="/profile" className="sidebar-link">
            <div
              className="avatar"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                fontSize: "0.7rem",
              }}
            >
              {initials}
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.83rem",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                {user?.workspace_name ?? "Workspace"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                {user?.plan_name ?? "Maze workspace"}
              </div>
            </div>
          </Link>
        </div>
      </aside>

      <main className="main-content">
        <MobileNavMenu
          brandHref="/dashboard"
          summary={{
            title: user?.workspace_name ?? (locale === "ar" ? "مساحة العمل" : "Workspace"),
            subtitle: user?.plan_name ?? (locale === "ar" ? "مساحة Maze" : "Maze workspace"),
          }}
          sections={[
            {
              title: messages.nav.product,
              items: navItems.map((item) => ({ href: item.href, label: item.label })),
            },
            {
              title: messages.nav.resources,
              items: marketingItems.map((item) => ({ href: item.href, label: item.label })),
            },
          ]}
        />
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
