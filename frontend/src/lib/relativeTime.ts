// Shared by every dense list surface that shows a relative "updated 3 minutes
// ago" timestamp (Browse, Registry status panels, …) and by anything that
// prints an absolute date/time — pulled into one hook so every page's
// formatting flips languages together instead of each page hand-rolling its
// own copy (or, worse, letting the browser's locale decide instead of the
// language the user picked in the app).
import { useTranslation } from "react-i18next";

function localeTag(language: string): string {
  return language.startsWith("en") ? "en-US" : "zh-TW";
}

export function useFormatters() {
  const { t, i18n } = useTranslation();
  const locale = localeTag(i18n.language);

  function formatDate(iso: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
  }

  function formatDateTime(iso: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  }

  function formatRelativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t("relativeTime.justNow");
    if (mins < 60) return t("relativeTime.minutesAgo", { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("relativeTime.hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t("relativeTime.daysAgo", { count: days });
    return formatDate(iso);
  }

  return { formatDate, formatDateTime, formatRelativeTime };
}
