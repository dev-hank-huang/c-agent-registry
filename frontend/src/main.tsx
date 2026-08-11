import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import zhTW from "antd/locale/zh_TW";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AuthProvider } from "./auth/AuthContext";
import "./i18n";
import "./global.css";
import "./design-system/tokens.css";
import "./design-system/components.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// Keeps antd's own strings (Table pagination, Empty, default Modal/Popconfirm
// button text, …) in sync with the language picked via the LanguageSwitcher —
// otherwise those fall back to antd's English defaults regardless of what the
// rest of the app is showing.
function Root() {
  const { i18n } = useTranslation();

  return (
    <ConfigProvider
      locale={i18n.language.startsWith("en") ? enUS : zhTW}
      theme={{
        token: {
          colorPrimary: "#4338CA",
          borderRadius: 6,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', Roboto, Helvetica, Arial, sans-serif",
        },
      }}
    >
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
