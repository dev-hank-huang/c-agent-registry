import { LockOutlined, MailOutlined, SafetyOutlined } from "@ant-design/icons";
import { Alert, Button, Divider, Form, Input, Typography } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ssoLoginUrl } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

interface LoginFormValues {
  email: string;
  password: string;
}

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onFinish(values: LoginFormValues) {
    setError(null);
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      navigate("/", { replace: true });
    } catch {
      setError(t("login.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(600px 400px at 15% 10%, var(--color-brand-tint), transparent 60%), var(--bg-surface-2)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(20, 24, 38, 0.12)",
          padding: "36px 32px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--color-brand)",
              color: "var(--fg-on-brand)",
              fontWeight: 700,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            AR
          </div>
          <div>
            <div style={{ fontWeight: 650, fontSize: 16 }}>Agent Registry</div>
            <div style={{ fontSize: 12, color: "var(--fg-subtle)" }}>{t("login.subtitle")}</div>
          </div>
        </div>

        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          {t("login.loginButton")}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 24 }}>
          {t("login.credentialsHint")}
        </Typography.Paragraph>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: t("login.emailRequired") }]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@company.com" size="large" />
          </Form.Item>
          <Form.Item
            label={t("login.passwordLabel")}
            name="password"
            rules={[{ required: true, message: t("login.passwordRequired") }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
            {t("login.loginButton")}
          </Button>
        </Form>

        <Divider plain style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
          {t("login.or")}
        </Divider>

        <Button
          block
          size="large"
          icon={<SafetyOutlined />}
          onClick={() => {
            window.location.href = ssoLoginUrl();
          }}
        >
          {t("login.ssoButton")}
        </Button>
      </div>
    </div>
  );
}
