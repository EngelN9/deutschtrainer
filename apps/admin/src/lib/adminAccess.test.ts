import { describe, expect, it } from "@jest/globals";
import { isContentTeamRole } from "./adminRepository";

describe("server-aware admin access roles", () => {
  it.each(["content_editor", "reviewer", "admin"])("accepts %s", (role) => {
    expect(isContentTeamRole(role)).toBe(true);
  });

  it.each(["learner", "owner", "", undefined, null])("rejects %s", (role) => {
    expect(isContentTeamRole(role)).toBe(false);
  });
});
