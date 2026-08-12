import { Alert, Spin } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { setToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function SsoCallback() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = fragment.get("access_token");
    if (!token) {
      setError(t("sso.error"));
      return;
    }
    setToken(token);
    refresh().then(() => navigate("/", { replace: true }));
  }, [navigate, refresh, t]);

  return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
      {error ? <Alert type="error" message={error} showIcon /> : <Spin size="large" tip={t("sso.loading")} />}
    </div>
  );
}
