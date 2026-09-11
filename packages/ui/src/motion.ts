export const durationTokens = {
  instant: 0,
  quick: 120,
  base: 240,
  celebrate: 600,
} as const;

export type DurationToken = keyof typeof durationTokens;

export const springTokens = {
  // 答題回饋：回彈明顯但不拖沓，學習者每題都會看到。
  feedback: { damping: 12, mass: 0.8, stiffness: 220 },
  // 進度與計數：不回彈，避免數字來回跳動造成誤讀。
  progress: { damping: 20, mass: 1, stiffness: 160 },
} as const;

export type SpringToken = keyof typeof springTokens;

/**
 * 系統開啟「減少動態效果」時，所有動效時間降為 0，畫面直接切到終態。
 * 以此為單一出口，動效元件就不必各自處理無障礙分支。
 */
export function resolveDuration(token: DurationToken, reduceMotion: boolean): number {
  return reduceMotion ? 0 : durationTokens[token];
}
