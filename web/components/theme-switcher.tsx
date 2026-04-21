"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { useTheme } from "@/components/theme-provider";

export function ThemeSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const isArabic = locale === "ar";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const options = [
    { label: isArabic ? "طھظ„ظ‚ط§ط¦ظٹ" : "System", value: "system" },
    { label: isArabic ? "ظپط§طھط­" : "Light", value: "light" },
    { label: isArabic ? "ط¯ط§ظƒظ†" : "Dark", value: "dark" },
  ] as const;
  const resolvedLabel =
    resolvedTheme === "light"
      ? isArabic
        ? "ظپط§طھط­"
        : "Light"
      : isArabic
        ? "ط¯ط§ظƒظ†"
        : "Dark";

  return (
    <label
      className={`theme-switcher ${compact ? "theme-switcher-compact" : ""}`.trim()}
    >
      <span className="theme-switcher-copy">
        <span className="theme-switcher-label">{isArabic ? "ط§ظ„ظ…ط¸ظ‡ط±" : "Theme"}</span>
        <strong>
          {theme === "system"
            ? isMounted
              ? `${options[0].label} / ${resolvedLabel}`
              : options[0].label
            : options.find((option) => option.value === theme)?.label}
        </strong>
      </span>
      <select
        aria-label={isArabic ? "ط§ط®طھظٹط§ط± ط§ظ„ظ…ط¸ظ‡ط±" : "Select theme"}
        className="theme-switcher-select"
        onChange={(event) => setTheme(event.target.value as typeof theme)}
        value={theme}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

