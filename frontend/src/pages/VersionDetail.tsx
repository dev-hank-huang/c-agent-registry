import { DownloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Breadcrumb,
  Button,
  Empty,
  Form,
  Grid,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { listSkills, listMcps } from "../api/skills";
import { getRegistryOverview } from "../api/registry";
import { listReviewerCandidates, listVersionReviews } from "../api/reviews";
import type { DependencySource, DependencyType } from "../api/types";
import {
  activateVersion,
  addDependency,
  deactivateVersion,
  getDownloadUrl,
  getVersion,
  listDependencies,
  removeDependency,
  submitVersion,
  updateVersion,
} from "../api/versions";
import { ReviewResultTag, VersionStatusTag } from "../components/tags";
import { useFormatters } from "../lib/relativeTime";

export default function VersionDetail() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const { agentSlug, versionSlug } = useParams<{ agentSlug: string; versionSlug: string }>();
  const queryClient = useQueryClient();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [depOpen, setDepOpen] = useState(false);
  const [submitForm] = Form.useForm<{ reviewer_ids: string[] }>();
  const [depForm] = Form.useForm<{ type: DependencyType; dependency_id: string }>();

  const versionQuery = useQuery({
    queryKey: ["version", versionSlug],
    queryFn: () => getVersion(versionSlug!),
    enabled: !!versionSlug,
  });
  const depsQuery = useQuery({
    queryKey: ["version-deps", versionSlug],
    queryFn: () => listDependencies(versionSlug!),
    enabled: !!versionSlug,
  });
  const reviewsQuery = useQuery({
    queryKey: ["version-reviews", versionSlug],
    queryFn: () => listVersionReviews(versionSlug!),
    enabled: !!versionSlug,
  });
  const skillsQuery = useQuery({ queryKey: ["skills"], queryFn: listSkills });
  const mcpsQuery = useQuery({ queryKey: ["mcps"], queryFn: listMcps });
  // Skill's registry-sourced options — see UI_AUDIT.md's registry-migration note.
  // Currently always empty until the real sync integration lands
  // (app/crud/registry.py), so this query just contributes nothing to the picker
  // below yet, not an error. MCP has no equivalent — it resolves against the real
  // mcps table (with its own available/unavailable sync) instead, see the dependency
  // picker below.
  const skillhubRegistryQuery = useQuery({
    queryKey: ["admin-registry", "skillhub-registry"],
    queryFn: () => getRegistryOverview("skillhub-registry"),
  });
  const reviewerCandidatesQuery = useQuery({
    queryKey: ["reviewer-candidates"],
    queryFn: listReviewerCandidates,
  });

  const skillNameById = useMemo(
    () => new Map((skillsQuery.data ?? []).map((s) => [s.id, `${s.name} v${s.version}`])),
    [skillsQuery.data],
  );
  const mcpNameById = useMemo(
    () => new Map((mcpsQuery.data ?? []).map((m) => [m.id, `${m.name} v${m.version}`])),
    [mcpsQuery.data],
  );
  const skillhubItemNameById = useMemo(
    () => new Map((skillhubRegistryQuery.data?.items ?? []).map((i) => [i.id, i.name])),
    [skillhubRegistryQuery.data],
  );
  const invalidateVersion = () => {
    queryClient.invalidateQueries({ queryKey: ["version", versionSlug] });
    queryClient.invalidateQueries({ queryKey: ["agent-versions", agentSlug] });
  };

  const submitMutation = useMutation({
    mutationFn: (reviewerIds: string[]) => submitVersion(versionSlug!, reviewerIds),
    onSuccess: () => {
      message.success(t("versionDetail.submitSuccess"));
      invalidateVersion();
      queryClient.invalidateQueries({ queryKey: ["version-reviews", versionSlug] });
      setSubmitOpen(false);
      submitForm.resetFields();
    },
    onError: () => message.error(t("versionDetail.submitFailed")),
  });

  const activateMutation = useMutation({
    mutationFn: () => activateVersion(versionSlug!),
    onSuccess: () => {
      message.success(t("versionDetail.activateSuccess"));
      invalidateVersion();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(msg ?? t("versionDetail.activateFailed"));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateVersion(versionSlug!),
    onSuccess: () => {
      message.success(t("versionDetail.deactivateSuccess"));
      invalidateVersion();
    },
    onError: () => message.error(t("versionDetail.deactivateFailed")),
  });

  const downloadMutation = useMutation({
    mutationFn: () => getDownloadUrl(versionSlug!),
    onSuccess: (url) => window.open(url, "_blank"),
    onError: () => message.error(t("versionDetail.downloadLinkFailed")),
  });

  const addDepMutation = useMutation({
    mutationFn: (values: { type: DependencyType; dependency_id: string; source: DependencySource }) =>
      addDependency(versionSlug!, values.dependency_id, values.type, values.source),
    onSuccess: () => {
      message.success(t("versionDetail.addDependencySuccess"));
      queryClient.invalidateQueries({ queryKey: ["version-deps", versionSlug] });
      setDepOpen(false);
      depForm.resetFields();
    },
    onError: () => message.error(t("versionDetail.addDependencyFailed")),
  });

  const removeDepMutation = useMutation({
    mutationFn: (rowId: string) => removeDependency(versionSlug!, rowId),
    onSuccess: () => {
      message.success(t("versionDetail.removeDependencySuccess"));
      queryClient.invalidateQueries({ queryKey: ["version-deps", versionSlug] });
    },
    onError: () => message.error(t("common.removeFailed")),
  });

  const saveParamsMutation = useMutation({
    mutationFn: (values: { url?: string; streaming?: boolean }) =>
      updateVersion(versionSlug!, values),
    onSuccess: () => {
      message.success(t("versionDetail.saveSuccess"));
      invalidateVersion();
    },
    onError: () => message.error(t("versionDetail.saveFailed")),
  });

  if (versionQuery.isLoading || !versionQuery.data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }
  const version = versionQuery.data;
  const isRejected = version.status === "rejected";
  // Rejected versions are fixed in place and resubmitted rather than forking a new
  // version, so review history keeps accumulating on this same version slug.
  const isEditable = version.status === "draft" || isRejected;

  return (
    <div>
      <Breadcrumb
        items={[
          { title: <Link to="/my-agents">Agents</Link> },
          { title: <Link to={`/agents/${agentSlug}`}>{agentSlug}</Link> },
          { title: `v${version.version}` },
        ]}
        style={{ marginBottom: 8, fontSize: 12.5 }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 22 }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
            {version.slug}
            <VersionStatusTag status={version.status} />
          </Typography.Title>
          <div style={{ fontSize: 12.5, color: "#9AA0AC" }}>
            {t("versionDetail.lastUpdated", { date: formatDateTime(version.updated_at) })}
          </div>
        </div>
        <Space>
          {isEditable && (
            <Button type="primary" onClick={() => setSubmitOpen(true)}>
              {isRejected ? t("versionDetail.resubmit") : t("common.submit")}
            </Button>
          )}
          {version.status === "approved" && (
            <Button onClick={() => activateMutation.mutate()} loading={activateMutation.isPending}>
              {t("versionDetail.activate")}
            </Button>
          )}
          {version.status === "active" && (
            <Popconfirm
              title={t("versionDetail.deactivateConfirm")}
              onConfirm={() => deactivateMutation.mutate()}
              okText={t("versionDetail.deactivate")}
              cancelText={t("common.cancel")}
            >
              <Button danger>{t("versionDetail.deactivate")}</Button>
            </Popconfirm>
          )}
          {version.package_path && (
            <Button icon={<DownloadOutlined />} onClick={() => downloadMutation.mutate()} loading={downloadMutation.isPending}>
              {t("versionDetail.downloadPackage")}
            </Button>
          )}
        </Space>
      </div>

      {version.status === "draft" && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 18 }}
          title={t("versionDetail.draftAlertTitle")}
          description={t("versionDetail.draftAlertDesc")}
        />
      )}
      {version.status === "in_review" && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 18 }}
          title={t("versionDetail.inReviewAlertTitle")}
          description={t("versionDetail.inReviewAlertDesc")}
        />
      )}
      {isRejected && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 18 }}
          title={t("versionDetail.rejectedAlertTitle")}
          description={t("versionDetail.rejectedAlertDesc")}
        />
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: screens.lg ? "1.5fr 1fr" : "1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div>
          <div style={{ background: "#fff", border: "1px solid #E4E6EC", borderRadius: 8, padding: 20, marginBottom: 18 }}>
            <Typography.Title level={5} style={{ marginBottom: 14 }}>
              {t("versionDetail.paramsTitle")}
            </Typography.Title>
            <Form
              layout="vertical"
              initialValues={{ url: version.url ?? "", streaming: version.streaming }}
              onFinish={(v) => saveParamsMutation.mutate(v)}
              disabled={!isEditable}
            >
              <Form.Item label="Endpoint URL" name="url">
                <Input placeholder="https://agents.example.com/your-agent" />
              </Form.Item>
              <Form.Item label="Streaming" name="streaming" valuePropName="checked">
                <Switch />
              </Form.Item>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "#9AA0AC", marginBottom: 6 }}>
                  DEFAULT INPUT MODES
                </div>
                <Space wrap>
                  {version.default_input_modes.length
                    ? version.default_input_modes.map((m) => <Tag key={m}>{m}</Tag>)
                    : <Typography.Text type="secondary">{t("common.none")}</Typography.Text>}
                </Space>
              </div>
              <div style={{ marginBottom: isEditable ? 14 : 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "#9AA0AC", marginBottom: 6 }}>
                  DEFAULT OUTPUT MODES
                </div>
                <Space wrap>
                  {version.default_output_modes.length
                    ? version.default_output_modes.map((m) => <Tag key={m}>{m}</Tag>)
                    : <Typography.Text type="secondary">{t("common.none")}</Typography.Text>}
                </Space>
              </div>
              {isEditable && (
                <Button htmlType="submit" loading={saveParamsMutation.isPending}>
                  {t("versionDetail.saveParams")}
                </Button>
              )}
            </Form>
          </div>

          <div style={{ background: "#fff", border: "1px solid #E4E6EC", borderRadius: 8, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Typography.Title level={5} style={{ marginBottom: 0 }}>
                {t("versionDetail.dependenciesTitle")}
              </Typography.Title>
              {isEditable && (
                <Button size="small" onClick={() => setDepOpen(true)}>
                  {t("versionDetail.addDependency")}
                </Button>
              )}
            </div>
            {depsQuery.data && depsQuery.data.length > 0 ? (
              <Space wrap>
                {depsQuery.data.map((d) => {
                  // "registry" source only ever applies to skill dependencies now (see
                  // the picker above) — an mcp/registry row could only exist from before
                  // this reconciliation, and falls back to the dependency_id itself.
                  const legacyName = d.type === "skill" ? skillNameById.get(d.dependency_id) : mcpNameById.get(d.dependency_id);
                  const registryName = d.type === "skill" ? skillhubItemNameById.get(d.dependency_id) : undefined;
                  const label = (d.source === "registry" ? registryName : legacyName) ?? d.dependency_id;
                  return (
                    <Tag
                      key={d.id}
                      color={d.type === "mcp" ? "geekblue" : "default"}
                      closable={isEditable}
                      onClose={(e) => {
                        e.preventDefault();
                        removeDepMutation.mutate(d.id);
                      }}
                    >
                      {label} <span style={{ opacity: 0.6 }}>{d.type}{d.source === "registry" ? " · synced" : ""}</span>
                    </Tag>
                  );
                })}
              </Space>
            ) : (
              <Typography.Text type="secondary">{t("versionDetail.dependenciesEmpty")}</Typography.Text>
            )}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E4E6EC", borderRadius: 8, padding: 20 }}>
          <Typography.Title level={5} style={{ marginBottom: 14 }}>
            {t("versionDetail.reviewHistoryTitle")}
          </Typography.Title>
          {reviewsQuery.data && reviewsQuery.data.length > 0 ? (
            <Space orientation="vertical" style={{ width: "100%" }} size={14}>
              {reviewsQuery.data.map((r) => (
                <div key={r.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12.5, fontFamily: "monospace", color: "#6B7280" }}>
                      {r.reviewer_id.slice(0, 8)}…
                    </div>
                    <ReviewResultTag result={r.result} />
                  </div>
                  {r.comment && (
                    <Typography.Paragraph
                      type="secondary"
                      style={{ fontSize: 12.5, whiteSpace: "pre-wrap", marginTop: 4, marginBottom: 0 }}
                    >
                      {r.comment}
                    </Typography.Paragraph>
                  )}
                </div>
              ))}
            </Space>
          ) : (
            <Empty description={t("versionDetail.reviewHistoryEmpty")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      </div>

      <Modal
        title={t("versionDetail.submitModalTitle")}
        open={submitOpen}
        onCancel={() => setSubmitOpen(false)}
        onOk={() => submitForm.submit()}
        confirmLoading={submitMutation.isPending}
        okText={t("versionDetail.submitOk")}
        cancelText={t("common.cancel")}
      >
        <Form
          form={submitForm}
          layout="vertical"
          onFinish={(v) => submitMutation.mutate(v.reviewer_ids ?? [])}
        >
          <Form.Item
            label={t("versionDetail.reviewerLabel")}
            name="reviewer_ids"
            extra={t("versionDetail.reviewerExtra")}
          >
            <Select
              mode="multiple"
              placeholder={t("versionDetail.reviewerPlaceholder")}
              loading={reviewerCandidatesQuery.isLoading}
              options={(reviewerCandidatesQuery.data ?? []).map((c) => ({
                value: c.id,
                label: `${c.name} (${c.email})`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("versionDetail.addDependencyModalTitle")}
        open={depOpen}
        onCancel={() => setDepOpen(false)}
        onOk={() => depForm.submit()}
        confirmLoading={addDepMutation.isPending}
        okText={t("versionDetail.addOk")}
        cancelText={t("common.cancel")}
      >
        <Form
          form={depForm}
          layout="vertical"
          initialValues={{ type: "skill" }}
          onFinish={(v: { type: DependencyType; dependency_id: string }) => {
            // Encoded as "<source>:<id>" by the option values below — decode before
            // sending, the API wants source and dependency_id as separate fields.
            const [source, ...rest] = v.dependency_id.split(":");
            addDepMutation.mutate({
              type: v.type,
              source: source as DependencySource,
              dependency_id: rest.join(":"),
            });
          }}
        >
          <Form.Item label={t("common.type")} name="type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "skill", label: "Skill" },
                { value: "mcp", label: "MCP" },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.type !== cur.type}>
            {({ getFieldValue }) => {
              const type: DependencyType = getFieldValue("type");
              // MCP no longer has a separate "registry" source — it resolves against
              // the mcps table directly, now filtered to available (synced) ones, same
              // as the reference PR's approach. Skill keeps the legacy/registry group
              // split (SkillHub Registry is still a distinct external mirror), and also
              // picks up the same available-only filter on its legacy group now that
              // Skill carries a status field too.
              if (type === "mcp") {
                const mcpOptions = (mcpsQuery.data ?? [])
                  .filter((m) => m.status === "available")
                  .map((m) => ({ value: `legacy:${m.id}`, label: `${m.name} v${m.version}` }));
                return (
                  <Form.Item label="MCP" name="dependency_id" rules={[{ required: true }]}>
                    <Select options={mcpOptions} placeholder={t("common.select")} showSearch optionFilterProp="label" />
                  </Form.Item>
                );
              }

              const legacyOptions = (skillsQuery.data ?? [])
                .filter((s) => s.status === "available")
                .map((s) => ({ value: `legacy:${s.id}`, label: `${s.name} v${s.version}` }));
              const registryOptions = (skillhubRegistryQuery.data?.items ?? []).map((i) => ({
                value: `registry:${i.id}`,
                label: `${i.name}${i.version ? ` v${i.version}` : ""}`,
              }));
              const groupedOptions = [
                { label: t("versionDetail.skillsUploaded"), options: legacyOptions },
                { label: t("versionDetail.skillHubSynced"), options: registryOptions },
              ];
              return (
                <Form.Item label="Skill" name="dependency_id" rules={[{ required: true }]}>
                  <Select options={groupedOptions} placeholder={t("common.select")} showSearch optionFilterProp="label" />
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
