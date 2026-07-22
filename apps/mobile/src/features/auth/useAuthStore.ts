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
import { useLearningSetupStore } from "../../state/useLearningSetupStore";
import { requestNotificationPermission } from "../notifications/notificationRuntime";
import { completeOnboarding as persistOnboarding } from "../onboarding/onboardingRepository";
import { fetchCurrentSettings } from "../profile/profileRepository";
import {
  demoAuthEnabled,
  demoUserSettings,
  isDemoAuthActive,
  persistDemoAuthActive,
} from "./demoAuth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export type AuthMode = "demo" | "supabase" | null;

interface AuthState {
  authMode: AuthMode;
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
  startDemo: () => Promise<void>;
}

let unsubscribeFromAuth: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  authMode: null,
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
      if (demoAuthEnabled && (await isDemoAuthActive())) {
        applyLearningSettings(demoUserSettings);
        set({
          authMode: "demo",
          bootstrapped: true,
          profile: demoUserSettings.profile,
          session: null,
          status: "authenticated",
        });
        return;
      }

      const session = await getCurrentSession();
      await applySession(set, session);
      set({ bootstrapped: true });
      ensureAuthSubscription(set, get);
    } catch (error) {
      set({
        authMode: null,
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
      const settings = await persistOnboarding(input, get().session?.user.id);
      if (input.notificationsEnabled) {
        await requestNotificationPermission().catch(() => "denied" as const);
      }
      applyLearningSettings(settings);
      set({
        errorMessage: null,
        noticeMessage: "初次設定已完成。",
        profile: settings.profile,
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
      ensureAuthSubscription(set, get);
    } catch (error) {
      set({
        authMode: null,
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
      if (get().authMode === "demo") {
        await persistDemoAuthActive(false);
        set({
          authMode: null,
          profile: null,
          session: null,
          status: "unauthenticated",
        });
        ensureAuthSubscription(set, get);
        return;
      }

      await signOutCurrentUser();
      set({ authMode: null, profile: null, session: null, status: "unauthenticated" });
    } catch (error) {
      set({ errorMessage: toUserFacingError(error), status: "authenticated" });
    }
  },

  signUp: async (input) => {
    set({ errorMessage: null, noticeMessage: null, status: "loading" });

    try {
      const result = await signUpWithPassword(input);
      await applySession(set, result.session);
      ensureAuthSubscription(set, get);

      if (!result.session) {
        set({
          noticeMessage: "註冊已建立。若專案啟用 email 確認，請先到信箱完成確認。",
          status: "unauthenticated",
        });
      }
    } catch (error) {
      set({
        authMode: null,
        errorMessage: toUserFacingError(error),
        profile: null,
        session: null,
        status: "unauthenticated",
      });
    }
  },

  startDemo: async () => {
    set({ errorMessage: null, noticeMessage: null, status: "loading" });

    try {
      await persistDemoAuthActive(true);
      unsubscribeFromAuth?.();
      unsubscribeFromAuth = null;
      applyLearningSettings(demoUserSettings);
      set({
        authMode: "demo",
        noticeMessage: null,
        profile: demoUserSettings.profile,
        session: null,
        status: "authenticated",
      });
    } catch (error) {
      set({
        authMode: null,
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
    set({ authMode: null, profile: null, session: null, status: "unauthenticated" });
    return;
  }

  try {
    const settings = await fetchCurrentSettings(session.user.id);
    applyLearningSettings(settings);
    set({ authMode: "supabase", profile: settings.profile, session, status: "authenticated" });
  } catch (error) {
    set({
      errorMessage: toUserFacingError(error),
      profile: null,
      session,
      authMode: "supabase",
      status: "authenticated",
    });
  }
}

function ensureAuthSubscription(
  set: (partial: Partial<AuthState>) => void,
  get: () => AuthState,
): void {
  if (unsubscribeFromAuth) {
    return;
  }

  unsubscribeFromAuth = subscribeToAuthChanges((nextSession) => {
    if (get().authMode === "demo") {
      return;
    }
    void applySession(set, nextSession);
  });
}

function applyLearningSettings(settings: {
  learning: {
    currentLevel: "B1" | "B2" | "C1" | "C2";
    targetLevel: "B1" | "B2" | "C1" | "C2";
  };
}): void {
  const learningSetup = useLearningSetupStore.getState();
  learningSetup.setCurrentLevel(settings.learning.currentLevel);
  learningSetup.setTargetLevel(settings.learning.targetLevel);
}
