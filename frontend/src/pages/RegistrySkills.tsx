import { SyncOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Switch, Table, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { listSkills, syncSkills } from "../api/skills";
import type { Skill } from "../api/types";
import { useFormatters } from "../lib/relativeTime";

export default function RegistrySkills() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [showUnavailable, setShowUnavailable] = useState(false);
  // Skill ids whose `status` flipped in the most recent sync run — cleared on the
  // next fetch/sync so a stale highlight never lingers, same as RegistryMcps.
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());

  const { data: skills = [], isLoading } = useQuery({ queryKey: ["skills"], queryFn: listSkills });

  const syncMutation = useMutation({
    mutationFn: syncSkills,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      message.success(t("registry.syncComplete", { available: result.available, unavailable: result.unavailable }));
      setChangedIds(new Set(result.items.filter((i) => i.changed).map((i) => i.id)));
    },
    onError: () => message.error(t("common.syncFailed")),
  });

  const lastSyncedAt = useMemo(() => {
    const timestamps = skills.map((s) => s.last_synced_at).filter((v): v is string => !!v);
    if (timestamps.length === 0) return null;
    return timestamps.reduce((a, b) => (a > b ? a : b));
  }, [skills]);

  const availableCount = skills.filter((s) => s.status === "available").length;
  const unavailableCount = skills.length - availableCount;
  const visibleSkills = showUnavailable ? skills : skills.filter((s) => s.status === "available");

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Registry · Skill
          </Typography.Title>
          <Typography.Text type="secondary">{t("registry.skillDescription")}</Typography.Text>
        </div>
        <Button
          icon={<SyncOutlined spin={syncMutation.isPending} />}
          loading={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
        >
          {t("registry.sync")}
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-default)",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        <span style={{ color: "var(--fg-muted)" }}>
          {lastSyncedAt ? t("registry.lastSynced", { date: formatDateTime(lastSyncedAt) }) : t("common.notSyncedYet")}
          {" · "}
          {t("registry.availableCount", { available: availableCount, unavailable: unavailableCount })}
        </span>
        <Switch
          checkedChildren={t("registry.showUnavailable")}
          unCheckedChildren={t("registry.showAvailableOnly")}
          checked={showUnavailable}
          onChange={setShowUnavailable}
        />
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={visibleSkills}
        pagination={false}
        rowClassName={(s: Skill) => (changedIds.has(s.id) ? "row-recently-changed" : "")}
        columns={[
          {
            title: t("common.name"),
            dataIndex: "name",
            render: (_: string, r: Skill) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ color: "var(--fg-subtle)", fontSize: 12 }}>v{r.version}</div>
              </div>
            ),
          },
          { title: t("common.category"), dataIndex: "category", render: (v: string | null) => v ?? "—" },
          {
            title: t("common.status"),
            dataIndex: "status",
            render: (s: Skill["status"], row: Skill) => (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {s === "available" ? (
                  <Tag color="green">{t("registry.available")}</Tag>
                ) : (
                  <Tag color="red">{t("registry.unavailable")}</Tag>
                )}
                {changedIds.has(row.id) && <Tag color="gold">{t("registry.recentlyChanged")}</Tag>}
              </span>
            ),
          },
          {
            title: t("common.updatedAt"),
            dataIndex: "updated_at",
            render: (v: string) => formatDateTime(v),
          },
        ]}
      />
    </div>
  );
}
