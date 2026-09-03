interface AuthenticatedAudioWorkspaceInput {
  authMode: "demo" | "supabase" | null;
  profileId: string | null | undefined;
}

export function canLoadAuthenticatedAudioWorkspace({
  authMode,
  profileId,
}: AuthenticatedAudioWorkspaceInput): boolean {
  return authMode === "supabase" && Boolean(profileId);
}
