import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Breadcrumb,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { decideReview, getReview } from "../api/reviews";
import { listFabs, listMcps, listSkills } from "../api/skills";
import { getVersion, listDependencies, listVersionFabs } from "../api/versions";
import { ReviewResultTag, VersionStatusTag } from "../components/tags";

export default function ReviewDetail() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { reviewId } = useParams<{ reviewId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<{ comment?: string }>();

  const reviewQuery = useQuery({
    queryKey: ["review", reviewId],
    queryFn: () => getReview(reviewId!),
    enabled: !!reviewId,
  });

  const versionSlug = reviewQuery.data?.agent_slug;
  const agentSlug = versionSlug?.replace(/-v\d+$/, "");

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
  const skillsQuery = useQuery({ queryKey: ["skills"], queryFn: listSkills });
  const mcpsQuery = useQuery({ queryKey: ["mcps"], queryFn: listMcps });
  const versionFabsQuery = useQuery({
    queryKey: ["version-fabs", versionSlug],
    queryFn: () => listVersionFabs(versionSlug!),
    enabled: !!versionSlug,
  });
  const fabsQuery = useQuery({ queryKey: ["fabs"], queryFn: listFabs });

  const skillNameById = useMemo(
    () => new Map((skillsQuery.data ?? []).map((s) => [s.id, `${s.name} v${s.version}`])),
    [skillsQuery.data],
  );
  const mcpNameById = useMemo(
    () => new Map((mcpsQuery.data ?? []).map((m) => [m.id, `${m.name} v${m.version}`])),
    [mcpsQuery.data],
  );
  const fabNameById = useMemo(
    () => new Map((fabsQuery.data ?? []).map((f) => [f.id, f.fab])),
    [fabsQuery.data],
  );

  const decisionMutation = useMutation({
    mutationFn: ({ result, comment }: { result: "approved" | "rejected"; comment?: string }) =>
      decideReview(reviewId!, result, comment),
    onSuccess: () => {
      message.success(t("reviewDetail.submitResultSuccess"));
      queryClient.invalidateQueries({ queryKey: ["review", reviewId] });
      queryClient.invalidateQueries({ queryKey: ["reviews-mine"] });
      if (versionSlug) {
        queryClient.invalidateQueries({ queryKey: ["version", versionSlug] });
        queryClient.invalidateQueries({ queryKey: ["version-reviews", versionSlug] });
      }
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(msg ?? t("reviewDetail.actionFailed"));
    },
  });

  if (reviewQuery.isLoading || !reviewQuery.data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  const review = reviewQuery.data;
  const version = versionQuery.data;
  const isPending = review.result === "pending";
  const isMyReview = user?.id === review.reviewer_id;
  const canDecide = isPending && (isMyReview || user?.role === "admin");

  const submit = (result: "approved" | "rejected") => {
    const comment = (form.getFieldValue("comment") as string | undefined)?.trim();
    if (result === "rejected" && !comment) {
      form.setFields([{ name: "comment", errors: [t("reviewDetail.commentRequired")] }]);
      return;
    }
    decisionMutation.mutate({ result, comment: comment || undefined });
  };

  return (
    <div>
      <Breadcrumb
        items={[{ title: <Link to="/reviews">{t("reviewDetail.breadcrumb")}</Link> }, { title: versionSlug ?? "…" }]}
        style={{ marginBottom: 8, fontSize: 12.5 }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>
          {t("reviewDetail.title", { slug: versionSlug })}
        </Typography.Title>
        <ReviewResultTag result={review.result} />
      </div>

      <Card title={t("reviewDetail.versionContentTitle")} size="small" style={{ marginBottom: 18 }}>
        {version ? (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
              <Descriptions.Item label={t("common.status")}>
                <VersionStatusTag status={version.status} />
              </Descriptions.Item>
              <Descriptions.Item label={t("reviewDetail.fabsLabel")}>
                {versionFabsQuery.data && versionFabsQuery.data.length > 0 ? (
                  <Space direction="vertical" size={2}>
                    {versionFabsQuery.data.map((f) => (
                      <span key={f.fab_id}>
                        <Tag>{fabNameById.get(f.fab_id) ?? f.fab_id}</Tag>
                        <span style={{ fontFamily: "monospace", fontSize: 12.5, color: "var(--fg-subtle)" }}>
                          {f.url}
                        </span>
                      </span>
                    ))}
                  </Space>
                ) : (
                  <Typography.Text type="secondary">{t("common.none")}</Typography.Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t("reviewDetail.streamingLabel")}>{version.streaming ? t("common.yes") : t("common.no")}</Descriptions.Item>
              <Descriptions.Item label="Input Modes">
                {version.default_input_modes.length ? (
                  <Space wrap>
                    {version.default_input_modes.map((m) => (
                      <Tag key={m}>{m}</Tag>
                    ))}
                  </Space>
                ) : (
                  <Typography.Text type="secondary">{t("common.none")}</Typography.Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Output Modes">
                {version.default_output_modes.length ? (
                  <Space wrap>
                    {version.default_output_modes.map((m) => (
                      <Tag key={m}>{m}</Tag>
                    ))}
                  </Space>
                ) : (
                  <Typography.Text type="secondary">{t("common.none")}</Typography.Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-subtle)", marginBottom: 8 }}>
              {t("reviewDetail.dependenciesTitle")}
            </div>
            {depsQuery.data && depsQuery.data.length > 0 ? (
              <Space wrap style={{ marginBottom: 12 }}>
                {depsQuery.data.map((d) => {
                  const label =
                    d.type === "skill"
                      ? skillNameById.get(d.dependency_id) ?? d.dependency_id
                      : mcpNameById.get(d.dependency_id) ?? d.dependency_id;
                  return (
                    <Tag key={d.id} color={d.type === "mcp" ? "geekblue" : "default"}>
                      {label} <span style={{ opacity: 0.6 }}>{d.type}</span>
                    </Tag>
                  );
                })}
              </Space>
            ) : (
              <Empty
                description={t("reviewDetail.dependenciesEmpty")}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: "8px 0 12px" }}
              />
            )}

            <Link to={`/agents/${agentSlug}/versions/${versionSlug}`}>{t("reviewDetail.viewInAgentDetail")}</Link>
          </>
        ) : (
          <Spin />
        )}
      </Card>

      <Card title={t("reviewDetail.commentsTitle")} size="small">
        {canDecide ? (
          <Form form={form} layout="vertical">
            <Form.Item
              label="Comment"
              name="comment"
              extra={t("reviewDetail.commentExtra")}
            >
              <Input.TextArea rows={4} placeholder={t("reviewDetail.commentPlaceholder")} />
            </Form.Item>
            <Space>
              <Button
                type="primary"
                loading={decisionMutation.isPending}
                onClick={() => submit("approved")}
              >
                {t("reviewDetail.approve")}
              </Button>
              <Button danger loading={decisionMutation.isPending} onClick={() => submit("rejected")}>
                {t("reviewDetail.reject")}
              </Button>
            </Space>
          </Form>
        ) : isPending ? (
          <Typography.Text type="secondary">{t("reviewDetail.notAssigned")}</Typography.Text>
        ) : (
          <div>
            <div style={{ marginBottom: review.comment ? 10 : 0 }}>
              {t("reviewDetail.result")}<ReviewResultTag result={review.result} />
            </div>
            {review.comment && (
              <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                {review.comment}
              </Typography.Paragraph>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
