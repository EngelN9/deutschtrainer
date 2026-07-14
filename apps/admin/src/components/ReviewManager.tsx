"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import type { ContentTeamRole } from "@deutschtrainer/shared-types";
import type { ContentReviewRow, ContentVersionRow } from "../lib/adminTypes";
import { EmptyState, StatusBadge, formatAdminDate } from "./AdminUi";

export function ReviewManager({
  reviews,
  versions,
  role,
  busy,
  onDecision,
}: {
  reviews: ContentReviewRow[];
  versions: ContentVersionRow[];
  role: ContentTeamRole;
  busy: boolean;
  onDecision(reviewId: string, decision: "approved" | "rejected", notes: string): Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(
    reviews.find((review) => review.status === "pending")?.id ?? reviews[0]?.id ?? null,
  );
  const [notes, setNotes] = useState("");
  const selected = reviews.find((review) => review.id === selectedId);
  const version = useMemo(
    () => versions.find((item) => item.id === selected?.content_version_id),
    [versions, selected?.content_version_id],
  );
  const canReview = role === "reviewer" || role === "admin";

  return (
    <div className="split-workspace">
      <section className="list-pane">
        <div className="section-heading compact-heading">
          <div>
            <p className="section-kicker">Review queue</p>
            <h2>審核工作</h2>
          </div>
          <span className="section-count">
            {reviews.filter((review) => review.status === "pending").length}
          </span>
        </div>
        {reviews.length === 0 ? (
          <EmptyState>目前沒有審核紀錄</EmptyState>
        ) : (
          <div className="record-list">
            {reviews.map((review) => (
              <button
                className={`record-row${review.id === selectedId ? " selected" : ""}`}
                key={review.id}
                onClick={() => {
                  setSelectedId(review.id);
                  setNotes(review.review_notes);
                }}
                type="button"
              >
                <span className="entity-square">
                  {review.entity_type === "course" ? "課" : "題"}
                </span>
                <span className="record-copy">
                  <strong>{review.entity_type === "course" ? "課程審核" : "題目審核"}</strong>
                  <small>
                    {review.entity_id.slice(0, 8)} · {formatAdminDate(review.created_at)}
                  </small>
                </span>
                <StatusBadge status={review.status} />
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="editor-pane">
        {!selected || !version ? (
          <EmptyState>選擇一筆審核工作</EmptyState>
        ) : (
          <>
            <div className="section-heading compact-heading">
              <div>
                <p className="section-kicker">Version {version.version}</p>
                <h2>{selected.entity_type === "course" ? "課程內容" : "題目內容"}</h2>
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <dl className="metadata-grid">
              <div>
                <dt>送審者</dt>
                <dd className="mono-cell">{selected.requested_by.slice(0, 8)}</dd>
              </div>
              <div>
                <dt>送審時間</dt>
                <dd>{formatAdminDate(selected.created_at)}</dd>
              </div>
              <div>
                <dt>來源</dt>
                <dd>{version.source_type}</dd>
              </div>
              <div>
                <dt>內容版本</dt>
                <dd>v{version.version}</dd>
              </div>
            </dl>
            <div className="review-note">
              <strong>送審備註</strong>
              <p>{selected.request_notes || "未填寫備註"}</p>
            </div>
            <details className="snapshot-panel" open>
              <summary>版本快照</summary>
              <pre>{JSON.stringify(version.snapshot_json, null, 2)}</pre>
            </details>
            {selected.status === "pending" && canReview ? (
              <div className="workflow-bar">
                <label>
                  審核意見
                  <textarea
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    value={notes}
                  />
                </label>
                <div className="command-row">
                  <button
                    className="button button-danger"
                    disabled={busy}
                    onClick={() => onDecision(selected.id, "rejected", notes)}
                    type="button"
                  >
                    <X size={16} />
                    退回
                  </button>
                  <button
                    className="button button-approve"
                    disabled={busy}
                    onClick={() => onDecision(selected.id, "approved", notes)}
                    type="button"
                  >
                    <Check size={16} />
                    核准
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
