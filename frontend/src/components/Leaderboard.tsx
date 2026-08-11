export interface LeaderboardItem {
  key: string;
  primary: string;
  secondary: string;
}

export default function Leaderboard({ title, items }: { title: string; items: LeaderboardItem[] }) {
  return (
    <div className="leaderboard">
      <div className="leaderboard-title">{title}</div>
      {items.length === 0 ? (
        <div className="leaderboard-empty">No data yet</div>
      ) : (
        <ol className="leaderboard-list">
          {items.map((item, i) => (
            <li key={item.key} className="leaderboard-item">
              <span className="leaderboard-rank">{i + 1}</span>
              <span className="leaderboard-primary">{item.primary}</span>
              <span className="leaderboard-secondary">{item.secondary}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
