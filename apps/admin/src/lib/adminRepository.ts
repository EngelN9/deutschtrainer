import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { ContentTeamRole } from "@deutschtrainer/shared-types";
import {
  adminCourseDraftSchema,
  adminExerciseDraftSchema,
  generateExerciseDraftRequestSchema,
  generateExerciseDraftResponseSchema,
  type AdminCourseDraft,
  type AdminExerciseDraft,
  type GenerateExerciseDraftRequest,
  type GenerateExerciseDraftResponse,
} from "@deutschtrainer/validation";
import type {
  ActivityRow,
  AdminProfile,
  AdminWorkspaceData,
  AuditLogRow,
  ContentReviewRow,
  ContentVersionRow,
  CourseRow,
  ExerciseAnswerRow,
  ExerciseDetail,
  ExerciseOptionRow,
  ExerciseRow,
  GenerationJobRow,
} from "./adminTypes";

interface AdminPublicConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
}

let cachedClient: SupabaseClient | undefined;

export function readAdminPublicConfig(): AdminPublicConfig | undefined {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.startsWith("replace-with-")) {
    return undefined;
  }
  return {
    supabaseUrl,
    supabaseAnonKey,
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8787",
  };
}

export function createAdminRepository(): AdminRepository | undefined {
  const config = readAdminPublicConfig();
  if (!config) {
    return undefined;
  }
  cachedClient ??= createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return new AdminRepository(cachedClient, config.apiBaseUrl);
}

export class AdminRepository {
  constructor(
    readonly client: SupabaseClient,
    private readonly apiBaseUrl: string,
  ) {}

  async getSession(): Promise<Session | null> {
    const result = await this.client.auth.getSession();
    assertSupabase(result.error, "無法讀取登入狀態。");
    return result.data.session;
  }

  async signIn(email: string, password: string): Promise<Session> {
    const result = await this.client.auth.signInWithPassword({ email, password });
    assertSupabase(result.error, "登入失敗，請確認帳號與密碼。");
    if (!result.data.session) {
      throw new Error("登入完成但沒有建立 session。");
    }
    return result.data.session;
  }

  async signOut(): Promise<void> {
    const result = await this.client.auth.signOut();
    assertSupabase(result.error, "登出失敗。");
  }

  async getProfile(authUserId: string): Promise<AdminProfile | undefined> {
    const result = await this.client
      .from("profiles")
      .select("id, auth_user_id, display_name, role")
      .eq("auth_user_id", authUserId)
      .is("deleted_at", null)
      .maybeSingle();
    assertSupabase(result.error, "無法讀取管理者角色。");
    if (!result.data || !isContentTeamRole(result.data.role)) {
      return undefined;
    }
    return {
      id: result.data.id,
      authUserId: result.data.auth_user_id,
      displayName: result.data.display_name,
      role: result.data.role,
    };
  }

