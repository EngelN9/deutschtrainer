import type { Session } from "@supabase/supabase-js";
import type { UserProfile } from "@deutschtrainer/shared-types";
import type {
  ForgotPasswordRequest,
  OnboardingRequest,
  SignInRequest,
  SignUpRequest,
} from "@deutschtrainer/validation";
import { create } from "zustand";
import {
  getCurrentSession,
  sendPasswordReset,
  signInWithPassword,
  signOutCurrentUser,
  signUpWithPassword,
  subscribeToAuthChanges,
} from "./authService";
import { toUserFacingError } from "../../lib/userFacingErrors";
import { completeOnboarding as persistOnboarding } from "../onboarding/onboardingRepository";
import { fetchCurrentProfile } from "../profile/profileRepository";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  bootstrapped: boolean;
  errorMessage: string | null;
  noticeMessage: string | null;
  profile: UserProfile | null;
  session: Session | null;
  status: AuthStatus;
  bootstrap: () => Promise<void>;
  clearMessages: () => void;
  completeOnboarding: (input: OnboardingRequest) => Promise<void>;
  resetPassword: (input: ForgotPasswordRequest) => Promise<void>;
  signIn: (input: SignInRequest) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (input: SignUpRequest) => Promise<void>;
}

let unsubscribeFromAuth: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  bootstrapped: false,
  errorMessage: null,
  noticeMessage: null,
  profile: null,
  session: null,
  status: "loading",

  bootstrap: async () => {
    if (get().bootstrapped) {
      return;
    }

    set({ errorMessage: null, status: "loading" });

    try {
      const session = await getCurrentSession();
      await applySession(set, session);
      set({ bootstrapped: true });

      if (!unsubscribeFromAuth) {
        unsubscribeFromAuth = subscribeToAuthChanges((nextSession) => {
          void applySession(set, nextSession);
        });
      }
    } catch (error) {
      set({
        bootstrapped: true,
        errorMessage: toUserFacingError(error),
        profile: null,
        session: null,
        status: "unauthenticated",
      });
    }
  },

  clearMessages: () => set({ errorMessage: null, noticeMessage: null }),

  completeOnboarding: async (input) => {
    set({ errorMessage: null, noticeMessage: null, status: "loading" });

    try {
      await persistOnboarding(input);
      const profile = await fetchCurrentProfile();
      set({
        errorMessage: null,
        noticeMessage: "初次設定已完成。",
        profile,
        status: "authenticated",
      });
    } catch (error) {
      set({ errorMessage: toUserFacingError(error), status: "authenticated" });
    }
  },

  resetPassword: async (input) => {
    set({ errorMessage: null, noticeMessage: null });

    try {
      await sendPasswordReset(input);
      set({ noticeMessage: "重設密碼信已送出，請檢查你的信箱。" });
    } catch (error) {
      set({ errorMessage: toUserFacingError(error) });
    }
  },

  signIn: async (input) => {
    set({ errorMessage: null, noticeMessage: null, status: "loading" });

    try {
      const result = await signInWithPassword(input);
      await applySession(set, result.session);
    } catch (error) {
      set({
        errorMessage: toUserFacingError(error),
        profile: null,
        session: null,
        status: "unauthenticated",
      });
    }
  },

  signOut: async () => {
    set({ errorMessage: null, noticeMessage: null, status: "loading" });

    try {
      await signOutCurrentUser();
      set({ profile: null, session: null, status: "unauthenticated" });
    } catch (error) {
      set({ errorMessage: toUserFacingError(error), status: "authenticated" });
    }
  },

  signUp: async (input) => {
    set({ errorMessage: null, noticeMessage: null, status: "loading" });

    try {
      const result = await signUpWithPassword(input);
      await applySession(set, result.session);

      if (!result.session) {
        set({
          noticeMessage: "註冊已建立。若專案啟用 email 確認，請先到信箱完成確認。",
          status: "unauthenticated",
        });
      }
    } catch (error) {
      set({
        errorMessage: toUserFacingError(error),
        profile: null,
        session: null,
        status: "unauthenticated",
      });
    }
  },
}));

async function applySession(
  set: (partial: Partial<AuthState>) => void,
  session: Session | null,
): Promise<void> {
  if (!session) {
    set({ profile: null, session: null, status: "unauthenticated" });
    return;
  }

  try {
    const profile = await fetchCurrentProfile();
    set({ profile, session, status: "authenticated" });
  } catch (error) {
    set({
      errorMessage: toUserFacingError(error),
      profile: null,
      session,
      status: "authenticated",
    });
  }
}
