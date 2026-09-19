import type { Metadata } from "next";
import { Baloo_2, Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The banner face. Heavy and friendly, like the app it is impersonating.
const baloo = Baloo_2({
  variable: "--font-banner",
  weight: ["800"],
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

// One name everywhere: NotHotdog in the app, "Not Hotdog" in search.
const description =
  "The Silicon Valley Not Hotdog app, rebuilt on Jev — TypeSafe's System One model. It returns a calibrated probability in ~350ms instead of generating text, and tells you when it isn't sure.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Not Hotdog — a Jev demo that knows when it doesn\u2019t know",
    template: "%s — Not Hotdog",
  },
  description,
  applicationName: "NotHotdog",
  keywords: [
    "not hotdog",
    "nothotdog",
    "seefood",
    "not hotdog app",
    "silicon valley",
    "jian yang",
    "jev",
    "typesafe",
    "system one model",
    "classification",
    "calibrated probability",
  ],
  authors: [{ name: "anishsrinivasan", url: "https://github.com/anishsrinivasan" }],
  creator: "anishsrinivasan",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Not Hotdog",
    title: "Not Hotdog — a Jev demo that knows when it doesn\u2019t know",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Not Hotdog — a Jev demo that knows when it doesn\u2019t know",
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${baloo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
