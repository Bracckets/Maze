import "./globals.css";
import "./apple-rehaul.css";
import "./pollex.css";
import type { Metadata } from "next";
import { ReactNode } from "react";

import { LocaleProvider } from "@/components/locale-provider";
import { getDirection, getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "Pollex - Product Signal Intelligence",
  description: "Pollex helps teams inspect friction, usage, and behavioral signal with a calmer, more actionable workspace.",
  icons: {
    icon: "favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <html dir={getDirection(locale)} lang={locale}>
      <body className={`locale-${locale}`}>
        <LocaleProvider locale={locale} messages={messages}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
