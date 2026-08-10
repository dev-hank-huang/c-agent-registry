// Hand-rolled counterpart to tags.tsx's antd-based VisibilityTag — used on the
// data-dense surfaces COMPONENT_GUIDE.md keeps off Ant Design (starting with
// Browse → Agents). tags.tsx stays as-is until Phase 4 migrates the screens
// that still use it.
import type { AgentVisibility } from "../api/types";

const LABEL: Record<AgentVisibility, string> = {
  private: "private",
  internal: "internal",
  public: "public",
};

export default function VisibilityBadge({ visibility }: { visibility: AgentVisibility }) {
  return <span className={`badge badge-visibility-${visibility}`}>{LABEL[visibility]}</span>;
}
