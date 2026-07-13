export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type CefrLevel = "B1" | "B2" | "C1" | "C2";
type AppRole = "learner" | "content_editor" | "reviewer" | "admin";
type ContentStatus =
  "draft" | "pending_review" | "approved" | "published" | "rejected" | "archived";
type SkillCategory =
  | "vocabulary"
  | "grammar"
  | "reading"
  | "listening"
  | "writing"
  | "speaking"
  | "interaction"
  | "mediation"
  | "pronunciation"
  | "exam_preparation";
type ActivityType = "instruction" | "practice" | "review" | "quiz" | "task";
type FixedExerciseType =
  | "multiple_choice"
  | "multiple_select"
  | "fill_blank"
  | "sentence_order"
  | "matching"
  | "error_correction";
type SourceType = "human" | "ai_generated" | "ai_assisted";
type ReviewStatus = "draft" | "pending_review" | "approved" | "rejected";
type AttemptMode = "lesson" | "review" | "practice" | "placement";
type ReviewQueueStatus = "scheduled" | "completed" | "skipped" | "cancelled";
type LessonProgressStatus = "not_started" | "in_progress" | "completed";
type ErrorSeverity = "minor" | "moderate" | "major" | "critical";
type ErrorType =
  | "spelling"
  | "capitalization"
  | "punctuation"
  | "article"
  | "gender"
  | "case"
  | "declension"
  | "adjective_ending"
  | "verb_conjugation"
  | "tense"
  | "auxiliary"
  | "word_order"
  | "subordinate_clause"
  | "preposition"
  | "verb_preposition"
  | "pronoun"
  | "relative_clause"
  | "passive_voice"
  | "subjunctive"
  | "collocation"
  | "word_choice"
  | "register"
  | "coherence"
  | "cohesion"
  | "argumentation"
  | "task_completion"
  | "style"
  | "idiomaticity"
  | "redundancy"
  | "ambiguity"
  | "pronunciation"
  | "fluency";

interface ReadOnlyTable<Row extends Record<string, unknown>> {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
}

