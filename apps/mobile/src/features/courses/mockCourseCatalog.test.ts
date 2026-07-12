import { describe, expect, it } from "@jest/globals";
import { courseCatalogSchema } from "@deutschtrainer/validation";
import { mockCourseCatalog } from "./mockCourseCatalog";

describe("mock course catalog", () => {
  it("supports every required CEFR level", () => {
    const parsed = courseCatalogSchema.parse(mockCourseCatalog);

    expect(parsed.courses.map((course) => course.level)).toEqual(["B1", "B2", "C1", "C2"]);
  });

  it("contains every Phase 3 fixed exercise type", () => {
    const exerciseTypes = new Set(
      mockCourseCatalog.courses
        .flatMap((course) => course.units)
        .flatMap((unit) => unit.lessons)
        .flatMap((lesson) => lesson.activities)
        .flatMap((activity) => activity.exercises)
        .map((exercise) => exercise.type),
    );

    expect([...exerciseTypes].sort()).toEqual(
      [
        "error_correction",
        "fill_blank",
        "matching",
        "multiple_choice",
        "multiple_select",
        "sentence_order",
      ].sort(),
    );
  });
});
