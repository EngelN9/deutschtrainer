import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  accountDataExportResponseSchema,
  type AccountDataExportResponse,
} from "@deutschtrainer/validation";
import { ApiError } from "../errors";
import type { AccountDataRepository, AccountStorageObject, AuthenticatedAccount } from "./types";

type JsonRow = Record<string, unknown>;

interface DeletionStorageRow {
  profile_id: string;
  storage_bucket: string;
  storage_path: string;
}

const signedAudioLifetimeSeconds = 60 * 60;

export class SupabaseAccountDataRepository implements AccountDataRepository {
  private readonly client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async authenticate(
    accessToken: string,
    options: { includeDeleting?: boolean } = {},
  ): Promise<AuthenticatedAccount | undefined> {
    const userResult = await this.client.auth.getUser(accessToken);
    if (userResult.error || !userResult.data.user) {
      return undefined;
    }

    let profileQuery = this.client
      .from("profiles")
      .select("id, deleted_at")
      .eq("auth_user_id", userResult.data.user.id);
    if (!options.includeDeleting) {
      profileQuery = profileQuery.is("deleted_at", null);
    }
    const profileResult = await profileQuery.maybeSingle();
    assertDatabaseResult(profileResult.error, "無法驗證帳號資料。");
    if (!profileResult.data) {
      return undefined;
    }

    return {
      authUserId: userResult.data.user.id,
      profileId: profileResult.data.id,
      ...(userResult.data.user.email ? { email: userResult.data.user.email } : {}),
      deletionStarted: profileResult.data.deleted_at !== null,
    };
  }

  async exportAccount(
    account: AuthenticatedAccount,
  ): Promise<Omit<AccountDataExportResponse, "requestId">> {
    const [
      profileRows,
      userPreferences,
      userLevels,
      attempts,
      errorRecords,
      skillMastery,
      reviewQueue,
      lessonProgress,
      aiFeedback,
      aiUsageLogs,
      writingSubmissions,
      writingVersions,
      listeningAttempts,
      speakingSubmissions,
      audioAssets,
      contentVersions,
      contentReviewsRequested,
      contentReviewsPerformed,
      aiGenerationJobs,
      auditLogs,
    ] = await Promise.all([
      this.readRows("profiles", "id", account.profileId),
      this.readRows("user_preferences", "user_id", account.profileId),
      this.readRows("user_levels", "user_id", account.profileId),
      this.readRows("attempts", "user_id", account.profileId),
      this.readRows("error_records", "user_id", account.profileId),
      this.readRows("skill_mastery", "user_id", account.profileId),
      this.readRows("review_queue", "user_id", account.profileId),
      this.readRows("lesson_progress", "user_id", account.profileId),
      this.readRows("ai_feedback", "user_id", account.profileId),
      this.readRows("ai_usage_logs", "user_id", account.profileId),
      this.readRows("writing_submissions", "user_id", account.profileId),
      this.readRows("writing_versions", "user_id", account.profileId),
      this.readRows("listening_attempts", "user_id", account.profileId),
      this.readRows("speaking_submissions", "user_id", account.profileId),
      this.readRows("audio_assets", "owner_user_id", account.profileId),
      this.readRows("content_versions", "created_by", account.profileId),
      this.readRows("content_reviews", "requested_by", account.profileId),
      this.readRows("content_reviews", "reviewer_id", account.profileId),
      this.readRows("ai_generation_jobs", "requested_by", account.profileId),
      this.readRows("audit_logs", "actor_user_id", account.profileId),
    ]);

    const profile = profileRows[0];
    if (!profile) {
      throw new ApiError("NOT_FOUND", "找不到可匯出的帳號資料。", 404, false);
    }

    const attemptIds = attempts.flatMap((row) => (typeof row.id === "string" ? [row.id] : []));
    const attemptAnswers = await this.readRowsIn("attempt_answers", "attempt_id", attemptIds);
    const exportedAt = new Date();
    const audioFiles = await Promise.all(
      audioAssets.flatMap((row) => {
        const bucket = row.storage_bucket;
        const path = row.storage_path;
        return bucket === "speaking-audio" && typeof path === "string"
          ? [this.createSignedAudioExport(path, exportedAt)]
          : [];
      }),
    );

    return accountDataExportResponseSchema.omit({ requestId: true }).parse({
      schemaVersion: "1",
      exportedAt: exportedAt.toISOString(),
      profile: { ...profile, email: account.email ?? null },
      collections: {
        userPreferences,
        userLevels,
        attempts,
        attemptAnswers,
        errorRecords,
        skillMastery,
        reviewQueue,
        lessonProgress,
        aiFeedback,
        aiUsageLogs,
        writingSubmissions,
        writingVersions,
        listeningAttempts,
        speakingSubmissions,
        audioAssets,
        contentVersions,
        contentReviewsRequested,
        contentReviewsPerformed,
        aiGenerationJobs,
        auditLogs,
      },
      audioFiles,
    });
  }

