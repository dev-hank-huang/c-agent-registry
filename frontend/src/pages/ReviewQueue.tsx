import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { decideReview, listReviewQueue } from "../api/reviews";
import type { ReviewResult } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import Pagination from "../components/Pagination";
import { useFormatters } from "../lib/relativeTime";

const STATUS_OPTIONS: { value: ReviewResult; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function ReviewQueue() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReviewResult>("pending");
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [reasonNotes, setReasonNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectStatus(next: ReviewResult) {
    setStatus(next);
    setOffset(0);
  }

  const canView = user?.role === "reviewer" || user?.role === "admin";

  const { data, isLoading } = useQuery({
    queryKey: ["review-queue", status, limit, offset],
    queryFn: () => listReviewQueue({ status, limit, offset }),
    enabled: canView,
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["review-queue"] });
  }

  async function decide(reviewId: string, result: "approved" | "rejected") {
    const note = reasonNotes[reviewId]?.trim();
    if (result === "rejected" && !note) {
      setError("A reason is required to reject.");
      return;
    }
    setBusyId(reviewId);
    setError(null);
    try {
      await decideReview(reviewId, result, note || undefined);
      await refresh();
    } catch {
      setError(`Failed to ${result === "approved" ? "approve" : "reject"}.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: "var(--p-text-xl)", fontWeight: 700, margin: "0 0 4px" }}>
        Review Queue {data && <span className="badge">{data.total} total</span>}
      </h1>
      <p style={{ color: "var(--fg-muted)", fontSize: "var(--p-text-sm)", margin: "0 0 var(--p-space-2)" }}>
        {t("reviewQueue.description")}
      </p>

      <div className="filter-bar">
        <div className="toggle-group">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`toggle-btn ${status === option.value ? "active" : ""}`}
              onClick={() => selectStatus(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!canView && (
        <p style={{ color: "var(--status-danger-fg)" }}>{t("reviewQueue.forbidden")}</p>
      )}

      {error && (
        <p style={{ color: "var(--status-danger-fg)", fontSize: "var(--p-text-sm)" }}>{error}</p>
      )}

      {canView && isLoading && <div className="loading-state">Loading…</div>}

      {!isLoading && data && data.items.length === 0 && <div className="empty-state">{t("reviewQueue.empty")}</div>}

      {!isLoading && data && data.items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th>Agent · Version</th>
                <th>Reviewer</th>
                <th>Submitted by</th>
                <th>Status</th>
                <th>{status === "pending" ? "Decision" : "Note"}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="col-num">{offset + index + 1}</td>
                  <td>
                    <Link to={`/agents/${item.agent_slug}/versions/${item.version_slug}`}>
                      {item.agent_name} · v{item.version_number}
                    </Link>
                  </td>
                  <td>{item.reviewer_name}</td>
                  <td style={{ color: "var(--fg-muted)" }}>{item.submitted_by_name}</td>
                  <td>
                    <span className={`badge badge-${item.result === "approved" ? "success" : item.result === "rejected" ? "danger" : "pending"}`}>
                      {item.result}
                    </span>
                    {item.signoff_by_name && (
                      <span style={{ color: "var(--fg-subtle)", fontSize: "var(--p-text-2xs)", marginLeft: "var(--p-space-1)" }}>
                        by {item.signoff_by_name} · {formatDateTime(item.updated_at)}
                      </span>
                    )}
                  </td>
                  <td>
                    {item.result === "pending" ? (
                      <div className="table-actions">
                        <input
                          className="filter-input"
                          placeholder="Reason (required to reject)"
                          value={reasonNotes[item.id] ?? ""}
                          onChange={(event) => setReasonNotes((prev) => ({ ...prev, [item.id]: event.target.value }))}
                        />
                        <button
                          type="button"
                          className="pagination-btn"
                          disabled={busyId === item.id}
                          onClick={() => decide(item.id, "approved")}
                          title="Approve"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          type="button"
                          className="pagination-btn"
                          style={{ color: "var(--status-danger-fg)", borderColor: "var(--status-danger-border)" }}
                          disabled={busyId === item.id}
                          onClick={() => decide(item.id, "rejected")}
                          title="Reject"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "var(--fg-muted)" }}>{item.comment ?? "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <Pagination total={data.total} limit={data.limit} offset={offset} onOffsetChange={setOffset} onLimitChange={setLimit} />
      )}
    </div>
  );
}
