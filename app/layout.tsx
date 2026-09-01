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
  alternates: { canonical: "https://labs.ratifyprotocol.com/" },
  openGraph: { title: "Ratify Labs — Executable authority patterns", description: "Run and inspect open references for authority-aware agents.", url: "https://labs.ratifyprotocol.com/", type: "website", images: ["/og.jpg"] },
  twitter: { card: "summary_large_image", title: "Ratify Labs — Executable authority patterns", description: "Run and inspect open references for authority-aware agents.", images: ["/og.jpg"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>;
}
