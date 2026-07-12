import type {
  BaseExercise,
  CatalogCourse,
  CefrLevel,
  CourseCatalog,
  FillBlankExercise,
  FixedExercise,
  LessonContent,
  SkillCategory,
} from "@deutschtrainer/shared-types";

const id = (value: number) => `10000000-0000-4000-8000-${value.toString().padStart(12, "0")}`;

const gradingPolicy = {
  acceptedAlternatives: [],
  allowPartialCredit: false,
  caseSensitive: false,
  ignorePunctuation: true,
  normalizeGermanCharacters: true,
};

const firstLessonExercises: FixedExercise[] = [
  {
    ...baseExercise(
      101,
      "B1",
      "multiple_choice",
      "連接詞單選",
      "Ich bleibe zu Hause, ___ es regnet.",
    ),
    options: [
      option(111, "A", "weil", "因為", 0),
      option(112, "B", "deshalb", "因此", 1),
      option(113, "C", "trotzdem", "儘管如此", 2),
      option(114, "D", "denn", "因為（並列）", 3),
    ],
    answer: { optionId: id(111) },
  },
  {
    ...baseExercise(
      102,
      "B1",
      "multiple_select",
      "從句語序複選",
      "Welche Sätze haben eine korrekte Nebensatzstellung?",
    ),
    options: [
      option(121, "A", "Ich bleibe hier, weil ich warten muss.", undefined, 0),
      option(122, "B", "Obwohl er müde ist, lernt er weiter.", undefined, 1),
      option(123, "C", "Weil ich muss warten, bleibe ich hier.", undefined, 2),
      option(124, "D", "Obwohl regnet es, gehen wir spazieren.", undefined, 3),
    ],
    answer: { optionIds: [id(121), id(122)] },
    requireAllCorrect: false,
    gradingPolicy: { ...gradingPolicy, allowPartialCredit: true },
  },
  {
    ...baseExercise(103, "B1", "fill_blank", "動詞末位填空", "Obwohl er müde ist, ___ er weiter."),
    answer: { acceptedAnswers: ["arbeitet"] },
    gradingPolicy,
  },
  {
    ...baseExercise(104, "B1", "sentence_order", "句子排序", "Ordne die Satzteile."),
    segments: [
      { id: "segment-1", textDe: "Ich bleibe zu Hause," },
      { id: "segment-2", textDe: "weil" },
      { id: "segment-3", textDe: "es heute regnet." },
    ],
    answer: { segmentIds: ["segment-1", "segment-2", "segment-3"] },
    allowPartialCredit: true,
  },
  {
    ...baseExercise(105, "B1", "matching", "功能配對", "Ordne die Konnektoren zu."),
    leftItems: [
      { id: "left-1", textDe: "weil" },
      { id: "left-2", textDe: "obwohl" },
      { id: "left-3", textDe: "deshalb" },
    ],
    rightItems: [
      { id: "right-3", textDe: "nennt eine Folge" },
      { id: "right-1", textDe: "nennt einen Grund" },
      { id: "right-2", textDe: "drückt einen Gegensatz aus" },
    ],
    answer: { pairs: { "left-1": "right-1", "left-2": "right-2", "left-3": "right-3" } },
    allowPartialCredit: true,
  },
  {
    ...baseExercise(
      106,
      "B1",
      "error_correction",
      "從句改錯",
      "Ich bleibe zu Hause, weil es regnet stark.",
    ),
    answer: { acceptedAnswers: ["Ich bleibe zu Hause, weil es stark regnet."] },
    gradingPolicy,
    explanationZhTw: "weil 引導從句，變位動詞 regnet 必須放在句末。",
  },
];

interface LessonDefinition {
  categories: SkillCategory[];
  cefrDescriptor: string;
  grammarTags: string[];
  level: CefrLevel;
  objective: string;
  prompt: string;
  answer: string;
  skillId: string;
  titleDe: string;
  titleZhTw: string;
  vocabularyTags: string[];
}

