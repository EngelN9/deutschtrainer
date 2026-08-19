import { describe, expect, it } from "@jest/globals";
import {
  ACCOUNT_DELETION_CONFIRMATION,
  accountDeletionRequestSchema,
  adminExerciseDraftSchema,
  audioLearningWorkspaceResponseSchema,
  apiErrorResponseSchema,
  completeReviewRequestSchema,
  courseListResponseSchema,
  deleteWritingSubmissionResponseSchema,
  evaluateResponseRequestSchema,
  evaluateWritingRequestSchema,
  fixedExerciseSchema,
  generateExerciseDraftRequestSchema,
  grammarTopicDetailResponseSchema,
  grammarTopicListRequestSchema,
  learningRecordSnapshotSchema,
  listeningActivityResponseSchema,
  notificationPreferencesSchema,
  onboardingRequestSchema,
  submitAttemptRequestSchema,
  submitDictationRequestSchema,
  textToSpeechRequestSchema,
  transcribeRequestSchema,
  updateNotificationPreferencesRequestSchema,
  userSettingsResponseSchema,
  vocabularyDetailResponseSchema,
  vocabularyListRequestSchema,
  writingWorkspaceResponseSchema,
} from "./index";

describe("generateExerciseDraftRequestSchema", () => {
  it("accepts a constrained admin generation brief", () => {
    const result = generateExerciseDraftRequestSchema.parse({
      activityId: "1103f461-2efe-46c2-a238-00b310037494",
      level: "B2",
      type: "multiple_choice",
      topicZhTw: "正式職場溝通",
      targetSkillIds: ["B2.register.formal"],
      instructionsZhTw: "答案必須明確。",
      orderIndex: 20,
      idempotencyKey: "phase8-generation-contract",
    });

    expect(result.type).toBe("multiple_choice");
  });

  it("rejects unsupported AI draft exercise types", () => {
    const result = generateExerciseDraftRequestSchema.safeParse({
      activityId: "1103f461-2efe-46c2-a238-00b310037494",
      level: "B2",
      type: "essay",
      topicZhTw: "正式職場溝通",
      targetSkillIds: ["B2.register.formal"],
      instructionsZhTw: "",
      orderIndex: 20,
      idempotencyKey: "phase8-generation-contract",
    });

    expect(result.success).toBe(false);
  });
});

