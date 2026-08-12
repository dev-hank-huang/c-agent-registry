import { PlusOutlined, SyncOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, Modal, Switch, Table, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createModel, listModels, syncModels } from "../api/models";
import type { CreateModelInput } from "../api/models";
import type { AIModel } from "../api/types";
import { useFormatters } from "../lib/relativeTime";

export default function RegistryModels() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [form] = Form.useForm<CreateModelInput>();

  const { data: models = [], isLoading } = useQuery({ queryKey: ["models"], queryFn: listModels });

  const createMutation = useMutation({
    mutationFn: createModel,
    onSuccess: () => {
      message.success(t("registry.createSuccess", { item: "Model" }));
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setCreateOpen(false);
      form.resetFields();
    },
    onError: () => message.error(t("common.createFailed")),
  });

  const syncMutation = useMutation({
    mutationFn: syncModels,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      message.success(t("registry.syncComplete", { available: result.available, unavailable: result.unavailable }));
    },
    onError: () => message.error(t("common.syncFailed")),
  });

  const lastSyncedAt = useMemo(() => {
    const timestamps = models.map((m) => m.last_synced_at).filter((v): v is string => !!v);
    if (timestamps.length === 0) return null;
    return timestamps.reduce((a, b) => (a > b ? a : b));
  }, [models]);

  const availableCount = models.filter((m) => m.status === "available").length;
  const unavailableCount = models.length - availableCount;
  const visibleModels = showUnavailable ? models : models.filter((m) => m.status === "available");

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
            Registry · Model
          </Typography.Title>
          <Typography.Text type="secondary">{t("registry.modelDescription")}</Typography.Text>
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
            {t("registry.addModel")}
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
        dataSource={visibleModels}
        pagination={false}
        columns={[
          {
            title: t("common.name"),
            dataIndex: "name",
            render: (_: string, r: AIModel) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ color: "var(--fg-subtle)", fontSize: 12, fontFamily: "monospace" }}>
                  {r.model_id}
                </div>
              </div>
            ),
          },
          { title: "Provider", dataIndex: "provider" },
          { title: t("common.category"), dataIndex: "category", render: (v: string | null) => v ?? "—" },
          {
            title: t("common.status"),
            dataIndex: "status",
            render: (s: AIModel["status"]) =>
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
        title={t("registry.addModel")}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText={t("common.create")}
        cancelText={t("common.cancel")}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item label={t("common.name")} name="name" rules={[{ required: true }]}>
            <Input placeholder="Claude Sonnet 5" />
          </Form.Item>
          <Form.Item label="Provider" name="provider" rules={[{ required: true }]}>
            <Input placeholder="anthropic" />
          </Form.Item>
          <Form.Item label="Model ID" name="model_id" rules={[{ required: true }]}>
            <Input placeholder="claude-sonnet-5" />
          </Form.Item>
          <Form.Item label={t("common.category")} name="category">
            <Input placeholder="chat" />
          </Form.Item>
          <Form.Item label={t("common.description")} name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
