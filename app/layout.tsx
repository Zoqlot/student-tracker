import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/ui/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Student Tracking Portal",
  description: "Modern student tracking and management portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${inter.className} min-h-screen bg-slate-50`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}