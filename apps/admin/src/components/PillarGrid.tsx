import { BookOpenCheck, Gauge, ShieldCheck } from "lucide-react";

const pillars = [
  {
    title: "進階內容有脈絡",
    description: "依 CEFR B1–C2 組織課程，搭配繁體中文說明與清楚的練習目標。",
    Icon: BookOpenCheck,
  },
  {
    title: "AI 是輔助，不是答案",
    description: "AI 回饋保留使用限制與不確定性，不冒充教師認證或正式檢定結果。",
    Icon: ShieldCheck,
  },
  {
    title: "進度看得見",
    description: "以正式提交結果更新熟練度、錯誤紀錄與複習排程。",
    Icon: Gauge,
  },
] as const;

export function PillarGrid() {
  return (
    <section className="public-section pillar-section" aria-labelledby="pillar-grid-title">
      <div className="public-section-heading compact">
        <p className="public-eyebrow">設計原則</p>
        <h2 id="pillar-grid-title">為長期學習留下真正有用的訊號。</h2>
      </div>
      <div className="pillar-grid">
        {pillars.map(({ title, description, Icon }) => (
          <article key={title}>
            <span className="pillar-icon" aria-hidden="true">
              <Icon size={24} strokeWidth={1.8} />
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
