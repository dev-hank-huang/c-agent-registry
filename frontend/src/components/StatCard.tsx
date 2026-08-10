import { Link } from "react-router-dom";

export interface StatCardProps {
  value: string | number;
  label: string;
  breakdown?: string;
  to?: string;
}

// Every Summary/Reports page reuses this — the stat-grid + stat-card pattern
// COMPONENT_GUIDE.md standardizes so those pages stop each hand-rolling their own.
export default function StatCard({ value, label, breakdown, to }: StatCardProps) {
  const content = (
    <>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {breakdown && <div className="stat-card-breakdown">{breakdown}</div>}
    </>
  );
  if (to) {
    return (
      <Link to={to} className="stat-card">
        {content}
      </Link>
    );
  }
  return <div className="stat-card">{content}</div>;
}
