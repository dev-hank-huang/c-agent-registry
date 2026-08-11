import { PlusOutlined, SyncOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, Modal, Switch, Table, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { createMcp, listMcps, syncMcps } from "../api/skills";
import type { CreateMcpInput } from "../api/skills";
import type { Mcp } from "../api/types";

export default function RegistryMcps() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [form] = Form.useForm<CreateMcpInput>();

  const { data: mcps = [], isLoading } = useQuery({ queryKey: ["mcps"], queryFn: listMcps });

  const createMutation = useMutation({
    mutationFn: createMcp,
    onSuccess: () => {
      message.success("MCP 已建立");
      queryClient.invalidateQueries({ queryKey: ["mcps"] });
      setCreateOpen(false);
      form.resetFields();
    },
    onError: () => message.error("建立失敗"),
  });

  const syncMutation = useMutation({
    mutationFn: syncMcps,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["mcps"] });
      message.success(`同步完成：${result.available} 個可用、${result.unavailable} 個不可用`);
    },
    onError: () => message.error("同步失敗"),
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
          <Typography.Text type="secondary">可重複使用、跨 agent 掛載的 MCP 清單。</Typography.Text>
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
            新增 MCP
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
        dataSource={visibleMcps}
        pagination={false}
        columns={[
          {
            title: "名稱",
            dataIndex: "name",
            render: (_: string, r: Mcp) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ color: "#9AA0AC", fontSize: 12 }}>v{r.version}</div>
              </div>
            ),
          },
          {
            title: "Host",
            dataIndex: "host",
            render: (v: string) => <span style={{ fontFamily: "monospace", fontSize: 12.5 }}>{v}</span>,
          },
          {
            title: "狀態",
            dataIndex: "status",
            render: (s: Mcp["status"]) =>
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
        title="新增 MCP"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="建立"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item label="名稱" name="name" rules={[{ required: true }]}>
            <Input placeholder="finance-db-mcp" />
          </Form.Item>
          <Form.Item label="版本" name="version" rules={[{ required: true }]}>
            <Input placeholder="1.0.0" />
          </Form.Item>
          <Form.Item label="Host" name="host" rules={[{ required: true }]}>
            <Input placeholder="mcp://finance.internal:8443" />
          </Form.Item>
          <Form.Item label="分類" name="category">
            <Input placeholder="finance" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
