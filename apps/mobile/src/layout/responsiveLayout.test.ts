import { describe, expect, it } from "@jest/globals";
import { getResponsiveLayout, type ResponsiveLayoutSize } from "./responsiveLayout";

const cases: Array<[number, ResponsiveLayoutSize]> = [
  [360, "compact"],
  [599, "compact"],
  [600, "medium"],
  [1023, "medium"],
  [1024, "wide"],
  [1440, "wide"],
];

describe("getResponsiveLayout", () => {
  it.each(cases)("maps %ipx to %s", (width, expected) => {
    expect(getResponsiveLayout(width).size).toBe(expected);
  });
});
