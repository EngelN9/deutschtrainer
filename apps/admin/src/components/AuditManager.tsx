import { ShieldCheck } from "lucide-react";
import type { ContentTeamRole } from "@deutschtrainer/shared-types";
import type { AuditLogRow } from "../lib/adminTypes";
import { EmptyState, formatAdminDate } from "./AdminUi";

export function AuditManager({ logs, role }: { logs: AuditLogRow[]; role: ContentTeamRole }) {
  if (role !== "admin") {
    return (
      <section className="content-section">
        <EmptyState>
          <ShieldCheck size={20} />
          發布紀錄僅限系統管理員
        </EmptyState>
      </section>
    );
  }
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Audit trail</p>
          <h2>內容操作紀錄</h2>
        </div>
        <span className="section-count">{logs.length}</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>操作</th>
              <th>內容</th>
              <th>版本</th>
              <th>操作者</th>
              <th>時間</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{auditActionLabel(log.action)}</td>
                <td>
                  {log.entity_type} · <span className="mono-cell">{log.entity_id.slice(0, 8)}</span>
                </td>
                <td>{readVersion(log.metadata_json)}</td>
                <td className="mono-cell">{log.actor_user_id?.slice(0, 8) ?? "system"}</td>
                <td>{formatAdminDate(log.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function auditActionLabel(action: string): string {
  return (
    (
      {
        "content.saved": "保存草稿",
        "content.review_requested": "送出審核",
        "content.review_approved": "核准內容",
        "content.review_rejected": "退回內容",
        "content.published": "發布內容",
        "content.ai_draft_created": "建立 AI 草稿",
      } as Record<string, string>
    )[action] ?? action
  );
}

function readVersion(metadata: Record<string, unknown>): string {
  const value = metadata.version;
  return typeof value === "number" ? `v${value}` : "-";
}
