import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Session } from "@supabase/supabase-js";
import type { UserSettingsResponse } from "@deutschtrainer/validation";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    removeItem: jest.fn(async () => undefined),
    setItem: jest.fn(async () => undefined),
  },
}));

jest.mock("./authService", () => ({
  __esModule: true,
  clearLocalSession: jest.fn(),
  getCurrentSession: jest.fn(),
  sendPasswordReset: jest.fn(),
  signInAnonymousGuest: jest.fn(),
  signInWithPassword: jest.fn(),
  signOutCurrentUser: jest.fn(),
  signUpWithPassword: jest.fn(),
  subscribeToAuthChanges: jest.fn(() => () => undefined),
}));

jest.mock("../onboarding/onboardingRepository", () => ({
  __esModule: true,
  completeOnboarding: jest.fn(),
}));

jest.mock("../profile/profileRepository", () => ({
  __esModule: true,
  fetchCurrentSettings: jest.fn(),
}));

type SignInMock = jest.Mock<() => Promise<{ session: Session | null }>>;
type SettingsMock = jest.Mock<() => Promise<UserSettingsResponse>>;

const { signInAnonymousGuest } = jest.requireMock<{ signInAnonymousGuest: SignInMock }>(
  "./authService",
);
const { completeOnboarding } = jest.requireMock<{ completeOnboarding: SettingsMock }>(
  "../onboarding/onboardingRepository",
);
const { fetchCurrentSettings } = jest.requireMock<{ fetchCurrentSettings: SettingsMock }>(
  "../profile/profileRepository",
);

const { demoUserSettings } = jest.requireActual<{ demoUserSettings: UserSettingsResponse }>(
  "./demoAuth",
);
const { useAuthStore } = jest.requireActual<typeof import("./useAuthStore")>("./useAuthStore");

const guestSession = {
  user: { id: "11111111-1111-4111-8111-111111111111", is_anonymous: true },
} as unknown as Session;

const settingsNeedingOnboarding: UserSettingsResponse = {
  ...demoUserSettings,
  profile: { ...demoUserSettings.profile, onboardingCompleted: false },
};

describe("startGuestTrial", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      authMode: null,
      errorMessage: null,
      noticeMessage: null,
      profile: null,
      session: null,
      status: "unauthenticated",
    });
  });

  it("signs the guest in and completes onboarding so they skip the questionnaire", async () => {
    signInAnonymousGuest.mockResolvedValue({ session: guestSession });
    fetchCurrentSettings.mockResolvedValue(settingsNeedingOnboarding);
    completeOnboarding.mockResolvedValue(demoUserSettings);

    await useAuthStore.getState().startGuestTrial();

    const state = useAuthStore.getState();
    expect(state.status).toBe("authenticated");
    expect(state.session).toBe(guestSession);
    expect(state.profile?.onboardingCompleted).toBe(true);
    expect(completeOnboarding).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when onboarding fails, so a retry cannot mint a second account", async () => {
    signInAnonymousGuest.mockResolvedValue({ session: guestSession });
    fetchCurrentSettings.mockResolvedValue(settingsNeedingOnboarding);
    // The onboarding call goes through the API, which sleeps on the free tier.
    completeOnboarding.mockRejectedValue(new Error("無法儲存初次設定。"));

    await useAuthStore.getState().startGuestTrial();

    const state = useAuthStore.getState();
    expect(state.session).toBe(guestSession);
    expect(state.authMode).toBe("supabase");
    expect(state.status).toBe("authenticated");
    expect(state.errorMessage).not.toBeNull();
  });

  it("clears everything when the sign-in itself fails", async () => {
    signInAnonymousGuest.mockRejectedValue(new Error("anonymous sign-ins are disabled"));

    await useAuthStore.getState().startGuestTrial();

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.authMode).toBeNull();
    expect(state.status).toBe("unauthenticated");
    expect(state.errorMessage).not.toBeNull();
    expect(completeOnboarding).not.toHaveBeenCalled();
  });

  it("clears everything when Supabase returns no session", async () => {
    signInAnonymousGuest.mockResolvedValue({ session: null });

    await useAuthStore.getState().startGuestTrial();

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.status).toBe("unauthenticated");
    expect(state.errorMessage).not.toBeNull();
  });
});
