import type { Metadata } from "next";
import { PRODUCT_CONFIG } from "@/lib/app-config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${PRODUCT_CONFIG.name} PSD3/PSR`,
  description: "PSD3/PSR readiness matrix and remediation backlog for payment fintechs."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
