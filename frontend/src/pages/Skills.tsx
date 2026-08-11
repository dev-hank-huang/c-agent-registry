import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Table,
  Tabs,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createMcp, createSkill, listMcps, listSkills } from "../api/skills";
import type { CreateMcpInput, CreateSkillInput } from "../api/skills";
import { useFormatters } from "../lib/relativeTime";

export default function Skills() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [mcpModalOpen, setMcpModalOpen] = useState(false);
  const [skillForm] = Form.useForm<Omit<CreateSkillInput, "file"> & { file: UploadFile[] }>();
  const [mcpForm] = Form.useForm<CreateMcpInput>();

  const skillsQuery = useQuery({ queryKey: ["skills"], queryFn: listSkills });
  const mcpsQuery = useQuery({ queryKey: ["mcps"], queryFn: listMcps });

  const createSkillMutation = useMutation({
    mutationFn: createSkill,
    onSuccess: () => {
      message.success(t("registry.createSuccess", { item: "Skill" }));
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      setSkillModalOpen(false);
      skillForm.resetFields();
    },
    onError: () => message.error(t("common.createFailed")),
  });

  const createMcpMutation = useMutation({
    mutationFn: createMcp,
    onSuccess: () => {
      message.success(t("registry.createSuccess", { item: "MCP" }));
      queryClient.invalidateQueries({ queryKey: ["mcps"] });
      setMcpModalOpen(false);
      mcpForm.resetFields();
    },
    onError: () => message.error(t("common.createFailed")),
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Skills &amp; MCP
          </Typography.Title>
          <Typography.Text type="secondary">{t("registry.combinedDescription")}</Typography.Text>
        </div>
      </div>

      <Tabs
        defaultActiveKey="skills"
        items={[
          {
            key: "skills",
            label: "Skills",
            children: (
              <>
                <Button icon={<PlusOutlined />} onClick={() => setSkillModalOpen(true)} style={{ marginBottom: 12 }}>
                  {t("registry.addSkill")}
                </Button>
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
                          <div style={{ color: "#9AA0AC", fontSize: 12 }}>v{r.version}</div>
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
              </>
            ),
          },
          {
            key: "mcp",
            label: "MCP",
            children: (
              <>
                <Button icon={<PlusOutlined />} onClick={() => setMcpModalOpen(true)} style={{ marginBottom: 12 }}>
                  {t("registry.addMcp")}
                </Button>
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
                      title: t("common.updatedAt"),
                      dataIndex: "updated_at",
                      render: (v: string) => formatDateTime(v),
                    },
                  ]}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title={t("registry.addSkill")}
        open={skillModalOpen}
        onCancel={() => setSkillModalOpen(false)}
        onOk={() => skillForm.submit()}
        confirmLoading={createSkillMutation.isPending}
        okText={t("registry.uploadOk")}
        cancelText={t("common.cancel")}
      >
        <Form
          form={skillForm}
          layout="vertical"
          onFinish={(v) => {
            const file = v.file?.[0]?.originFileObj as File | undefined;
            if (!file) {
              message.error(t("common.selectFile"));
              return;
            }
            createSkillMutation.mutate({ ...v, file });
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

      <Modal
        title={t("registry.addMcp")}
        open={mcpModalOpen}
        onCancel={() => setMcpModalOpen(false)}
        onOk={() => mcpForm.submit()}
        confirmLoading={createMcpMutation.isPending}
        okText={t("common.create")}
        cancelText={t("common.cancel")}
      >
        <Form form={mcpForm} layout="vertical" onFinish={(v) => createMcpMutation.mutate(v)}>
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
