export const themeStorageKey = "pollex-theme";
export const themeCookieName = "pollex_theme";
export const themeCookieMaxAge = 60 * 60 * 24 * 365;

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const themePreferences = new Set<ThemePreference>(["system", "light", "dark"]);

export function readThemePreference(value: string | null | undefined): ThemePreference {
  if (value && themePreferences.has(value as ThemePreference)) {
    return value as ThemePreference;
  }

  return "system";
}

export function getThemeCookieString(theme: ThemePreference) {
  return `${themeCookieName}=${theme}; path=/; max-age=${themeCookieMaxAge}; samesite=lax`;
}
