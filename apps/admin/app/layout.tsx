import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeutschTrainer 內容管理",
  description: "DeutschTrainer 課程、題目、審核與發布管理後台。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
