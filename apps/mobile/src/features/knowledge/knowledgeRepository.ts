import type {
  GrammarTopicDetailResponse,
  GrammarTopicListRequest,
  GrammarTopicListResponse,
  VocabularyDetailResponse,
  VocabularyListRequest,
  VocabularyListResponse,
} from "@deutschtrainer/validation";
import {
  grammarTopicDetailResponseSchema,
  grammarTopicListResponseSchema,
  vocabularyDetailResponseSchema,
  vocabularyListResponseSchema,
} from "@deutschtrainer/validation";
import { requestApi } from "../../lib/apiClient";

export async function getVocabulary(
  request: VocabularyListRequest,
): Promise<VocabularyListResponse> {
  return requestApi(`/vocabulary?${toQueryString(request)}`, vocabularyListResponseSchema, {
    fallbackMessage: "單字庫回傳格式不完整，請稍後重試。",
  });
}

export async function getVocabularyItem(itemId: string): Promise<VocabularyDetailResponse> {
  return requestApi(`/vocabulary/${encodeURIComponent(itemId)}`, vocabularyDetailResponseSchema, {
    fallbackMessage: "單字內容回傳格式不完整，請稍後重試。",
  });
}

export async function getGrammarTopics(
  request: GrammarTopicListRequest,
): Promise<GrammarTopicListResponse> {
  return requestApi(`/grammar-topics?${toQueryString(request)}`, grammarTopicListResponseSchema, {
    fallbackMessage: "文法庫回傳格式不完整，請稍後重試。",
  });
}

export async function getGrammarTopic(topicId: string): Promise<GrammarTopicDetailResponse> {
  return requestApi(
    `/grammar-topics/${encodeURIComponent(topicId)}`,
    grammarTopicDetailResponseSchema,
    { fallbackMessage: "文法內容回傳格式不完整，請稍後重試。" },
  );
}

function toQueryString(request: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(request)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  return query.toString();
}
