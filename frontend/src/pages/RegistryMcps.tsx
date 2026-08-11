import { PlusOutlined, SyncOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, Modal, Switch, Table, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createMcp, listMcps, syncMcps } from "../api/skills";
import type { CreateMcpInput } from "../api/skills";
import type { Mcp } from "../api/types";
import { useFormatters } from "../lib/relativeTime";

export default function RegistryMcps() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [form] = Form.useForm<CreateMcpInput>();

  const { data: mcps = [], isLoading } = useQuery({ queryKey: ["mcps"], queryFn: listMcps });

  const createMutation = useMutation({
    mutationFn: createMcp,
    onSuccess: () => {
      message.success(t("registry.createSuccess", { item: "MCP" }));
      queryClient.invalidateQueries({ queryKey: ["mcps"] });
      setCreateOpen(false);
      form.resetFields();
    },
    onError: () => message.error(t("common.createFailed")),
  });

  const syncMutation = useMutation({
    mutationFn: syncMcps,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["mcps"] });
      message.success(t("registry.syncComplete", { available: result.available, unavailable: result.unavailable }));
    },
    onError: () => message.error(t("common.syncFailed")),
  });

  const lastSyncedAt = useMemo(() => {
    const timestamps = mcps.map((m) => m.last_synced_at).filter((v): v is string => !!v);
    if (timestamps.length === 0) return null;
    return timestamps.reduce((a, b) => (a > b ? a : b));
  }, [mcps]);

  const availableCount = mcps.filter((m) => m.status === "available").length;
  const unavailableCount = mcps.length - availableCount;
  const visibleMcps = showUnavailable ? mcps : mcps.filter((m) => m.status === "available");

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
            Registry · MCP
          </Typography.Title>
          <Typography.Text type="secondary">{t("registry.mcpDescription")}</Typography.Text>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<SyncOutlined spin={syncMutation.isPending} />}
            loading={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            {t("registry.sync")}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {t("registry.addMcp")}
          </Button>
        </div>
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
        dataSource={visibleMcps}
        pagination={false}
        columns={[
          {
            title: t("common.name"),
            dataIndex: "name",
            render: (_: string, r: Mcp) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ color: "var(--fg-subtle)", fontSize: 12 }}>v{r.version}</div>
              </div>
            ),
          },
          {
            title: "Host",
            dataIndex: "host",
            render: (v: string) => <span style={{ fontFamily: "monospace", fontSize: 12.5 }}>{v}</span>,
          },
          {
            title: t("common.status"),
            dataIndex: "status",
            render: (s: Mcp["status"]) =>
              s === "available" ? (
                <Tag color="green">{t("registry.available")}</Tag>
              ) : (
                <Tag color="red">{t("registry.unavailable")}</Tag>
              ),
          },
          {
            title: t("common.updatedAt"),
            dataIndex: "updated_at",
            render: (v: string) => formatDateTime(v),
          },
        ]}
      />

      <Modal
        title={t("registry.addMcp")}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText={t("common.create")}
        cancelText={t("common.cancel")}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item label={t("common.name")} name="name" rules={[{ required: true }]}>
            <Input placeholder="finance-db-mcp" />
          </Form.Item>
          <Form.Item label={t("registry.versionLabel")} name="version" rules={[{ required: true }]}>
            <Input placeholder="1.0.0" />
          </Form.Item>
          <Form.Item label="Host" name="host" rules={[{ required: true }]}>
            <Input placeholder="mcp://finance.internal:8443" />
          </Form.Item>
          <Form.Item label={t("common.category")} name="category">
            <Input placeholder="finance" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
