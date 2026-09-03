import { describe, expect, it } from "@jest/globals";
import { canLoadAuthenticatedAudioWorkspace } from "./audioLearningAccess";

describe("audio learning access", () => {
  it("never enables the authenticated workspace for Demo", () => {
    expect(
      canLoadAuthenticatedAudioWorkspace({ authMode: "demo", profileId: "demo-profile" }),
    ).toBe(false);
  });

  it("enables the authenticated workspace only for a connected profile", () => {
    expect(
      canLoadAuthenticatedAudioWorkspace({ authMode: "supabase", profileId: "profile-id" }),
    ).toBe(true);
    expect(canLoadAuthenticatedAudioWorkspace({ authMode: "supabase", profileId: null })).toBe(
      false,
    );
  });

  it("stays disabled while authentication is unresolved", () => {
    expect(canLoadAuthenticatedAudioWorkspace({ authMode: null, profileId: null })).toBe(false);
  });
});
