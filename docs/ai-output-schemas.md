# AI Output Schemas

## 1. 命名與同步規則

每個 AI schema 同時需要：

- JSON Schema `$id`
- Zod schema 名稱
- TypeScript response type
- backend validator
- 測試樣本

命名必須一致：

```text
JSON Schema id: AiEvaluationFeedback.v1
Zod schema: aiEvaluationFeedbackSchema
TypeScript type: AiEvaluationFeedback
```

## 2. 共用欄位

```ts
export type ErrorSeverity = "minor" | "moderate" | "major" | "critical";

export type ErrorType =
  | "spelling"
  | "capitalization"
  | "punctuation"
  | "article"
  | "gender"
  | "case"
  | "declension"
  | "adjective_ending"
  | "verb_conjugation"
  | "tense"
  | "auxiliary"
  | "word_order"
  | "subordinate_clause"
  | "preposition"
  | "verb_preposition"
  | "pronoun"
  | "relative_clause"
  | "passive_voice"
  | "subjunctive"
  | "collocation"
  | "word_choice"
  | "register"
  | "coherence"
  | "cohesion"
  | "argumentation"
  | "task_completion"
  | "style"
  | "idiomaticity"
  | "redundancy"
  | "ambiguity"
  | "pronunciation"
  | "fluency";

export interface AiErrorItem {
  type: ErrorType;
  severity: ErrorSeverity;
  original: string;
  correction: string;
  explanationZhTw: string;
  relatedSkillId: string;
  grammarTopicId?: string;
  vocabularyId?: string;
}
```

## 3. AiEvaluationFeedback.v1

用於 translation、free_response、error_correction 的 AI 批改。

```json
{
  "$id": "AiEvaluationFeedback.v1",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "isCorrect",
    "score",
    "cefrLevelEstimate",
    "correctedText",
    "errors",
    "strengths",
    "suggestions",
    "naturalAlternative",
    "requiresHumanReview"
  ],
  "properties": {
    "isCorrect": { "type": "boolean" },
    "score": { "type": "integer", "minimum": 0, "maximum": 100 },
    "cefrLevelEstimate": { "enum": ["B1", "B2", "C1", "C2"] },
    "correctedText": { "type": "string" },
    "errors": {
      "type": "array",
      "items": { "$ref": "#/$defs/errorItem" }
    },
    "strengths": {
      "type": "array",
      "items": { "type": "string" }
    },
    "suggestions": {
      "type": "array",
      "items": { "type": "string" }
    },
    "naturalAlternative": { "type": "string" },
    "requiresHumanReview": { "type": "boolean" }
  },
  "$defs": {
    "errorItem": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "type",
        "severity",
        "original",
        "correction",
        "explanationZhTw",
        "relatedSkillId"
      ],
      "properties": {
        "type": { "type": "string" },
        "severity": { "enum": ["minor", "moderate", "major", "critical"] },
        "original": { "type": "string" },
        "correction": { "type": "string" },
        "explanationZhTw": { "type": "string" },
        "relatedSkillId": { "type": "string" },
        "grammarTopicId": { "type": "string" },
        "vocabularyId": { "type": "string" }
      }
    }
  }
}
```

## 4. WritingFeedback.v1

用於作文批改。第一輪不提供完整改寫，第二輪可提供 referenceVersion。

```ts
export interface WritingFeedback {
  score: number;
  cefrLevelEstimate: "B1" | "B2" | "C1" | "C2";
  rubricScores: {
    taskCompletion: number;
    grammar: number;
    vocabulary: number;
    coherence: number;
    cohesion: number;
    register: number;
    argumentation: number;
    style: number;
    accuracy: number;
    idiomaticity: number;
  };
  inlineErrors: Array<
    AiErrorItem & {
      startOffset: number;
      endOffset: number;
    }
  >;
  strengths: string[];
  revisionTasks: string[];
  referenceVersion?: string;
  repeatedErrorTypes: ErrorType[];
  requiresHumanReview: boolean;
}
```

限制：

- first_pass 不得回傳完整 referenceVersion。
- second_pass 可回傳 referenceVersion。
- 所有 explanation 使用繁體中文。

## 5. GeneratedPracticeSet.v1

用於 AI 生成補強練習草稿。

```ts
export interface GeneratedPracticeSet {
  level: "B1" | "B2" | "C1" | "C2";
  targetSkillIds: string[];
  grammarTopicIds: string[];
  exercises: ExerciseDraft[];
  validationNotes: string[];
  requiresHumanReview: true;
}
```

規則：

- requiresHumanReview 永遠為 true。
- reviewStatus 必須是 draft 或 pending_review。
- 不可直接 published。
- 每題需符合 Exercise discriminated union。

## 6. TranscriptionResult.v1

```ts
export interface TranscriptionResult {
  transcriptDe: string;
  confidence?: number;
  segments: Array<{
    startMs: number;
    endMs: number;
    text: string;
  }>;
  suspectedIssues: string[];
}
```

STT 的 confidence 不可轉換成發音分數。

## 7. SpeakingFeedback.v1

```ts
export interface SpeakingFeedback {
  transcriptDe: string;
  targetTextDe?: string;
  missingWords: string[];
  extraWords: string[];
  wordsPerMinute: number;
  pauses: Array<{ startMs: number; durationMs: number }>;
  contentAccuracy: number;
  grammarNotesZhTw: string[];
  fluencyNotesZhTw: string[];
  suspectedPronunciationIssuesZhTw: string[];
  retrySuggestionZhTw: string;
  requiresHumanReview: boolean;
}
```

## 8. ConversationTurnFeedback.v1

```ts
export interface ConversationTurnFeedback {
  shouldContinue: boolean;
  taskCompletionScore: number;
  immediateCorrections: AiErrorItem[];
  naturalSuggestions: string[];
  usedTargetVocabularyIds: string[];
  unusedTargetPatternIds: string[];
  nextPromptDe: string;
  summaryZhTw?: string;
}
```

預設 correctionStyle 不應每句打斷使用者；只有 immediate 模式才回傳即時糾錯。

## 9. TextToSpeechResult.v1

```ts
export interface TextToSpeechResult {
  audioAssetId: string;
  audioUrl: string;
  voice: string;
  textHash: string;
  durationMs: number;
  license: "generated";
}
```
