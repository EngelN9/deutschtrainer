import { describe, expect, it } from "@jest/globals";
import { isContentTeamRole, parseAdminProfile } from "./adminAuthorization";

describe("admin authorization boundary", () => {
  it.each(["content_editor", "reviewer", "admin"])("accepts the content-team role %s", (role) => {
    expect(isContentTeamRole(role)).toBe(true);
  });

  it.each(["learner", "", "ADMIN", undefined, null])("rejects the non-admin role %s", (role) => {
    expect(isContentTeamRole(role)).toBe(false);
  });

  it("maps a validated database profile", () => {
    expect(
      parseAdminProfile({
        id: "profile-1",
        auth_user_id: "auth-1",
        display_name: "Reviewer",
        role: "reviewer",
      }),
    ).toEqual({
      id: "profile-1",
      authUserId: "auth-1",
      displayName: "Reviewer",
      role: "reviewer",
    });
  });

  it("does not authorize an incomplete or learner profile", () => {
    expect(
      parseAdminProfile({
        id: "profile-1",
        auth_user_id: "auth-1",
        display_name: "Learner",
        role: "learner",
      }),
    ).toBeUndefined();
    expect(parseAdminProfile({ role: "admin" })).toBeUndefined();
  });
});
