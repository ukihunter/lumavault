import type { Metadata } from "next";

import "./globals.css";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export const metadata: Metadata = {
  title: {
    default: "LumaVault",
    template: "%s | LumaVault",
  },
  description: "Your personal media library.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <Header />
        <Sidebar />

        <div className="min-h-screen lg:pl-64">
          {children}
        </div>

        <MobileNav />
      </body>
    </html>
  );
}