import type { ContentStatus, ContentTeamRole, ReviewStatus } from "@deutschtrainer/shared-types";

const statusLabels: Record<ContentStatus | ReviewStatus | "pending" | "superseded", string> = {
  draft: "草稿",
  pending_review: "待審核",
  approved: "已核准",
  published: "已發布",
  rejected: "已退回",
  archived: "已封存",
  pending: "待審核",
  superseded: "已取代",
};

export const roleLabels: Record<ContentTeamRole, string> = {
  content_editor: "內容編輯",
  reviewer: "內容審核",
  admin: "系統管理員",
};

export function StatusBadge({ status }: { status: keyof typeof statusLabels }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span aria-hidden="true" className="status-dot" />
      {statusLabels[status]}
    </span>
  );
}

export function formatAdminDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="field-error">{message}</p> : null;
}
