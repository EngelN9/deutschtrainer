import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { mobileEnv } from "./env";
import type { Database } from "./database.types";

export const supabase = createClient<Database>(mobileEnv.supabaseUrl, mobileEnv.supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    storage: AsyncStorage,
  },
});
