import { useQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getReviewSummary } from "../api/reviews";
import Leaderboard from "../components/Leaderboard";
import StatCard from "../components/StatCard";
import TrendChart from "../components/TrendChart";

const COLOR_APPROVED = "var(--chart-good)";
const COLOR_REJECTED = "var(--chart-critical)";

// Aggregate/statistical view of review activity — for the working queue (approving/
// rejecting a specific pending request), see Review Queue instead.
export default function AdminReviewSummary() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-review-summary"],
    queryFn: getReviewSummary,
  });

  if (isLoading) return <div className="loading-state">Loading…</div>;
  if (error || !data) return <p style={{ color: "var(--status-danger-fg)" }}>You don't have permission to view the review summary.</p>;

  return (
    <div>
      <h1 style={{ fontSize: "var(--p-text-xl)", fontWeight: 700, margin: "0 0 4px" }}>{t("nav.reviewSummary")}</h1>
      <p style={{ color: "var(--fg-muted)", fontSize: "var(--p-text-sm)", margin: "0 0 var(--p-space-4)" }}>
        <Trans i18nKey="adminReviewSummary.description">
          整體審核活動的統計數據。要處理特定待審項目，請見 <Link to="/review-queue">Review Queue</Link>。
        </Trans>
      </p>

      <div className="stat-grid">
        <StatCard value={data.pendingCount} label="Pending reviews" to="/review-queue" />
        <StatCard value={data.totalApproved} label="Approved (all time)" />
        <StatCard value={data.totalRejected} label="Rejected (all time)" />
        <StatCard
          value={data.last30Days.approved + data.last30Days.rejected}
          label="Reviewed (last 30 days)"
          breakdown={`${data.last30Days.approved} approved · ${data.last30Days.rejected} rejected`}
        />
        <StatCard
          value={data.averageReviewTimeHours === null ? "—" : `${data.averageReviewTimeHours}h`}
          label="Avg. review time (last 30 days)"
        />
      </div>

      <TrendChart
        title="Review trend (last 30 days)"
        series={[
          { label: "Approved", color: COLOR_APPROVED, data: data.trends.approvedByDay },
          { label: "Rejected", color: COLOR_REJECTED, data: data.trends.rejectedByDay },
        ]}
      />

      <Leaderboard
        title="Top reviewers (all time)"
        items={data.topReviewers.map((reviewer) => ({
          key: reviewer.reviewerId,
          primary: reviewer.reviewerName,
          secondary: `${reviewer.total} review${reviewer.total === 1 ? "" : "s"} · ${reviewer.approved} approved · ${reviewer.rejected} rejected`,
        }))}
      />
    </div>
  );
}
