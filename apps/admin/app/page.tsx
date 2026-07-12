import { SUPPORTED_LEVELS } from "@deutschtrainer/shared-types";
import { colorTokens } from "@deutschtrainer/ui";

const plannedAdminAreas = [
  "課程管理",
  "題目審核",
  "內容版本",
  "AI 草稿",
  "音訊資源",
  "匿名學習統計",
];

export default function AdminHomePage() {
  return (
    <main style={styles.main}>
      <section style={styles.header}>
        <p style={styles.eyebrow}>Phase 1 Foundation</p>
        <h1 style={styles.title}>德語學習系統管理後台</h1>
        <p style={styles.description}>
          目前是 Next.js 基礎骨架。Phase 8 會加入課程、題目、審核、版本與發布流程。
        </p>
      </section>

      <section aria-label="支援程度" style={styles.section}>
        <h2 style={styles.sectionTitle}>支援程度</h2>
        <div style={styles.levelGrid}>
          {SUPPORTED_LEVELS.map((level) => (
            <span key={level} style={styles.levelBadge}>
              {level}
            </span>
          ))}
        </div>
      </section>

      <section aria-label="規劃中的管理功能" style={styles.section}>
        <h2 style={styles.sectionTitle}>規劃中的管理功能</h2>
        <ul style={styles.list}>
          {plannedAdminAreas.map((area) => (
            <li key={area}>{area}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

const styles = {
  description: {
    color: colorTokens.mutedText,
    fontSize: 16,
    lineHeight: "24px",
    margin: 0,
    maxWidth: 720,
  },
  eyebrow: {
    color: colorTokens.primary,
    fontSize: 13,
    fontWeight: 700,
    margin: 0,
  },
  header: {
    display: "grid",
    gap: 10,
  },
  levelBadge: {
    border: "1px solid #CBD5E1",
    borderRadius: 8,
    color: colorTokens.text,
    display: "inline-flex",
    fontWeight: 700,
    justifyContent: "center",
    minWidth: 64,
    padding: "10px 14px",
  },
  levelGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  list: {
    color: colorTokens.text,
    lineHeight: "28px",
    margin: 0,
    paddingInlineStart: 20,
  },
  main: {
    background: colorTokens.background,
    display: "grid",
    gap: 32,
    minHeight: "100vh",
    padding: "56px 24px",
  },
  section: {
    display: "grid",
    gap: 12,
  },
  sectionTitle: {
    color: colorTokens.text,
    fontSize: 18,
    margin: 0,
  },
  title: {
    color: colorTokens.text,
    fontSize: 34,
    lineHeight: "42px",
    margin: 0,
  },
} as const;
