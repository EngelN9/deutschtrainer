import { describe, expect, it } from "@jest/globals";
import { getVisibleMainNavigationPaths } from "./navigationPolicy";

describe("main navigation policy", () => {
  it("shows only supported local journeys in Demo", () => {
    expect(getVisibleMainNavigationPaths("demo")).toEqual([
      "/home",
      "/courses",
      "/audio-training",
      "/reviews",
    ]);
  });

  it("keeps all seven journeys for connected accounts", () => {
    expect(getVisibleMainNavigationPaths("supabase")).toEqual([
      "/home",
      "/courses",
      "/knowledge",
      "/writing",
      "/audio-training",
      "/reviews",
      "/analytics",
    ]);
  });
});