  async loadWorkspace(profile: AdminProfile): Promise<AdminWorkspaceData> {
    const [courses, exercises, activities, lessons, versions, reviews, generationJobs, auditLogs] =
      await Promise.all([
        this.client
          .from("courses")
          .select(
            "id, level, title_zh_tw, title_de, description_zh_tw, status, version, published_at, updated_at",
          )
          .is("deleted_at", null)
          .order("level")
          .order("updated_at", { ascending: false }),
        this.client
          .from("exercises")
          .select(
            "id, activity_id, level, type, title, instruction_zh_tw, prompt_de, payload_json, skill_ids, grammar_topic_ids, vocabulary_ids, estimated_seconds, difficulty, source_type, review_status, status, version, order_index, updated_at",
          )
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(250),
        this.client
          .from("activities")
          .select("id, lesson_id, title_zh_tw, order_index, status")
          .is("deleted_at", null)
          .order("lesson_id")
          .order("order_index"),
        this.client.from("lessons").select("id, title_zh_tw, level").is("deleted_at", null),
        this.client
          .from("content_versions")
          .select(
            "id, entity_type, entity_id, version, snapshot_json, change_summary, source_type, created_by, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(500),
        this.client
          .from("content_reviews")
          .select(
            "id, entity_type, entity_id, content_version_id, requested_by, reviewer_id, status, request_notes, review_notes, created_at, reviewed_at",
          )
          .order("created_at", { ascending: false })
          .limit(250),
        this.client
          .from("ai_generation_jobs")
          .select(
            "id, activity_id, level, exercise_type, topic_zh_tw, target_skill_ids, status, model, error_code, created_at, completed_at",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        profile.role === "admin"
          ? this.client
              .from("audit_logs")
              .select(
                "id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at",
              )
              .like("action", "content.%")
              .order("created_at", { ascending: false })
              .limit(250)
          : Promise.resolve({ data: [], error: null }),
      ]);

    for (const [result, message] of [
      [courses, "無法載入課程。"],
      [exercises, "無法載入題目。"],
      [activities, "無法載入活動。"],
      [lessons, "無法載入課堂。"],
      [versions, "無法載入內容版本。"],
      [reviews, "無法載入審核資料。"],
      [generationJobs, "無法載入 AI 草稿工作。"],
      [auditLogs, "無法載入發布紀錄。"],
    ] as const) {
      assertSupabase(result.error, message);
    }

    const lessonMap = new Map((lessons.data ?? []).map((lesson) => [lesson.id, lesson] as const));
    const mappedActivities: ActivityRow[] = (activities.data ?? []).map((activity) => {
      const lesson = lessonMap.get(activity.lesson_id);
      if (!lesson) {
        throw new Error("活動缺少對應課堂。");
      }
      return {
        ...activity,
        lessonTitleZhTw: lesson.title_zh_tw,
        level: lesson.level,
      } as ActivityRow;
    });

    return {
      courses: (courses.data ?? []) as CourseRow[],
      exercises: (exercises.data ?? []) as ExerciseRow[],
      activities: mappedActivities,
      versions: (versions.data ?? []) as ContentVersionRow[],
      reviews: (reviews.data ?? []) as ContentReviewRow[],
      generationJobs: (generationJobs.data ?? []) as GenerationJobRow[],
      auditLogs: (auditLogs.data ?? []) as AuditLogRow[],
    };
  }

  async getExerciseDetail(exerciseId: string): Promise<ExerciseDetail> {
    const [exercise, options, answer] = await Promise.all([
      this.client
        .from("exercises")
        .select(
          "id, activity_id, level, type, title, instruction_zh_tw, prompt_de, payload_json, skill_ids, grammar_topic_ids, vocabulary_ids, estimated_seconds, difficulty, source_type, review_status, status, version, order_index, updated_at",
        )
        .eq("id", exerciseId)
        .single(),
      this.client
        .from("exercise_options")
        .select("id, label, text_de, text_zh_tw, order_index, is_correct, metadata_json")
        .eq("exercise_id", exerciseId)
        .order("order_index"),
      this.client
        .from("exercise_answers")
        .select("answer_json, grading_policy_json, explanation_zh_tw")
        .eq("exercise_id", exerciseId)
        .maybeSingle(),
    ]);
    assertSupabase(exercise.error, "無法讀取題目內容。");
    assertSupabase(options.error, "無法讀取題目選項。");
    assertSupabase(answer.error, "無法讀取題目答案。");
    if (!exercise.data) {
      throw new Error("找不到題目。");
    }
    return {
      exercise: exercise.data as ExerciseRow,
      options: (options.data ?? []) as ExerciseOptionRow[],
      answer: (answer.data ?? {
        answer_json: {},
        grading_policy_json: {},
        explanation_zh_tw: "",
      }) as ExerciseAnswerRow,
    };
  }

  async saveCourse(input: {
    courseId?: string;
    expectedVersion?: number;
    draft: AdminCourseDraft;
    changeSummary: string;
  }): Promise<void> {
    const draft = adminCourseDraftSchema.parse(input.draft);
    const result = await this.client.rpc("admin_save_course", {
      p_course_id: input.courseId ?? null,
      p_expected_version: input.expectedVersion ?? null,
      p_draft: draft,
      p_change_summary: input.changeSummary,
    });
    assertSupabase(result.error, "無法保存課程。");
  }

  async saveExercise(input: {
    exerciseId?: string;
    expectedVersion?: number;
    draft: AdminExerciseDraft;
    changeSummary: string;
  }): Promise<void> {
    const draft = adminExerciseDraftSchema.parse(input.draft);
    const result = await this.client.rpc("admin_save_exercise", {
      p_exercise_id: input.exerciseId ?? null,
      p_expected_version: input.expectedVersion ?? null,
      p_draft: draft,
      p_change_summary: input.changeSummary,
    });
    assertSupabase(result.error, "無法保存題目。");
  }

  async submitReview(
    entityType: "course" | "exercise",
    entityId: string,
    version: number,
    notes: string,
  ): Promise<void> {
    const result = await this.client.rpc("admin_submit_content_review", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_expected_version: version,
      p_request_notes: notes,
    });
    assertSupabase(result.error, "無法送出審核。");
  }

  async review(reviewId: string, decision: "approved" | "rejected", notes: string) {
    const result = await this.client.rpc("admin_review_content", {
      p_review_id: reviewId,
      p_decision: decision,
      p_review_notes: notes,
    });
    assertSupabase(result.error, "無法完成審核決定。");
  }

  async publish(entityType: "course" | "exercise", entityId: string, version: number) {
    const result = await this.client.rpc("admin_publish_content", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_expected_version: version,
    });
    assertSupabase(result.error, "無法發布內容。");
  }

  async generateExerciseDraft(
    session: Session,
    input: GenerateExerciseDraftRequest,
  ): Promise<GenerateExerciseDraftResponse> {
    const request = generateExerciseDraftRequestSchema.parse(input);
    const response = await fetch(`${this.apiBaseUrl}/admin/ai/exercise-drafts`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
    const payload = (await response.json()) as unknown;
    if (!response.ok) {
      const message = readApiErrorMessage(payload);
      throw new Error(message || "AI 題目草稿生成失敗。");
    }
    return generateExerciseDraftResponseSchema.parse(payload);
  }
}

function isContentTeamRole(value: string): value is ContentTeamRole {
  return value === "content_editor" || value === "reviewer" || value === "admin";
}

function assertSupabase(error: { message: string } | null, message: string): void {
  if (error) {
    throw new Error(`${message} ${error.message}`);
  }
}

function readApiErrorMessage(payload: unknown): string {
  if (typeof payload !== "object" || payload === null || !("error" in payload)) {
    return "";
  }
  const error = (payload as { error?: unknown }).error;
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return "";
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}
