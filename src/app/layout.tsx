import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GarmentOS — Garment Manufacturing CRM",
    template: "%s | GarmentOS",
  },
  description:
    "Production-ready garment manufacturing CRM + PLM + Operations platform. Manage orders, costing, production, and delivery in one unified system.",
  keywords: ["garment CRM", "manufacturing ERP", "production tracking", "PLM", "apparel software"],
  robots: "noindex, nofollow", // Enterprise internal app
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
