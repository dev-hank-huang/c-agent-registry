import { useQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getAgentSummary } from "../api/admin";
import StatCard from "../components/StatCard";
import VisibilityBadge from "../components/VisibilityBadge";

// Aggregate/statistical view of the whole agent catalog — for row-by-row management
// (search, filter, transfer ownership), see Agents instead. No trend chart: unlike
// deletion/user activity, these numbers are point-in-time catalog composition, not
// event volume.
export default function AdminAgentSummary() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-agent-summary"],
    queryFn: getAgentSummary,
  });

  if (isLoading) return <div className="loading-state">Loading…</div>;
  if (error || !data) return <p style={{ color: "var(--status-danger-fg)" }}>You don't have permission to view the agent summary.</p>;

  const productionPercent = data.total > 0 ? Math.round((data.withProduction / data.total) * 100) : null;

  return (
    <div>
      <h1 style={{ fontSize: "var(--p-text-xl)", fontWeight: 700, margin: "0 0 4px" }}>{t("nav.agentSummary")}</h1>
      <p style={{ color: "var(--fg-muted)", fontSize: "var(--p-text-sm)", margin: "0 0 var(--p-space-4)" }}>
        <Trans i18nKey="adminAgentSummary.description">
          整體 agent catalog 的統計數據。要搜尋、篩選、或轉移特定 agent 的所有權，請見 <Link to="/admin/agents">Agents</Link>。
        </Trans>
      </p>

      <div className="stat-grid">
        <StatCard value={data.total} label="Total agents" to="/admin/agents" />
        <StatCard
          value={data.withProduction}
          label="With an active version"
          breakdown={productionPercent === null ? undefined : `${productionPercent}% of all agents`}
        />
        <StatCard value={data.withoutProduction} label="Without an active version" />
        <StatCard value={data.withoutAnyVersion} label="With zero versions" />
      </div>

      <h2 style={{ fontSize: "var(--p-text-lg)", fontWeight: 700, margin: "var(--p-space-6) 0 var(--p-space-2)" }}>By visibility</h2>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Visibility</th>
              <th style={{ textAlign: "right" }}>Agents</th>
            </tr>
          </thead>
          <tbody>
            {data.byVisibility.map((row) => (
              <tr key={row.visibility}>
                <td>
                  <VisibilityBadge visibility={row.visibility} />
                </td>
                <td style={{ textAlign: "right" }}>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
