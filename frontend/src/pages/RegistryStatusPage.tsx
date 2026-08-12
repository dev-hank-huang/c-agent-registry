import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { getRegistryOverview, triggerResync } from "../api/registry";
import type { RegistrySource } from "../api/types";
import StatCard from "../components/StatCard";
import { useFormatters } from "../lib/relativeTime";

export interface RegistryStatusPageProps {
  source: RegistrySource;
  title: string;
  description: string;
  itemLabel: string; // e.g. "tools", "models", "skills", "templates"
}

// Shared by all four Registry pages (Agent Templates / MCP Registry / Model Registry
// / SkillHub Registry) — identically shaped read-only status + item list + manual
// re-sync, so one component renders all four instead of four near-duplicate files.
// See api/registry.ts's PLACEHOLDER note: real data arrives once the actual sync
// integration is wired in; until then every source legitimately reports zero items.
export default function RegistryStatusPage({ source, title, description, itemLabel }: RegistryStatusPageProps) {
  const queryClient = useQueryClient();
  const { formatRelativeTime, formatDateTime } = useFormatters();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-registry", source],
    queryFn: () => getRegistryOverview(source),
  });

  const resyncMutation = useMutation({
    mutationFn: () => triggerResync(source),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-registry", source] }),
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "var(--p-text-xl)", fontWeight: 700, margin: "0 0 4px" }}>{title}</h1>
          <p style={{ color: "var(--fg-muted)", fontSize: "var(--p-text-sm)", margin: "0 0 var(--p-space-2)", maxWidth: 640 }}>
            {description}
          </p>
        </div>
        <button
          type="button"
          className="pagination-btn"
          disabled={resyncMutation.isPending}
          onClick={() => resyncMutation.mutate()}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={14} className={resyncMutation.isPending ? "spin" : undefined} />
          Re-sync now
        </button>
      </div>

      {isLoading && <div className="loading-state">Loading…</div>}

      {!isLoading && data && (
        <>
          <div className="stat-grid">
            <StatCard value={data.status.total_count} label={`Total ${itemLabel}`} />
            <StatCard
              value={data.status.last_synced_at ? formatRelativeTime(data.status.last_synced_at) : "Never"}
              label="Last synced"
              breakdown={data.status.last_synced_at ? formatDateTime(data.status.last_synced_at) : undefined}
            />
            <StatCard value={data.status.consecutive_failures} label="Consecutive sync failures" />
            <StatCard value={data.status.stale_count} label="Stale items" />
          </div>

          {data.items.length === 0 ? (
            <div className="empty-state">
              {data.status.last_synced_at
                ? `No ${itemLabel} mirrored yet.`
                : `Not synced yet — the external ${title} integration hasn't run. Click "Re-sync now" once it's connected.`}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Version</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th className="col-nowrap">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td style={{ color: "var(--fg-muted)" }}>{item.version ?? "—"}</td>
                      <td style={{ color: "var(--fg-muted)" }}>{item.category ?? "—"}</td>
                      <td>
                        {item.deprecated ? (
                          <span className="badge badge-danger">deprecated</span>
                        ) : (
                          <span className="badge badge-success">current</span>
                        )}
                      </td>
                      <td className="col-nowrap" style={{ color: "var(--fg-subtle)" }}>
                        {item.last_seen_at ? formatRelativeTime(item.last_seen_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
