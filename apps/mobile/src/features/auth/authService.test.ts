import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  clearLocalSession,
  getCurrentSession,
  sendPasswordReset,
  signInWithPassword,
  signOutCurrentUser,
  signUpWithPassword,
  subscribeToAuthChanges,
} from "./authService";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
    },
  },
}));

describe("connected authentication boundary", () => {
  beforeEach(() => {
    jest.mocked(supabase.auth.getSession).mockReset();
    jest.mocked(supabase.auth.onAuthStateChange).mockReset();
    jest.mocked(supabase.auth.resetPasswordForEmail).mockReset();
    jest.mocked(supabase.auth.signInWithPassword).mockReset();
    jest.mocked(supabase.auth.signOut).mockReset();
    jest.mocked(supabase.auth.signUp).mockReset();
  });

  it("rejects every connected auth operation before contacting Supabase in a mock Preview", async () => {
    await expect(getCurrentSession()).rejects.toThrow("此 Preview APK 不連接雲端");
    await expect(
      signInWithPassword({ email: "learner@example.com", password: "password123" }),
    ).rejects.toThrow("此 Preview APK 不連接雲端");
    await expect(
      signUpWithPassword({
        displayName: "Learner",
        email: "learner@example.com",
        password: "password123",
      }),
    ).rejects.toThrow("此 Preview APK 不連接雲端");
    await expect(sendPasswordReset({ email: "learner@example.com" })).rejects.toThrow(
      "此 Preview APK 不連接雲端",
    );
    await expect(signOutCurrentUser()).rejects.toThrow("此 Preview APK 不連接雲端");
    await expect(clearLocalSession()).rejects.toThrow("此 Preview APK 不連接雲端");
    expect(() => subscribeToAuthChanges(() => undefined)).toThrow("此 Preview APK 不連接雲端");

    expect(supabase.auth.getSession).not.toHaveBeenCalled();
    expect(supabase.auth.onAuthStateChange).not.toHaveBeenCalled();
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });
});
