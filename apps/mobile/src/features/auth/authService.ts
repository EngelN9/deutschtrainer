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
import { assertConnectedAuthEnabled } from "./authCapabilities";

export interface AuthResult {
  session: Session | null;
}

export async function getCurrentSession(): Promise<Session | null> {
  assertConnectedAuthEnabled();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function signInWithPassword(input: SignInRequest): Promise<AuthResult> {
  assertConnectedAuthEnabled();
  const parsed = signInRequestSchema.parse(input);
  const { data, error } = await supabase.auth.signInWithPassword(parsed);

  if (error) {
    throw new Error(error.message);
  }

  return { session: data.session };
}

export async function signUpWithPassword(input: SignUpRequest): Promise<AuthResult> {
  assertConnectedAuthEnabled();
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

export async function sendPasswordReset(input: ForgotPasswordRequest): Promise<void> {
  assertConnectedAuthEnabled();
  const parsed = forgotPasswordRequestSchema.parse(input);
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.email);

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOutCurrentUser(): Promise<void> {
  assertConnectedAuthEnabled();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearLocalSession(): Promise<void> {
  assertConnectedAuthEnabled();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeToAuthChanges(callback: (session: Session | null) => void): () => void {
  assertConnectedAuthEnabled();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}