const lessonDefinitions: LessonDefinition[] = [
  {
    level: "B1",
    titleZhTw: "說明原因與讓步",
    titleDe: "Gründe und Gegensätze ausdrücken",
    categories: ["grammar", "interaction"],
    objective: "使用 weil 與 obwohl 說明原因並維持正確從句語序。",
    vocabularyTags: ["obwohl", "deshalb", "trotzdem"],
    grammarTags: ["weil / obwohl", "從句動詞末位"],
    skillId: "B1.word_order.subordinate_clause",
    cefrDescriptor: "能以簡單連貫的語句說明理由，並表達對比或讓步。",
    prompt: "Obwohl er müde ist, ___ er weiter.",
    answer: "arbeitet",
  },
  {
    level: "B1",
    titleZhTw: "租屋與位置變化",
    titleDe: "Wohnungssuche und Ortswechsel",
    categories: ["vocabulary", "grammar"],
    objective: "依移動或位置選擇三格與四格。",
    vocabularyTags: ["die Miete", "die Kaution", "der Mietvertrag"],
    grammarTags: ["雙向介系詞", "三格"],
    skillId: "B1.preposition.two_way",
    cefrDescriptor: "能理解租屋資訊，並描述物品的位置及移動方向。",
    prompt: "Wir helfen ___ Nachbarn beim Umzug.",
    answer: "dem",
  },
  {
    level: "B1",
    titleZhTw: "預約看診與描述症狀",
    titleDe: "Arzttermine und Beschwerden",
    categories: ["interaction", "vocabulary"],
    objective: "禮貌預約看診並描述常見症狀。",
    vocabularyTags: ["die Beschwerden", "der Termin", "seit gestern"],
    grammarTags: ["禮貌請求", "seit + 三格"],
    skillId: "B1.interaction.appointment",
    cefrDescriptor: "能在看診情境中交換必要資訊並說明常見症狀。",
    prompt: "Ich habe seit gestern ___ Kopfschmerzen.",
    answer: "starke",
  },
  {
    level: "B1",
    titleZhTw: "撰寫簡短求職信",
    titleDe: "Eine kurze Bewerbung schreiben",
    categories: ["writing", "exam_preparation"],
    objective: "使用正式稱謂、結尾與求職常見搭配。",
    vocabularyTags: ["sich bewerben um", "der Lebenslauf", "die Stelle"],
    grammarTags: ["正式信件格式", "反身動詞搭配"],
    skillId: "B1.writing.formal_email",
    cefrDescriptor: "能撰寫簡短、連貫且符合基本格式的正式電子郵件。",
    prompt: "Hiermit ___ ich mich um die Stelle.",
    answer: "bewerbe",
  },
  {
    level: "B1",
    titleZhTw: "表達意見與比較觀點",
    titleDe: "Meinungen vergleichen",
    categories: ["interaction", "writing"],
    objective: "清楚標示個人立場並比較兩個觀點。",
    vocabularyTags: ["meiner Meinung nach", "einerseits", "andererseits"],
    grammarTags: ["句子連接詞", "意見表達"],
    skillId: "B1.interaction.opinion",
    cefrDescriptor: "能就熟悉議題簡要說明自己的立場，並提出支持理由。",
    prompt: "Meiner Meinung ___ sollten Städte mehr Radwege bauen.",
    answer: "nach",
  },
  {
    level: "B2",
    titleZhTw: "建立論點、讓步與反駁",
    titleDe: "Argumente abwägen und entkräften",
    categories: ["writing", "interaction"],
    objective: "使用讓步結構引入並回應反方觀點。",
    vocabularyTags: ["zwar ... aber", "hingegen", "demgegenüber"],
    grammarTags: ["讓步結構", "篇章銜接"],
    skillId: "B2.argumentation.counterargument",
    cefrDescriptor: "能有系統地發展論點，凸顯重要觀點並回應相反意見。",
    prompt: "Die erste Lösung spart Zeit; die zweite ist ___ günstiger.",
    answer: "hingegen",
  },
  {
    level: "B2",
    titleZhTw: "正式職場溝通",
    titleDe: "Formell am Arbeitsplatz kommunizieren",
    categories: ["interaction", "writing"],
    objective: "在郵件中以正式語氣提出請求與替代方案。",
    vocabularyTags: ["bezüglich", "Rücksprache halten", "einen Vorschlag unterbreiten"],
    grammarTags: ["名詞化語體", "間接請求"],
    skillId: "B2.register.formal",
    cefrDescriptor: "能在專業情境中清楚交換複雜資訊，並維持合宜語域。",
    prompt: "___ Ihrer Anfrage habe ich intern Rücksprache gehalten.",
    answer: "Bezüglich",
  },
  {
    level: "C1",
    titleZhTw: "摘要研究主張與限制",
    titleDe: "Forschungspositionen präzise zusammenfassen",
    categories: ["reading", "mediation", "writing"],
    objective: "區分研究結果、推論與限制，並以中性語氣摘要。",
    vocabularyTags: ["die Befundlage", "einschränkend", "daraus ableiten"],
    grammarTags: ["報導式虛擬一式", "學術名詞化"],
    skillId: "C1.writing.academic_summary",
    cefrDescriptor: "能理解複雜文本的隱含立場，並摘要重要資訊。",
    prompt: "Zusammenfassend ___ sich festhalten, dass weitere Daten nötig sind.",
    answer: "lässt",
  },
  {
    level: "C2",
    titleZhTw: "辨識反諷與語域轉換",
    titleDe: "Ironie und Registerwechsel erkennen",
    categories: ["reading", "mediation", "interaction"],
    objective: "從語境與措辭辨識反諷及語域轉換的效果。",
    vocabularyTags: ["mitnichten", "vermeintlich", "augenzwinkernd"],
    grammarTags: ["語用預設", "語域轉換"],
    skillId: "C2.pragmatics.irony",
    cefrDescriptor: "能辨識細微的風格差異、暗示及言外之意。",
    prompt: "Die Reform war ___ der große Wurf, als den man sie verkauft hatte.",
    answer: "mitnichten",
  },
];

