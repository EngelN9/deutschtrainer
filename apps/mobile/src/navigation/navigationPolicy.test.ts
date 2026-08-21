import { describe, expect, it } from "@jest/globals";
import {
  getMoreCapabilities,
  getPrimaryNavigationItems,
  isNavigationItemActive,
} from "./navigationPolicy";

describe("mobile navigation policy", () => {
  it("shows five stable primary destinations for connected compact and medium layouts", () => {
    expect(getPrimaryNavigationItems("supabase", "bar").map((item) => item.capability)).toEqual([
      "home",
      "courses",
      "writing",
      "reviews",
      "more",
    ]);
  });

  it("keeps unsupported connected features out of demo navigation", () => {
    const capabilities = [
      ...getPrimaryNavigationItems("demo", "bar"),
      ...getMoreCapabilities("demo"),
    ].map((item) => item.capability);

    expect(capabilities).toEqual(["home", "courses", "reviews", "more", "offline", "settings"]);
    expect(capabilities).not.toEqual(expect.arrayContaining(["writing", "knowledge", "audio"]));
  });

  it("expands connected-only destinations into the wide rail", () => {
    expect(getPrimaryNavigationItems("supabase", "rail").map((item) => item.capability)).toEqual([
      "home",
      "courses",
      "writing",
      "reviews",
      "knowledge",
      "audio",
      "analytics",
      "more",
    ]);
  });

  it("returns no protected navigation while auth mode is unresolved", () => {
    expect(getPrimaryNavigationItems(null, "bar")).toEqual([]);
    expect(getMoreCapabilities(null)).toEqual([]);
  });

  it("keeps More selected across its secondary destinations", () => {
    const more = getPrimaryNavigationItems("supabase", "bar").find(
      (item) => item.capability === "more",
    );
    expect(more).toBeDefined();
    expect(isNavigationItemActive(more!, "/settings")).toBe(true);
    expect(isNavigationItemActive(more!, "/knowledge/article-1")).toBe(true);
    expect(isNavigationItemActive(more!, "/writing")).toBe(false);
  });

  it("does not register draft reading or conversation destinations", () => {
    const hrefs = getMoreCapabilities("supabase").map((item) => item.href);
    expect(hrefs).not.toEqual(expect.arrayContaining(["/reading", "/conversation"]));
  });
});
