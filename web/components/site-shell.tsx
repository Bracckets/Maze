import Link from "next/link";
import { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { navLinks } from "@/lib/site-data";
import { getCurrentUser } from "@/lib/service-gateway";

export async function SiteShell({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  const currentUser = await getCurrentUser();
  const user = "user" in currentUser.data ? currentUser.data.user : null;
  console.log("Current user in SiteShell:", currentUser.data);

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
            style={{ marginLeft: 4 }}
          >
            {user ? "Profile" : "Sign in"}
          </Link>
          <Link
            className="btn btn-primary btn-sm"
            href={user ? "/dashboard" : "/signup"}
            style={{ marginLeft: 4 }}
          >
            {user ? "Dashboard" : "Sign up"}
          </Link>
        </nav>
      </header>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {children}
      <footer className="site-footer">
        <div>
          <Brand compact href={user ? "/dashboard" : "/"} />
          <p className="footer-copy" style={{ marginTop: 8 }}>
            Observe. Infer. Act.
          </p>
        </div>
        <nav className="footer-links">
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
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
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "*" },
    { href: "/heatmap", label: "Heatmap", icon: "o" },
    { href: "/settings", label: "Settings", icon: "+" },
    { href: "/profile", label: "Profile", icon: "@" },
  ] as const;

  const marketingItems = [
    { href: "/pricing", label: "Pricing", icon: "$" },
    { href: "/docs", label: "Docs", icon: ">" },
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
          <p className="sidebar-label">Product</p>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="sidebar-link">
              <span className="s-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <p className="sidebar-label">Resources</p>
          {marketingItems.map((item) => (
            <Link key={item.href} href={item.href} className="sidebar-link">
              <span className="s-icon">{item.icon}</span>
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
                {user?.workspace_name ?? "Workspace account"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                {user?.plan_name ?? "Maze workspace"}
              </div>
            </div>
          </Link>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
