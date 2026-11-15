import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["600", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "APM Forex - Buy & Sell Foreign Currency in Kolkata", template: "%s | APM Forex" },
  description:
    "APM Tours & Travels, Dum Dum, Kolkata: order foreign currency notes online with transparent rates, GST shown upfront, online KYC, doorstep delivery or store pickup.",
};

export const viewport: Viewport = { themeColor: "#0F766E", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
