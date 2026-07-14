import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateExerciseDraftResponseSchema } from "@deutschtrainer/validation";

const supabaseUrl = requireEnvironment("SUPABASE_URL");
const anonKey = requireEnvironment("SUPABASE_ANON_KEY");
const serviceRoleKey = requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8787";

const service = createClient(supabaseUrl, serviceRoleKey, clientOptions());
const learner = createClient(supabaseUrl, anonKey, clientOptions());
const editor = createClient(supabaseUrl, anonKey, clientOptions());
const reviewer = createClient(supabaseUrl, anonKey, clientOptions());
const administrator = createClient(supabaseUrl, anonKey, clientOptions());
const createdUserIds: string[] = [];
const createdEntities: Array<{ type: "course" | "exercise"; id: string }> = [];

try {
  const stamp = Date.now();
  const password = "Phase8-test-only-Strong-42!";
  const learnerUser = await createUser(
    `phase8-${stamp}-learner@example.test`,
    password,
    "Phase 8 Learner",
  );
  const editorUser = await createUser(
    `phase8-${stamp}-editor@example.test`,
    password,
    "Phase 8 Editor",
  );
  const reviewerUser = await createUser(
    `phase8-${stamp}-reviewer@example.test`,
    password,
    "Phase 8 Reviewer",
  );
  const adminUser = await createUser(
    `phase8-${stamp}-admin@example.test`,
    password,
    "Phase 8 Admin",
  );

  const learnerProfile = await setRole(learnerUser.id, "learner");
  const editorProfile = await setRole(editorUser.id, "content_editor");
  await setRole(reviewerUser.id, "reviewer");
  const adminProfile = await setRole(adminUser.id, "admin");

  await signIn(learner, learnerUser.email, password);
  const editorToken = await signIn(editor, editorUser.email, password);
  await signIn(reviewer, reviewerUser.email, password);
  await signIn(administrator, adminUser.email, password);

  const learnerSave = await learner.rpc("admin_save_course", {
    p_course_id: null,
    p_expected_version: null,
    p_draft: {
      level: "B1",
      titleZhTw: "不應建立",
      titleDe: "Nicht erlaubt",
      descriptionZhTw: "一般學習者不可建立管理內容。",
    },
    p_change_summary: "unauthorized",
  });
  assert.ok(learnerSave.error, "learner must not create course content");

  const savedCourse = await editor.rpc("admin_save_course", {
    p_course_id: null,
    p_expected_version: null,
    p_draft: {
      level: "B2",
      titleZhTw: `Phase 8 測試課程 ${stamp}`,
      titleDe: `Phase-8-Testkurs ${stamp}`,
      descriptionZhTw: "用於驗證版本、審核、發布與稽核紀錄的暫時課程。",
    },
    p_change_summary: "建立整合測試課程",
  });
  assertDatabaseSuccess(savedCourse.error, "save course draft as editor");
  const coursePayload = asObject(savedCourse.data);
  const course = asObject(coursePayload.entity);
  const courseId = requireString(course, "id");
  createdEntities.push({ type: "course", id: courseId });
  assert.equal(course.status, "draft");
  assert.equal(course.version, 1);

  const learnerVersions = await learner
    .from("content_versions")
    .select("id")
    .eq("entity_id", courseId);
  assertDatabaseSuccess(learnerVersions.error, "query versions as learner");
  assert.equal(learnerVersions.data.length, 0);

  const directPublish = await editor
    .from("courses")
    .update({ status: "published" })
    .eq("id", courseId)
    .select("id");
  assert.ok(directPublish.error || directPublish.data.length === 0);
  assert.equal(await readStatus("courses", courseId), "draft");

  const courseReview = await editor.rpc("admin_submit_content_review", {
    p_entity_type: "course",
    p_entity_id: courseId,
    p_expected_version: 1,
    p_request_notes: "請確認 B2 定位。",
  });
  assertDatabaseSuccess(courseReview.error, "submit course review");
  const courseReviewId = requireString(asObject(courseReview.data), "id");

  const editorApproval = await editor.rpc("admin_review_content", {
    p_review_id: courseReviewId,
    p_decision: "approved",
    p_review_notes: "editor cannot approve",
  });
  assert.ok(editorApproval.error, "editor must not approve a review");

  const approvedCourse = await reviewer.rpc("admin_review_content", {
    p_review_id: courseReviewId,
    p_decision: "approved",
    p_review_notes: "程度、標題與說明符合內容規範。",
  });
  assertDatabaseSuccess(approvedCourse.error, "approve course as reviewer");
  assert.equal(await readStatus("courses", courseId), "approved");

  const reviewerPublish = await reviewer.rpc("admin_publish_content", {
    p_entity_type: "course",
    p_entity_id: courseId,
    p_expected_version: 1,
  });
  assert.ok(reviewerPublish.error, "reviewer must not publish content");

  const publishedCourse = await administrator.rpc("admin_publish_content", {
    p_entity_type: "course",
    p_entity_id: courseId,
    p_expected_version: 1,
  });
  assertDatabaseSuccess(publishedCourse.error, "publish course as admin");
  assert.equal(await readStatus("courses", courseId), "published");

  const contextResult = await service
    .from("activities")
    .select("id, lesson_id, order_index")
    .eq("status", "published")
    .limit(1)
    .single();
  assertDatabaseSuccess(contextResult.error, "read generation activity");
  const lessonResult = await service
    .from("lessons")
    .select("level")
    .eq("id", contextResult.data.lesson_id)
    .single();
  assertDatabaseSuccess(lessonResult.error, "read generation lesson level");
  const skillResult = await service
    .from("skills")
    .select("code")
    .eq("level", lessonResult.data.level)
    .limit(1)
    .single();
  assertDatabaseSuccess(skillResult.error, "read generation skill");
  const maxOrderResult = await service
    .from("exercises")
    .select("order_index")
    .eq("activity_id", contextResult.data.id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  assertDatabaseSuccess(maxOrderResult.error, "read exercise order");

  const generationRequest = {
    activityId: contextResult.data.id,
    level: lessonResult.data.level,
    type: "multiple_choice",
    topicZhTw: "正式情境中的禮貌請求",
    targetSkillIds: [skillResult.data.code],
    instructionsZhTw: "題目只能有一個明確正確答案。",
    orderIndex: (maxOrderResult.data?.order_index ?? 0) + 10,
    idempotencyKey: `phase8-generation-${stamp}`,
  } as const;

  const generated = await generate(editorToken, generationRequest);
  createdEntities.push({ type: "exercise", id: generated.exerciseId });
  assert.equal(generated.status, "draft");
  assert.equal(generated.reviewStatus, "draft");
  assert.equal(generated.sourceType, "ai_generated");
  assert.equal(generated.draft.requiresHumanReview, true);

  const anonymousDraft = await learner
    .from("exercises")
    .select("id")
    .eq("id", generated.exerciseId);
  assertDatabaseSuccess(anonymousDraft.error, "query AI draft as learner");
  assert.equal(anonymousDraft.data.length, 0);

  const prematurePublish = await administrator.rpc("admin_publish_content", {
    p_entity_type: "exercise",
    p_entity_id: generated.exerciseId,
    p_expected_version: 1,
  });
  assert.ok(prematurePublish.error, "AI draft must not publish without approved review");
  assert.equal(await readStatus("exercises", generated.exerciseId), "draft");

  const replay = await generate(editorToken, generationRequest);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.exerciseId, generated.exerciseId);

  const exerciseReview = await editor.rpc("admin_submit_content_review", {
    p_entity_type: "exercise",
    p_entity_id: generated.exerciseId,
    p_expected_version: 1,
    p_request_notes: "AI 草稿已人工檢查答案唯一性。",
  });
  assertDatabaseSuccess(exerciseReview.error, "submit generated exercise review");
  const exerciseReviewId = requireString(asObject(exerciseReview.data), "id");
  const exerciseApproval = await reviewer.rpc("admin_review_content", {
    p_review_id: exerciseReviewId,
    p_decision: "approved",
    p_review_notes: "德文自然且正確答案唯一。",
  });
  assertDatabaseSuccess(exerciseApproval.error, "approve generated exercise");
  const exercisePublish = await administrator.rpc("admin_publish_content", {
    p_entity_type: "exercise",
    p_entity_id: generated.exerciseId,
    p_expected_version: 1,
  });
  assertDatabaseSuccess(exercisePublish.error, "publish reviewed generated exercise");
  assert.equal(await readStatus("exercises", generated.exerciseId), "published");

  const auditResult = await service
    .from("audit_logs")
    .select("actor_user_id, entity_type, entity_id, metadata_json")
    .eq("action", "content.published")
    .in("entity_id", [courseId, generated.exerciseId]);
  assertDatabaseSuccess(auditResult.error, "read publish audit logs");
  assert.equal(auditResult.data.length, 2);
  assert.ok(auditResult.data.every((row) => row.actor_user_id === adminProfile));

  const usageResult = await service
    .from("ai_usage_logs")
    .select("id")
    .eq("user_id", editorProfile)
    .eq("feature", "generate_content")
    .eq("logical_request", true);
  assertDatabaseSuccess(usageResult.error, "read content generation usage");
  assert.equal(usageResult.data.length, 1);

  console.log(
    JSON.stringify(
      {
        learnerSaveDenied: Boolean(learnerSave.error),
        learnerVersionRows: learnerVersions.data.length,
        editorDirectPublishDenied: Boolean(directPublish.error || directPublish.data.length === 0),
        editorApprovalDenied: Boolean(editorApproval.error),
        reviewerPublishDenied: Boolean(reviewerPublish.error),
        coursePublished: await readStatus("courses", courseId),
        generatedSourceType: generated.sourceType,
        generatedInitialStatus: generated.status,
        prematureAiPublishDenied: Boolean(prematurePublish.error),
        idempotentReplay: replay.idempotentReplay,
        reviewedAiExercisePublished: await readStatus("exercises", generated.exerciseId),
        publishAuditRows: auditResult.data.length,
        publishAuditActorIsAdmin: auditResult.data.every(
          (row) => row.actor_user_id === adminProfile,
        ),
        generationLogicalUsageRows: usageResult.data.length,
        learnerProfileCreated: Boolean(learnerProfile),
      },
      null,
      2,
    ),
  );
} finally {
  for (const entity of createdEntities.reverse()) {
    const reviews = await service
      .from("content_reviews")
      .delete()
      .eq("entity_type", entity.type)
      .eq("entity_id", entity.id);
    assertDatabaseSuccess(reviews.error, "clean content reviews");
    const versions = await service
      .from("content_versions")
      .delete()
      .eq("entity_type", entity.type)
      .eq("entity_id", entity.id);
    assertDatabaseSuccess(versions.error, "clean content versions");
    const audit = await service
      .from("audit_logs")
      .delete()
      .eq("entity_type", entity.type)
      .eq("entity_id", entity.id);
    assertDatabaseSuccess(audit.error, "clean content audit logs");
    const content = await service
      .from(entity.type === "course" ? "courses" : "exercises")
      .delete()
      .eq("id", entity.id);
    assertDatabaseSuccess(content.error, "clean managed content");
  }
  await Promise.all(
    createdUserIds.map(async (userId) => {
      const result = await service.auth.admin.deleteUser(userId, false);
      if (result.error) {
        console.error(`Could not delete local integration user ${userId}: ${result.error.message}`);
      }
    }),
  );
}

