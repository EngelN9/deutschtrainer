import type { CefrLevel } from "@deutschtrainer/shared-types";
import { z } from "zod";

const listeningD1LevelSchema = z.enum(["B1", "B2"]);

const listeningD1OptionSchema = z.object({
  key: z.string().trim().min(1).max(20),
  textZhTw: z.string().trim().min(1).max(240),
});

const listeningD1VocabularySupportSchema = z.object({
  termDe: z.string().trim().min(1).max(80),
  explanationZhTw: z.string().trim().min(1).max(160),
});

const listeningD1QuestionSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(["main_idea", "key_information", "detail", "speaker_intent"]),
    promptZhTw: z.string().trim().min(1).max(300),
    options: z.array(listeningD1OptionSchema).min(2).max(5),
    correctOptionKey: z.string().trim().min(1).max(20),
    explanationZhTw: z.string().trim().min(1).max(500),
  })
  .superRefine((question, context) => {
    const optionKeys = question.options.map((option) => option.key);
    if (new Set(optionKeys).size !== optionKeys.length) {
      context.addIssue({ code: "custom", message: "選項代碼不可重複。", path: ["options"] });
    }
    if (!optionKeys.includes(question.correctOptionKey)) {
      context.addIssue({
        code: "custom",
        message: "正解必須對應現有選項。",
        path: ["correctOptionKey"],
      });
    }
  });

export const listeningD1ExerciseSchema = z
  .object({
    id: z.string().uuid(),
    level: listeningD1LevelSchema,
    availableToLevels: z.array(listeningD1LevelSchema).min(1).max(2),
    kind: z.literal("news"),
    titleZhTw: z.string().trim().min(1).max(120),
    descriptionZhTw: z.string().trim().min(1).max(500),
    contextZhTw: z.string().trim().min(1).max(500),
    vocabularySupport: z.array(listeningD1VocabularySupportSchema).length(4),
    estimatedSeconds: z.number().int().min(30).max(90),
    transcriptDe: z.string().trim().min(1).max(4096),
    questions: z.array(listeningD1QuestionSchema).min(3).max(5),
    source: z.object({
      title: z.string().trim().min(1),
      creator: z.string().trim().min(1),
      pageUrl: z.string().url(),
      license: z.literal("CC BY 2.5"),
      licenseUrl: z.string().url(),
      modified: z.boolean(),
    }),
    version: z.number().int().positive(),
  })
  .superRefine((exercise, context) => {
    const questionIds = exercise.questions.map((question) => question.id);
    if (new Set(questionIds).size !== questionIds.length) {
      context.addIssue({ code: "custom", message: "題目 ID 不可重複。", path: ["questions"] });
    }
    if (!exercise.availableToLevels.includes(exercise.level)) {
      context.addIssue({
        code: "custom",
        message: "主要程度必須包含在可用程度中。",
        path: ["availableToLevels"],
      });
    }
    const vocabularyTerms = exercise.vocabularySupport.map((entry) => entry.termDe.toLowerCase());
    if (new Set(vocabularyTerms).size !== vocabularyTerms.length) {
      context.addIssue({
        code: "custom",
        message: "聽前詞彙不可重複。",
        path: ["vocabularySupport"],
      });
    }
  });

export type ListeningD1Exercise = z.infer<typeof listeningD1ExerciseSchema>;

const listeningD1SubmissionSchema = z.object({
  exerciseId: z.string().uuid(),
  answers: z.record(z.string().uuid(), z.string().trim().min(1).max(20)),
});

export interface ListeningD1QuestionResult {
  questionId: string;
  selectedOptionKey: string;
  correctOptionKey: string;
  isCorrect: boolean;
  explanationZhTw: string;
}

export type ListeningD1GradeResult =
  | {
      status: "completed";
      score: number;
      correctCount: number;
      totalCount: number;
      questionResults: ListeningD1QuestionResult[];
    }
  | {
      status: "invalid";
      message: string;
    };

