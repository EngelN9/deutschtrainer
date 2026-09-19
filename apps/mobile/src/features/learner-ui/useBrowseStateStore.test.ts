import { beforeEach, describe, expect, it } from "@jest/globals";
import { useBrowseStateStore } from "./useBrowseStateStore";

describe("useBrowseStateStore", () => {
  beforeEach(() => {
    useBrowseStateStore.setState({ courseLevel: undefined, courseScrollOffset: 0 });
  });

  it("keeps the selected level and scroll offset while a detail route is open", () => {
    useBrowseStateStore.getState().setCourseLevel("C1");
    useBrowseStateStore.getState().setCourseScrollOffset(384);

    expect(useBrowseStateStore.getState()).toMatchObject({
      courseLevel: "C1",
      courseScrollOffset: 384,
    });
  });
});
