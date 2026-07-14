"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FilePlus2, Save, Send, Upload } from "lucide-react";
import {
  SUPPORTED_LEVELS,
  type CefrLevel,
  type ContentTeamRole,
} from "@deutschtrainer/shared-types";
import type { AdminCourseDraft } from "@deutschtrainer/validation";
import type { ContentVersionRow, CourseRow } from "../lib/adminTypes";
import { EmptyState, StatusBadge, formatAdminDate } from "./AdminUi";

interface CourseManagerProps {
  courses: CourseRow[];
  versions: ContentVersionRow[];
  role: ContentTeamRole;
  busy: boolean;
  onSave(input: {
    courseId?: string;
    expectedVersion?: number;
    draft: AdminCourseDraft;
    changeSummary: string;
  }): Promise<void>;
  onSubmitReview(course: CourseRow, notes: string): Promise<void>;
  onPublish(course: CourseRow): Promise<void>;
}

export function CourseManager(props: CourseManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(props.courses[0]?.id ?? null);
  const selected = props.courses.find((course) => course.id === selectedId);
  const [level, setLevel] = useState<CefrLevel>(selected?.level ?? "B1");
  const [titleZhTw, setTitleZhTw] = useState(selected?.title_zh_tw ?? "");
  const [titleDe, setTitleDe] = useState(selected?.title_de ?? "");
  const [descriptionZhTw, setDescriptionZhTw] = useState(selected?.description_zh_tw ?? "");
  const [changeSummary, setChangeSummary] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const canEdit = props.role === "content_editor" || props.role === "admin";

  useEffect(() => {
    setLevel(selected?.level ?? "B1");
    setTitleZhTw(selected?.title_zh_tw ?? "");
    setTitleDe(selected?.title_de ?? "");
    setDescriptionZhTw(selected?.description_zh_tw ?? "");
    setChangeSummary("");
    setReviewNotes("");
  }, [selected]);

  const courseVersions = useMemo(
    () =>
      props.versions.filter(
        (version) => version.entity_type === "course" && version.entity_id === selected?.id,
      ),
    [props.versions, selected?.id],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await props.onSave({
      ...(selected ? { courseId: selected.id, expectedVersion: selected.version } : {}),
      draft: { level, titleZhTw, titleDe, descriptionZhTw },
      changeSummary,
    });
  }

  return (
    <div className="split-workspace">
      <section className="list-pane">
        <div className="section-heading compact-heading">
          <div>
            <p className="section-kicker">Courses</p>
            <h2>課程</h2>
          </div>
          {canEdit ? (
            <button
              className="button button-secondary"
              onClick={() => setSelectedId(null)}
              type="button"
            >
              <FilePlus2 size={16} aria-hidden="true" />
              新增
            </button>
          ) : null}
        </div>
        <div className="record-list" role="list">
          {props.courses.map((course) => (
            <button
              className={`record-row${selectedId === course.id ? " selected" : ""}`}
              key={course.id}
              onClick={() => setSelectedId(course.id)}
              role="listitem"
              type="button"
            >
              <span className="level-square">{course.level}</span>
              <span className="record-copy">
                <strong>{course.title_zh_tw}</strong>
                <small>{course.title_de}</small>
              </span>
              <StatusBadge status={course.status} />
            </button>
          ))}
        </div>
      </section>

      <section className="editor-pane">
        <div className="section-heading compact-heading">
          <div>
            <p className="section-kicker">
              {selected ? `Version ${selected.version}` : "New course"}
            </p>
            <h2>{selected ? selected.title_zh_tw : "新增課程"}</h2>
          </div>
          {selected ? <StatusBadge status={selected.status} /> : null}
        </div>

        <form className="editor-form" onSubmit={handleSubmit}>
          <div className="form-grid two-columns">
            <label>
              程度
              <select
                disabled={!canEdit}
                onChange={(event) => setLevel(event.target.value as CefrLevel)}
                value={level}
              >
                {SUPPORTED_LEVELS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              德文標題
              <input
                disabled={!canEdit}
                maxLength={120}
                onChange={(event) => setTitleDe(event.target.value)}
                required
                value={titleDe}
              />
            </label>
          </div>
          <label>
            繁中標題
            <input
              disabled={!canEdit}
              maxLength={120}
              onChange={(event) => setTitleZhTw(event.target.value)}
              required
              value={titleZhTw}
            />
          </label>
          <label>
            繁中說明
            <textarea
              disabled={!canEdit}
              maxLength={1000}
              onChange={(event) => setDescriptionZhTw(event.target.value)}
              required
              rows={4}
              value={descriptionZhTw}
            />
          </label>
          <label>
            變更摘要
            <input
              disabled={!canEdit}
              maxLength={240}
              onChange={(event) => setChangeSummary(event.target.value)}
              placeholder="例：調整課程定位與德文標題"
              value={changeSummary}
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

        {selected ? (
          <div className="workflow-bar">
            <label>
              審核備註
              <input onChange={(event) => setReviewNotes(event.target.value)} value={reviewNotes} />
            </label>
            <div className="command-row">
              {canEdit && (selected.status === "draft" || selected.status === "rejected") ? (
                <button
                  className="button button-secondary"
                  disabled={props.busy}
                  onClick={() => props.onSubmitReview(selected, reviewNotes)}
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
          {courseVersions.length === 0 ? (
            <EmptyState>尚無版本紀錄</EmptyState>
          ) : (
            <div className="version-list">
              {courseVersions.map((version) => (
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
