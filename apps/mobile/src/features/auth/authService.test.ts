import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

type ProviderError = { message: string } | null;
type ResetPasswordMock = jest.Mock<
  (email: string, options?: { redirectTo: string }) => Promise<{ error: ProviderError }>
>;
type UpdateUserMock = jest.Mock<
  (attributes: {
    data?: { display_name: string };
    email?: string;
    password?: string;
  }) => Promise<{ error: ProviderError }>
>;

jest.mock("../../lib/supabase", () => ({
  __esModule: true,
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));

const { sendPasswordReset, updatePassword, upgradeGuestToAccount } =
  jest.requireActual<typeof import("./authService")>("./authService");
const { supabase } = jest.requireMock<{
  supabase: {
    auth: {
      resetPasswordForEmail: ResetPasswordMock;
      updateUser: UpdateUserMock;
    };
  };
}>("../../lib/supabase");

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

function setBrowserOrigin(origin: string): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { origin } },
  });
  Object.defineProperty(globalThis, "document", { configurable: true, value: {} });
}

function restoreBrowserGlobals(): void {
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
  if (originalDocument) {
    Object.defineProperty(globalThis, "document", originalDocument);
  } else {
    Reflect.deleteProperty(globalThis, "document");
  }
}

describe("auth service recovery and guest upgrade", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    restoreBrowserGlobals();
  });

  afterEach(() => {
    restoreBrowserGlobals();
  });

  it("sends browser recovery links back to the same origin", async () => {
    setBrowserOrigin("https://app.deutschtrainer.app");
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    await sendPasswordReset({ email: "learner@example.com" });

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("learner@example.com", {
      redirectTo: "https://app.deutschtrainer.app/reset-password",
    });
  });

  it("uses Supabase's Site URL fallback outside a browser", async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    await sendPasswordReset({ email: "learner@example.com" });

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "learner@example.com",
      undefined,
    );
  });

  it("updates only the password for a validated recovery session", async () => {
    supabase.auth.updateUser.mockResolvedValue({ error: null });

    await updatePassword({ password: "secure-password" });

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "secure-password" });
  });

  it("upgrades the existing guest user instead of signing up a second account", async () => {
    supabase.auth.updateUser.mockResolvedValue({ error: null });

    await upgradeGuestToAccount({
      displayName: "林小明",
      email: "learner@example.com",
      password: "secure-password",
    });

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      data: { display_name: "林小明" },
      email: "learner@example.com",
      password: "secure-password",
    });
  });

  it("returns the provider error instead of claiming a guest upgrade succeeded", async () => {
    supabase.auth.updateUser.mockResolvedValue({
      error: { message: "Email is already registered" },
    });

    await expect(
      upgradeGuestToAccount({
        displayName: "林小明",
        email: "learner@example.com",
        password: "secure-password",
      }),
    ).rejects.toThrow("Email is already registered");
  });
});
