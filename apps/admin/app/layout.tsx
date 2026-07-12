import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeutschTrainer Admin",
  description: "Content and review console for the DeutschTrainer learning system.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
