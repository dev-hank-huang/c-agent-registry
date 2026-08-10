import { PlusOutlined, SyncOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, Modal, Switch, Table, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { createModel, listModels, syncModels } from "../api/models";
import type { CreateModelInput } from "../api/models";
import type { AIModel } from "../api/types";

export default function RegistryModels() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [form] = Form.useForm<CreateModelInput>();

  const { data: models = [], isLoading } = useQuery({ queryKey: ["models"], queryFn: listModels });

  const createMutation = useMutation({
    mutationFn: createModel,
    onSuccess: () => {
      message.success("Model 已建立");
      queryClient.invalidateQueries({ queryKey: ["models"] });
      setCreateOpen(false);
      form.resetFields();
    },
    onError: () => message.error("建立失敗"),
  });

  const syncMutation = useMutation({
    mutationFn: syncModels,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      message.success(`同步完成：${result.available} 個可用、${result.unavailable} 個不可用`);
    },
    onError: () => message.error("同步失敗"),
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
          <Typography.Text type="secondary">可供 agent 使用的 LLM 模型清單。</Typography.Text>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<SyncOutlined spin={syncMutation.isPending} />}
            loading={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            同步
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新增 Model
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
          background: "#F7F8FA",
          border: "1px solid #E4E6EC",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        <span style={{ color: "#5B6270" }}>
          {lastSyncedAt ? `上次同步：${new Date(lastSyncedAt).toLocaleString()}` : "尚未同步"}
          {" · "}
          可用 {availableCount} · 不可用 {unavailableCount}
        </span>
        <Switch
          checkedChildren="顯示不可用項目"
          unCheckedChildren="只顯示可用項目"
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
            title: "名稱",
            dataIndex: "name",
            render: (_: string, r: AIModel) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ color: "#9AA0AC", fontSize: 12, fontFamily: "monospace" }}>
                  {r.model_id}
                </div>
              </div>
            ),
          },
          { title: "Provider", dataIndex: "provider" },
          { title: "分類", dataIndex: "category", render: (v: string | null) => v ?? "—" },
          {
            title: "狀態",
            dataIndex: "status",
            render: (s: AIModel["status"]) =>
              s === "available" ? (
                <Tag color="green">可用</Tag>
              ) : (
                <Tag color="red">不可用</Tag>
              ),
          },
          {
            title: "更新時間",
            dataIndex: "updated_at",
            render: (v: string) => new Date(v).toLocaleString(),
          },
        ]}
      />

      <Modal
        title="新增 Model"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="建立"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item label="名稱" name="name" rules={[{ required: true }]}>
            <Input placeholder="Claude Sonnet 5" />
          </Form.Item>
          <Form.Item label="Provider" name="provider" rules={[{ required: true }]}>
            <Input placeholder="anthropic" />
          </Form.Item>
          <Form.Item label="Model ID" name="model_id" rules={[{ required: true }]}>
            <Input placeholder="claude-sonnet-5" />
          </Form.Item>
          <Form.Item label="分類" name="category">
            <Input placeholder="chat" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
