"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FilePlus2, LoaderCircle, Save, Send, Upload } from "lucide-react";
import {
  EXERCISE_TYPES,
  SUPPORTED_LEVELS,
  type CefrLevel,
  type ContentTeamRole,
  type ExerciseType,
} from "@deutschtrainer/shared-types";
import type { AdminExerciseDraft } from "@deutschtrainer/validation";
import type { AdminRepository } from "../lib/adminRepository";
import type {
  ActivityRow,
  ContentVersionRow,
  ExerciseDetail,
  ExerciseRow,
} from "../lib/adminTypes";
import { EmptyState, StatusBadge, formatAdminDate } from "./AdminUi";

interface ExerciseManagerProps {
  repository: AdminRepository;
  activities: ActivityRow[];
  exercises: ExerciseRow[];
  versions: ContentVersionRow[];
  role: ContentTeamRole;
  busy: boolean;
  onSave(input: {
    exerciseId?: string;
    expectedVersion?: number;
    draft: AdminExerciseDraft;
    changeSummary: string;
  }): Promise<void>;
  onSubmitReview(exercise: ExerciseRow, notes: string): Promise<void>;
  onPublish(exercise: ExerciseRow): Promise<void>;
}

interface ExerciseFormState {
  activityId: string;
  level: CefrLevel;
  type: ExerciseType;
  title: string;
  instructionZhTw: string;
  promptDe: string;
  skillIds: string;
  grammarTopicIds: string;
  vocabularyIds: string;
  estimatedSeconds: string;
  difficulty: string;
  orderIndex: string;
  sourceType: "human" | "ai_assisted";
  payloadJson: string;
  optionsJson: string;
  answerJson: string;
  gradingPolicyJson: string;
  explanationZhTw: string;
  changeSummary: string;
  reviewNotes: string;
}

