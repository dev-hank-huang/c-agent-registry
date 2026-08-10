import { PlusOutlined, SyncOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useMemo, useState } from "react";
import { createSkill, listSkills, syncSkills } from "../api/skills";
import type { CreateSkillInput } from "../api/skills";
import type { Skill } from "../api/types";

export default function RegistrySkills() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [form] = Form.useForm<Omit<CreateSkillInput, "file"> & { file: UploadFile[] }>();

  const { data: skills = [], isLoading } = useQuery({ queryKey: ["skills"], queryFn: listSkills });

  const createMutation = useMutation({
    mutationFn: createSkill,
    onSuccess: () => {
      message.success("Skill 已建立");
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      setCreateOpen(false);
      form.resetFields();
    },
    onError: () => message.error("建立失敗"),
  });

  const syncMutation = useMutation({
    mutationFn: syncSkills,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      message.success(`同步完成：${result.available} 個可用、${result.unavailable} 個不可用`);
    },
    onError: () => message.error("同步失敗"),
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
          <Typography.Text type="secondary">可重複使用、跨 agent 掛載的 skill 清單。</Typography.Text>
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
            新增 Skill
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
        dataSource={visibleSkills}
        pagination={false}
        columns={[
          {
            title: "名稱",
            dataIndex: "name",
            render: (_: string, r: Skill) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ color: "#9AA0AC", fontSize: 12 }}>v{r.version}</div>
              </div>
            ),
          },
          { title: "分類", dataIndex: "category", render: (v: string | null) => v ?? "—" },
          {
            title: "狀態",
            dataIndex: "status",
            render: (s: Skill["status"]) =>
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
        title="新增 Skill"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="上傳"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => {
            const file = v.file?.[0]?.originFileObj as File | undefined;
            if (!file) {
              message.error("請選擇檔案");
              return;
            }
            createMutation.mutate({ ...v, file });
          }}
        >
          <Form.Item label="名稱" name="name" rules={[{ required: true }]}>
            <Input placeholder="pdf-ocr-extract" />
          </Form.Item>
          <Form.Item label="版本" name="version" rules={[{ required: true }]}>
            <Input placeholder="1.0.0" />
          </Form.Item>
          <Form.Item label="分類" name="category">
            <Input placeholder="extraction" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            label="檔案"
            name="file"
            valuePropName="fileList"
            getValueFromEvent={(e) => e?.fileList}
            rules={[{ required: true, message: "請選擇檔案" }]}
          >
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button icon={<UploadOutlined />}>選擇檔案</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
