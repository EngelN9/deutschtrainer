export const SUPPORTED_LEVELS = ["B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof SUPPORTED_LEVELS)[number];

export const SKILL_CATEGORIES = [
  "vocabulary",
  "grammar",
  "reading",
  "listening",
  "writing",
  "speaking",
  "interaction",
  "mediation",
  "pronunciation",
  "exam_preparation",
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const EXERCISE_TYPES = [
  "multiple_choice",
  "multiple_select",
  "fill_blank",
  "sentence_order",
  "matching",
  "translation",
  "dictation",
  "error_correction",
  "reading_comprehension",
  "listening_comprehension",
  "free_response",
  "speaking",
  "conversation",
  "essay",
  "summary",
  "paraphrase",
  "argumentation",
  "mediation",
  "oral_presentation",
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export type SourceType = "human" | "ai_generated" | "ai_assisted";
export type ReviewStatus = "draft" | "pending_review" | "approved" | "rejected";
export type ContentStatus =
  "draft" | "pending_review" | "approved" | "published" | "rejected" | "archived";

export const ERROR_TYPES = [
  "spelling",
  "capitalization",
  "punctuation",
  "article",
  "gender",
  "case",
  "declension",
  "adjective_ending",
  "verb_conjugation",
  "tense",
  "auxiliary",
  "word_order",
  "subordinate_clause",
  "preposition",
  "verb_preposition",
  "pronoun",
  "relative_clause",
  "passive_voice",
  "subjunctive",
  "collocation",
  "word_choice",
  "register",
  "coherence",
  "cohesion",
  "argumentation",
  "task_completion",
  "style",
  "idiomaticity",
  "redundancy",
  "ambiguity",
  "pronunciation",
  "fluency",
] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];
export type ErrorSeverity = "minor" | "moderate" | "major" | "critical";

export interface UserProfile {
  id: string;
  authUserId: string;
  displayName: string;
  role: "learner" | "content_editor" | "reviewer" | "admin";
  timezone: string;
  onboardingCompleted: boolean;
}

export interface UserPreferences {
  userId: string;
  dailyMinutes: number;
  targetLevel: CefrLevel;
  notificationsEnabled: boolean;
  preferredTheme: "system" | "light" | "dark";
  learningGoals: LearningGoal[];
}

export type LearningGoal = "exam_preparation" | "work" | "study" | "immigration" | "daily_life";

export interface Course {
  id: string;
  level: CefrLevel;
  titleZhTw: string;
  titleDe: string;
  descriptionZhTw: string;
  status: ContentStatus;
  version: number;
}

export interface Unit {
  id: string;
  courseId: string;
  titleZhTw: string;
  orderIndex: number;
  status: ContentStatus;
  version: number;
}

export interface Lesson {
  id: string;
  unitId: string;
  level: CefrLevel;
  titleZhTw: string;
  estimatedMinutes: number;
  skillCategories: SkillCategory[];
  prerequisiteSkillIds: string[];
  learningObjectives: string[];
  vocabularyTags: string[];
  grammarTags: string[];
  cefrDescriptor: string;
  status: ContentStatus;
  version: number;
}

export interface Activity {
  id: string;
  lessonId: string;
  titleZhTw: string;
  type: "instruction" | "practice" | "review" | "quiz" | "task";
  orderIndex: number;
  exerciseIds: string[];
}

export interface Skill {
  id: string;
  code: string;
  nameZhTw: string;
  nameDe: string;
  descriptionZhTw: string;
  level: CefrLevel;
  category: SkillCategory;
  prerequisiteSkillIds: string[];
  masteryThreshold: number;
  reviewPolicy: ReviewPolicy;
}

export interface ReviewPolicy {
  initialIntervalDays: number;
  maxIntervalDays: number;
  easeFactor: number;
}

export interface GrammarTopic {
  id: string;
  titleZhTw: string;
  titleDe: string;
  level: CefrLevel;
  shortExplanationZhTw: string;
  fullExplanationZhTw: string;
  relatedSkillIds: string[];
  prerequisiteTopicIds: string[];
}

export interface VocabularyItem {
  id: string;
  lemma: string;
  partOfSpeech: string;
  gender?: "der" | "die" | "das";
  plural?: string;
  principalParts?: string[];
  separablePrefix?: string;
  reflexive?: boolean;
  governingCase?: "nominative" | "accusative" | "dative" | "genitive";
  requiredPreposition?: string;
  level: CefrLevel;
  frequencyRank?: number;
  definitionsZhTw: string[];
  exampleSentences: string[];
  collocations: string[];
  register: "neutral" | "formal" | "informal" | "academic";
  region: "DE" | "AT" | "CH" | "general";
  audioUrl?: string;
}

export interface ExerciseOption {
  id: string;
  label: string;
  textDe: string;
  textZhTw?: string;
  orderIndex: number;
}

export interface OrderSegment {
  id: string;
  textDe: string;
}

export interface MatchingItem {
  id: string;
  textDe: string;
  textZhTw?: string;
}

export interface ExerciseAnswer {
  exerciseId: string;
  answer: unknown;
  gradingPolicy: GradingPolicy;
}

export interface GradingPolicy {
  caseSensitive: boolean;
  ignorePunctuation: boolean;
  normalizeGermanCharacters: boolean;
  allowPartialCredit: boolean;
  acceptedAlternatives: string[];
}

export interface BaseExercise {
  id: string;
  level: CefrLevel;
  type: ExerciseType;
  title: string;
  instructionZhTw: string;
  promptDe: string;
  skillIds: string[];
  grammarTopicIds: string[];
  vocabularyIds: string[];
  estimatedSeconds: number;
  difficulty: number;
  sourceType: SourceType;
  reviewStatus: ReviewStatus;
  version: number;
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: "multiple_choice";
  options: ExerciseOption[];
  answer: { optionId: string };
}

export interface MultipleSelectExercise extends BaseExercise {
  type: "multiple_select";
  options: ExerciseOption[];
  answer: { optionIds: string[] };
  requireAllCorrect: boolean;
  gradingPolicy: GradingPolicy;
}

export interface FillBlankExercise extends BaseExercise {
  type: "fill_blank";
  answer: { acceptedAnswers: string[] };
  gradingPolicy: GradingPolicy;
}

export interface SentenceOrderExercise extends BaseExercise {
  type: "sentence_order";
  segments: OrderSegment[];
  answer: { segmentIds: string[] };
  allowPartialCredit: boolean;
}

export interface MatchingExercise extends BaseExercise {
  type: "matching";
  leftItems: MatchingItem[];
  rightItems: MatchingItem[];
  answer: { pairs: Record<string, string> };
  allowPartialCredit: boolean;
}

export interface ErrorCorrectionExercise extends BaseExercise {
  type: "error_correction";
  answer: { acceptedAnswers: string[] };
  gradingPolicy: GradingPolicy;
  explanationZhTw: string;
}

export const FIXED_EXERCISE_TYPES = [
  "multiple_choice",
  "multiple_select",
  "fill_blank",
  "sentence_order",
  "matching",
  "error_correction",
] as const;
export type FixedExerciseType = (typeof FIXED_EXERCISE_TYPES)[number];

export type FixedExercise =
  | MultipleChoiceExercise
  | MultipleSelectExercise
  | FillBlankExercise
  | SentenceOrderExercise
  | MatchingExercise
  | ErrorCorrectionExercise;

export type FutureExerciseType = Exclude<ExerciseType, FixedExerciseType>;

export interface FutureExercise extends BaseExercise {
  type: FutureExerciseType;
  payload: Record<string, unknown>;
}

export type Exercise = FixedExercise | FutureExercise;

export interface ActivityContent extends Omit<Activity, "exerciseIds"> {
  exercises: FixedExercise[];
}

export interface LessonContent extends Lesson {
  activities: ActivityContent[];
}

export interface CatalogUnit extends Unit {
  lessons: LessonContent[];
}

export interface CatalogCourse extends Course {
  units: CatalogUnit[];
}

export interface CourseCatalog {
  courses: CatalogCourse[];
  source: "mock" | "supabase";
}

export interface ExerciseProgressResult {
  exerciseId: string;
  lessonId: string;
  score: number;
  isCorrect: boolean;
  submittedAt: string;
}

export interface LessonProgressSnapshot {
  lessonId: string;
  completedExerciseIds: string[];
  correctExerciseIds: string[];
  currentExerciseIndex: number;
  completedAt?: string;
  updatedAt: string;
}

export interface Attempt {
  id: string;
  userId: string;
  exerciseId: string;
  lessonId: string;
  submittedAt: string;
  score: number;
  isCorrect: boolean;
  durationMs: number;
  usedHint: boolean;
  mode: "lesson" | "review" | "practice" | "placement";
  idempotencyKey: string;
}

export interface AttemptAnswer {
  id: string;
  attemptId: string;
  exerciseId: string;
  answer: unknown;
  normalizedAnswer: unknown;
}

export interface ErrorRecord {
  id: string;
  userId: string;
  attemptId: string;
  exerciseId: string;
  lessonId: string;
  skillId: string;
  type: ErrorType;
  severity: ErrorSeverity;
  original: string;
  correction: string;
  explanationZhTw: string;
  createdAt: string;
}

export interface SkillMastery {
  userId: string;
  skillId: string;
  masteryScore: number;
  confidenceScore: number;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  hintCount: number;
  averageResponseTimeMs: number;
  lastPracticedAt?: string;
  nextReviewAt?: string;
  correctStreak: number;
  incorrectStreak: number;
  lastErrorTypes: ErrorType[];
}

export interface ReviewItem {
  id: string;
  userId: string;
  skillId: string;
  exerciseId: string;
  priority: number;
  scheduledAt: string;
  reason: string;
  intervalDays: number;
  easeFactor: number;
  status: "scheduled" | "completed" | "skipped" | "cancelled";
  sourceAttemptId?: string;
  completedAt?: string;
}

export interface LessonProgressRecord {
  userId: string;
  lessonId: string;
  status: "not_started" | "in_progress" | "completed";
  completionPercent: number;
  completedExerciseIds: string[];
  correctExerciseCount: number;
  attemptedExerciseCount: number;
  lastPracticedAt?: string;
  completedAt?: string;
}

export interface LearningRecordSnapshot {
  attempts: Attempt[];
  errors: ErrorRecord[];
  mastery: SkillMastery[];
  reviews: ReviewItem[];
  lessonProgress: LessonProgressRecord[];
  skillNames: Record<string, string>;
}

export type MasteryBand =
  | "not_mastered"
  | "initial_understanding"
  | "partially_mastered"
  | "stable_mastery"
  | "high_mastery";

export interface DailyLearningActivity {
  date: string;
  attemptCount: number;
  learningMinutes: number;
}

export interface LearningAnalytics {
  totalAttempts: number;
  correctAttempts: number;
  accuracyPercent: number;
  learningMinutes: number;
  dueReviewCount: number;
  errorCount: number;
  masteredSkillCount: number;
  trackedSkillCount: number;
  averageMasteryScore: number;
  dailyActivity: DailyLearningActivity[];
}

export interface WritingSubmission {
  id: string;
  userId: string;
  lessonId: string;
  level: CefrLevel;
  writingType: string;
  currentVersionId?: string;
}

export interface AIFeedback {
  id: string;
  userId: string;
  feature: string;
  targetType: string;
  targetId: string;
  schemaVersion: string;
  feedback: unknown;
  requiresHumanReview: boolean;
}

export interface ConversationScenario {
  id: string;
  level: CefrLevel;
  scenario: string;
  userRole: string;
  aiRole: string;
  maximumTurns: number;
  correctionStyle: "immediate" | "after_three_turns" | "after_conversation" | "user_requested";
}

export interface ConversationSession {
  id: string;
  userId: string;
  scenarioId: string;
  status: "active" | "completed" | "cancelled";
  startedAt: string;
}

export interface SpeakingSubmission {
  id: string;
  userId: string;
  exerciseId: string;
  audioAssetId: string;
  transcriptDe: string;
  wordsPerMinute: number;
}

export interface AudioAsset {
  id: string;
  storagePath: string;
  sourceType: "uploaded" | "generated" | "licensed";
  license: string;
  durationMs: number;
}

export interface ContentVersion {
  id: string;
  entityType: string;
  entityId: string;
  version: number;
  status: ContentStatus;
}