describe("validation schemas", () => {
  it("accepts the Phase 10 workspace and mutation response contracts", () => {
    const writing = writingWorkspaceResponseSchema.parse({ prompts: [], submissions: [] });
    const audio = audioLearningWorkspaceResponseSchema.parse({
      listeningAssets: [],
      listeningAttempts: [],
      speakingPrompts: [],
      speakingSubmissions: [],
      audioAssets: [],
    });
    const activity = listeningActivityResponseSchema.parse({
      requestId: "phase10-activity",
      attemptId: "2f48dbbe-2e97-4f4f-a795-d8d0cda0bfc2",
    });
    const deletion = deleteWritingSubmissionResponseSchema.parse({
      requestId: "phase10-delete",
      deleted: true,
    });

    expect(writing.submissions).toEqual([]);
    expect(audio.listeningAttempts).toEqual([]);
    expect(activity.attemptId).toBe("2f48dbbe-2e97-4f4f-a795-d8d0cda0bfc2");
    expect(deletion.deleted).toBe(true);
  });

  it("accepts the unified API error format", () => {
    const parsed = apiErrorResponseSchema.parse({
      error: {
        code: "AI_RESPONSE_INVALID",
        message: "無法解析 AI 回應。",
        retryable: true,
        requestId: "req_test",
      },
    });

    expect(parsed.error.retryable).toBe(true);
  });

  it("rejects short idempotency keys for attempts", () => {
    const result = submitAttemptRequestSchema.safeParse({
      exerciseId: "2d4ba9d8-1718-4e59-af67-10c3639ba0f1",
      answer: "weil ich Deutsch lerne",
      durationMs: 2000,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "short",
    });

    expect(result.success).toBe(false);
  });

  it("accepts raw fixed answers but rejects client-authored scores", () => {
    const valid = submitAttemptRequestSchema.safeParse({
      exerciseId: "2d4ba9d8-1718-4e59-af67-10c3639ba0f1",
      answer: "weil",
      durationMs: 2000,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "phase9-server-grading",
    });
    const forged = submitAttemptRequestSchema.safeParse({
      exerciseId: "2d4ba9d8-1718-4e59-af67-10c3639ba0f1",
      answer: "denn",
      durationMs: 2000,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "phase9-forged-grading",
      score: 100,
      isCorrect: true,
    });

    expect(valid.success).toBe(true);
    expect(forged.success).toBe(false);
  });

  it("accepts an ISO timestamp for an offline attempt", () => {
    const result = submitAttemptRequestSchema.safeParse({
      exerciseId: "2d4ba9d8-1718-4e59-af67-10c3639ba0f1",
      answer: "weil",
      durationMs: 2000,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "phase12-offline-attempt",
      submittedAt: "2026-07-15T08:30:00.000+08:00",
    });

    expect(result.success).toBe(true);
  });

  it("accepts API catalog and review completion contracts", () => {
    const catalog = courseListResponseSchema.parse({ source: "api", courses: [] });
    const review = completeReviewRequestSchema.parse({
      answer: "weil",
      durationMs: 1000,
      usedHint: false,
      idempotencyKey: "phase9-review-contract",
    });

    expect(catalog.source).toBe("api");
    expect(review.answer).toBe("weil");
  });

  it("normalizes knowledge-library pagination and validates detailed content", () => {
    expect(vocabularyListRequestSchema.parse({ level: "B1" })).toMatchObject({
      level: "B1",
      page: 1,
      pageSize: 20,
    });
    expect(grammarTopicListRequestSchema.parse({ query: "從句", pageSize: 10 }).page).toBe(1);

    const exercise = {
      id: "2d4ba9d8-1718-4e59-af67-10c3639ba0f1",
      lessonId: "3d4ba9d8-1718-4e59-af67-10c3639ba0f2",
      lessonTitleZhTw: "說明原因與讓步",
      title: "連接詞填空",
      level: "B1" as const,
      type: "fill_blank" as const,
    };
    const vocabulary = vocabularyDetailResponseSchema.parse({
      item: {
        id: "4d4ba9d8-1718-4e59-af67-10c3639ba0f3",
        lemma: "obwohl",
        partOfSpeech: "Konjunktion",
        principalParts: [],
        reflexive: false,
        level: "B1",
        definitionsZhTw: ["雖然、儘管"],
        exampleSentences: ["Obwohl es regnet, gehen wir spazieren."],
        collocations: [],
        synonyms: ["obgleich"],
        antonyms: [],
        register: "neutral",
        region: "general",
        version: 1,
      },
      relatedExercises: [exercise],
    });
    const grammar = grammarTopicDetailResponseSchema.parse({
      topic: {
        id: "5d4ba9d8-1718-4e59-af67-10c3639ba0f4",
        code: "B1.nebensatz",
        titleZhTw: "從句動詞末位",
        titleDe: "Verbendstellung im Nebensatz",
        level: "B1",
        shortExplanationZhTw: "連接詞會把變位動詞推到句末。",
        fullExplanationZhTw: "先辨識主從句邊界，再把變位動詞放在從句末位。",
        rules: [
          {
            titleZhTw: "基本語序",
            explanationZhTw: "從屬連接詞後，變位動詞位於從句末位。",
            patternDe: "Konjunktion + ... + Verb",
          },
        ],
        examples: [{ textDe: "..., weil es regnet.", translationZhTw: "因為正在下雨。" }],
        commonMistakes: [
          {
            incorrectDe: "..., weil es regnet stark.",
            correctDe: "..., weil es stark regnet.",
            explanationZhTw: "regnet 必須位於從句末位。",
          },
        ],
        relatedSkillIds: ["B1.word_order.subordinate_clause"],
        prerequisiteTopicIds: [],
        difficulty: 2,
        version: 1,
      },
      relatedExercises: [exercise],
    });

    expect(vocabulary.item.lemma).toBe("obwohl");
    expect(grammar.topic.rules).toHaveLength(1);
  });

  it("rejects onboarding when target level is below current level", () => {
    const result = onboardingRequestSchema.safeParse({
      currentLevel: "C1",
      targetLevel: "B2",
      dailyMinutes: 30,
      learningGoals: ["work"],
      notificationsEnabled: true,
    });

    expect(result.success).toBe(false);
  });

  it("validates notification preferences, timezone, and settings response", () => {
    const notifications = {
      notificationsEnabled: true,
      dailyReminderEnabled: true,
      dailyReminderTime: "20:30",
      reviewReminderEnabled: true,
      inactivityReminderEnabled: true,
      inactivityDays: 3,
      writingCompleteEnabled: true,
      newCourseEnabled: false,
      goalCompleteEnabled: true,
      timezone: "Asia/Taipei",
    };

    expect(updateNotificationPreferencesRequestSchema.parse(notifications)).toEqual(notifications);
    expect(
      notificationPreferencesSchema.safeParse({
        ...notifications,
        dailyReminderTime: "25:10",
        updatedAt: "2026-07-15T08:00:00.000Z",
      }).success,
    ).toBe(false);
    expect(
      userSettingsResponseSchema.parse({
        profile: {
          id: "00000000-0000-4000-8000-000000000001",
          authUserId: "00000000-0000-4000-8000-000000000002",
          displayName: "Learner",
          role: "learner",
          timezone: "Asia/Taipei",
          onboardingCompleted: true,
        },
        learning: {
          currentLevel: "B1",
          targetLevel: "B2",
          dailyMinutes: 20,
          learningGoals: ["exam_preparation"],
        },
        notifications: {
          ...notifications,
          updatedAt: "2026-07-15T08:00:00.000Z",
        },
      }).notifications.timezone,
    ).toBe("Asia/Taipei");
  });

  it("rejects a fixed exercise without a usable answer", () => {
    const result = fixedExerciseSchema.safeParse({
      id: "2d4ba9d8-1718-4e59-af67-10c3639ba0f1",
      level: "B1",
      type: "fill_blank",
      title: "連接詞填空",
      instructionZhTw: "填入正確答案。",
      promptDe: "Ich bleibe zu Hause, ___ es regnet.",
      skillIds: [],
      grammarTopicIds: [],
      vocabularyIds: [],
      estimatedSeconds: 30,
      difficulty: 2,
      sourceType: "human",
      reviewStatus: "approved",
      version: 1,
      answer: { acceptedAnswers: [] },
      gradingPolicy: {
        acceptedAlternatives: [],
        allowPartialCredit: false,
        caseSensitive: false,
        ignorePunctuation: true,
        normalizeGermanCharacters: true,
      },
    });

    expect(result.success).toBe(false);
  });

  it("accepts a four-question reading exercise and its Admin draft contract", () => {
    const questionIds = ["q1", "q2", "q3", "q4"];
    const optionId = (index: number) =>
      `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    const questions = questionIds.map((id, index) => ({
      id,
      promptDe: `Was sagt Absatz ${index + 1}?`,
      supportZhTw: "請回到相對應段落找線索。",
      explanationZhTw: "這是繁體中文解析。",
      options: [
        { id: optionId(index * 2 + 1), label: "A", textDe: "Richtige Antwort", orderIndex: 0 },
        { id: optionId(index * 2 + 2), label: "B", textDe: "Falsche Antwort", orderIndex: 1 },
      ],
    }));
    const answer = {
      optionIdsByQuestion: Object.fromEntries(
        questionIds.map((questionId, index) => [questionId, optionId(index * 2 + 1)]),
      ),
    };
    const payload = {
      articleTitleDe: "Ein erfundener Lesetext",
      passageDe:
        "Dieser vollständig erfundene Text ist lang genug für die Validierung und enthält keine personenbezogenen Daten oder geschützten Inhalte.",
      estimatedReadingMinutes: 2,
      questions: questions.map(({ options: _options, ...question }) => question),
    };

    expect(
      fixedExerciseSchema.safeParse({
        id: "2d4ba9d8-1718-4e59-af67-10c3639ba0f1",
        level: "B1",
        type: "reading_comprehension",
        title: "閱讀理解草稿",
        instructionZhTw: "閱讀文章後完成四題。",
        promptDe: "Lies den Text und beantworte die Fragen.",
        skillIds: ["B1.reading.main_idea"],
        grammarTopicIds: [],
        vocabularyIds: [],
        estimatedSeconds: 360,
        difficulty: 2,
        sourceType: "ai_assisted",
        reviewStatus: "draft",
        version: 1,
        articleTitleDe: payload.articleTitleDe,
        passageDe: payload.passageDe,
        estimatedReadingMinutes: payload.estimatedReadingMinutes,
        questions,
        answer,
      }).success,
    ).toBe(true);

    expect(
      adminExerciseDraftSchema.safeParse({
        activityId: "1103f461-2efe-46c2-a238-00b310037494",
        level: "B1",
        type: "reading_comprehension",
        title: "閱讀理解草稿",
        instructionZhTw: "閱讀文章後完成四題。",
        promptDe: "Lies den Text und beantworte die Fragen.",
        payloadJson: payload,
        skillIds: ["B1.reading.main_idea"],
        grammarTopicIds: [],
        vocabularyIds: [],
        estimatedSeconds: 360,
        difficulty: 2,
        sourceType: "ai_assisted",
        orderIndex: 0,
        options: questions.flatMap((question) =>
          question.options.map((option) => ({
            ...option,
            isCorrect: answer.optionIdsByQuestion[question.id] === option.id,
            metadataJson: { questionId: question.id },
          })),
        ),
        answerJson: answer,
        gradingPolicyJson: {
          acceptedAlternatives: [],
          allowPartialCredit: true,
          caseSensitive: false,
          ignorePunctuation: true,
          normalizeGermanCharacters: true,
        },
        explanationZhTw: "每題都有對應解析。",
      }).success,
    ).toBe(true);
  });

  it("accepts PostgreSQL UUIDs in a learning-record snapshot", () => {
    const parsed = learningRecordSnapshotSchema.parse({
      attempts: [
        {
          id: "cea085c4-11cd-4dcd-b852-70db65caaeb4",
          userId: "1d377460-50a3-4c7b-97f6-5d0a6d72e5ce",
          exerciseId: "bbd6554d-7c7f-0909-d72a-106769464259",
          lessonId: "7201fcca-f0c9-9bb7-218a-192849e5f84d",
          submittedAt: "2026-07-13T03:22:15.000+00:00",
          score: 0,
          isCorrect: false,
          durationMs: 5000,
          usedHint: false,
          mode: "lesson",
          idempotencyKey: "phase4-attempt-test",
        },
      ],
      errors: [],
      mastery: [],
      reviews: [],
      lessonProgress: [],
      skillNames: {},
    });

    expect(parsed.attempts[0]?.lessonId).toBe("7201fcca-f0c9-9bb7-218a-192849e5f84d");
  });

  it("accepts PostgreSQL UUIDs in an AI evaluation request", () => {
    const parsed = evaluateResponseRequestSchema.parse({
      exerciseId: "ce5a2fd6-18ef-95ba-f141-3530ba85a56a",
      responseDe: "Obwohl es regnet, fahre ich zur Arbeit.",
      durationMs: 12_000,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "phase5-evaluation-test",
      reviewId: "7201fcca-f0c9-9bb7-218a-192849e5f84d",
    });

    expect(parsed.exerciseId).toBe("ce5a2fd6-18ef-95ba-f141-3530ba85a56a");
  });

  it("validates a server-trusted writing request and rejects short replay keys", () => {
    const result = evaluateWritingRequestSchema.safeParse({
      promptId: "ced48daf-53ab-d040-93ea-85190838c379",
      textDe: "Sehr geehrte Frau Berger, ich kann nächste Woche leider nicht teilnehmen.",
      durationMs: 30_000,
      idempotencyKey: "short",
    });

    expect(result.success).toBe(false);
  });

  it("accepts asset-based TTS requests without accepting arbitrary text", () => {
    const parsed = textToSpeechRequestSchema.parse({
      listeningAssetId: "ced48daf-53ab-d040-93ea-85190838c379",
      voice: "marin",
      idempotencyKey: "phase7-tts-test-key",
    });

    expect(parsed).not.toHaveProperty("text");
  });

  it("rejects speaking storage paths outside an auth-user UUID folder", () => {
    const result = transcribeRequestSchema.safeParse({
      speakingPromptId: "ced48daf-53ab-d040-93ea-85190838c379",
      storagePath: "shared/recording.webm",
      mimeType: "audio/webm",
      durationMs: 12_000,
      idempotencyKey: "phase7-speaking-test",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty dictation submissions before protected scoring", () => {
    const result = submitDictationRequestSchema.safeParse({
      listeningAssetId: "ced48daf-53ab-d040-93ea-85190838c379",
      sessionKey: "phase7-listening-session",
      textDe: "   ",
      comprehensionAnswer: "a",
      playCount: 1,
      usedSlowSpeed: false,
      idempotencyKey: "phase7-listening-submit",
    });

    expect(result.success).toBe(false);
  });

  it("requires the exact destructive account-deletion confirmation", () => {
    expect(
      accountDeletionRequestSchema.safeParse({ confirmation: ACCOUNT_DELETION_CONFIRMATION })
        .success,
    ).toBe(true);
    expect(accountDeletionRequestSchema.safeParse({ confirmation: "刪除" }).success).toBe(false);
    expect(
      accountDeletionRequestSchema.safeParse({
        confirmation: ACCOUNT_DELETION_CONFIRMATION,
        bypass: true,
      }).success,
    ).toBe(false);
  });
});
