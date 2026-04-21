import "./pollex.css";
import type { Metadata } from "next";
import { ReactNode } from "react";

import { LocaleProvider } from "@/components/locale-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getDirection, getMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "Pollex - Product Signal Intelligence",
  description:
    "Pollex helps teams inspect friction, usage, and behavioral signal with a calmer, more actionable workspace.",
  icons: {
    icon: [{ url: "/pollex-shapes/x_line.png", type: "image/png" }],
    shortcut: "/pollex-shapes/x_line.png",
    apple: "/pollex-shapes/x_line.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <html
      data-theme="dark"
      dir={getDirection(locale)}
      lang={locale}
      suppressHydrationWarning
    >
      <body className={`locale-${locale}`}>
        <ThemeProvider initialTheme="dark">
          <LocaleProvider locale={locale} messages={messages}>
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
