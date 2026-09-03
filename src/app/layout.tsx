import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Business Suite",
  description: "Internes CRM / Orders / Invoices System",
};

// Setzt das gespeicherte Theme vor dem ersten Paint (verhindert Farb-Flackern).
const THEME_INIT = `try{if(localStorage.getItem("bs-theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}
