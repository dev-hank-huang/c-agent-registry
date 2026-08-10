import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getUserSummary } from "../api/admin";
import Leaderboard from "../components/Leaderboard";
import StatCard from "../components/StatCard";
import TrendChart from "../components/TrendChart";

const COLOR_CREATED = "var(--chart-good)";
const COLOR_DELETED = "var(--chart-critical)";

// Aggregate/statistical view of user-management activity — for row-by-row actions
// (edit role, toggle active/disabled, delete), see Users instead.
export default function AdminUserSummary() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-user-summary"],
    queryFn: getUserSummary,
  });

  if (isLoading) return <div className="loading-state">Loading…</div>;
  if (error || !data) return <p style={{ color: "var(--status-danger-fg)" }}>You don't have permission to view the user summary.</p>;

  return (
    <div>
      <h1 style={{ fontSize: "var(--p-text-xl)", fontWeight: 700, margin: "0 0 4px" }}>User Summary</h1>
      <p style={{ color: "var(--fg-muted)", fontSize: "var(--p-text-sm)", margin: "0 0 var(--p-space-4)" }}>
        整體使用者帳號的統計數據。要編輯角色、切換 active/disabled、或刪除帳號，請見 <Link to="/admin/users">Users</Link>。
      </p>

      <div className="stat-grid">
        <StatCard value={data.totalUsers} label="Total users" to="/admin/users" />
        <StatCard value={data.activeCount} label="Active" />
        <StatCard value={data.disabledCount} label="Disabled" />
        <StatCard value={data.usersWithoutAgents} label="Active users without agents" />
        <StatCard
          value={data.byRole.admin + data.byRole.reviewer + data.byRole.member}
          label="By role"
          breakdown={`${data.byRole.admin} admin · ${data.byRole.reviewer} reviewer · ${data.byRole.member} member`}
        />
      </div>

      <TrendChart
        title="Account activity (last 30 days)"
        series={[
          { label: "Created", color: COLOR_CREATED, data: data.trends.createdByDay },
          { label: "Deleted", color: COLOR_DELETED, data: data.trends.deletedByDay },
        ]}
      />

      <Leaderboard
        title="Top agent owners (by live agent count)"
        items={data.topAgentOwners.map((owner) => ({
          key: owner.userId,
          primary: owner.userName,
          secondary: `owns ${owner.agentCount} agent${owner.agentCount === 1 ? "" : "s"}`,
        }))}
      />

      <Leaderboard
        title="Most active reviewers (all time)"
        items={data.topReviewers.map((reviewer) => ({
          key: reviewer.userId,
          primary: reviewer.userName,
          secondary: `acted on ${reviewer.reviewCount} review${reviewer.reviewCount === 1 ? "" : "s"}`,
        }))}
      />
    </div>
  );
}
