import type { ContentTeamRole } from "@deutschtrainer/shared-types";
import type { AdminProfile } from "./adminTypes";

export const contentTeamRoles = ["content_editor", "reviewer", "admin"] as const;

export function isContentTeamRole(value: unknown): value is ContentTeamRole {
  return typeof value === "string" && contentTeamRoles.some((role) => role === value);
}

export function parseAdminProfile(value: unknown): AdminProfile | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = value.id;
  const authUserId = value.auth_user_id;
  const displayName = value.display_name;
  const role = value.role;

  if (
    typeof id !== "string" ||
    typeof authUserId !== "string" ||
    typeof displayName !== "string" ||
    !isContentTeamRole(role)
  ) {
    return undefined;
  }

  return { id, authUserId, displayName, role };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