interface CourseRow extends Record<string, unknown> {
  id: string;
  level: CefrLevel;
  title_zh_tw: string;
  title_de: string;
  description_zh_tw: string;
  status: ContentStatus;
  version: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface UnitRow extends Record<string, unknown> {
  id: string;
  course_id: string;
  title_zh_tw: string;
  title_de: string;
  description_zh_tw: string;
  order_index: number;
  status: ContentStatus;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface LessonRow extends Record<string, unknown> {
  id: string;
  unit_id: string;
  level: CefrLevel;
  title_zh_tw: string;
  title_de: string;
  order_index: number;
  estimated_minutes: number;
  skill_categories: SkillCategory[];
  prerequisite_skill_ids: string[];
  learning_objectives: string[];
  vocabulary_tags: string[];
  grammar_tags: string[];
  cefr_descriptor: string;
  status: ContentStatus;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface ActivityRow extends Record<string, unknown> {
  id: string;
  lesson_id: string;
  type: ActivityType;
  title_zh_tw: string;
  order_index: number;
  content_json: Json;
  status: ContentStatus;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface ExerciseRow extends Record<string, unknown> {
  id: string;
  activity_id: string;
  level: CefrLevel;
  type: FixedExerciseType;
  title: string;
  instruction_zh_tw: string;
  prompt_de: string;
  payload_json: Json;
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
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface ExerciseOptionRow extends Record<string, unknown> {
  id: string;
  exercise_id: string;
  label: string;
  text_de: string;
  text_zh_tw: string | null;
  order_index: number;
  is_correct: boolean;
  metadata_json: Json;
  created_at: string;
  updated_at: string;
}

interface ExerciseAnswerRow extends Record<string, unknown> {
  id: string;
  exercise_id: string;
  answer_json: Json;
  grading_policy_json: Json;
  explanation_zh_tw: string;
  created_at: string;
  updated_at: string;
}

interface AttemptRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  exercise_id: string;
  lesson_id: string;
  submitted_at: string;
  score: number;
  is_correct: boolean;
  duration_ms: number;
  used_hint: boolean;
  mode: AttemptMode;
  idempotency_key: string;
  created_at: string;
}

interface AttemptAnswerRow extends Record<string, unknown> {
  id: string;
  attempt_id: string;
  exercise_id: string;
  answer_json: Json;
  normalized_answer_json: Json;
  grading_result_json: Json;
  created_at: string;
}

interface ErrorRecordRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  attempt_id: string;
  exercise_id: string;
  lesson_id: string;
  skill_id: string;
  grammar_topic_id: string | null;
  vocabulary_id: string | null;
  type: ErrorType;
  severity: ErrorSeverity;
  original: string;
  correction: string;
  explanation_zh_tw: string;
  created_at: string;
}

interface SkillMasteryRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  skill_id: string;
  mastery_score: number;
  confidence_score: number;
  attempt_count: number;
  correct_count: number;
  incorrect_count: number;
  hint_count: number;
  average_response_time_ms: number;
  last_practiced_at: string | null;
  next_review_at: string | null;
  correct_streak: number;
  incorrect_streak: number;
  last_error_types: ErrorType[];
  created_at: string;
  updated_at: string;
}

interface ReviewQueueRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  skill_id: string;
  exercise_id: string;
  source_attempt_id: string;
  priority: number;
  scheduled_at: string;
  reason: string;
  interval_days: number;
  ease_factor: number;
  status: ReviewQueueStatus;
  completed_at: string | null;
  completed_attempt_id: string | null;
  created_at: string;
  updated_at: string;
}

interface LessonProgressRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  lesson_id: string;
  status: LessonProgressStatus;
  completion_percent: number;
  completed_exercise_ids: string[];
  correct_exercise_count: number;
  attempted_exercise_count: number;
  last_activity_id: string | null;
  last_practiced_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SkillRow extends Record<string, unknown> {
  id: string;
  code: string;
  name_zh_tw: string;
  name_de: string;
  description_zh_tw: string;
  level: CefrLevel;
  category: SkillCategory;
  mastery_threshold: number;
  prerequisite_skill_ids: string[];
  review_policy_json: Json;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    CompositeTypes: Record<string, never>;
    Enums: {
      activity_type: ActivityType;
      app_role: AppRole;
      cefr_level: CefrLevel;
      content_status: ContentStatus;
      exercise_type: FixedExerciseType;
      attempt_mode: AttemptMode;
      error_severity: ErrorSeverity;
      error_type: ErrorType;
      lesson_progress_status: LessonProgressStatus;
      review_queue_status: ReviewQueueStatus;
      review_status: ReviewStatus;
      skill_category: SkillCategory;
      source_type: SourceType;
    };
    Functions: {
      record_fixed_attempt: {
        Args: {
          p_exercise_id: string;
          p_answer_json: Json;
          p_normalized_answer_json: Json;
          p_grading_result_json: Json;
          p_score: number;
          p_is_correct: boolean;
          p_duration_ms: number;
          p_used_hint: boolean;
          p_mode: AttemptMode;
          p_idempotency_key: string;
          p_review_id?: string | null;
        };
        Returns: Json;
      };
    };
    Tables: {
      activities: ReadOnlyTable<ActivityRow>;
      attempt_answers: ReadOnlyTable<AttemptAnswerRow>;
      attempts: ReadOnlyTable<AttemptRow>;
      courses: ReadOnlyTable<CourseRow>;
      error_records: ReadOnlyTable<ErrorRecordRow>;
      exercise_answers: ReadOnlyTable<ExerciseAnswerRow>;
      exercise_options: ReadOnlyTable<ExerciseOptionRow>;
      exercises: ReadOnlyTable<ExerciseRow>;
      lessons: ReadOnlyTable<LessonRow>;
      lesson_progress: ReadOnlyTable<LessonProgressRow>;
      profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          display_name: string;
          role: AppRole;
          timezone: string;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          auth_user_id: string;
          display_name?: string;
          role?: AppRole;
          timezone?: string;
          onboarding_completed?: boolean;
        };
        Update: {
          display_name?: string;
          timezone?: string;
          onboarding_completed?: boolean;
        };
        Relationships: [];
      };
      units: ReadOnlyTable<UnitRow>;
      review_queue: ReadOnlyTable<ReviewQueueRow>;
      skills: ReadOnlyTable<SkillRow>;
      skill_mastery: ReadOnlyTable<SkillMasteryRow>;
      user_levels: {
        Row: {
          id: string;
          user_id: string;
          current_level: CefrLevel;
          target_level: CefrLevel;
          placement_status: "not_started" | "in_progress" | "completed";
          placement_result_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          current_level: CefrLevel;
          target_level: CefrLevel;
          placement_status?: "not_started" | "in_progress" | "completed";
          placement_result_json?: Json;
        };
        Update: {
          current_level?: CefrLevel;
          target_level?: CefrLevel;
          placement_status?: "not_started" | "in_progress" | "completed";
          placement_result_json?: Json;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          daily_minutes: number;
          target_level: CefrLevel;
          notifications_enabled: boolean;
          theme: "system" | "light" | "dark";
          audio_settings_json: Json;
          learning_goals_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          daily_minutes: number;
          target_level: CefrLevel;
          notifications_enabled: boolean;
          theme?: "system" | "light" | "dark";
          learning_goals_json: Json;
        };
        Update: {
          daily_minutes?: number;
          target_level?: CefrLevel;
          notifications_enabled?: boolean;
          theme?: "system" | "light" | "dark";
          learning_goals_json?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
  };
}
