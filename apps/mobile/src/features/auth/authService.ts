import type { Session } from "@supabase/supabase-js";
import type {
  ForgotPasswordRequest,
  SignInRequest,
  SignUpRequest,
} from "@deutschtrainer/validation";
import {
  forgotPasswordRequestSchema,
  signInRequestSchema,
  signUpRequestSchema,
} from "@deutschtrainer/validation";
import { supabase } from "../../lib/supabase";

export interface AuthResult {
  session: Session | null;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function signInWithPassword(input: SignInRequest): Promise<AuthResult> {
  const parsed = signInRequestSchema.parse(input);
  const { data, error } = await supabase.auth.signInWithPassword(parsed);

  if (error) {
    throw new Error(error.message);
  }

  return { session: data.session };
}

export async function signUpWithPassword(input: SignUpRequest): Promise<AuthResult> {
  const parsed = signUpRequestSchema.parse(input);
  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    options: {
      data: {
        display_name: parsed.displayName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    },
    password: parsed.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { session: data.session };
}

/**
 * Starts a trial without an account. Supabase creates a real `auth.users` row flagged
 * `is_anonymous`, so every RLS policy keeps working and `handle_new_auth_user()` provisions the
 * profile exactly as it does for a registered user. The session can later be upgraded in place
 * with `supabase.auth.updateUser({ email, password })` without losing any learning history.
 */
export async function signInAnonymousGuest(): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        display_name: "訪客",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return { session: data.session };
}

export async function sendPasswordReset(input: ForgotPasswordRequest): Promise<void> {
  const parsed = forgotPasswordRequestSchema.parse(input);
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.email);

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOutCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearLocalSession(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeToAuthChanges(callback: (session: Session | null) => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}
