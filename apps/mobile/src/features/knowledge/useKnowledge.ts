import { useQuery } from "@tanstack/react-query";
import type { GrammarTopicListRequest, VocabularyListRequest } from "@deutschtrainer/validation";
import { useConnectivityStore } from "../offline/connectivityStore";
import {
  getGrammarTopic,
  getGrammarTopics,
  getVocabulary,
  getVocabularyItem,
} from "./knowledgeRepository";

export function useVocabularyList(request: VocabularyListRequest, active = true) {
  const connectivity = useConnectivityStore((state) => state.status);
  return useQuery({
    queryKey: ["knowledge", "vocabulary", request],
    queryFn: () => getVocabulary(request),
    enabled: active && connectivity !== "offline",
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useVocabularyItem(itemId?: string) {
  const connectivity = useConnectivityStore((state) => state.status);
  return useQuery({
    queryKey: ["knowledge", "vocabulary", "detail", itemId],
    queryFn: () => getVocabularyItem(itemId!),
    enabled: Boolean(itemId) && connectivity !== "offline",
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useGrammarTopicList(request: GrammarTopicListRequest, active = true) {
  const connectivity = useConnectivityStore((state) => state.status);
  return useQuery({
    queryKey: ["knowledge", "grammar", request],
    queryFn: () => getGrammarTopics(request),
    enabled: active && connectivity !== "offline",
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useGrammarTopic(topicId?: string) {
  const connectivity = useConnectivityStore((state) => state.status);
  return useQuery({
    queryKey: ["knowledge", "grammar", "detail", topicId],
    queryFn: () => getGrammarTopic(topicId!),
    enabled: Boolean(topicId) && connectivity !== "offline",
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
