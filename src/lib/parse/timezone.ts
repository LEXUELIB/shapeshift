import { pick } from "@/lib/i18n";
import { hasCJK } from "./common";
import { fw, ZH_NUM, zhNumber } from "./zh";

export type Zone = { label: string; tz: string };
export type TimezoneData = {
  /** The instant being converted (now when no time was given). */
  instant: Date | null;
  isNow: boolean;
  from: Zone;
  to: Zone | null;
};

/**
 * Abbreviations and cities → IANA zones. Labels are what the card shows.
 *
 * `cst` is deliberately ambiguous: for Chinese text it means China Standard
 * Time, not US Central — see `resolveZone`.
 */
export const ZONES: Record<string, Zone> = {
  pst: { label: "PT", tz: "America/Los_Angeles" },
  pdt: { label: "PT", tz: "America/Los_Angeles" },
  pt: { label: "PT", tz: "America/Los_Angeles" },
  "san francisco": { label: "San Francisco", tz: "America/Los_Angeles" },
  sf: { label: "San Francisco", tz: "America/Los_Angeles" },
  "los angeles": { label: "Los Angeles", tz: "America/Los_Angeles" },
  la: { label: "Los Angeles", tz: "America/Los_Angeles" },
  seattle: { label: "Seattle", tz: "America/Los_Angeles" },
  mst: { label: "MT", tz: "America/Denver" },
  denver: { label: "Denver", tz: "America/Denver" },
  cst: { label: "CT", tz: "America/Chicago" },
  chicago: { label: "Chicago", tz: "America/Chicago" },
  est: { label: "ET", tz: "America/New_York" },
  edt: { label: "ET", tz: "America/New_York" },
  et: { label: "ET", tz: "America/New_York" },
  "new york": { label: "New York", tz: "America/New_York" },
  nyc: { label: "New York", tz: "America/New_York" },
  toronto: { label: "Toronto", tz: "America/Toronto" },
  utc: { label: "UTC", tz: "UTC" },
  gmt: { label: "GMT", tz: "Europe/London" },
  london: { label: "London", tz: "Europe/London" },
  bst: { label: "London", tz: "Europe/London" },
  cet: { label: "CET", tz: "Europe/Paris" },
  paris: { label: "Paris", tz: "Europe/Paris" },
  berlin: { label: "Berlin", tz: "Europe/Berlin" },
  amsterdam: { label: "Amsterdam", tz: "Europe/Amsterdam" },
  dubai: { label: "Dubai", tz: "Asia/Dubai" },
  ist: { label: "IST", tz: "Asia/Kolkata" },
  india: { label: "India", tz: "Asia/Kolkata" },
  mumbai: { label: "Mumbai", tz: "Asia/Kolkata" },
  delhi: { label: "Delhi", tz: "Asia/Kolkata" },
  bangalore: { label: "Bangalore", tz: "Asia/Kolkata" },
  bengaluru: { label: "Bengaluru", tz: "Asia/Kolkata" },
  singapore: { label: "Singapore", tz: "Asia/Singapore" },
  sgt: { label: "Singapore", tz: "Asia/Singapore" },
  "hong kong": { label: "Hong Kong", tz: "Asia/Hong_Kong" },
  tokyo: { label: "Tokyo", tz: "Asia/Tokyo" },
  jst: { label: "Tokyo", tz: "Asia/Tokyo" },
  seoul: { label: "Seoul", tz: "Asia/Seoul" },
  sydney: { label: "Sydney", tz: "Australia/Sydney" },
  aest: { label: "Sydney", tz: "Australia/Sydney" },
  auckland: { label: "Auckland", tz: "Pacific/Auckland" },
  // ── Chinese names ──────────────────────────────────────────
  中国: { label: pick("China", "中国"), tz: "Asia/Shanghai" },
  北京时间: { label: pick("Beijing time", "北京时间"), tz: "Asia/Shanghai" },
  北京: { label: pick("Beijing", "北京"), tz: "Asia/Shanghai" },
  上海: { label: pick("Shanghai", "上海"), tz: "Asia/Shanghai" },
  深圳: { label: pick("Shenzhen", "深圳"), tz: "Asia/Shanghai" },
  广州: { label: pick("Guangzhou", "广州"), tz: "Asia/Shanghai" },
  杭州: { label: pick("Hangzhou", "杭州"), tz: "Asia/Shanghai" },
  成都: { label: pick("Chengdu", "成都"), tz: "Asia/Shanghai" },
  香港: { label: pick("Hong Kong", "香港"), tz: "Asia/Hong_Kong" },
  台北: { label: pick("Taipei", "台北"), tz: "Asia/Taipei" },
  东京: { label: pick("Tokyo", "东京"), tz: "Asia/Tokyo" },
  首尔: { label: pick("Seoul", "首尔"), tz: "Asia/Seoul" },
  新加坡: { label: pick("Singapore", "新加坡"), tz: "Asia/Singapore" },
  纽约: { label: pick("New York", "纽约"), tz: "America/New_York" },
  洛杉矶: { label: pick("Los Angeles", "洛杉矶"), tz: "America/Los_Angeles" },
  旧金山: { label: pick("San Francisco", "旧金山"), tz: "America/Los_Angeles" },
  西雅图: { label: pick("Seattle", "西雅图"), tz: "America/Los_Angeles" },
  芝加哥: { label: pick("Chicago", "芝加哥"), tz: "America/Chicago" },
  多伦多: { label: pick("Toronto", "多伦多"), tz: "America/Toronto" },
  伦敦: { label: pick("London", "伦敦"), tz: "Europe/London" },
  巴黎: { label: pick("Paris", "巴黎"), tz: "Europe/Paris" },
  柏林: { label: pick("Berlin", "柏林"), tz: "Europe/Berlin" },
  莫斯科: { label: pick("Moscow", "莫斯科"), tz: "Europe/Moscow" },
  迪拜: { label: pick("Dubai", "迪拜"), tz: "Asia/Dubai" },
  印度: { label: pick("India", "印度"), tz: "Asia/Kolkata" },
  孟买: { label: pick("Mumbai", "孟买"), tz: "Asia/Kolkata" },
  德里: { label: pick("Delhi", "德里"), tz: "Asia/Kolkata" },
  悉尼: { label: pick("Sydney", "悉尼"), tz: "Australia/Sydney" },
  奥克兰: { label: pick("Auckland", "奥克兰"), tz: "Pacific/Auckland" },
};

