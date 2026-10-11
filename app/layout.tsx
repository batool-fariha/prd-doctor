import type { Metadata, Viewport } from "next";
import { SITE } from "@/lib/site";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/footer";
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

const description = "Paste or upload a PRD and get a 0-100 score across 12 categories, with fixes that quote your own words. Free, private, no account.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "PRD Doctor: score your product requirements doc", template: "%s | PRD Doctor" },
  description,
  applicationName: SITE.name,
  authors: [{ name: SITE.author, url: SITE.linkedin }],
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE.name, title: "PRD Doctor: is your PRD ready for review?", description, url: SITE.url },
  twitter: { card: "summary_large_image", title: "PRD Doctor: is your PRD ready for review?", description },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FBFAFE" }, { media: "(prefers-color-scheme: dark)", color: "#0E0B1C" }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}
    >
      <head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("prd-doctor:theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}` }} /></head>
      <body className="min-h-full flex flex-col"><Ambient /><AnalyticsProvider>{children}<Footer /></AnalyticsProvider></body>
    </html>
  );
}
