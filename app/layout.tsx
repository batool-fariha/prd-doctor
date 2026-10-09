import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Ambient } from "@/components/ambient";
import { AnalyticsProvider } from "@/components/analytics-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const serif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PRD Doctor: score your product requirements doc",
  description: "Paste a PRD, get a 0-100 score across 12 categories with quoted, specific fixes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><Ambient /><AnalyticsProvider>{children}</AnalyticsProvider></body>
    </html>
  );
}
