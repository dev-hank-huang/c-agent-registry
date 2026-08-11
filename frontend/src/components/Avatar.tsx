// Hand-rolled counterpart to AgentsTable.tsx's antd-based AvatarInitial — per
// UI_AUDIT.md §1, "avatar with initials" was already independently hand-built 3
// separate ways across the antd screens; this is the one version the hybrid
// (hand-rolled) surfaces from Phase 3 onward should reuse instead of adding a 4th.
export default function Avatar({ name }: { name: string }) {
  return <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>;
}