const lessons = lessonDefinitions.map((definition, index) =>
  createLesson(definition, index, index === 0 ? firstLessonExercises : undefined),
);

export const mockCourseCatalog: CourseCatalog = {
  source: "mock",
  courses: [
    course(
      1,
      "B1",
      "日常獨立溝通",
      "Selbstständig im Alltag",
      "從生活情境建立可靠的 B1 溝通能力。",
      11,
      lessons.slice(0, 5),
    ),
    course(
      2,
      "B2",
      "職場論證與表達",
      "Argumentieren im Berufsleben",
      "練習有條理的論證與正式職場表達。",
      12,
      lessons.slice(5, 7),
    ),
    course(
      3,
      "C1",
      "學術摘要與立場",
      "Akademische Positionen",
      "精確處理學術文本的主張、證據與限制。",
      13,
      lessons.slice(7, 8),
    ),
    course(
      4,
      "C2",
      "語體、修辭與言外之意",
      "Stil, Rhetorik und Implikatur",
      "辨識高階文本中的反諷、語域與細緻語用效果。",
      14,
      lessons.slice(8, 9),
    ),
  ],
};

function baseExercise<TType extends FixedExercise["type"]>(
  value: number,
  level: CefrLevel,
  type: TType,
  title: string,
  promptDe: string,
): BaseExercise & { type: TType } {
  return {
    id: id(value),
    level,
    type,
    title,
    instructionZhTw: "依題目要求完成作答。",
    promptDe,
    skillIds: ["B1.word_order.subordinate_clause"],
    grammarTopicIds: [],
    vocabularyIds: [],
    estimatedSeconds: 45,
    difficulty: level === "B1" ? 2 : level === "B2" ? 3 : level === "C1" ? 4 : 5,
    sourceType: "human" as const,
    reviewStatus: "approved" as const,
    version: 1,
  };
}

function option(
  value: number,
  label: string,
  textDe: string,
  textZhTw: string | undefined,
  orderIndex: number,
) {
  return { id: id(value), label, textDe, textZhTw, orderIndex };
}

function createLesson(
  definition: LessonDefinition,
  index: number,
  exercises?: FixedExercise[],
): LessonContent {
  const exercise: FillBlankExercise = {
    ...baseExercise(
      201 + index,
      definition.level,
      "fill_blank",
      `${definition.titleZhTw}：填空`,
      definition.prompt,
    ),
    skillIds: [definition.skillId],
    answer: { acceptedAnswers: [definition.answer] },
    gradingPolicy,
  };
  const unitIndex = index < 5 ? 11 : index < 7 ? 12 : index === 7 ? 13 : 14;

  return {
    id: id(21 + index),
    unitId: id(unitIndex),
    level: definition.level,
    titleZhTw: definition.titleZhTw,
    estimatedMinutes: 18 + (index % 3) * 2,
    skillCategories: definition.categories,
    prerequisiteSkillIds: index === 0 ? [] : [definition.skillId],
    learningObjectives: [definition.objective],
    vocabularyTags: definition.vocabularyTags,
    grammarTags: definition.grammarTags,
    cefrDescriptor: definition.cefrDescriptor,
    status: "published",
    version: 1,
    activities: [
      {
        id: id(31 + index),
        lessonId: id(21 + index),
        titleZhTw: "理解與固定題型練習",
        type: "practice",
        orderIndex: 0,
        exercises: exercises ?? [exercise],
      },
    ],
  };
}

function course(
  value: number,
  level: CefrLevel,
  titleZhTw: string,
  titleDe: string,
  descriptionZhTw: string,
  unitValue: number,
  courseLessons: LessonContent[],
): CatalogCourse {
  return {
    id: id(value),
    level,
    titleZhTw,
    titleDe,
    descriptionZhTw,
    status: "published",
    version: 1,
    units: [
      {
        id: id(unitValue),
        courseId: id(value),
        titleZhTw: level === "B1" ? "單元 1：在德語環境中處理日常事務" : "示範單元",
        orderIndex: 0,
        status: "published",
        version: 1,
        lessons: courseLessons,
      },
    ],
  };
}
