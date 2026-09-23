import { isZh } from "@/lib/i18n";

/**
 * Chinese has no case to fold: a render site that says
 * `${verb} ${lower(def.label)}` must not call `toLowerCase()` on 日程.
 */
export const lower = (s: string): string => (isZh ? s : s.toLowerCase());

/** `zh-CN` renders 24-hour clocks and 年月日 dates; `en-US` keeps the old 8 PM / Fri, Sep 25. */
export const localeCode = isZh ? "zh-CN" : "en-US";

/** One-off date formatting for cards that have no catalog entry of their own. */
export function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString(localeCode, options);
}

/** One-off time formatting; `hour: "numeric"` is the only shape the cards need. */
export function formatTime(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleTimeString(localeCode, options);
}

/** Number grouping: Chinese uses the same 3-digit grouping as en-US. */
export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(localeCode, options);
}

/**
 * The clock face for one IANA zone. `Intl` is asked directly rather than going
 * through `formatIn` (which the parser layer pins to the en-US 12-hour shape for
 * its own tests), so Chinese gets 24-hour 15:00 instead of 3 PM. Shared by the
 * timezone card and its one-line summary so the two can never disagree.
 */
export function formatZoneTime(tz: string, at: Date): string {
  return new Intl.DateTimeFormat(localeCode, {
    timeZone: tz,
    hour: isZh ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: !isZh,
  }).format(at);
}

/**
 * Words the dashed "Add …" chips type into the input. They have to be in the
 * language the parsers read, so each one is spelled out rather than translated
 * word-for-word: the Chinese connectors are the ones the zh parsers look for.
 */
export const CONNECTORS = {
  at: isZh ? " 在" : " at ",
  with: isZh ? " 和" : " with ",
  on: isZh ? " 用" : " on ",
  to: isZh ? " 去" : " to ",
  everyDay: isZh ? " 每天" : " every day",
  or: isZh ? " 还是" : " or ",
  list: isZh ? "、" : ", ",
  duration: isZh ? " 10分钟" : " 10 min",
} as const;

/** One connector for the "Add …" chips: `connector("at")`. */
export const connector = (key: keyof typeof CONNECTORS): string => CONNECTORS[key];

/**
 * The countdown sentence: "12 days until Christmas" / "距离圣诞节还有 12 天",
 * "3 days since new year" / "元旦已经过去 3 天". Kept in one place so the plural
 * and the Chinese word order are not re-derived per card.
 */
export function formatRemaining(days: number, title: string): string {
  const n = Math.abs(days);
  if (isZh) return days < 0 ? `${title}已经过去 ${n} 天` : `距离${title}还有 ${n} 天`;
  return `${n} ${n === 1 ? "day" : "days"} ${days < 0 ? "since" : "until"} ${title}`;
}
