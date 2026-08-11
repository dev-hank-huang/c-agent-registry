import type { TrendPoint } from "../api/types";

export interface TrendSeries {
  label: string;
  color: string;
  data: TrendPoint[];
}

const VIEW_W = 300;
const VIEW_H = 48;
const PAD = 3;

function toPath(data: TrendPoint[], max: number): string {
  if (data.length === 0) return "";
  const step = data.length > 1 ? (VIEW_W - PAD * 2) / (data.length - 1) : 0;
  return data
    .map((point, i) => {
      const x = PAD + i * step;
      const y = max === 0 ? VIEW_H - PAD : VIEW_H - PAD - (point.count / max) * (VIEW_H - PAD * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

// Hand-rolled inline SVG per COMPONENT_GUIDE.md's hybrid decision — no charting
// library. Shared by every Summary/Reports page that plots a 30-day trend.
export default function TrendChart({ title, series }: { title: string; series: TrendSeries[] }) {
  const allCounts = series.flatMap((s) => s.data.map((d) => d.count));
  const max = Math.max(1, ...allCounts);
  const firstDate = series[0]?.data[0]?.date;
  const lastDate = series[0]?.data[series[0].data.length - 1]?.date;

  return (
    <div className="trend-chart">
      <div className="trend-chart-header">
        <span className="trend-chart-title">{title}</span>
        {firstDate && lastDate && (
          <span className="trend-chart-range">
            {firstDate} – {lastDate}
          </span>
        )}
      </div>
      <svg className="trend-chart-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none">
        {series.map((s) => (
          <path key={s.label} d={toPath(s.data, max)} fill="none" stroke={s.color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="trend-chart-legend">
        {series.map((s) => (
          <span key={s.label} className="trend-chart-legend-item">
            <span className="trend-chart-legend-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
