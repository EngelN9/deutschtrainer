import { describe, expect, it, jest } from "@jest/globals";
import { ClassroomService, createSafetyIdentifier } from "./classroomService";
import type {
  ClassroomAuthenticator,
  ClassroomRepository,
  ClassroomSessionStart,
  RealtimeCallProvider,
} from "./types";

const allowedLearner = {
  emailVerified: true,
  profileId: "profile-allowed",
  role: "learner" as const,
};

function createFixture(
  overrides: {
    enabled?: boolean;
    expiredCallIds?: string[];
    learner?: Awaited<ReturnType<ClassroomAuthenticator["authenticate"]>>;
    providerConfigured?: boolean;
    salt?: string;
    startSession?: ClassroomSessionStart | Error;
  } = {},
) {
  const createCall = jest.fn<RealtimeCallProvider["createCall"]>(async () => ({
    callId: "rtc_test123",
    sdp: "v=0\r\nanswer",
  }));
  const hangup = jest.fn<RealtimeCallProvider["hangup"]>(async () => true);
  const provider: RealtimeCallProvider = {
    configured: overrides.providerConfigured ?? true,
    createCall,
    hangup,
  };
  const startSession = jest.fn<ClassroomRepository["startSession"]>(async () => {
    if (overrides.startSession instanceof Error) throw overrides.startSession;
    return (
      overrides.startSession ?? { allowed: true, sessionId: "11111111-1111-4111-8111-111111111111" }
    );
  });
  const endSession = jest.fn<ClassroomRepository["endSession"]>(async () => true);
  const listExpiredCallIds = jest.fn<ClassroomRepository["listExpiredCallIds"]>(
    async () => overrides.expiredCallIds ?? [],
  );
  const findActiveCallId = jest.fn<ClassroomRepository["findActiveCallId"]>(
    async () => "rtc_test123",
  );
  const repository: ClassroomRepository = {
    endSession,
    findActiveCallId,
    listExpiredCallIds,
    startSession,
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
    dailySessionLimit: 2,
    enabled: overrides.enabled ?? true,
    globalDailySessionLimit: 3,
    maxSessionSeconds: 900,
    provider,
    repository,
    safetyIdentifierSalt: overrides.salt ?? "server-only-salt",
  });
  return {
    createCall,
    endSession,
    findActiveCallId,
    hangup,
    listExpiredCallIds,
    service,
    startSession,
  };
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

  it("records the session so the call can be ended later", async () => {
    const { service, startSession } = createFixture();
    await service.createRealtimeCall("token", "v=0\r\noffer");
    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        callId: "rtc_test123",
        dailyLimit: 2,
        globalDailyLimit: 3,
        maxSessionSeconds: 900,
        userId: allowedLearner.profileId,
      }),
    );
  });

  it.each([["ACTIVE_SESSION" as const], ["DAILY_LIMIT" as const], ["GLOBAL_LIMIT" as const]])(
    "hangs up immediately when the session is refused (%s)",
    async (reason) => {
      const { hangup, service } = createFixture({ startSession: { allowed: false, reason } });

      await expect(service.createRealtimeCall("token", "v=0\r\noffer")).rejects.toMatchObject({
        code: "CLASSROOM_SESSION_LIMIT",
        status: 429,
      });
      // The call was already established at the provider, so refusing without hanging up would
      // leave a billable session running that nothing is tracking.
      expect(hangup).toHaveBeenCalledWith("rtc_test123");
    },
  );

  it("hangs up when the session cannot be recorded at all", async () => {
    const { hangup, service } = createFixture({ startSession: new Error("database offline") });

    await expect(service.createRealtimeCall("token", "v=0\r\noffer")).rejects.toThrow(
      "database offline",
    );
    expect(hangup).toHaveBeenCalledWith("rtc_test123");
  });

  it("ends the caller own session at the provider before closing the row", async () => {
    const { endSession, hangup, service } = createFixture();
    await expect(service.endActiveSession("token")).resolves.toBe(true);
    expect(hangup).toHaveBeenCalledWith("rtc_test123");
    expect(endSession).toHaveBeenCalledWith("rtc_test123", "client_ended");
  });

  it("is a no-op when the caller has no active session", async () => {
    const fixture = createFixture();
    fixture.findActiveCallId.mockResolvedValueOnce(undefined);
    await expect(fixture.service.endActiveSession("token")).resolves.toBe(false);
    expect(fixture.hangup).not.toHaveBeenCalled();
  });

  it("sweeps every expired session even when a hangup fails", async () => {
    const fixture = createFixture({ expiredCallIds: ["rtc_a", "rtc_b"] });
    fixture.hangup.mockResolvedValueOnce(false);

    await expect(fixture.service.sweepExpiredSessions()).resolves.toBe(2);
    expect(fixture.hangup.mock.calls.map(([id]) => id)).toEqual(["rtc_a", "rtc_b"]);
    // Rows close regardless, so an unreachable call cannot wedge the sweeper into retrying forever.
    expect(fixture.endSession.mock.calls.map(([id]) => id)).toEqual(["rtc_a", "rtc_b"]);
  });

  it("does not sweep while the feature is disabled", async () => {
    const { listExpiredCallIds, service } = createFixture({ enabled: false });
    await expect(service.sweepExpiredSessions()).resolves.toBe(0);
    expect(listExpiredCallIds).not.toHaveBeenCalled();
  });

  it("uses a stable opaque HMAC rather than the profile identifier", () => {
    const identifier = createSafetyIdentifier("profile-allowed", "server-only-salt");
    expect(identifier).toMatch(/^dt_[0-9a-f]{61}$/);
    // The provider rejects anything longer, and a mocked fetch will never tell you so. The
    // previous format was 67 characters and failed every real call with a 400.
    expect(identifier.length).toBeLessThanOrEqual(64);
    expect(identifier).not.toContain("profile-allowed");
  });
});
