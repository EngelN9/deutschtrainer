import type { Metadata } from "next";
import Link from "next/link";
import { LearningLoop } from "../../src/components/LearningLoop";
import { PublicDocument } from "../../src/components/PublicDocument";

export const metadata: Metadata = {
  title: "德語 B1–C2 自學",
  description: "以繁體中文學習德語 B1、B2、C1、C2：固定題、錯誤分析、熟練度與間隔複習。",
  alternates: { canonical: "/learn-german-b1-c2" },
};

export default function LearnGermanB1C2Page() {
  return (
    <PublicDocument
      title="德語 B1–C2 自學"
      lead="從能應付日常與工作溝通的 B1，走向能處理複雜語境與精確表達的 C2。"
    >
      <section>
        <h2>以能力等級安排練習</h2>
        <p>
          課程依 CEFR B1、B2、C1、C2
          分級，搭配繁體中文解釋、德語原文與明確的練習目標。內容品質與發布狀態由系統流程管理，不以未審核草稿冒充正式教材。
        </p>
      </section>
      <section>
        <h2>固定題與可追蹤複習</h2>
        <p>
          固定題會根據伺服器確認的提交結果更新熟練度、錯誤紀錄與複習排程。離線時可使用已下載的支援內容；需要
          AI 或即時服務的練習仍必須連線。
        </p>
      </section>
      <LearningLoop />
      <section>
        <h2>開始使用</h2>
        <p>先從目前程度與學習目標開始，再以可重複的練習建立長期節奏。</p>
        <Link className="inline-action-link" href="/">
          回到 DeutschTrainer AI 首頁
        </Link>
      </section>
    </PublicDocument>
  );
}
