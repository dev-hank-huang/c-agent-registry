import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Search, X } from "lucide-react";
import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { listAdminAgents, transferOwner } from "../api/admin";
import type { AgentSort } from "../api/types";
import { listUsers } from "../api/users";
import Pagination from "../components/Pagination";
import VisibilityBadge from "../components/VisibilityBadge";

const SORT_OPTIONS: { value: AgentSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name (A–Z)" },
];

// Every agent across every owner, admin-scoped — distinct from Browse (visibility-
// scoped) and My Agents (ownership-scoped). For the soft-deleted/permanent-deletion
// queue, see Deleted Agents (not yet built).
export default function AdminAgents() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<AgentSort>("newest");
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [transferringSlug, setTransferringSlug] = useState<string | null>(null);
  const [newOwnerId, setNewOwnerId] = useState("");
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateFilter<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setOffset(0);
    };
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin-agents", q, sort, limit, offset],
    queryFn: () => listAdminAgents({ q: q || undefined, sort, limit, offset }),
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users-picker"],
    queryFn: () => listUsers({ status: "active", limit: 100 }),
  });
  const candidates = users?.items ?? [];

  function startTransfer(slug: string) {
    setTransferringSlug(slug);
    setNewOwnerId("");
    setError(null);
  }

  function cancelTransfer() {
    setTransferringSlug(null);
    setNewOwnerId("");
  }

  async function confirmTransfer(slug: string) {
    if (!newOwnerId) {
      setError("Choose a user to transfer ownership to.");
      return;
    }
    setBusySlug(slug);
    setError(null);
    try {
      await transferOwner(slug, newOwnerId);
      cancelTransfer();
      await queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
    } catch {
      setError("Failed to transfer ownership of this agent.");
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: "var(--p-text-xl)", fontWeight: 700, margin: "0 0 4px" }}>
        Agents {data && <span className="badge">{data.total} total</span>}
      </h1>
      <p style={{ color: "var(--fg-muted)", fontSize: "var(--p-text-sm)", margin: "0 0 var(--p-space-2)" }}>
        每一個 agent，不分 public/private，跨所有 owner。
      </p>

      <div className="filter-bar">
        <div className="filter-search">
          <Search size={16} />
          <input
            className="filter-input"
            placeholder="Search name or description…"
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

      {error && <p style={{ color: "var(--status-danger-fg)", fontSize: "var(--p-text-sm)" }}>{error}</p>}

      {isLoading && <div className="loading-state">Loading…</div>}
      {!isLoading && data && data.items.length === 0 && <div className="empty-state">No agents match these filters.</div>}

      {!isLoading && data && data.items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th>Transfer</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Visibility</th>
                <th>Owner</th>
                <th className="col-nowrap">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((agent, index) => {
                const isTransferring = transferringSlug === agent.slug;
                const transferCandidates = candidates.filter((u) => u.id !== agent.owner_id);
                return (
                  <Fragment key={agent.id}>
                    <tr>
                      <td className="col-num">{offset + index + 1}</td>
                      <td>
                        <button
                          type="button"
                          className="pagination-btn"
                          disabled={busySlug === agent.slug}
                          onClick={() => (isTransferring ? cancelTransfer() : startTransfer(agent.slug))}
                          title={isTransferring ? "Cancel" : "Transfer owner"}
                        >
                          {isTransferring ? <X size={14} /> : <ArrowRightLeft size={14} />}
                        </button>
                      </td>
                      <td>
                        <Link to={`/agents/${agent.slug}`}>
                          <strong>{agent.name}</strong>
                        </Link>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--p-text-2xs)", color: "var(--fg-subtle)" }}>{agent.slug}</td>
                      <td>
                        <VisibilityBadge visibility={agent.visibility} />
                      </td>
                      <td style={{ color: "var(--fg-muted)" }}>
                        {agent.owner_name} ({agent.owner_email})
                      </td>
                      <td className="col-nowrap" style={{ color: "var(--fg-subtle)" }}>
                        {new Date(agent.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                    {isTransferring && (
                      <tr>
                        <td colSpan={7}>
                          <div className="table-actions">
                            <select className="filter-select" value={newOwnerId} onChange={(event) => setNewOwnerId(event.target.value)}>
                              <option value="">Transfer to…</option>
                              {transferCandidates.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.name} ({candidate.email})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="pagination-btn"
                              style={{ background: "var(--color-brand)", color: "var(--fg-on-brand)", borderColor: "var(--color-brand)" }}
                              disabled={busySlug === agent.slug}
                              onClick={() => confirmTransfer(agent.slug)}
                            >
                              Confirm transfer
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination total={data.total} limit={data.limit} offset={offset} onOffsetChange={setOffset} onLimitChange={setLimit} />}
    </div>
  );
}
