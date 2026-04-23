import type { Route } from "next";
import Link from "next/link";
import { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { PollexAppIcon } from "@/components/pollex-app-icon";
import { getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/service-gateway";

type DashboardShellProps = {
  activePath?: string;
  children: ReactNode;
  headerAction?: ReactNode;
  subtitle?: string;
  title: string;
};

export async function SiteShell({
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
    <div className="site-frame pollex-app-shell">
      <header className="site-shell-header">
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

      <main className="site-shell-main">{children}</main>

      <footer className="site-shell-footer">
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

export async function DashboardShell({
  activePath,
  children,
  headerAction,
  subtitle,
  title,
}: DashboardShellProps) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;
  const navItems: Array<{ href: Route; icon: Parameters<typeof PollexAppIcon>[0]["icon"]; label: string }> = [
    { href: "/dashboard" as Route, icon: "dashboard", label: messages.nav.dashboard },
    { href: "/usage" as Route, icon: "usage", label: messages.nav.usage },
    { href: "/heatmap" as Route, icon: "heatmap", label: messages.nav.heatmap },
    { href: "/liquid" as Route, icon: "liquid", label: messages.nav.liquid },
    { href: "/profile" as Route, icon: "profile", label: messages.nav.profile },
    { href: "/settings" as Route, icon: "settings", label: messages.nav.settings },
  ] as const;
  const resourceItems: Array<{ href: Route; icon: Parameters<typeof PollexAppIcon>[0]["icon"]; label: string }> = [
    { href: "/pricing" as Route, icon: "pricing", label: messages.nav.pricing },
    { href: "/docs" as Route, icon: "docs", label: messages.nav.docs },
  ] as const;
  const initials = user?.email.slice(0, 2).toUpperCase() ?? "PL";
  const activeItem =
    [...navItems, ...resourceItems].find((item) => item.href === activePath) ??
    { href: "/dashboard" as Route, icon: "dashboard" as const, label: messages.nav.dashboard };

  return (
    <div className="dashboard-shell pollex-dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-brand">
          <Brand sidebar href="/dashboard" />
        </div>

        <nav className="dashboard-sidebar-nav">
          <div className="dashboard-sidebar-group">
            <p className="dashboard-sidebar-label">{messages.nav.product}</p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`dashboard-sidebar-link ${item.href === activePath ? "active" : ""}`.trim()}
              >
                <span className="dashboard-sidebar-link-icon" aria-hidden="true">
                  <PollexAppIcon icon={item.icon} />
                </span>
                <span className="dashboard-sidebar-link-copy">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="dashboard-sidebar-group">
            <p className="dashboard-sidebar-label">{messages.nav.resources}</p>
            {resourceItems.map((item) => (
              <Link key={item.href} href={item.href} className="dashboard-sidebar-link">
                <span className="dashboard-sidebar-link-icon" aria-hidden="true">
                  <PollexAppIcon icon={item.icon} />
                </span>
                <span className="dashboard-sidebar-link-copy">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <Link className="dashboard-workspace-card" href="/profile">
          <div className="dashboard-workspace-avatar">{initials}</div>
          <div>
            <strong>{user?.workspace_name ?? "Workspace name"}</strong>
            <span>{user?.plan_name ?? "Pollex workspace"}</span>
          </div>
        </Link>
      </aside>

      <main className="dashboard-main">
        <MobileNavMenu
          brandHref="/dashboard"
          sections={[
            {
              title: messages.nav.product,
              items: navItems.map((item) => ({ href: item.href, label: item.label })),
            },
            {
              title: messages.nav.resources,
              items: resourceItems.map((item) => ({ href: item.href, label: item.label })),
            },
          ]}
          summary={{
            title: user?.workspace_name ?? (locale === "ar" ? "مساحة العمل" : "Workspace"),
            subtitle: user?.plan_name ?? "Pollex workspace",
          }}
        />

        <div className="dashboard-page-header">
          <div className="dashboard-page-copy">
            <div className="dashboard-page-title-row">
              <span className="dashboard-page-title-icon" aria-hidden="true">
                <PollexAppIcon icon={activeItem.icon} />
              </span>
              <h1 className="page-title">{title}</h1>
            </div>
            {subtitle ? <p className="dashboard-page-subtitle">{subtitle}</p> : null}
          </div>
          <div className="dashboard-page-tools">
            {headerAction}
            <LocaleSwitcher />
          </div>
        </div>

        <div className="dashboard-page-body">{children}</div>

        <footer className="dashboard-app-footer">
          <div className="dashboard-app-footer-copy">
            <Brand compact href="/dashboard" />
            <span>{locale === "ar" ? "مساحة تشغيل أكثر هدوءًا للقرارات اليومية." : "A calmer operating surface for daily product decisions."}</span>
          </div>
          <nav className="dashboard-app-footer-links">
            <Link href="/docs">{messages.nav.docs}</Link>
            <Link href="/pricing">{messages.nav.pricing}</Link>
            <Link href="/settings">{messages.nav.settings}</Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}
