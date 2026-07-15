import type { NotificationPreferences } from "@deutschtrainer/validation";

export type ReminderKind = "daily" | "review" | "inactivity";

export interface ReminderPlanItem {
  body: string;
  fireAt: string;
  key: string;
  kind: ReminderKind;
  path: string;
  title: string;
}

export interface ReminderContext {
  dueReviewCount: number;
  lastActivityAt?: string;
}

interface CalendarDate {
  day: number;
  month: number;
  year: number;
}

interface ZonedParts extends CalendarDate {
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

export function buildReminderPlan(
  preferences: NotificationPreferences,
  context: ReminderContext,
  now = new Date(),
  occurrenceCount = 14,
): ReminderPlanItem[] {
  if (!preferences.notificationsEnabled) {
    return [];
  }

  const occurrences = nextZonedOccurrences(
    now,
    preferences.dailyReminderTime,
    preferences.timezone,
    occurrenceCount,
  );
  const plans = new Map<string, ReminderPlanItem>();

  if (preferences.dailyReminderEnabled) {
    for (const fireAt of occurrences) {
      const dateKey = formatDateKey(fireAt, preferences.timezone);
      plans.set(dateKey, {
        body: "今天安排一小段德語練習，保持穩定的學習節奏。",
        fireAt: fireAt.toISOString(),
        key: `daily:${dateKey}`,
        kind: "daily",
        path: "/home",
        title: "今日德語學習",
      });
    }
  }

  const firstOccurrence = occurrences[0];
  if (preferences.reviewReminderEnabled && context.dueReviewCount > 0 && firstOccurrence) {
    const dateKey = formatDateKey(firstOccurrence, preferences.timezone);
    plans.set(dateKey, {
      body: `目前有 ${context.dueReviewCount} 項到期複習，先完成最需要加強的內容。`,
      fireAt: firstOccurrence.toISOString(),
      key: `review:${dateKey}`,
      kind: "review",
      path: "/reviews",
      title: "到期複習提醒",
    });
  }

  if (preferences.inactivityReminderEnabled) {
    const lastActivity = parseDate(context.lastActivityAt) ?? now;
    const eligibleDate = addCalendarDays(
      getZonedParts(lastActivity, preferences.timezone),
      preferences.inactivityDays,
    );
    const [hour = 0, minute = 0] = preferences.dailyReminderTime.split(":").map(Number);
    const eligibleAt = zonedDateTimeToDate(eligibleDate, hour, minute, preferences.timezone);
    const scheduleAfter =
      eligibleAt.getTime() > now.getTime() ? new Date(eligibleAt.getTime() - 1) : now;
    const inactivityAt = nextZonedOccurrences(
      scheduleAfter,
      preferences.dailyReminderTime,
      preferences.timezone,
      1,
    )[0];
    const horizonEnd = occurrences.at(-1);
    if (inactivityAt && (!horizonEnd || inactivityAt.getTime() <= horizonEnd.getTime())) {
      const dateKey = formatDateKey(inactivityAt, preferences.timezone);
      plans.set(dateKey, {
        body: `已經 ${preferences.inactivityDays} 天沒有學習，從一個短練習重新開始。`,
        fireAt: inactivityAt.toISOString(),
        key: `inactivity:${dateKey}`,
        kind: "inactivity",
        path: "/home",
        title: "回到德語學習",
      });
    }
  }

  return [...plans.values()].toSorted(
    (left, right) => new Date(left.fireAt).getTime() - new Date(right.fireAt).getTime(),
  );
}

export function formatDateKey(date: Date, timezone: string): string {
  const parts = getZonedParts(date, timezone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function nextZonedOccurrences(after: Date, time: string, timezone: string, count: number): Date[] {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  const start = getZonedParts(after, timezone);
  const results: Date[] = [];

  for (let offset = 0; results.length < count && offset <= count + 2; offset += 1) {
    const calendarDate = addCalendarDays(start, offset);
    const candidate = zonedDateTimeToDate(calendarDate, hour, minute, timezone);
    if (candidate.getTime() > after.getTime()) {
      results.push(candidate);
    }
  }
  return results;
}

function zonedDateTimeToDate(
  date: CalendarDate,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  const target = Date.UTC(date.year, date.month - 1, date.day, hour, minute, 0);
  let candidate = target;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = getZonedParts(new Date(candidate), timezone);
    const represented = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    candidate -= represented - target;
  }
  return new Date(candidate);
}

function getZonedParts(date: Date, timezone: string): ZonedParts {
  let formatter = formatterCache.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timezone, formatter);
  }
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year ?? 1970,
    month: values.month ?? 1,
    day: values.day ?? 1,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
