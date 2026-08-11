import { Avatar, Table } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Agent } from "../api/types";
import { useFormatters } from "../lib/relativeTime";
import { VisibilityTag } from "./tags";

export default function AgentsTable({ agents, loading }: { agents: Agent[]; loading: boolean }) {
  const { t } = useTranslation();
  const { formatRelativeTime } = useFormatters();
  const navigate = useNavigate();

  return (
    <Table
      loading={loading}
      dataSource={agents}
      rowKey="id"
      pagination={false}
      onRow={(record) => ({
        style: { cursor: "pointer" },
        onClick: () => navigate(`/agents/${record.slug}`),
      })}
      scroll={{ x: 640 }}
      columns={[
        {
          title: t("common.name"),
          dataIndex: "name",
          render: (_: string, record: Agent) => (
            <div>
              <div style={{ fontWeight: 600 }}>{record.name}</div>
              <div style={{ color: "#9AA0AC", fontSize: 12 }}>{record.slug}</div>
            </div>
          ),
        },
        {
          title: "Visibility",
          dataIndex: "visibility",
          render: (v: Agent["visibility"]) => <VisibilityTag visibility={v} />,
        },
        { title: "Provider", dataIndex: "provider", render: (p: string | null) => p ?? "—" },
        {
          title: t("common.updatedAt"),
          dataIndex: "updated_at",
          render: (v: string) => formatRelativeTime(v),
        },
      ]}
      locale={{ emptyText: t("agentsTable.empty") }}
      style={{ background: "#fff" }}
    />
  );
}

export function AvatarInitial({ name }: { name: string }) {
  return (
    <Avatar size={22} style={{ background: "#EEF0FE", color: "#4338CA", fontSize: 10 }}>
      {name.slice(0, 1).toUpperCase()}
    </Avatar>
  );
}
