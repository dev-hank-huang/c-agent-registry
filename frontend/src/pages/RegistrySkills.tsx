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
import { useTranslation } from "react-i18next";
import { createSkill, listSkills, syncSkills } from "../api/skills";
import type { CreateSkillInput } from "../api/skills";
import type { Skill } from "../api/types";
import { useFormatters } from "../lib/relativeTime";

export default function RegistrySkills() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [form] = Form.useForm<Omit<CreateSkillInput, "file"> & { file: UploadFile[] }>();

  const { data: skills = [], isLoading } = useQuery({ queryKey: ["skills"], queryFn: listSkills });

  const createMutation = useMutation({
    mutationFn: createSkill,
    onSuccess: () => {
      message.success(t("registry.createSuccess", { item: "Skill" }));
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      setCreateOpen(false);
      form.resetFields();
    },
    onError: () => message.error(t("common.createFailed")),
  });

  const syncMutation = useMutation({
    mutationFn: syncSkills,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      message.success(t("registry.syncComplete", { available: result.available, unavailable: result.unavailable }));
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
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            icon={<SyncOutlined spin={syncMutation.isPending} />}
            loading={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            {t("registry.sync")}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {t("registry.addSkill")}
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
        columns={[
          {
            title: t("common.name"),
            dataIndex: "name",
            render: (_: string, r: Skill) => (
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ color: "#9AA0AC", fontSize: 12 }}>v{r.version}</div>
              </div>
            ),
          },
          { title: t("common.category"), dataIndex: "category", render: (v: string | null) => v ?? "—" },
          {
            title: t("common.status"),
            dataIndex: "status",
            render: (s: Skill["status"]) =>
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
        title={t("registry.addSkill")}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText={t("registry.uploadOk")}
        cancelText={t("common.cancel")}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => {
            const file = v.file?.[0]?.originFileObj as File | undefined;
            if (!file) {
              message.error(t("common.selectFile"));
              return;
            }
            createMutation.mutate({ ...v, file });
          }}
        >
          <Form.Item label={t("common.name")} name="name" rules={[{ required: true }]}>
            <Input placeholder="pdf-ocr-extract" />
          </Form.Item>
          <Form.Item label={t("registry.versionLabel")} name="version" rules={[{ required: true }]}>
            <Input placeholder="1.0.0" />
          </Form.Item>
          <Form.Item label={t("common.category")} name="category">
            <Input placeholder="extraction" />
          </Form.Item>
          <Form.Item label={t("common.description")} name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            label={t("registry.fileLabel")}
            name="file"
            valuePropName="fileList"
            getValueFromEvent={(e) => e?.fileList}
            rules={[{ required: true, message: t("common.selectFile") }]}
          >
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button icon={<UploadOutlined />}>{t("registry.selectFileBtn")}</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
