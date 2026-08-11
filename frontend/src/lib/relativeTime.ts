// Shared by every dense list surface that shows a relative "updated 3 分鐘前"
// timestamp (Browse, Registry status panels, …) — pulled out once several pages
// wanted the same formatting instead of each hand-rolling its own copy.
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "剛剛";
  if (mins < 60) return `${mins} 分鐘前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(iso).toLocaleDateString();
}

export function formatFullDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}
