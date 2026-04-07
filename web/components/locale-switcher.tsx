"use client";

import { useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { localeCookieName } from "@/lib/i18n";

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, messages } = useI18n();
  const [isUpdating, setIsUpdating] = useState(false);

  function handleSwitch() {
    const nextLocale = locale === "en" ? "ar" : "en";
    setIsUpdating(true);
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <button
      className={`locale-switcher ${compact ? "locale-switcher-compact" : ""}`.trim()}
      disabled={isUpdating}
      onClick={handleSwitch}
      type="button"
    >
      <span className="locale-switcher-label">{messages.localeLabel}</span>
      <strong>{messages.switchLocale}</strong>
    </button>
  );
}
