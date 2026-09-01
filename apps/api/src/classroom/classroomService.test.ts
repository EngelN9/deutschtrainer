import { describe, expect, it, jest } from "@jest/globals";
import { ClassroomService, createSafetyIdentifier } from "./classroomService";
import type { ClassroomAuthenticator, RealtimeCallProvider } from "./types";

const allowedLearner = {
  emailVerified: true,
  profileId: "profile-allowed",
  role: "learner" as const,
};

function createFixture(
  overrides: {
    enabled?: boolean;
    learner?: Awaited<ReturnType<ClassroomAuthenticator["authenticate"]>>;
    providerConfigured?: boolean;
    salt?: string;
  } = {},
) {
  const createCall = jest.fn<RealtimeCallProvider["createCall"]>(async () => "v=0\r\nanswer");
  const provider: RealtimeCallProvider = {
    configured: overrides.providerConfigured ?? true,
    createCall,
  };
  const authenticator: ClassroomAuthenticator = {
    authenticate: jest.fn(async () =>
      Object.prototype.hasOwnProperty.call(overrides, "learner")
        ? overrides.learner
        : allowedLearner,
    ),
  };
  const service = new ClassroomService({
    allowedProfileIds: new Set([allowedLearner.profileId]),
    authenticator,
    enabled: overrides.enabled ?? true,
    provider,
    safetyIdentifierSalt: overrides.salt ?? "server-only-salt",
  });
  return { createCall, service };
}

describe("ClassroomService", () => {
  it("fails closed while the feature is disabled or incomplete", async () => {
    await expect(
      createFixture({ enabled: false }).service.createRealtimeCall("token", "v=0"),
    ).rejects.toMatchObject({
      code: "CLASSROOM_DISABLED",
    });
    await expect(
      createFixture({ providerConfigured: false }).service.createRealtimeCall("token", "v=0"),
    ).rejects.toMatchObject({ code: "CLASSROOM_NOT_CONFIGURED" });
    await expect(
      createFixture({ salt: "" }).service.createRealtimeCall("token", "v=0"),
    ).rejects.toMatchObject({
      code: "CLASSROOM_NOT_CONFIGURED",
    });
  });

  it.each([
    [undefined, "UNAUTHORIZED"],
    [{ ...allowedLearner, role: "admin" as const }, "FORBIDDEN"],
    [{ ...allowedLearner, emailVerified: false }, "FORBIDDEN"],
    [{ ...allowedLearner, profileId: "profile-not-allowed" }, "CLASSROOM_ACCESS_RESTRICTED"],
  ])("rejects an ineligible learner", async (learner, code) => {
    await expect(
      createFixture({ learner }).service.createRealtimeCall("token", "v=0"),
    ).rejects.toMatchObject({
      code,
    });
  });

  it("sends only an HMAC safety identifier and SDP to the provider", async () => {
    const { createCall, service } = createFixture();

    await expect(service.createRealtimeCall("private-access-token", "v=0\r\noffer")).resolves.toBe(
      "v=0\r\nanswer",
    );
    expect(createCall).toHaveBeenCalledWith({
      safetyIdentifier: createSafetyIdentifier(allowedLearner.profileId, "server-only-salt"),
      sdp: "v=0\r\noffer",
    });
    const serializedInput = JSON.stringify(createCall.mock.calls[0]?.[0]);
    expect(serializedInput).not.toContain(allowedLearner.profileId);
    expect(serializedInput).not.toContain("private-access-token");
    expect(serializedInput).not.toContain("@");
  });

  it("uses a stable opaque HMAC rather than the profile identifier", () => {
    const identifier = createSafetyIdentifier("profile-allowed", "server-only-salt");
    expect(identifier).toMatch(/^dt_[0-9a-f]{64}$/);
    expect(identifier).not.toContain("profile-allowed");
  });
});
