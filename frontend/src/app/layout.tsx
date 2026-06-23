import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ataru-X | Xキャンペーン抽選プラットフォーム",
  description: "X（Twitter）のキャンペーン応募者を自動収集・条件検証し、公平な抽選を行える主催者向けダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full dark antialiased">
      <body className={`${inter.className} min-h-full bg-slate-950 text-slate-100 flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
