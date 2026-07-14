"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Bot, LoaderCircle, Sparkles } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import type { AiGeneratedExerciseType, ContentTeamRole } from "@deutschtrainer/shared-types";
import type { GenerateExerciseDraftResponse } from "@deutschtrainer/validation";
import type { AdminRepository } from "../lib/adminRepository";
import type { ActivityRow, ExerciseRow, GenerationJobRow } from "../lib/adminTypes";
import { EmptyState, formatAdminDate } from "./AdminUi";

export function AiDraftManager({
  repository,
  session,
  role,
  activities,
  exercises,
  jobs,
  busy,
  onRun,
  onCompleted,
}: {
  repository: AdminRepository;
  session: Session;
  role: ContentTeamRole;
  activities: ActivityRow[];
  exercises: ExerciseRow[];
  jobs: GenerationJobRow[];
  busy: boolean;
  onRun<T>(action: () => Promise<T>): Promise<T>;
  onCompleted(): Promise<void>;
}) {
  const [activityId, setActivityId] = useState(activities[0]?.id ?? "");
  const [type, setType] = useState<AiGeneratedExerciseType>("multiple_choice");
  const [topicZhTw, setTopicZhTw] = useState("");
  const [skillIds, setSkillIds] = useState("");
  const [instructionsZhTw, setInstructionsZhTw] = useState("");
  const [result, setResult] = useState<GenerateExerciseDraftResponse | null>(null);
  const activity = activities.find((item) => item.id === activityId);
  const orderIndex = useMemo(
    () =>
      exercises
        .filter((exercise) => exercise.activity_id === activityId)
        .reduce((maximum, exercise) => Math.max(maximum, exercise.order_index + 1), 0),
    [exercises, activityId],
  );
  const canGenerate = role === "content_editor" || role === "admin";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const generated = await onRun(() =>
      repository.generateExerciseDraft(session, {
        activityId,
        level: activity?.level ?? "B1",
        type,
        topicZhTw,
        targetSkillIds: skillIds
          .split(/[,\n]/u)
          .map((item) => item.trim())
          .filter(Boolean),
        instructionsZhTw,
        orderIndex,
        idempotencyKey: `admin-generation-${crypto.randomUUID()}`,
      }),
    );
    setResult(generated);
    await onCompleted();
  }

  if (!canGenerate) {
    return (
      <section className="content-section">
        <EmptyState>
          <Bot size={20} />
          審核角色不可建立 AI 草稿
        </EmptyState>
      </section>
    );
  }

  return (
    <div className="workspace-stack">
      <section className="content-section generation-layout">
        <div className="section-heading">
          <div>
            <p className="section-kicker">AI draft</p>
            <h2>生成題目草稿</h2>
          </div>
          <span className="human-review-flag">
            <Sparkles size={15} />
            必須人工審核
          </span>
        </div>
        <form className="editor-form" onSubmit={handleSubmit}>
          <div className="form-grid two-columns">
            <label>
              目標活動
              <select
                onChange={(event) => setActivityId(event.target.value)}
                required
                value={activityId}
              >
                {activities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.level} · {item.lessonTitleZhTw} / {item.title_zh_tw}
                  </option>
                ))}
              </select>
            </label>
            <label>
              題型
              <select
                onChange={(event) => setType(event.target.value as AiGeneratedExerciseType)}
                value={type}
              >
                <option value="multiple_choice">單選題</option>
                <option value="fill_blank">填空題</option>
                <option value="error_correction">改錯題</option>
              </select>
            </label>
          </div>
          <label>
            主題
            <input
              maxLength={160}
              onChange={(event) => setTopicZhTw(event.target.value)}
              required
              value={topicZhTw}
            />
          </label>
          <label>
            目標技能代碼（逗號分隔）
            <input
              onChange={(event) => setSkillIds(event.target.value)}
              required
              value={skillIds}
            />
          </label>
          <label>
            編輯限制
            <textarea
              maxLength={1000}
              onChange={(event) => setInstructionsZhTw(event.target.value)}
              rows={4}
              value={instructionsZhTw}
            />
          </label>
          <div className="command-row">
            <button className="button button-primary" disabled={busy || !activityId} type="submit">
              {busy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}生成草稿
            </button>
          </div>
        </form>
        {result ? (
          <div className="generation-result">
            <div>
              <strong>{result.draft.titleZhTw}</strong>
              <span>
                {result.draft.type} · {result.sourceType}
              </span>
            </div>
            <p lang="de">{result.draft.promptDe}</p>
            <span className="human-review-flag">Draft · 未發布</span>
          </div>
        ) : null}
      </section>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Generation jobs</p>
            <h2>最近生成工作</h2>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>主題</th>
                <th>程度／題型</th>
                <th>狀態</th>
                <th>模型</th>
                <th>完成時間</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.topic_zh_tw}</td>
                  <td>
                    {job.level} · {job.exercise_type}
                  </td>
                  <td>
                    <span className={`job-status job-${job.status}`}>{job.status}</span>
                  </td>
                  <td>{job.model ?? "-"}</td>
                  <td>{formatAdminDate(job.completed_at ?? job.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
