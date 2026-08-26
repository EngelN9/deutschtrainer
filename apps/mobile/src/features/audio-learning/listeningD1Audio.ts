import type { AudioSource } from "expo-audio";
import euroTicketAudio from "../../../assets/audio/365-euro-ticket.mp3";

const listeningD1AudioSources: Record<string, AudioSource> = {
  "7bdc1dd6-8f39-4cb9-a5f3-c0d3a4270031": euroTicketAudio,
};

export function getListeningD1AudioSource(exerciseId: string): AudioSource | undefined {
  return listeningD1AudioSources[exerciseId];
}
