import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { userRoleSchema } from "@deutschtrainer/validation";
import { databaseError } from "../errors";
import type { ClassroomAuthenticator, ClassroomLearner } from "./types";

export class SupabaseClassroomAuthenticator implements ClassroomAuthenticator {
  private readonly client: SupabaseClient;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async authenticate(accessToken: string): Promise<ClassroomLearner | undefined> {
    const userResult = await this.client.auth.getUser(accessToken);
    if (userResult.error || !userResult.data.user) {
      return undefined;
    }

    const profileResult = await this.client
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", userResult.data.user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (profileResult.error) {
      throw databaseError("無法驗證即時教室學習者資料。", profileResult.error);
    }
    if (!profileResult.data) {
      return undefined;
    }

    return {
      emailVerified: Boolean(userResult.data.user.email_confirmed_at),
      profileId: profileResult.data.id,
      role: userRoleSchema.parse(profileResult.data.role),
    };
  }
}
