export function formatDate(iso: string, language: string): string {
  const locale = language === "zh-CN" ? "zh-CN" : "fr-FR";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso + "T12:00:00"));
}