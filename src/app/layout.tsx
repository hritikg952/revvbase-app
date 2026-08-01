import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Revvbase — Used two-wheelers in India",
  description: "Browse and list second-hand motorcycles, scooters, electric two-wheelers, and bicycles.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <SiteHeader />
          <main>{children}</main>
          <footer className="site-footer">
            <div className="shell">Revvbase · A simpler way to pass two-wheelers forward.</div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
