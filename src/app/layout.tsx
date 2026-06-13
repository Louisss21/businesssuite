import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Business Suite",
  description: "Internes CRM / Orders / Invoices System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
