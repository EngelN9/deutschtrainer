import type { ListeningKind } from "@deutschtrainer/shared-types";

export function listeningKindLabel(kind: ListeningKind): string {
  return {
    sentence: "單句",
    dialogue: "短對話",
    announcement: "公告",
    interview: "訪談",
    news: "新聞",
    lecture: "講座",
    academic: "學術內容",
    discussion: "多人討論",
  }[kind];
}

export function formatAudioTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
