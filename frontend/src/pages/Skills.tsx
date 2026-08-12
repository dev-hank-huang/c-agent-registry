import { useQuery } from "@tanstack/react-query";
import { Table, Tabs, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { listMcps, listSkills } from "../api/skills";
import { useFormatters } from "../lib/relativeTime";

export default function Skills() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();

  const skillsQuery = useQuery({ queryKey: ["skills"], queryFn: listSkills });
  const mcpsQuery = useQuery({ queryKey: ["mcps"], queryFn: listMcps });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Typography.Title level={3} style={{ marginBottom: 4 }}>
          Skills &amp; MCP
        </Typography.Title>
        <Typography.Text type="secondary">{t("registry.combinedDescription")}</Typography.Text>
      </div>

      <Tabs
        defaultActiveKey="skills"
        items={[
          {
            key: "skills",
            label: "Skills",
            children: (
              <Table
                rowKey="id"
                loading={skillsQuery.isLoading}
                dataSource={skillsQuery.data ?? []}
                pagination={false}
                columns={[
                  {
                    title: t("common.name"),
                    dataIndex: "name",
                    render: (_: string, r) => (
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div style={{ color: "var(--fg-subtle)", fontSize: 12 }}>v{r.version}</div>
                      </div>
                    ),
                  },
                  { title: t("common.category"), dataIndex: "category", render: (v: string | null) => v ?? "—" },
                  {
                    title: t("common.updatedAt"),
                    dataIndex: "updated_at",
                    render: (v: string) => formatDateTime(v),
                  },
                ]}
              />
            ),
          },
          {
            key: "mcp",
            label: "MCP",
            children: (
              <Table
                rowKey="id"
                loading={mcpsQuery.isLoading}
                dataSource={mcpsQuery.data ?? []}
                pagination={false}
                columns={[
                  {
                    title: t("common.name"),
                    dataIndex: "name",
                    render: (_: string, r) => (
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div style={{ color: "var(--fg-subtle)", fontSize: 12 }}>v{r.version}</div>
                      </div>
                    ),
                  },
                  { title: t("common.category"), dataIndex: "category", render: (v: string | null) => v ?? "—" },
                  {
                    title: t("registry.fabCount"),
                    dataIndex: "fabs",
                    render: (fabs: { status: string }[]) =>
                      `${fabs.filter((f) => f.status === "available").length} / ${fabs.length}`,
                  },
                  {
                    title: t("common.updatedAt"),
                    dataIndex: "updated_at",
                    render: (v: string) => formatDateTime(v),
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
