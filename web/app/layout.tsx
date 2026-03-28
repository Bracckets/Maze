import "./globals.css";
import type { Metadata } from "next";
import { Syne } from "next/font/google";
import { ReactNode } from "react";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Maze",
  description: "Product intelligence with easy integration"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={syne.variable}>{children}</body>
    </html>
  );
}
