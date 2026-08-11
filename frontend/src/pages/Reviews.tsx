import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Segmented, Table, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { listMyReviews } from "../api/reviews";
import type { Review } from "../api/types";
import { ReviewResultTag } from "../components/tags";
import { useFormatters } from "../lib/relativeTime";

export default function Reviews() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const navigate = useNavigate();
  const [pendingOnly, setPendingOnly] = useState(true);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews-mine", pendingOnly],
    queryFn: () => listMyReviews(pendingOnly),
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            {t("reviews.title")}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t("reviews.description")}
          </Typography.Text>
        </div>
        <Segmented
          value={pendingOnly ? "pending" : "all"}
          onChange={(v) => setPendingOnly(v === "pending")}
          options={[
            { label: t("reviews.pending"), value: "pending" },
            { label: t("reviews.all"), value: "all" },
          ]}
        />
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={reviews}
        pagination={false}
        locale={{ emptyText: pendingOnly ? t("reviews.emptyPending") : t("reviews.emptyAll") }}
        onRow={(record: Review) => ({
          style: { cursor: "pointer" },
          onClick: () => navigate(`/reviews/${record.id}`),
        })}
        columns={[
          { title: t("common.version"), dataIndex: "agent_slug" },
          { title: t("reviews.priorityCol"), dataIndex: "priority" },
          {
            title: t("reviews.submittedAtCol"),
            dataIndex: "created_at",
            render: (v: string) => formatDateTime(v),
          },
          {
            title: t("common.status"),
            dataIndex: "result",
            render: (result: Review["result"]) => <ReviewResultTag result={result} />,
          },
        ]}
      />
    </div>
  );
}
