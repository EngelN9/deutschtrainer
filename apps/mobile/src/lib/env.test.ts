import { afterEach, describe, expect, it, jest } from "@jest/globals";

const originalEnv = { ...process.env };

async function loadMobileEnv(overrides: Record<string, string | undefined>) {
  jest.resetModules();

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return (await import("./env")).mobileEnv;
}

describe("guest trial availability", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("stays off without an explicit opt-in, even on a connected build", async () => {
    const env = await loadMobileEnv({
      EXPO_PUBLIC_CONTENT_SOURCE: "api",
      EXPO_PUBLIC_GUEST_TRIAL_ENABLED: undefined,
    });

    expect(env.contentSource).toBe("api");
    expect(env.guestTrialEnabled).toBe(false);
  });

  it("stays off on a mock build, which has no backend to sign in against", async () => {
    const env = await loadMobileEnv({
      EXPO_PUBLIC_CONTENT_SOURCE: "mock",
      EXPO_PUBLIC_GUEST_TRIAL_ENABLED: "true",
    });

    expect(env.contentSource).toBe("mock");
    expect(env.guestTrialEnabled).toBe(false);
  });

  it("turns on only when a connected build explicitly opts in", async () => {
    const env = await loadMobileEnv({
      EXPO_PUBLIC_CONTENT_SOURCE: "api",
      EXPO_PUBLIC_GUEST_TRIAL_ENABLED: "true",
    });

    expect(env.guestTrialEnabled).toBe(true);
  });
});

describe("classroom navigation availability", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("stays off when unset, so a deploy never advertises the classroom by accident", async () => {
    const env = await loadMobileEnv({ EXPO_PUBLIC_CLASSROOM_ENABLED: undefined });

    expect(env.classroomEnabled).toBe(false);
  });

  it("treats any value other than the exact opt-in as off", async () => {
    const env = await loadMobileEnv({ EXPO_PUBLIC_CLASSROOM_ENABLED: "1" });

    expect(env.classroomEnabled).toBe(false);
  });

  it("turns on only for the explicit opt-in", async () => {
    const env = await loadMobileEnv({ EXPO_PUBLIC_CLASSROOM_ENABLED: "true" });

    expect(env.classroomEnabled).toBe(true);
  });
});