const SHANGHAI: Zone = { label: pick("Beijing", "北京"), tz: "Asia/Shanghai" };
const CHICAGO: Zone = ZONES.cst;

const ZONE_PATTERN = Object.keys(ZONES)
  .sort((a, b) => b.length - a.length)
  .map((z) => z.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
/**
 * `\b` cannot separate a Chinese zone name from the hanzi around it, so the
 * ASCII keys are guarded with lookarounds instead — 北京下午3点 still matches.
 */
const ZONE_RE = new RegExp(`(?<![a-z])(${ZONE_PATTERN})(?![a-z])`, "gi");

/** `cst` means China Standard Time in Chinese text, US Central otherwise. */
function resolveZone(key: string, zh: boolean): Zone {
  if (key === "cst") return zh ? SHANGHAI : CHICAGO;
  return ZONES[key];
}

export function localZone(): Zone {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return { label: pick("Local", "本地"), tz };
}

/** Minutes the zone is ahead of UTC at that instant. */
export function tzOffset(tz: string, at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** Calendar date (y/m/d) of an instant as seen in a zone. */
function ymdIn(tz: string, at: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(at).map((x) => [x.type, x.value]),
  );
  return { y: +p.year, m: +p.month - 1, d: +p.day };
}

/** The instant when the wall clock in `tz` reads h:m on the zone's current date. */
export function wallTimeToInstant(tz: string, h: number, m: number, ref: Date) {
  const { y, m: mo, d } = ymdIn(tz, ref);
  const guess = Date.UTC(y, mo, d, h, m);
  let at = new Date(guess - tzOffset(tz, new Date(guess)) * 60_000);
  at = new Date(guess - tzOffset(tz, at) * 60_000); // settle across DST edges
  return at;
}

/**
 * NB: kept on the `en-US` shape ("3:00 PM") because the existing suite pins it.
 * The card itself formats with the build locale (see TimezoneCard) and so
 * already shows a 24-hour face under zh.
 */
export function formatIn(tz: string, at: Date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(at);
}

/** −1, 0 or +1: which day the target sees relative to the source. */
export function dayShift(fromTz: string, toTz: string, at: Date) {
  const a = ymdIn(fromTz, at);
  const b = ymdIn(toTz, at);
  return Math.sign(Date.UTC(b.y, b.m, b.d) - Date.UTC(a.y, a.m, a.d));
}

/** `下午3点` / `上午9点半` / `晚上八点一刻` → hour and minute. */
function zhClock(t: string): [number, number] | null {
  const m = t.match(
    new RegExp(`(上午|早上|早晨|凌晨|中午|下午|傍晚|晚上|夜里)?\\s*([${ZH_NUM}\\d]+)\\s*[点时](?:(半)|(\\d{1,2})\\s*分|(一刻)|(三刻))?`),
  );
  if (!m) return null;
  const raw = zhNumber(m[2]);
  if (raw === null || !Number.isFinite(raw)) return null;
  let h = Math.floor(raw);
  const period = m[1];
  if (period === "下午" || period === "晚上" || period === "傍晚") {
    if (h < 12) h += 12;
  } else if (period === "中午") {
    if (h < 6) h += 12;
  } else if (period === "凌晨") {
    if (h === 12) h = 0;
  }
  const min = m[3] ? 30 : m[5] ? 15 : m[6] ? 45 : m[4] ? Number(m[4]) : 0;
  return [h % 24, min];
}

export function parseTimezone(text: string, ref: Date = new Date()): TimezoneData {
  const t = fw(text).toLowerCase();
  const zh = hasCJK(t);
  const hits = [...t.matchAll(ZONE_RE)].map((m) => ({ key: m[1], zone: resolveZone(m[1], zh), index: m.index ?? 0 }));

  const time = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(\d{1,2}):(\d{2})\b|\b(noon|midnight)\b/);
  let hm: [number, number] | null = null;
  if (time) {
    if (time[6]) hm = time[6] === "noon" ? [12, 0] : [0, 0];
    else if (time[3]) {
      let h = Number(time[1]) % 12;
      if (time[3] === "pm") h += 12;
      hm = [h, Number(time[2] ?? 0)];
    } else hm = [Number(time[4]), Number(time[5])];
  }
  if (!hm && zh) hm = zhClock(t);

  // "3pm pst in ist" → pst → ist.
  // One zone: "in/to tokyo" (or no time given) converts local → tokyo; "3pm pst" reads pst → local.
  let from: Zone;
  let to: Zone | null;
  if (hits.length >= 2) {
    from = hits[0].zone;
    to = hits[1].zone;
  } else if (hits.length === 1) {
    const before = t.slice(0, hits[0].index).trimEnd();
    const isTarget = /\b(?:in|to|into|for|at)$|(?:换成|换为|转成|换算成|转换|到|去)$/.test(before) || !hm;
    from = isTarget ? localZone() : hits[0].zone;
    to = isTarget ? hits[0].zone : localZone();
  } else {
    from = localZone();
    to = null;
  }

  const instant = hm ? wallTimeToInstant(from.tz, hm[0], hm[1], ref) : ref;
  return { instant, isNow: !hm, from, to };
}

export function completeTimezone(d: TimezoneData) {
  return (d.to ? 0.7 : 0) + (d.isNow ? 0.1 : 0.3);
}
