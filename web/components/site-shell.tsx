import Link from "next/link";
import { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { navLinks } from "@/lib/site-data";

export function SiteShell({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="site-frame">
      <header className="topbar">
        <Brand />
        <nav className="topnav">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link className="btn btn-primary btn-sm" href="/signin" style={{ marginLeft: 4 }}>
            Sign in
          </Link>
        </nav>
      </header>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {children}
      <footer className="site-footer">
        <div>
          <Brand compact />
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

export function DashboardShell({
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
    { href: "/dashboard", label: "Dashboard", icon: "▦" },
    { href: "/settings",  label: "Settings",  icon: "⚙" },
    { href: "/profile",   label: "Profile",   icon: "◉" },
  ];

  const marketingItems = [
    { href: "/pricing", label: "Pricing",  icon: "◇" },
    { href: "/docs",    label: "Docs",     icon: "⊞" },
  ];

  return (
    <div className="sidebar-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand sidebar />
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
          <div className="sidebar-link" style={{ cursor: "default" }}>
            <div className="avatar" style={{ width: 28, height: 28, borderRadius: 8, fontSize: "0.7rem" }}>AN</div>
            <div>
              <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "var(--text)" }}>Amina Noor</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Pro plan</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
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
