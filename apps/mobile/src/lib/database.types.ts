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

export interface Database {
  public: {
    CompositeTypes: Record<string, never>;
    Enums: {
      activity_type: ActivityType;
      app_role: AppRole;
      cefr_level: CefrLevel;
      content_status: ContentStatus;
      exercise_type: FixedExerciseType;
      review_status: ReviewStatus;
      skill_category: SkillCategory;
      source_type: SourceType;
    };
    Functions: Record<string, never>;
    Tables: {
      activities: ReadOnlyTable<ActivityRow>;
      courses: ReadOnlyTable<CourseRow>;
      exercise_answers: ReadOnlyTable<ExerciseAnswerRow>;
      exercise_options: ReadOnlyTable<ExerciseOptionRow>;
      exercises: ReadOnlyTable<ExerciseRow>;
      lessons: ReadOnlyTable<LessonRow>;
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
