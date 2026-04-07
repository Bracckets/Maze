"use client";

import { createContext, ReactNode, useContext } from "react";

import { getDirection, type Locale, type Messages } from "@/lib/i18n";

const LocaleContext = createContext<{ locale: Locale; messages: Messages } | null>(null);

export function LocaleProvider({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: Locale;
  messages: Messages;
}) {
  return (
    <LocaleContext.Provider value={{ locale, messages }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useI18n must be used within LocaleProvider");
  }

  return {
    locale: context.locale,
    messages: context.messages,
    isRtl: context.locale === "ar",
    direction: getDirection(context.locale),
  };
}