export function ExerciseManager(props: ExerciseManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(props.exercises[0]?.id ?? null);
  const selected = props.exercises.find((exercise) => exercise.id === selectedId);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [form, setForm] = useState<ExerciseFormState>(() => createEmptyForm(props.activities[0]));
  const canEdit = props.role === "content_editor" || props.role === "admin";

  useEffect(() => {
    let active = true;
    if (!selectedId) {
      setForm(createEmptyForm(props.activities[0]));
      return () => {
        active = false;
      };
    }
    setLoadingDetail(true);
    void props.repository
      .getExerciseDetail(selectedId)
      .then((value) => {
        if (active) {
          setForm(createFormFromDetail(value));
        }
      })
      .finally(() => {
        if (active) {
          setLoadingDetail(false);
        }
      });
    return () => {
      active = false;
    };
  }, [props.repository, props.activities, selectedId]);

  const exerciseVersions = useMemo(
    () =>
      props.versions.filter(
        (version) => version.entity_type === "exercise" && version.entity_id === selected?.id,
      ),
    [props.versions, selected?.id],
  );

  function update<K extends keyof ExerciseFormState>(key: K, value: ExerciseFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const options = normalizeOptions(parseArray(form.optionsJson, "選項 JSON"));
    let answerJson = parseObject(form.answerJson, "答案 JSON");
    if (form.type === "multiple_choice") {
      answerJson = { optionId: options.find((option) => option.isCorrect)?.id ?? "" };
    }
    await props.onSave({
      ...(selected ? { exerciseId: selected.id, expectedVersion: selected.version } : {}),
      draft: {
        activityId: form.activityId,
        level: form.level,
        type: form.type,
        title: form.title,
        instructionZhTw: form.instructionZhTw,
        promptDe: form.promptDe,
        payloadJson: parseObject(form.payloadJson, "題型 payload JSON"),
        skillIds: splitList(form.skillIds),
        grammarTopicIds: splitList(form.grammarTopicIds),
        vocabularyIds: splitList(form.vocabularyIds),
        estimatedSeconds: Number(form.estimatedSeconds),
        difficulty: Number(form.difficulty),
        sourceType: form.sourceType,
        orderIndex: Number(form.orderIndex),
        options,
        answerJson,
        gradingPolicyJson: parseObject(form.gradingPolicyJson, "批改規則 JSON"),
        explanationZhTw: form.explanationZhTw,
      },
      changeSummary: form.changeSummary,
    });
  }

  return (
    <div className="split-workspace wide-list">
      <section className="list-pane">
        <div className="section-heading compact-heading">
          <div>
            <p className="section-kicker">Exercises</p>
            <h2>題目</h2>
          </div>
          {canEdit ? (
            <button
              className="button button-secondary"
              onClick={() => setSelectedId(null)}
              type="button"
            >
              <FilePlus2 size={16} />
              新增
            </button>
          ) : null}
        </div>
        <div className="record-list" role="list">
          {props.exercises.map((exercise) => (
            <button
              className={`record-row exercise-record${selectedId === exercise.id ? " selected" : ""}`}
              key={exercise.id}
              onClick={() => setSelectedId(exercise.id)}
              role="listitem"
              type="button"
            >
              <span className="level-square">{exercise.level}</span>
              <span className="record-copy">
                <strong>{exercise.title}</strong>
                <small>
                  {exercise.type} · v{exercise.version}
                </small>
              </span>
              <StatusBadge status={exercise.status} />
            </button>
          ))}
        </div>
      </section>

      <section className="editor-pane">
        <div className="section-heading compact-heading">
          <div>
            <p className="section-kicker">
              {selected ? `${selected.type} · Version ${selected.version}` : "New exercise"}
            </p>
            <h2>{selected?.title ?? "新增題目"}</h2>
          </div>
          {selected ? <StatusBadge status={selected.status} /> : null}
        </div>
        {loadingDetail ? (
          <div className="loading-block">
            <LoaderCircle className="spin" size={20} />
            讀取題目
          </div>
        ) : (
          <form className="editor-form" onSubmit={handleSubmit}>
            <div className="form-grid two-columns">
              <label>
                活動
                <select
                  disabled={!canEdit}
                  onChange={(event) => {
                    const activity = props.activities.find(
                      (item) => item.id === event.target.value,
                    );
                    setForm((current) => ({
                      ...current,
                      activityId: event.target.value,
                      level: activity?.level ?? current.level,
                    }));
                  }}
                  required
                  value={form.activityId}
                >
                  {props.activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.level} · {activity.lessonTitleZhTw} / {activity.title_zh_tw}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                題型
                <select
                  disabled={!canEdit}
                  onChange={(event) => update("type", event.target.value as ExerciseType)}
                  value={form.type}
                >
                  {EXERCISE_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label>
                程度
                <select
                  disabled={!canEdit}
                  onChange={(event) => update("level", event.target.value as CefrLevel)}
                  value={form.level}
                >
                  {SUPPORTED_LEVELS.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </label>
              <label>
                順序
                <input
                  disabled={!canEdit}
                  min={0}
                  onChange={(event) => update("orderIndex", event.target.value)}
                  required
                  type="number"
                  value={form.orderIndex}
                />
              </label>
            </div>
            <label>
              題目名稱
              <input
                disabled={!canEdit}
                maxLength={120}
                onChange={(event) => update("title", event.target.value)}
                required
                value={form.title}
              />
            </label>
            <label>
              繁中指示
              <textarea
                disabled={!canEdit}
                maxLength={300}
                onChange={(event) => update("instructionZhTw", event.target.value)}
                required
                rows={2}
                value={form.instructionZhTw}
              />
            </label>
            <label>
              德文題幹
              <textarea
                disabled={!canEdit}
                maxLength={1000}
                onChange={(event) => update("promptDe", event.target.value)}
                required
                rows={3}
                value={form.promptDe}
              />
            </label>
            <div className="form-grid three-columns">
              <label>
                預估秒數
                <input
                  disabled={!canEdit}
                  min={1}
                  onChange={(event) => update("estimatedSeconds", event.target.value)}
                  type="number"
                  value={form.estimatedSeconds}
                />
              </label>
              <label>
                難度
                <input
                  disabled={!canEdit}
                  max={5}
                  min={1}
                  onChange={(event) => update("difficulty", event.target.value)}
                  type="number"
                  value={form.difficulty}
                />
              </label>
              <label>
                內容來源
                <select
                  disabled={!canEdit}
                  onChange={(event) =>
                    update("sourceType", event.target.value as "human" | "ai_assisted")
                  }
                  value={form.sourceType}
                >
                  <option value="human">人工</option>
                  <option value="ai_assisted">AI 協作</option>
                </select>
              </label>
            </div>
            <label>
              技能代碼（逗號分隔）
              <input
                disabled={!canEdit}
                onChange={(event) => update("skillIds", event.target.value)}
                required
                value={form.skillIds}
              />
            </label>
            <div className="form-grid two-columns">
              <label>
                文法主題 ID
                <textarea
                  className="code-input"
                  disabled={!canEdit}
                  onChange={(event) => update("grammarTopicIds", event.target.value)}
                  rows={2}
                  value={form.grammarTopicIds}
                />
              </label>
              <label>
                單字 ID
                <textarea
                  className="code-input"
                  disabled={!canEdit}
                  onChange={(event) => update("vocabularyIds", event.target.value)}
                  rows={2}
                  value={form.vocabularyIds}
                />
              </label>
            </div>
            <details className="json-section" open={form.type === "multiple_choice"}>
              <summary>題型資料與答案</summary>
              <label>
                Payload JSON
                <textarea
                  className="code-input"
                  disabled={!canEdit}
                  onChange={(event) => update("payloadJson", event.target.value)}
                  rows={4}
                  value={form.payloadJson}
                />
              </label>
              <label>
                選項 JSON
                <textarea
                  className="code-input"
                  disabled={!canEdit}
                  onChange={(event) => update("optionsJson", event.target.value)}
                  rows={8}
                  value={form.optionsJson}
                />
              </label>
              <label>
                答案 JSON
                <textarea
                  className="code-input"
                  disabled={!canEdit}
                  onChange={(event) => update("answerJson", event.target.value)}
                  rows={4}
                  value={form.answerJson}
                />
              </label>
              <label>
                批改規則 JSON
                <textarea
                  className="code-input"
                  disabled={!canEdit}
                  onChange={(event) => update("gradingPolicyJson", event.target.value)}
                  rows={5}
                  value={form.gradingPolicyJson}
                />
              </label>
            </details>
            <label>
              繁中解釋
              <textarea
                disabled={!canEdit}
                onChange={(event) => update("explanationZhTw", event.target.value)}
                rows={3}
                value={form.explanationZhTw}
              />
            </label>
            <label>
              變更摘要
              <input
                disabled={!canEdit}
                onChange={(event) => update("changeSummary", event.target.value)}
                value={form.changeSummary}
              />
            </label>
            {canEdit ? (
              <div className="command-row">
                <button className="button button-primary" disabled={props.busy} type="submit">
                  <Save size={16} />
                  保存草稿
                </button>
              </div>
            ) : null}
          </form>
        )}

        {selected ? (
          <div className="workflow-bar">
            <label>
              審核備註
              <input
                onChange={(event) => update("reviewNotes", event.target.value)}
                value={form.reviewNotes}
              />
            </label>
            <div className="command-row">
              {canEdit && (selected.status === "draft" || selected.status === "rejected") ? (
                <button
                  className="button button-secondary"
                  disabled={props.busy}
                  onClick={() => props.onSubmitReview(selected, form.reviewNotes)}
                  type="button"
                >
                  <Send size={16} />
                  送出審核
                </button>
              ) : null}
              {props.role === "admin" && selected.status === "approved" ? (
                <button
                  className="button button-publish"
                  disabled={props.busy}
                  onClick={() => props.onPublish(selected)}
                  type="button"
                >
                  <Upload size={16} />
                  發布
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="version-section">
          <h3>版本紀錄</h3>
          {exerciseVersions.length === 0 ? (
            <EmptyState>尚無版本紀錄</EmptyState>
          ) : (
            <div className="version-list">
              {exerciseVersions.map((version) => (
                <div className="version-row" key={version.id}>
                  <strong>v{version.version}</strong>
                  <span>{version.change_summary || "未填寫摘要"}</span>
                  <time>{formatAdminDate(version.created_at)}</time>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function createEmptyForm(activity?: ActivityRow): ExerciseFormState {
  return {
    activityId: activity?.id ?? "",
    level: activity?.level ?? "B1",
    type: "multiple_choice",
    title: "",
    instructionZhTw: "請選出正確答案。",
    promptDe: "",
    skillIds: "",
    grammarTopicIds: "",
    vocabularyIds: "",
    estimatedSeconds: "60",
    difficulty: "3",
    orderIndex: "0",
    sourceType: "human",
    payloadJson: "{}",
    optionsJson: JSON.stringify(
      [
        { label: "A", textDe: "", textZhTw: "", isCorrect: true },
        { label: "B", textDe: "", textZhTw: "", isCorrect: false },
      ],
      null,
      2,
    ),
    answerJson: "{}",
    gradingPolicyJson: JSON.stringify(
      {
        caseSensitive: false,
        ignorePunctuation: true,
        normalizeGermanCharacters: true,
        allowPartialCredit: false,
        acceptedAlternatives: [],
      },
      null,
      2,
    ),
    explanationZhTw: "",
    changeSummary: "",
    reviewNotes: "",
  };
}

function createFormFromDetail(detail: ExerciseDetail): ExerciseFormState {
  const exercise = detail.exercise;
  return {
    activityId: exercise.activity_id,
    level: exercise.level,
    type: exercise.type,
    title: exercise.title,
    instructionZhTw: exercise.instruction_zh_tw,
    promptDe: exercise.prompt_de,
    skillIds: exercise.skill_ids.join(", "),
    grammarTopicIds: exercise.grammar_topic_ids.join(", "),
    vocabularyIds: exercise.vocabulary_ids.join(", "),
    estimatedSeconds: String(exercise.estimated_seconds),
    difficulty: String(exercise.difficulty),
    orderIndex: String(exercise.order_index),
    sourceType: exercise.source_type === "human" ? "human" : "ai_assisted",
    payloadJson: JSON.stringify(exercise.payload_json, null, 2),
    optionsJson: JSON.stringify(
      detail.options.map((option) => ({
        id: option.id,
        label: option.label,
        textDe: option.text_de,
        textZhTw: option.text_zh_tw ?? "",
        orderIndex: option.order_index,
        isCorrect: option.is_correct,
        metadataJson: option.metadata_json,
      })),
      null,
      2,
    ),
    answerJson: JSON.stringify(detail.answer.answer_json, null, 2),
    gradingPolicyJson: JSON.stringify(detail.answer.grading_policy_json, null, 2),
    explanationZhTw: detail.answer.explanation_zh_tw,
    changeSummary: "",
    reviewNotes: "",
  };
}

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseObject(value: string, label: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} 必須是物件。`);
  }
  return parsed as Record<string, unknown>;
}

function parseArray(value: string, label: string): unknown[] {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`${label} 必須是陣列。`);
  }
  return parsed;
}

function normalizeOptions(values: unknown[]): AdminExerciseDraft["options"] {
  return values.map((value, index) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("每個選項都必須是物件。");
    }
    const option = value as Record<string, unknown>;
    return {
      id: typeof option.id === "string" ? option.id : crypto.randomUUID(),
      label: String(option.label ?? String.fromCharCode(65 + index)),
      textDe: String(option.textDe ?? ""),
      ...(option.textZhTw ? { textZhTw: String(option.textZhTw) } : {}),
      orderIndex: typeof option.orderIndex === "number" ? option.orderIndex : index,
      isCorrect: option.isCorrect === true,
      metadataJson:
        typeof option.metadataJson === "object" &&
        option.metadataJson !== null &&
        !Array.isArray(option.metadataJson)
          ? (option.metadataJson as Record<string, unknown>)
          : {},
    };
  });
}
