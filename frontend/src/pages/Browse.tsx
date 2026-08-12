import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { listAgents } from "../api/agents";
import type { AgentSort } from "../api/types";
import Avatar from "../components/Avatar";
import Pagination from "../components/Pagination";
import VisibilityBadge from "../components/VisibilityBadge";
import { useFormatters } from "../lib/relativeTime";

const SORT_OPTIONS: { value: AgentSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name (A–Z)" },
];

export default function Browse() {
  const { t } = useTranslation();
  const { formatRelativeTime } = useFormatters();
  const [scope, setScope] = useState<"public" | "all">("public");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<AgentSort>("newest");
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

  function updateFilter<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setOffset(0);
    };
  }

  const { data, isLoading } = useQuery({
    queryKey: ["agents", "browse", scope, q, sort, limit, offset],
    queryFn: () =>
      listAgents({
        q: q || undefined,
        sort,
        visibility: scope === "public" ? "public" : undefined,
        limit,
        offset,
      }),
  });

  const visible = data?.items ?? [];

  return (
    <div>
      <h1 style={{ fontSize: "var(--p-text-xl)", fontWeight: 700, margin: "0 0 4px" }}>Browse</h1>
      <p style={{ color: "var(--fg-muted)", fontSize: "var(--p-text-sm)", margin: "0 0 var(--p-space-2)" }}>
        {t("browse.description")}
      </p>

      <div className="filter-bar">
        <div className="toggle-group">
          <button
            type="button"
            className={`toggle-btn ${scope === "public" ? "active" : ""}`}
            onClick={() => updateFilter(setScope)("public")}
          >
            Public
          </button>
          <button
            type="button"
            className={`toggle-btn ${scope === "all" ? "active" : ""}`}
            onClick={() => updateFilter(setScope)("all")}
          >
            {t("browse.allVisible")}
          </button>
        </div>
        <div className="filter-search">
          <Search size={16} />
          <input
            className="filter-input"
            placeholder="Search agents…"
            value={q}
            onChange={(event) => updateFilter(setQ)(event.target.value)}
          />
        </div>
        <select className="filter-select" value={sort} onChange={(event) => updateFilter(setSort)(event.target.value as AgentSort)}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <div className="loading-state">Loading…</div>}

      {!isLoading && visible.length === 0 && <div className="empty-state">{t("browse.empty")}</div>}

      {!isLoading && visible.length > 0 && (
        <div className="agent-grid">
          {visible.map((agent) => (
            <Link key={agent.id} to={`/agents/${agent.slug}`} className="card agent-card">
              <div className="agent-card-header">
                <Avatar name={agent.name} />
                <span className="agent-card-title">{agent.name}</span>
                <VisibilityBadge visibility={agent.visibility} />
              </div>
              <div className="agent-card-slug">{agent.slug}</div>
              {agent.description && <p className="agent-card-description">{agent.description}</p>}
              <div className="agent-card-footer">
                {agent.provider && <span>{agent.provider}</span>}
                <span>Updated {formatRelativeTime(agent.updated_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {data && (
        <Pagination total={data.total} limit={data.limit} offset={offset} onOffsetChange={setOffset} onLimitChange={setLimit} />
      )}
    </div>
  );
}
