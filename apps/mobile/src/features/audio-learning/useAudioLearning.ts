import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ListeningActivityRequest,
  RevealListeningTranscriptRequest,
  SubmitDictationRequest,
  TextToSpeechRequest,
  TranscribeRequest,
} from "@deutschtrainer/validation";
import { useAuthStore } from "../auth/useAuthStore";
import {
  deleteSpeakingSubmission,
  getAudioLearningWorkspace,
  recordListeningActivity,
  requestListeningAudio,
  revealListeningTranscript,
  submitListeningDictation,
  transcribeSpeakingRecording,
} from "./audioLearningRepository";

export function useAudioLearningWorkspace() {
  const profile = useAuthStore((state) => state.profile);
  return useQuery({
    queryKey: audioLearningQueryKey(profile?.id),
    queryFn: getAudioLearningWorkspace,
    enabled: Boolean(profile),
    staleTime: 15 * 1000,
    retry: 1,
  });
}

export function useListeningAudio() {
  return useMutation({
    mutationFn: (request: TextToSpeechRequest) => requestListeningAudio(request),
  });
}

export function useRecordListeningActivity() {
  return useMutation({
    mutationFn: (request: ListeningActivityRequest) => recordListeningActivity(request),
  });
}

export function useRevealListeningTranscript() {
  return useMutation({
    mutationFn: (request: RevealListeningTranscriptRequest) => revealListeningTranscript(request),
  });
}

export function useSubmitListeningDictation() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  return useMutation({
    mutationFn: (request: SubmitDictationRequest) => submitListeningDictation(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: audioLearningQueryKey(profile?.id) });
    },
  });
}

export function useTranscribeSpeakingRecording() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  return useMutation({
    mutationFn: (request: TranscribeRequest) => transcribeSpeakingRecording(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: audioLearningQueryKey(profile?.id) });
    },
  });
}

export function useDeleteSpeakingSubmission() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  return useMutation({
    mutationFn: deleteSpeakingSubmission,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: audioLearningQueryKey(profile?.id) });
    },
  });
}

export function audioLearningQueryKey(profileId?: string) {
  return ["audio-learning-workspace", profileId] as const;
}
