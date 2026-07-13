import type { ErrorType, WritingSubmissionStatus, WritingType } from "@deutschtrainer/shared-types";

export function writingTypeLabel(type: WritingType): string {
  const labels: Record<WritingType, string> = {
    informal_email: "非正式郵件",
    formal_email: "正式郵件",
    experience_description: "經驗描述",
    opinion: "意見表達",
    complaint_letter: "申訴信",
    advantages_disadvantages: "利弊分析",
    argumentative_essay: "論證文章",
    forum_post: "論壇文章",
    summary: "摘要",
    formal_report: "正式報告",
    academic_argument: "學術論述",
    source_integration: "資料整合",
    structured_review: "結構化評論",
    advanced_essay: "高階論文",
    style_transformation: "文體改寫",
    critical_review: "批判評論",
    professional_editing: "專業編修",
    advanced_synthesis: "高階綜合",
    rhetorical_revision: "修辭改寫",
  };
  return labels[type];
}

export function writingStatusLabel(status: WritingSubmissionStatus): string {
  return {
    evaluating: "批改中",
    revision_requested: "待重寫",
    completed: "已完成",
    evaluation_failed: "待重試",
  }[status];
}

export function errorTypeLabel(type: ErrorType): string {
  const labels: Partial<Record<ErrorType, string>> = {
    spelling: "拼字",
    capitalization: "大小寫",
    punctuation: "標點",
    article: "冠詞",
    word_order: "語序",
    case: "格位",
    gender: "性別",
    verb_conjugation: "動詞變化",
    tense: "時態",
    word_choice: "詞彙選擇",
    collocation: "搭配",
    register: "語域",
    coherence: "連貫",
    cohesion: "銜接",
    argumentation: "論證",
    task_completion: "任務完成",
    style: "風格",
    idiomaticity: "慣用性",
    redundancy: "冗贅",
    ambiguity: "歧義",
  };
  return labels[type] ?? type;
}
