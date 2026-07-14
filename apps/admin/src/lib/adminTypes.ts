import type {
  CefrLevel,
  ContentStatus,
  ContentTeamRole,
  ExerciseType,
  ReviewStatus,
  SourceType,
} from "@deutschtrainer/shared-types";

export interface AdminProfile {
  id: string;
  authUserId: string;
  displayName: string;
  role: ContentTeamRole;
}

export interface CourseRow {
  id: string;
  level: CefrLevel;
  title_zh_tw: string;
  title_de: string;
  description_zh_tw: string;
  status: ContentStatus;
  version: number;
  published_at: string | null;
  updated_at: string;
}

export interface ActivityRow {
  id: string;
  lesson_id: string;
  title_zh_tw: string;
  order_index: number;
  status: ContentStatus;
  lessonTitleZhTw: string;
  level: CefrLevel;
}

export interface ExerciseRow {
  id: string;
  activity_id: string;
  level: CefrLevel;
  type: ExerciseType;
  title: string;
  instruction_zh_tw: string;
  prompt_de: string;
  payload_json: Record<string, unknown>;
  skill_ids: string[];
  grammar_topic_ids: string[];
  vocabulary_ids: string[];
  estimated_seconds: number;
  difficulty: number;
  source_type: SourceType;
  review_status: ReviewStatus;
  status: ContentStatus;
  version: number;
  order_index: number;
  updated_at: string;
}

export interface ExerciseOptionRow {
  id: string;
  label: string;
  text_de: string;
  text_zh_tw: string | null;
  order_index: number;
  is_correct: boolean;
  metadata_json: Record<string, unknown>;
}

export interface ExerciseAnswerRow {
  answer_json: Record<string, unknown>;
  grading_policy_json: Record<string, unknown>;
  explanation_zh_tw: string;
}

export interface ExerciseDetail {
  exercise: ExerciseRow;
  options: ExerciseOptionRow[];
  answer: ExerciseAnswerRow;
}

export interface ContentVersionRow {
  id: string;
  entity_type: "course" | "exercise";
  entity_id: string;
  version: number;
  snapshot_json: Record<string, unknown>;
  change_summary: string;
  source_type: SourceType;
  created_by: string | null;
  created_at: string;
}

export interface ContentReviewRow {
  id: string;
  entity_type: "course" | "exercise";
  entity_id: string;
  content_version_id: string;
  requested_by: string;
  reviewer_id: string | null;
  status: "pending" | "approved" | "rejected" | "superseded";
  request_notes: string;
  review_notes: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface GenerationJobRow {
  id: string;
  activity_id: string;
  level: CefrLevel;
  exercise_type: "multiple_choice" | "fill_blank" | "error_correction";
  topic_zh_tw: string;
  target_skill_ids: string[];
  status: "queued" | "processing" | "completed" | "failed";
  model: string | null;
  error_code: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface AdminWorkspaceData {
  courses: CourseRow[];
  activities: ActivityRow[];
  exercises: ExerciseRow[];
  versions: ContentVersionRow[];
  reviews: ContentReviewRow[];
  generationJobs: GenerationJobRow[];
  auditLogs: AuditLogRow[];
}
