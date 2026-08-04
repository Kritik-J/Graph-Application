import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const archivo = Archivo({
  variable: "--font-archivo",
  weight: ["400", "600", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ripple — Supply-chain risk explorer",
  description:
    "Graph-powered supply-chain risk explorer: arm a disruption, watch the blast radius, find the suppliers every product runs through.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} min-h-screen antialiased`}>
        <SiteHeader />
        <main className="min-w-0">{children}</main>
      </body>
    </html>
  );
}
