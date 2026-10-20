import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/register-sw";

const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const placa = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-placa" });

export const metadata: Metadata = {
  title: { default: "Emplacamento SESÉ", template: "%s · Emplacamento SESÉ" },
  applicationName: "Emplacamento SESÉ",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Emplacamento SESÉ", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1B1F23", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${placa.variable}`}>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