const euroTicketExercise = listeningD1ExerciseSchema.parse({
  id: "7bdc1dd6-8f39-4cb9-a5f3-c0d3a4270031",
  level: "B1",
  availableToLevels: ["B1", "B2"],
  kind: "news",
  titleZhTw: "每天一歐元的公共交通票",
  descriptionZhTw: "聽一則短新聞，掌握提案內容、價格與適用對象。B2 學習者可作為新聞理解暖身。",
  contextZhTw: "先看聽前詞彙，再完整聽一次並回答四題。需要時可慢速或從頭播放。",
  vocabularySupport: [
    { termDe: "das Preismoratorium", explanationZhTw: "暫時凍結價格或票價" },
    { termDe: "die Fraktion", explanationZhTw: "議會中的政黨黨團" },
    { termDe: "der Nahverkehr", explanationZhTw: "城市或區域內的公共交通" },
    { termDe: "Ehrenamtliche", explanationZhTw: "從事志願服務的人、志工" },
  ],
  estimatedSeconds: 66,
  transcriptDe:
    "Bremen, 18. Juni 2022. Die SPD-Fraktion in Bremen fordert ein einjähriges Preismoratorium nach dem Ende des Neun-Euro-Tickets für alle Bundesbürger. Dafür wurde ein Brief an die Fraktionsvorsitzenden aller Bundesländer und den Bund geschrieben. Ein 365-Euro-Ticket wäre nach Ansicht der Bremer wichtig. Preise zu erhöhen, können wir uns nicht erlauben. Dabei soll der öffentliche Personennahverkehr gänzlich ohne das Lösen eines Fahrscheins genutzt werden können, und man soll mit durchschnittlich einem Euro am Tag Bus, Bahn und Tram nutzen können. Hannover plant, das 365-Euro-Ticket für Ehrenamtliche ab September einzuführen. Auch beispielsweise Studierende in Bayern würden gemäß einer Umfrage mehr den öffentlichen Personennahverkehr nutzen, wenn es ein günstiges Ticket gäbe. An der Umfrage hatten 30 Prozent der Studierenden teilgenommen.",
  questions: [
    {
      id: "16fac010-6ee7-451c-b6ad-a3399165c0e1",
      kind: "main_idea",
      promptZhTw: "這則新聞的主旨是什麼？",
      options: [
        { key: "a", textZhTw: "布萊梅倡議以 365 歐元年票維持可負擔的公共交通" },
        { key: "b", textZhTw: "德國將停止所有地方公共交通" },
        { key: "c", textZhTw: "漢諾威要求學生購買昂貴月票" },
      ],
      correctOptionKey: "a",
      explanationZhTw:
        "報導重點是九歐元票結束後，布萊梅方面主張以 365 歐元年票維持可負擔的公共交通。",
    },
    {
      id: "6194b10d-4820-4c48-8cb7-d6acbeadce2d",
      kind: "key_information",
      promptZhTw: "365 歐元年票平均一天約多少錢？",
      options: [
        { key: "a", textZhTw: "一歐元" },
        { key: "b", textZhTw: "九歐元" },
        { key: "c", textZhTw: "三十歐元" },
      ],
      correctOptionKey: "a",
      explanationZhTw: "音訊明確說明平均一天一歐元即可搭乘公車、火車與電車。",
    },
    {
      id: "68f20b32-a384-4c02-9aa7-d515ec4fd1dd",
      kind: "detail",
      promptZhTw: "漢諾威計畫先讓哪一類人使用這種年票？",
      options: [
        { key: "a", textZhTw: "所有觀光客" },
        { key: "b", textZhTw: "志工" },
        { key: "c", textZhTw: "只有聯邦議員" },
      ],
      correctOptionKey: "b",
      explanationZhTw: "報導提到漢諾威計畫從九月起為志工（Ehrenamtliche）導入 365 歐元年票。",
    },
    {
      id: "dd2a674c-96cc-492f-9d4d-2f44fc176214",
      kind: "detail",
      promptZhTw: "關於巴伐利亞學生的調查，報導指出什麼？",
      options: [
        { key: "a", textZhTw: "全部學生都參加了調查" },
        { key: "b", textZhTw: "學生不願意使用公共交通" },
        { key: "c", textZhTw: "若票價便宜，學生會更常使用公共交通" },
      ],
      correctOptionKey: "c",
      explanationZhTw: "調查顯示，如果有便宜的票，巴伐利亞學生會更常使用公共交通；參與率為 30%。",
    },
  ],
  source: {
    title: "365-Euro-Ticket für den Nahverkehr",
    creator: "Emil Linus Albrecht / Wikinews",
    pageUrl:
      "https://commons.wikimedia.org/wiki/File:DE-365-Euro-Ticket_f%C3%BCr_den_Nahverkehr.flac",
    license: "CC BY 2.5",
    licenseUrl: "https://creativecommons.org/licenses/by/2.5/",
    modified: false,
  },
  version: 1,
});

const listeningD1Exercises: ListeningD1Exercise[] = [euroTicketExercise];

export function getListeningD1Exercise(exerciseId?: string): ListeningD1Exercise | undefined {
  return listeningD1Exercises.find((exercise) => exercise.id === exerciseId);
}

export function getListeningD1ExercisesForLevel(level: CefrLevel): ListeningD1Exercise[] {
  if (level !== "B1" && level !== "B2") {
    return [];
  }
  return listeningD1Exercises.filter((exercise) => exercise.availableToLevels.includes(level));
}

export function gradeListeningD1Exercise(
  exercise: ListeningD1Exercise,
  rawAnswers: Record<string, string>,
): ListeningD1GradeResult {
  const submission = listeningD1SubmissionSchema.safeParse({
    exerciseId: exercise.id,
    answers: rawAnswers,
  });
  if (!submission.success) {
    return { status: "invalid", message: "答案格式不正確，請重新選擇後再提交。" };
  }

  const expectedQuestionIds = new Set(exercise.questions.map((question) => question.id));
  const submittedQuestionIds = Object.keys(submission.data.answers);
  if (
    submittedQuestionIds.length !== expectedQuestionIds.size ||
    submittedQuestionIds.some((questionId) => !expectedQuestionIds.has(questionId))
  ) {
    return { status: "invalid", message: "請完成所有題目後再提交。" };
  }

  const questionResults: ListeningD1QuestionResult[] = [];
  for (const question of exercise.questions) {
    const selectedOptionKey = submission.data.answers[question.id];
    if (
      !selectedOptionKey ||
      !question.options.some((option) => option.key === selectedOptionKey)
    ) {
      return { status: "invalid", message: "有題目的選項無效，請重新選擇後再提交。" };
    }
    questionResults.push({
      questionId: question.id,
      selectedOptionKey,
      correctOptionKey: question.correctOptionKey,
      isCorrect: selectedOptionKey === question.correctOptionKey,
      explanationZhTw: question.explanationZhTw,
    });
  }

  const correctCount = questionResults.filter((result) => result.isCorrect).length;
  return {
    status: "completed",
    score: Math.round((correctCount / questionResults.length) * 100),
    correctCount,
    totalCount: questionResults.length,
    questionResults,
  };
}