  async beginDeletion(authUserId: string): Promise<AccountStorageObject[]> {
    const result = await this.client.rpc("begin_account_deletion_service", {
      p_auth_user_id: authUserId,
    });
    assertMutationResult(result.error, "無法開始帳號刪除流程。");

    return ((result.data ?? []) as DeletionStorageRow[]).map((row) => {
      if (row.storage_bucket !== "speaking-audio") {
        throw new ApiError("DATABASE_ERROR", "帳號錄音路徑不符合安全邊界。", 500, false);
      }
      return { bucket: row.storage_bucket, path: row.storage_path };
    });
  }

  async deleteStorageObjects(objects: AccountStorageObject[]): Promise<void> {
    const paths = [...new Set(objects.map((object) => object.path))];
    if (paths.length === 0) {
      return;
    }
    const result = await this.client.storage.from("speaking-audio").remove(paths);
    if (result.error) {
      throw new ApiError("DATABASE_ERROR", "無法刪除帳號錄音，請稍後重試。", 500, true);
    }
  }

  async deleteAuthUser(authUserId: string): Promise<void> {
    const result = await this.client.auth.admin.deleteUser(authUserId, false);
    if (result.error) {
      throw new ApiError("DATABASE_ERROR", "無法完成帳號刪除，請稍後重試。", 500, true);
    }
  }

  private async readRows(table: string, column: string, value: string): Promise<JsonRow[]> {
    const result = await this.client.from(table).select("*").eq(column, value);
    assertDatabaseResult(result.error, "無法匯出完整帳號資料。");
    return toJsonRows(result.data);
  }

  private async readRowsIn(table: string, column: string, values: string[]): Promise<JsonRow[]> {
    if (values.length === 0) {
      return [];
    }
    const result = await this.client.from(table).select("*").in(column, values);
    assertDatabaseResult(result.error, "無法匯出完整帳號資料。");
    return toJsonRows(result.data);
  }

  private async createSignedAudioExport(path: string, exportedAt: Date) {
    const result = await this.client.storage
      .from("speaking-audio")
      .createSignedUrl(path, signedAudioLifetimeSeconds);
    if (result.error || !result.data.signedUrl) {
      throw new ApiError("DATABASE_ERROR", "無法建立錄音匯出連結。", 500, true);
    }
    return {
      bucket: "speaking-audio" as const,
      path,
      signedUrl: result.data.signedUrl,
      expiresAt: new Date(exportedAt.getTime() + signedAudioLifetimeSeconds * 1000).toISOString(),
    };
  }
}

function toJsonRows(value: unknown): JsonRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((row) =>
    typeof row === "object" && row !== null && !Array.isArray(row) ? [row as JsonRow] : [],
  );
}

function assertDatabaseResult(
  error: { code?: string; message?: string } | null,
  message: string,
): void {
  if (error) {
    throw new ApiError("DATABASE_ERROR", message, 500, true);
  }
}

function assertMutationResult(
  error: { code?: string; message?: string } | null,
  message: string,
): void {
  if (!error) {
    return;
  }
  if (error.code === "22023") {
    throw new ApiError("NOT_FOUND", "找不到可刪除的帳號。", 404, false);
  }
  if (error.code === "42501") {
    throw new ApiError("FORBIDDEN", message, 403, false);
  }
  throw new ApiError("DATABASE_ERROR", message, 500, true);
}
