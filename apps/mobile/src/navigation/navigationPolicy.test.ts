import { describe, expect, it } from "@jest/globals";
import { findActiveGroup, getNavigationGroups } from "./navigationPolicy";

const previousTopLevelPaths = [
  "/home",
  "/courses",
  "/knowledge",
  "/writing",
  "/audio-training",
  "/reviews",
  "/classroom",
  "/analytics",
];

describe("navigationPolicy", () => {
  it("offers at most five labelled destinations to a signed-in learner", () => {
    const groups = getNavigationGroups("supabase", true);
    expect(groups.map((group) => group.label)).toEqual(["今日", "課程", "練習", "教室", "進度"]);
  });

  it("keeps every former top-level destination reachable through a group", () => {
    const reachable = getNavigationGroups("supabase", true).flatMap((group) =>
      group.sections.map((section) => section.path),
    );
    expect(reachable).toEqual(expect.arrayContaining(previousTopLevelPaths));
  });

  it("omits the classroom when its feature flag is off", () => {
    const groups = getNavigationGroups("supabase", false);
    expect(groups.map((group) => group.id)).not.toContain("classroom");
    expect(groups).toHaveLength(4);
  });

  it("limits demo mode to the offline-capable destinations", () => {
    const groups = getNavigationGroups("demo", true);
    expect(groups.map((group) => group.id)).toEqual(["today", "learn", "progress"]);
    expect(groups.flatMap((group) => group.sections.map((section) => section.path))).toEqual([
      "/home",
      "/courses",
      "/reviews",
    ]);
  });

  it("marks the group containing the current page as active", () => {
    const groups = getNavigationGroups("supabase", true);
    expect(findActiveGroup(groups, "/knowledge")?.id).toBe("learn");
    expect(findActiveGroup(groups, "/audio-training")?.id).toBe("practice");
    expect(findActiveGroup(groups, "/analytics")?.id).toBe("progress");
    expect(findActiveGroup(groups, "/errors")).toBeUndefined();
  });
});
