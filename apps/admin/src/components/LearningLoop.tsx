import { BookOpen, ChartNoAxesCombined, MessageSquareText, RotateCcw } from "lucide-react";

const learningSteps = [
  {
    title: "理解",
    description: "以繁體中文說明掌握德語情境、文法與任務目標。",
    Icon: BookOpen,
  },
  {
    title: "練習",
    description: "用固定題與輸出任務，把知識轉成可以運用的能力。",
    Icon: MessageSquareText,
  },
  {
    title: "看見回饋",
    description: "從批改、錯誤分類與學習紀錄找出下一個重點。",
    Icon: ChartNoAxesCombined,
  },
  {
    title: "適時複習",
    description: "依掌握度與複習排程回到真正需要加強的內容。",
    Icon: RotateCcw,
  },
] as const;

export function LearningLoop() {
  return (
    <section className="public-section learning-loop" aria-labelledby="learning-loop-title">
      <div className="public-section-heading">
        <p className="public-eyebrow">學習循環</p>
        <h2 id="learning-loop-title">每次練習，都清楚接到下一步。</h2>
        <p>
          DeutschTrainer
          將內容、作答、回饋與間隔複習串成一條可追蹤的路徑，而不是讓學習停在一次性的答案。
        </p>
      </div>
      <ol className="learning-loop-steps">
        {learningSteps.map(({ title, description, Icon }, index) => (
          <li key={title}>
            <span className="learning-step-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <Icon className="learning-step-icon" size={24} strokeWidth={1.8} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
