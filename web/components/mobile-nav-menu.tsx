"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Brand } from "@/components/brand";
import { useI18n } from "@/components/locale-provider";
import { LocaleSwitcher } from "@/components/locale-switcher";

type MobileMenuItem = {
  href: string;
  label: string;
  tone?: "default" | "primary";
};

type MobileMenuSection = {
  title?: string;
  items: MobileMenuItem[];
};

type MobileMenuProps = {
  brandHref: "/" | "/dashboard";
  summary?: {
    title: string;
    subtitle: string;
  };
  sections: MobileMenuSection[];
};

export function MobileNavMenu({
  brandHref,
  summary,
  sections,
}: MobileMenuProps) {
  const { messages } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <>
      <div className="mobile-topbar">
        <Brand href={brandHref} />
        <button
          aria-controls="mobile-navigation-drawer"
          aria-expanded={isOpen}
          aria-label={isOpen ? messages.auth.closeMenu : messages.auth.openMenu}
          className="mobile-menu-toggle"
          type="button"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        className={`mobile-drawer ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(false)}
      >
        <div className="mobile-drawer-backdrop" />
        <aside
          className="mobile-drawer-panel"
          id="mobile-navigation-drawer"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="mobile-drawer-close"
            type="button"
            onClick={() => setIsOpen(false)}
          >
            {messages.auth.close}
          </button>

          <div className="mobile-drawer-brand">
            <Brand href={brandHref} />
            {summary ? (
              <div className="mobile-drawer-summary">
                <strong>{summary.title}</strong>
                <span>{summary.subtitle}</span>
              </div>
            ) : null}
          </div>

          <div className="mobile-drawer-control-stack">
            <LocaleSwitcher compact />
          </div>

          <nav className="mobile-drawer-sections">
            {sections.map((section) => (
              <div className="mobile-drawer-group" key={section.title ?? section.items.map((item) => item.href).join("|")}>
                {section.title ? (
                  <p className="mobile-drawer-label">{section.title}</p>
                ) : null}
                <div className="mobile-drawer-links">
                  {section.items.map((item) => (
                    <Link
                      className={`mobile-drawer-link ${item.tone === "primary" ? "mobile-drawer-link-primary" : ""}`.trim()}
                      href={item.href as "/" | "/dashboard" | "/signin" | "/signup" | "/profile" | "/pricing" | "/docs" | "/usage" | "/heatmap" | "/settings"}
                      key={item.href}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}
