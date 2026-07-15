import { describe, expect, it } from "@jest/globals";
import type { NotificationPreferences } from "@deutschtrainer/validation";
import { buildReminderPlan, formatDateKey } from "./notificationPlan";

const preferences: NotificationPreferences = {
  notificationsEnabled: true,
  dailyReminderEnabled: true,
  dailyReminderTime: "20:00",
  reviewReminderEnabled: true,
  inactivityReminderEnabled: true,
  inactivityDays: 3,
  writingCompleteEnabled: true,
  newCourseEnabled: true,
  goalCompleteEnabled: true,
  timezone: "Asia/Taipei",
  updatedAt: "2026-07-15T08:00:00.000Z",
};

describe("buildReminderPlan", () => {
  it("creates timezone-aware reminders with at most one item per local date", () => {
    const now = new Date("2026-07-15T10:00:00.000Z");
    const plan = buildReminderPlan(
      preferences,
      { dueReviewCount: 4, lastActivityAt: now.toISOString() },
      now,
      5,
    );

    expect(plan[0]).toMatchObject({
      fireAt: "2026-07-15T12:00:00.000Z",
      kind: "review",
      path: "/reviews",
    });
    expect(plan.some((item) => item.kind === "inactivity")).toBe(true);
    const dateKeys = plan.map((item) => formatDateKey(new Date(item.fireAt), preferences.timezone));
    expect(new Set(dateKeys).size).toBe(dateKeys.length);
  });

  it("keeps review and inactivity reminders when the daily reminder is disabled", () => {
    const plan = buildReminderPlan(
      { ...preferences, dailyReminderEnabled: false },
      { dueReviewCount: 2, lastActivityAt: "2026-07-15T10:00:00.000Z" },
      new Date("2026-07-15T10:00:00.000Z"),
      5,
    );

    expect(plan.map((item) => item.kind)).toEqual(["review", "inactivity"]);
  });

  it("moves an overdue inactivity reminder to the next future reminder time", () => {
    const now = new Date("2026-07-15T10:00:00.000Z");
    const plan = buildReminderPlan(
      preferences,
      { dueReviewCount: 0, lastActivityAt: "2026-07-01T10:00:00.000Z" },
      now,
      5,
    );

    expect(plan[0]).toMatchObject({
      fireAt: "2026-07-15T12:00:00.000Z",
      kind: "inactivity",
    });
    expect(plan.every((item) => new Date(item.fireAt).getTime() > now.getTime())).toBe(true);
  });

  it("counts inactivity in local calendar days across daylight saving changes", () => {
    const now = new Date("2026-03-28T10:00:00.000Z");
    const plan = buildReminderPlan(
      { ...preferences, timezone: "Europe/Berlin" },
      { dueReviewCount: 0, lastActivityAt: "2026-03-27T19:00:00.000Z" },
      now,
      5,
    );

    expect(plan.find((item) => item.kind === "inactivity")).toMatchObject({
      fireAt: "2026-03-30T18:00:00.000Z",
    });
  });

  it("returns no reminders when the master preference is disabled", () => {
    expect(
      buildReminderPlan(
        { ...preferences, notificationsEnabled: false },
        { dueReviewCount: 8 },
        new Date("2026-07-15T10:00:00.000Z"),
      ),
    ).toEqual([]);
  });
});
