import type { UserProfile } from "@deutschtrainer/shared-types";

export interface ClassroomLearner {
  emailVerified: boolean;
  profileId: string;
  role: UserProfile["role"];
}

export interface ClassroomAuthenticator {
  authenticate(accessToken: string): Promise<ClassroomLearner | undefined>;
}

export interface CreateRealtimeCallInput {
  safetyIdentifier: string;
  sdp: string;
}

export interface RealtimeCall {
  /**
   * Provider call id, read from the Location header of the SDP exchange. This is the only handle
   * that lets the server end a call it did not stay connected to.
   */
  callId: string;
  sdp: string;
}

export interface RealtimeCallProvider {
  readonly configured: boolean;
  createCall(input: CreateRealtimeCallInput): Promise<RealtimeCall>;
  /** Terminate an established call at the provider. Must not throw; sweeping continues regardless. */
  hangup(callId: string): Promise<boolean>;
}

export type ClassroomSessionRefusal = "ACTIVE_SESSION" | "DAILY_LIMIT" | "GLOBAL_LIMIT";

export interface ClassroomSessionStart {
  allowed: boolean;
  expiresAt?: string;
  reason?: ClassroomSessionRefusal;
  sessionId?: string;
}

export interface ClassroomRepository {
  endSession(callId: string, reason: string): Promise<boolean>;
  findActiveCallId(userId: string): Promise<string | undefined>;
  listExpiredCallIds(): Promise<string[]>;
  startSession(input: {
    callId: string;
    dailyLimit: number;
    globalDailyLimit: number;
    maxSessionSeconds: number;
    safetyIdentifier: string;
    userId: string;
  }): Promise<ClassroomSessionStart>;
}

export interface ClassroomServiceContract {
  createRealtimeCall(accessToken: string, sdp: string): Promise<string>;
  /** Ends the caller's own active session. There is at most one, so no id is passed or trusted. */
  endActiveSession(accessToken: string): Promise<boolean>;
  sweepExpiredSessions(): Promise<number>;
}
