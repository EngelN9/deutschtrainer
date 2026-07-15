import { describe, expect, it } from "@jest/globals";
import type { CatalogCourse } from "@deutschtrainer/shared-types";
import { mockCourseCatalog } from "../courses/mockCourseCatalog";
import {
  courseFingerprint,
  enqueueOfflineAttempt,
  getOfflineCatalog,
  parseOfflineProfiles,
  parseOfflineStorage,
  removeDownloadedCourse,
  removeOfflineAttempt,
  saveDownloadedCourse,
  updateOfflineAttempt,
  type EnqueueOfflineAttemptInput,
} from "./offlineModel";

const profileA = "11111111-1111-4111-8111-111111111111";
const profileB = "22222222-2222-4222-8222-222222222222";

describe("offlineModel", () => {
  it("keeps downloaded course snapshots isolated by profile", () => {
    const course = mockCourseCatalog.courses[0] as CatalogCourse;
    const downloaded = saveDownloadedCourse({}, profileA, course, "2026-07-15T05:00:00.000Z");

    expect(getOfflineCatalog(downloaded, profileA).courses).toHaveLength(1);
    expect(getOfflineCatalog(downloaded, profileB).courses).toHaveLength(0);
    expect(
      removeDownloadedCourse(downloaded, profileA, course.id)[profileA]?.downloadedCourses,
    ).toEqual({});
  });

  it("detects nested exercise version updates", () => {
    const course = mockCourseCatalog.courses[0] as CatalogCourse;
    const firstExercise = course.units[0]?.lessons[0]?.activities[0]?.exercises[0];
    expect(firstExercise).toBeDefined();
    const changed = structuredClone(course);
    changed.units[0]!.lessons[0]!.activities[0]!.exercises[0]!.version += 1;

    expect(courseFingerprint(changed)).not.toBe(courseFingerprint(course));
  });

  it("queues idempotently and recovers interrupted sync state", () => {
    const queued = enqueueOfflineAttempt({}, offlineAttempt());
    const replayed = enqueueOfflineAttempt(queued, offlineAttempt());
    expect(Object.keys(replayed[profileA]!.pendingAttempts)).toHaveLength(1);

    const syncing = updateOfflineAttempt(
      replayed,
      profileA,
      offlineAttempt().request.idempotencyKey,
      {
        status: "syncing",
      },
    );
    const recovered = parseOfflineProfiles(syncing);
    expect(
      recovered[profileA]!.pendingAttempts[offlineAttempt().request.idempotencyKey]!.status,
    ).toBe("pending");
  });

  it("retains conflicts until the learner retries or discards them", () => {
    const key = offlineAttempt().request.idempotencyKey;
    const queued = enqueueOfflineAttempt({}, offlineAttempt());
    const conflict = updateOfflineAttempt(queued, profileA, key, {
      status: "conflict",
      lastError: "題目版本已失效。",
    });
    expect(conflict[profileA]!.pendingAttempts[key]!.lastError).toContain("版本");

    const pending = updateOfflineAttempt(conflict, profileA, key, {
      status: "pending",
      lastError: undefined,
    });
    expect(pending[profileA]!.pendingAttempts[key]!.status).toBe("pending");
    expect(removeOfflineAttempt(pending, profileA, key)[profileA]!.pendingAttempts).toEqual({});
  });

  it("reads the versioned storage envelope", () => {
    const profiles = enqueueOfflineAttempt({}, offlineAttempt());
    expect(parseOfflineStorage({ version: 1, profiles })).toEqual(profiles);
  });

  it("rejects a persisted queue whose record key does not match its request", () => {
    const profiles = enqueueOfflineAttempt({}, offlineAttempt());
    const attempt = profiles[profileA]!.pendingAttempts[offlineAttempt().request.idempotencyKey]!;
    profiles[profileA]!.pendingAttempts = { "phase12-mismatched-key": attempt };

    expect(parseOfflineStorage({ version: 1, profiles })).toEqual({});
  });
});

function offlineAttempt(): EnqueueOfflineAttemptInput {
  return {
    profileId: profileA,
    lessonId: "33333333-3333-4333-8333-333333333333",
    lessonTitle: "離線課堂",
    exerciseTitle: "連接詞練習",
    exerciseVersion: 1,
    queuedAt: "2026-07-15T05:00:01.000Z",
    request: {
      exerciseId: "44444444-4444-4444-8444-444444444444",
      exerciseVersion: 1,
      answer: "weil",
      durationMs: 1200,
      usedHint: false,
      mode: "lesson",
      idempotencyKey: "phase12-offline-model-attempt",
      submittedAt: "2026-07-15T05:00:00.000Z",
    },
    localGradingResult: {
      score: 100,
      isCorrect: true,
      normalizedAnswer: "weil",
      acceptedAnswer: "weil",
      details: { matched: true },
    },
  };
}
