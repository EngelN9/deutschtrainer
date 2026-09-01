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

export interface RealtimeCallProvider {
  readonly configured: boolean;
  createCall(input: CreateRealtimeCallInput): Promise<string>;
}

export interface ClassroomServiceContract {
  createRealtimeCall(accessToken: string, sdp: string): Promise<string>;
}
