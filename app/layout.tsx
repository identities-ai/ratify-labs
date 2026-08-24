import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://labs.ratifyprotocol.com"),
  title: "Ratify Labs — Executable authority patterns",
  description: "Run and inspect open references for authority-aware agents.",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "Ratify Labs", description: "Agents can act. Authority makes it safe.", type: "website", images: ["/og.jpg"] },
  twitter: { card: "summary_large_image", title: "Ratify Labs", description: "Agents can act. Authority makes it safe.", images: ["/og.jpg"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>;
}
