import type { CatalogCourse, CourseCatalog } from "@deutschtrainer/shared-types";
import {
  catalogCourseSchema,
  databaseUuidSchema,
  fixedGradingResultSchema,
  submitAttemptRequestSchema,
} from "@deutschtrainer/validation";
import { z } from "zod";

export const MAX_PENDING_OFFLINE_ATTEMPTS = 200;

export const offlineAttemptStatusSchema = z.enum(["pending", "syncing", "failed", "conflict"]);
export type OfflineAttemptStatus = z.infer<typeof offlineAttemptStatusSchema>;

export const downloadedCourseSchema = z
  .object({
    course: catalogCourseSchema,
    downloadedAt: z.string().datetime({ offset: true }),
    fingerprint: z.string().min(1),
  })
  .strict();
export type DownloadedCourse = z.infer<typeof downloadedCourseSchema>;

export const pendingOfflineAttemptSchema = z
  .object({
    profileId: databaseUuidSchema,
    lessonId: databaseUuidSchema,
    lessonTitle: z.string().min(1),
    exerciseTitle: z.string().min(1),
    exerciseVersion: z.number().int().positive(),
    queuedAt: z.string().datetime({ offset: true }),
    request: submitAttemptRequestSchema.extend({
      exerciseVersion: z.number().int().positive(),
      submittedAt: z.string().datetime({ offset: true }),
    }),
    localGradingResult: fixedGradingResultSchema,
    status: offlineAttemptStatusSchema,
    retryCount: z.number().int().nonnegative(),
    lastError: z.string().min(1).optional(),
  })
  .strict()
  .refine((attempt) => attempt.exerciseVersion === attempt.request.exerciseVersion, {
    message: "Offline exercise versions must match.",
    path: ["request", "exerciseVersion"],
  });
export type PendingOfflineAttempt = z.infer<typeof pendingOfflineAttemptSchema>;

export const offlineProfileDataSchema = z
  .object({
    downloadedCourses: z.record(databaseUuidSchema, downloadedCourseSchema),
    pendingAttempts: z.record(z.string().trim().min(12).max(200), pendingOfflineAttemptSchema),
  })
  .strict()
  .superRefine((data, context) => {
    for (const [courseId, download] of Object.entries(data.downloadedCourses)) {
      if (courseId !== download.course.id) {
        context.addIssue({
          code: "custom",
          message: "Offline course keys must match course IDs.",
          path: ["downloadedCourses", courseId],
        });
      }
    }
    for (const [idempotencyKey, attempt] of Object.entries(data.pendingAttempts)) {
      if (idempotencyKey !== attempt.request.idempotencyKey) {
        context.addIssue({
          code: "custom",
          message: "Offline attempt keys must match request idempotency keys.",
          path: ["pendingAttempts", idempotencyKey],
        });
      }
    }
  });
export type OfflineProfileData = z.infer<typeof offlineProfileDataSchema>;

export const offlineProfilesSchema = z.record(databaseUuidSchema, offlineProfileDataSchema);
export type OfflineProfiles = z.infer<typeof offlineProfilesSchema>;

export const offlineStorageEnvelopeSchema = z
  .object({
    version: z.literal(1),
    profiles: offlineProfilesSchema,
  })
  .strict();

export interface EnqueueOfflineAttemptInput {
  profileId: string;
  lessonId: string;
  lessonTitle: string;
  exerciseTitle: string;
  exerciseVersion: number;
  queuedAt: string;
  request: PendingOfflineAttempt["request"];
  localGradingResult: PendingOfflineAttempt["localGradingResult"];
}

export const emptyOfflineProfileData: OfflineProfileData = {
  downloadedCourses: {},
  pendingAttempts: {},
};

export function parseOfflineProfiles(value: unknown): OfflineProfiles {
  const parsed = offlineProfilesSchema.safeParse(value);
  if (!parsed.success) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(parsed.data).map(([profileId, data]) => [
      profileId,
      {
        ...data,
        pendingAttempts: Object.fromEntries(
          Object.entries(data.pendingAttempts).map(([key, attempt]) => [
            key,
            attempt.status === "syncing" ? { ...attempt, status: "pending" as const } : attempt,
          ]),
        ),
      },
    ]),
  );
}

