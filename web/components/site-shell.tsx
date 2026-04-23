import type { Route } from "next";
import Link from "next/link";
import { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { DashboardSidebarFrame } from "@/components/dashboard-sidebar-frame";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { PollexAppIcon, type PollexAppIconName } from "@/components/pollex-app-icon";
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
  const navItems: Array<{ href: Route; icon: PollexAppIconName; label: string }> = [
    { href: "/dashboard" as Route, icon: "dashboard", label: messages.nav.dashboard },
    { href: "/usage" as Route, icon: "usage", label: messages.nav.usage },
    { href: "/heatmap" as Route, icon: "heatmap", label: messages.nav.heatmap },
    { href: "/liquid" as Route, icon: "liquid", label: messages.nav.liquid },
    { href: "/profile" as Route, icon: "profile", label: messages.nav.profile },
    { href: "/settings" as Route, icon: "settings", label: messages.nav.settings },
  ] as const;
  const resourceItems: Array<{ href: Route; icon: PollexAppIconName; label: string }> = [
    { href: "/pricing" as Route, icon: "pricing", label: messages.nav.pricing },
    { href: "/docs" as Route, icon: "docs", label: messages.nav.docs },
  ] as const;
  const initials = user?.email.slice(0, 2).toUpperCase() ?? "PL";
  const activeItem =
    [...navItems, ...resourceItems].find((item) => item.href === activePath) ??
    { href: "/dashboard" as Route, icon: "dashboard" as const, label: messages.nav.dashboard };

  return (
    <DashboardSidebarFrame
      activePath={activePath}
      initials={initials}
      navItems={navItems}
      planName={user?.plan_name ?? "Pollex workspace"}
      productLabel={messages.nav.product}
      resourceItems={resourceItems}
      resourcesLabel={messages.nav.resources}
      workspaceName={user?.workspace_name ?? "Workspace name"}
    >
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
    </DashboardSidebarFrame>
  );
}
