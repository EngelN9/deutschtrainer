import { Bot, BookOpen, CircleCheck, ClipboardCheck, FileQuestion } from "lucide-react";
import type { AdminWorkspaceData } from "../lib/adminTypes";
import { EmptyState, StatusBadge, formatAdminDate } from "./AdminUi";

export function AdminDashboard({ data }: { data: AdminWorkspaceData }) {
  const pendingReviews = data.reviews.filter((review) => review.status === "pending");
  const publishedCourses = data.courses.filter((course) => course.status === "published").length;
  const publishedExercises = data.exercises.filter(
    (exercise) => exercise.status === "published",
  ).length;
  const failedJobs = data.generationJobs.filter((job) => job.status === "failed").length;

  return (
    <div className="workspace-stack">
      <section className="metric-grid" aria-label="內容統計">
        <Metric
          icon={<BookOpen size={19} />}
          label="已發布課程"
          value={publishedCourses}
          detail={`共 ${data.courses.length} 門`}
        />
        <Metric
          icon={<FileQuestion size={19} />}
          label="已發布題目"
          value={publishedExercises}
          detail={`共 ${data.exercises.length} 題`}
        />
        <Metric
          icon={<ClipboardCheck size={19} />}
          label="待審核"
          value={pendingReviews.length}
          detail="課程與題目"
        />
        <Metric
          icon={<Bot size={19} />}
          label="AI 工作異常"
          value={failedJobs}
          detail={`最近 ${data.generationJobs.length} 筆`}
          tone={failedJobs > 0 ? "warning" : "success"}
        />
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Review queue</p>
            <h2>待審核內容</h2>
          </div>
          <span className="section-count">{pendingReviews.length}</span>
        </div>
        {pendingReviews.length === 0 ? (
          <EmptyState>
            <CircleCheck size={20} aria-hidden="true" />
            目前沒有待審核內容
          </EmptyState>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>類型</th>
                  <th>內容 ID</th>
                  <th>狀態</th>
                  <th>送出時間</th>
                </tr>
              </thead>
              <tbody>
                {pendingReviews.slice(0, 8).map((review) => (
                  <tr key={review.id}>
                    <td>{review.entity_type === "course" ? "課程" : "題目"}</td>
                    <td className="mono-cell">{review.entity_id.slice(0, 8)}</td>
                    <td>
                      <StatusBadge status="pending" />
                    </td>
                    <td>{formatAdminDate(review.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Recent changes</p>
            <h2>最近內容版本</h2>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>類型</th>
                <th>版本</th>
                <th>變更摘要</th>
                <th>來源</th>
                <th>建立時間</th>
              </tr>
            </thead>
            <tbody>
              {data.versions.slice(0, 8).map((version) => (
                <tr key={version.id}>
                  <td>{version.entity_type === "course" ? "課程" : "題目"}</td>
                  <td>v{version.version}</td>
                  <td>{version.change_summary || "未填寫摘要"}</td>
                  <td>
                    {version.source_type === "ai_generated"
                      ? "AI 草稿"
                      : version.source_type === "ai_assisted"
                        ? "AI 協作"
                        : "人工"}
                  </td>
                  <td>{formatAdminDate(version.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  tone?: "neutral" | "warning" | "success";
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}
