"use client";

import type { Route } from "next";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ReactNode, useState } from "react";

import { Brand } from "@/components/brand";
import { PollexAppIcon, type PollexAppIconName } from "@/components/pollex-app-icon";

type SidebarItem = {
  href: Route;
  icon: PollexAppIconName;
  label: string;
};

type Props = {
  activePath?: string;
  children: ReactNode;
  initials: string;
  navItems: SidebarItem[];
  planName: string;
  productLabel: string;
  resourceItems: SidebarItem[];
  resourcesLabel: string;
  workspaceName: string;
};

export function DashboardSidebarFrame({
  activePath,
  children,
  initials,
  navItems,
  planName,
  productLabel,
  resourceItems,
  resourcesLabel,
  workspaceName,
}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`dashboard-shell pollex-dashboard-shell ${isCollapsed ? "sidebar-collapsed" : ""}`.trim()}>
      <aside className="dashboard-sidebar" aria-label="Dashboard navigation">
        <div className="dashboard-sidebar-top">
          <div className="dashboard-sidebar-brand">
            <Brand sidebar href="/dashboard" />
          </div>
          <button
            type="button"
            className="dashboard-sidebar-toggle"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </button>
        </div>

        <nav className="dashboard-sidebar-nav">
          <div className="dashboard-sidebar-group">
            <p className="dashboard-sidebar-label">{productLabel}</p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
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
            <p className="dashboard-sidebar-label">{resourcesLabel}</p>
            {resourceItems.map((item) => (
              <Link key={item.href} href={item.href} title={item.label} className="dashboard-sidebar-link">
                <span className="dashboard-sidebar-link-icon" aria-hidden="true">
                  <PollexAppIcon icon={item.icon} />
                </span>
                <span className="dashboard-sidebar-link-copy">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <Link className="dashboard-workspace-card" href="/profile" title={workspaceName}>
          <div className="dashboard-workspace-avatar">{initials}</div>
          <div className="dashboard-workspace-copy">
            <strong>{workspaceName}</strong>
            <span>{planName}</span>
          </div>
        </Link>
      </aside>

      {children}
    </div>
  );
}
