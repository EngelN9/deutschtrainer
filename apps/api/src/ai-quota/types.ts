import type { UserProfile } from "@deutschtrainer/shared-types";

export type AiQuotaFeature =
  "evaluate_response" | "evaluate_writing" | "text_to_speech" | "transcribe_audio" | "conversation";

export interface AiQuotaLearner {
  emailVerified: boolean;
  profileId: string;
  role: UserProfile["role"];
}

export interface AiQuotaReservation {
  generation: number;
  id: string;
}

export interface AiQuotaGate {
  assertEligible(learner: AiQuotaLearner): void;
  reserve(input: {
    feature: AiQuotaFeature;
    idempotencyKey: string;
    learnerId: string;
    limit: number;
  }): Promise<AiQuotaReservation>;
  reserveProviderCall(reservation: AiQuotaReservation, providerAttempt: number): Promise<void>;
  consume(reservation: AiQuotaReservation): Promise<void>;
  release(reservation: AiQuotaReservation): Promise<void>;
}