async function createUser(email: string, password: string, displayName: string) {
  const result = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  assertDatabaseSuccess(result.error, "create local integration user");
  assert.ok(result.data.user.email);
  createdUserIds.push(result.data.user.id);
  return { id: result.data.user.id, email: result.data.user.email };
}

async function setRole(userId: string, role: "learner" | "content_editor" | "reviewer" | "admin") {
  const result = await service
    .from("profiles")
    .update({ role })
    .eq("auth_user_id", userId)
    .select("id")
    .single();
  assertDatabaseSuccess(result.error, `set ${role} role`);
  return result.data.id;
}

async function signIn(client: SupabaseClient, email: string, password: string): Promise<string> {
  const result = await client.auth.signInWithPassword({ email, password });
  assertDatabaseSuccess(result.error, "sign in local integration user");
  assert.ok(result.data.session?.access_token);
  return result.data.session.access_token;
}

async function generate(token: string, body: Record<string, unknown>) {
  const response = await fetch(`${apiBaseUrl}/admin/ai/exercise-drafts`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Generation failed (${response.status}): ${await response.text()}`);
  }
  return generateExerciseDraftResponseSchema.parse(await response.json());
}

async function readStatus(table: "courses" | "exercises", id: string): Promise<string> {
  const result = await service.from(table).select("status").eq("id", id).single();
  assertDatabaseSuccess(result.error, `read ${table} status`);
  return result.data.status;
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Expected ${key} in integration response.`);
  }
  return value;
}

function clientOptions() {
  return { auth: { autoRefreshToken: false, persistSession: false } } as const;
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assertDatabaseSuccess(
  error: { message: string } | null,
  operation: string,
): asserts error is null {
  if (error) throw new Error(`Could not ${operation}: ${error.message}`);
}
