import type { Metadata } from "next";
import { getPublicSiteUrlString } from "../src/lib/publicSiteUrl";
import "./globals.css";

const publicSiteUrl = getPublicSiteUrlString();

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl),
  title: {
    default: "DeutschTrainer AI — 德語 B1–C2 繁中學習平台",
    template: "%s | DeutschTrainer AI",
  },
  applicationName: "DeutschTrainer AI",
  description: "以繁體中文學習德語 B1–C2：固定題練習、間隔複習、錯誤分析與受限的 AI 功能。",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: "DeutschTrainer AI",
    title: "DeutschTrainer AI — 德語 B1–C2 繁中學習平台",
    description: "以繁體中文建立可長期保留的德語能力。",
    url: publicSiteUrl,
  },
  twitter: {
    card: "summary",
    title: "DeutschTrainer AI — 德語 B1–C2 繁中學習平台",
    description: "以繁體中文建立可長期保留的德語能力。",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              applicationCategory: "EducationalApplication",
              applicationSubCategory: "Language learning",
              applicationSuite: "DeutschTrainer AI",
              description: "面向繁體中文使用者的德語 B1–C2 學習平台。",
              inLanguage: "zh-TW",
              name: "DeutschTrainer AI",
              operatingSystem: "Web, Android",
              offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
              url: publicSiteUrl,
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
