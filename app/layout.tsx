import type { Metadata } from "next";
import { PRODUCT_CONFIG } from "@/lib/app-config";
import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: `${PRODUCT_CONFIG.name} - Fintech expansion readiness`,
  description:
    "Guided regulatory expansion, evidence-gated PSD3/PSR readiness, RegPropagator and Live Compliance Agent workflows."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
