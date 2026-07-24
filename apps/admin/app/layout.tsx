import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DeutschTrainer｜給繁體中文學習者的德語 B1–C2 自學 App",
    template: "%s｜DeutschTrainer",
  },
  description:
    "以繁體中文文法解釋、分級課程、AI 錯誤診斷、間隔複習、寫作、聽力與口說，建立從德語 B1 到 C2 的持續進步路徑。",
  applicationName: "DeutschTrainer",
  authors: [{ name: "DeutschTrainer" }],
  creator: "DeutschTrainer",
  keywords: ["德語", "德文", "B1", "B2", "C1", "C2", "AI 德語學習", "繁體中文", "Deutsch lernen"],
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: "DeutschTrainer",
    title: "DeutschTrainer｜真正理解德語，從 B1 練到 C2",
    description: "給繁體中文學習者的德語 B1–C2 AI 自學 App。",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "DeutschTrainer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DeutschTrainer｜德語 B1–C2 AI 自學 App",
    description: "繁體中文解釋、分級課程、AI 診斷與完整語言能力訓練。",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
