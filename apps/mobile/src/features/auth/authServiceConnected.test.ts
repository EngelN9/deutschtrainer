import { afterEach, describe, expect, it, jest } from "@jest/globals";

const originalContentSource = process.env.EXPO_PUBLIC_CONTENT_SOURCE;

describe("connected authentication", () => {
  afterEach(() => {
    if (originalContentSource === undefined) {
      delete process.env.EXPO_PUBLIC_CONTENT_SOURCE;
    } else {
      process.env.EXPO_PUBLIC_CONTENT_SOURCE = originalContentSource;
    }
    jest.resetModules();
    jest.unmock("../../lib/supabase");
  });

  it("uses Supabase email/password in an API build", async () => {
    process.env.EXPO_PUBLIC_CONTENT_SOURCE = "api";
    const providerSignIn = jest.fn(async () => ({ data: { session: null }, error: null }));
    jest.doMock("../../lib/supabase", () => ({
      supabase: {
        auth: {
          signInWithPassword: providerSignIn,
        },
      },
    }));

    const { signInWithPassword } = await import("./authService");
    await expect(
      signInWithPassword({ email: "learner@example.com", password: "password123" }),
    ).resolves.toEqual({ session: null });
    expect(providerSignIn).toHaveBeenCalledWith({
      email: "learner@example.com",
      password: "password123",
    });
  });
});
