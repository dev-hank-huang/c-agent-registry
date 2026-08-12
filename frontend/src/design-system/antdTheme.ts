import { theme as antdTheme } from "antd";
import type { ThemeConfig } from "antd";

const SHARED_TOKEN = {
  colorPrimary: "#4338CA",
  borderRadius: 6,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', Roboto, Helvetica, Arial, sans-serif",
};

// Mirrors the semantic tokens in frontend/src/design-system/tokens.css.
// Keep these two objects in sync by hand if those change — antd's theme
// algorithm needs literal color values to derive hover/active shades, it
// can't consume var(--...) references.
const LIGHT_TOKEN = {
  ...SHARED_TOKEN,
  colorBgContainer: "#fbfbfd",
  colorBgLayout: "#f4f5f8",
  colorBorder: "#dcdee6",
  colorBorderSecondary: "#eaebf1",
  colorText: "#14161c",
  colorTextSecondary: "#5b6072",
};

const DARK_TOKEN = {
  ...SHARED_TOKEN,
  colorBgContainer: "#14161c",
  colorBgLayout: "#1b1e26",
  colorBorder: "#343948",
  colorBorderSecondary: "#242833",
  colorText: "#f7f8fa",
  colorTextSecondary: "#b8bdce",
};

export function getAntdThemeConfig(resolvedTheme: "light" | "dark"): ThemeConfig {
  return {
    algorithm: resolvedTheme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: resolvedTheme === "dark" ? DARK_TOKEN : LIGHT_TOKEN,
  };
}
