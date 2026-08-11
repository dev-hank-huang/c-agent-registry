import { Segmented } from "antd";
import { Monitor, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ThemeMode } from "../theme/ThemeContext";
import { useTheme } from "../theme/ThemeContext";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();

  const options: { value: ThemeMode; icon: ReactNode; title: string }[] = [
    { value: "light", icon: <Sun size={14} />, title: t("nav.themeLight") },
    { value: "dark", icon: <Moon size={14} />, title: t("nav.themeDark") },
    { value: "system", icon: <Monitor size={14} />, title: t("nav.themeSystem") },
  ];

  return (
    <Segmented
      aria-label={t("nav.theme")}
      value={mode}
      onChange={(value) => setMode(value as ThemeMode)}
      options={options.map(({ value, icon, title }) => ({
        value,
        label: (
          <span title={title} aria-label={title}>
            {icon}
          </span>
        ),
      }))}
    />
  );
}
