import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeutschTrainer",
  description: "面向繁體中文使用者的德語 B1–C2 自學系統。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
