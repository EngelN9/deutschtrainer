import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { mobileEnv } from "./env";
import type { Database } from "./database.types";

export const supabase = createClient<Database>(mobileEnv.supabaseUrl, mobileEnv.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    // The password-recovery mail lands on the web build with the tokens in the URL fragment
    // (#access_token=...&type=recovery). Only the browser can ever see one, and leaving this off
    // is why /forgot-password used to send a mail that went nowhere. Native has no such URL, and
    // enabling it there would make supabase-js reach for browser globals during bootstrap.
    // Probed via `document` rather than react-native's Platform: this module is in the import
    // graph of the .ts unit tests, which run under testEnvironment "node" with no RN transform.
    detectSessionInUrl: typeof document !== "undefined",
    persistSession: true,
    storage: AsyncStorage,
  },
});