export function parseOfflineStorage(value: unknown): OfflineProfiles {
  const envelope = offlineStorageEnvelopeSchema.safeParse(value);
  return parseOfflineProfiles(envelope.success ? envelope.data.profiles : value);
}

export function courseFingerprint(course: CatalogCourse): string {
  return [
    `course:${course.id}:${course.version}`,
    ...course.units.flatMap((unit) => [
      `unit:${unit.id}:${unit.version}`,
      ...unit.lessons.flatMap((lesson) => [
        `lesson:${lesson.id}:${lesson.version}`,
        ...lesson.activities.flatMap((activity) =>
          activity.exercises.map((exercise) => `exercise:${exercise.id}:${exercise.version}`),
        ),
      ]),
    ]),
  ].join("|");
}

export function saveDownloadedCourse(
  profiles: OfflineProfiles,
  profileId: string,
  course: CatalogCourse,
  downloadedAt: string,
): OfflineProfiles {
  const validatedCourse = catalogCourseSchema.parse(course);
  const current = profiles[profileId] ?? emptyOfflineProfileData;
  return {
    ...profiles,
    [profileId]: {
      ...current,
      downloadedCourses: {
        ...current.downloadedCourses,
        [course.id]: downloadedCourseSchema.parse({
          course: validatedCourse,
          downloadedAt,
          fingerprint: courseFingerprint(validatedCourse as CatalogCourse),
        }),
      },
    },
  };
}

export function removeDownloadedCourse(
  profiles: OfflineProfiles,
  profileId: string,
  courseId: string,
): OfflineProfiles {
  const current = profiles[profileId];
  if (!current?.downloadedCourses[courseId]) {
    return profiles;
  }

  const downloadedCourses = { ...current.downloadedCourses };
  delete downloadedCourses[courseId];
  return { ...profiles, [profileId]: { ...current, downloadedCourses } };
}

export function enqueueOfflineAttempt(
  profiles: OfflineProfiles,
  input: EnqueueOfflineAttemptInput,
): OfflineProfiles {
  const current = profiles[input.profileId] ?? emptyOfflineProfileData;
  const key = input.request.idempotencyKey;
  if (current.pendingAttempts[key]) {
    return profiles;
  }
  if (Object.keys(current.pendingAttempts).length >= MAX_PENDING_OFFLINE_ATTEMPTS) {
    throw new Error("待同步作答已達 200 筆，請先連線完成同步再繼續。");
  }

  const pending = pendingOfflineAttemptSchema.parse({
    ...input,
    status: "pending",
    retryCount: 0,
  });
  return {
    ...profiles,
    [input.profileId]: {
      ...current,
      pendingAttempts: { ...current.pendingAttempts, [key]: pending },
    },
  };
}

export function updateOfflineAttempt(
  profiles: OfflineProfiles,
  profileId: string,
  idempotencyKey: string,
  update: Partial<Pick<PendingOfflineAttempt, "lastError" | "retryCount" | "status">>,
): OfflineProfiles {
  const current = profiles[profileId];
  const attempt = current?.pendingAttempts[idempotencyKey];
  if (!current || !attempt) {
    return profiles;
  }

  const nextAttempt = pendingOfflineAttemptSchema.parse({ ...attempt, ...update });
  return {
    ...profiles,
    [profileId]: {
      ...current,
      pendingAttempts: { ...current.pendingAttempts, [idempotencyKey]: nextAttempt },
    },
  };
}

export function removeOfflineAttempt(
  profiles: OfflineProfiles,
  profileId: string,
  idempotencyKey: string,
): OfflineProfiles {
  const current = profiles[profileId];
  if (!current?.pendingAttempts[idempotencyKey]) {
    return profiles;
  }

  const pendingAttempts = { ...current.pendingAttempts };
  delete pendingAttempts[idempotencyKey];
  return { ...profiles, [profileId]: { ...current, pendingAttempts } };
}

export function getOfflineCatalog(profiles: OfflineProfiles, profileId: string): CourseCatalog {
  const courses = Object.values(profiles[profileId]?.downloadedCourses ?? {})
    .map((download) => download.course as CatalogCourse)
    .sort((left, right) => left.level.localeCompare(right.level));
  return { source: "offline", courses };
}
