// Hand-rolled per COMPONENT_GUIDE.md's hybrid decision — offset/limit pagination
// shared by every filtered list screen from Phase 3 onward (Browse → Agents is the
// first; Governance/Review lists reuse this as they're built).
export interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
  onLimitChange: (limit: number) => void;
}

const LIMIT_OPTIONS = [10, 20, 50, 100];

export default function Pagination({ total, limit, offset, onOffsetChange, onLimitChange }: PaginationProps) {
  const page = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  if (total === 0) return null;

  return (
    <div className="pagination">
      <button
        type="button"
        className="pagination-btn"
        disabled={!canPrev}
        onClick={() => onOffsetChange(Math.max(0, offset - limit))}
      >
        Previous
      </button>
      <span className="pagination-status">
        Page {page} of {pageCount} · {total} total
      </span>
      <button
        type="button"
        className="pagination-btn"
        disabled={!canNext}
        onClick={() => onOffsetChange(offset + limit)}
      >
        Next
      </button>
      <label className="pagination-limit">
        <select
          className="filter-select"
          value={limit}
          onChange={(event) => {
            onLimitChange(Number(event.target.value));
            onOffsetChange(0);
          }}
        >
          {LIMIT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} / page
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
