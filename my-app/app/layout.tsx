import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import UserProvider from '@/app/context/UserProvider';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-8"><UserProvider>{children}</UserProvider></div>
      </body>
    </html>
  );
}
