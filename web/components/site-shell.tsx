import Link from "next/link";
import { ReactNode } from "react";

import { Brand, OrbitMark } from "@/components/brand";
import { navLinks } from "@/lib/site-data";

export function SiteShell({
  children,
  eyebrow
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
          <Link className="button ghost" href="/signin">
            Sign in
          </Link>
        </nav>
      </header>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {children}
      <footer className="footer">
        <div>
          <Brand compact />
          <p className="footer-copy">Observe. Infer. Act. Product intelligence with easy integration.</p>
        </div>
        <div className="footer-links">
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <OrbitMark />
      </footer>
    </div>
  );
}

export function DashboardShell({
  title,
  subtitle,
  aside,
  children
}: {
  title: string;
  subtitle: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SiteShell eyebrow="Observe · Infer · Act">
      <section className="dashboard-hero">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-copy">{subtitle}</p>
        </div>
        {aside ? <div className="hero-aside">{aside}</div> : null}
      </section>
      {children}
    </SiteShell>
  );
}
