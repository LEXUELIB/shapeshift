import * as chrono from "chrono-node";

export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const titleCase = (s: string) =>
  s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => capitalize(w))
    .join(" ");

export const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Han, kana and hangul. Used to decide which language pack a string should be
 * parsed with — the parsers and the offline classifier both run per keystroke,
 * so the choice has to be cheap and allocation-free.
 */
export const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;
export const hasCJK = (s: string) => CJK_RE.test(s);

/** Strip dangling connector words left behind after removing a phrase. */
export function tidy(s: string) {
  // NB: the hyphen must stay last in the class — `:-，` would parse as a range
  // reaching from ":" all the way to U+FF0C and eat every hanzi in between.
  let out = collapse(s.replace(/[,;，、。；：]+\s*$/g, "").replace(/^\s*[,;:，、。；：\-]+/g, ""));
  const dangling = /\s*(?:on|at|by|for|with|to|in|and|the|this|next|from|every)$/i;
  const leading = /^(?:on|at|by|for|and|the|to)\s+/i;
  const zhDangling = /(?:在|于|和|与|跟|从|到|的|了|吧|呢|啊)+$/;
  const zhLeading = /^(?:在|于|和|与|跟|从|到)+/;
  for (let i = 0; i < 4; i++) {
    const next = out
      .replace(dangling, "")
      .replace(leading, "")
      .replace(zhDangling, "")
      .replace(zhLeading, "");
    if (next === out) break;
    out = next;
  }
  return out.trim();
}

export type Currency = "₹" | "$" | "€" | "£" | "¥";
export const DEFAULT_CURRENCY: Currency = "₹";

/**
 * Currency wins in this order: an explicit symbol in the text, then the script
 * of the text (Chinese input with no symbol means ¥), then the built-in default.
 * Chinese amounts put the symbol or the unit *after* the number, so both
 * `¥45` and `45元` have to resolve to the same currency.
 */
export function detectCurrency(text: string): Currency {
  if (/[¥￥]|\bcny\b|\brmb\b|元|块|人民币/.test(text)) return "¥";
  if (/\$|\busd\b|dollars?\b/i.test(text)) return "$";
  if (/€|\beur(os?)?\b/i.test(text)) return "€";
  if (/£|\bgbp\b|pounds? sterling/i.test(text)) return "£";
  return hasCJK(text) ? "¥" : DEFAULT_CURRENCY;
}

/** Magnitude suffixes: `2k` / `2w` / `3万` / `1.5亿`. */
const MAGNITUDE: Record<string, number> = { k: 1e3, w: 1e3, 万: 1e4, 亿: 1e8 };

export const AMOUNT_RE =
  /(?:¥|￥|₹|rs\.?|inr|\$|usd|€|eur|£|gbp|cny|rmb)?\s?(\d[\d,]*(?:\.\d+)?)\s*(亿|万|k\b|w\b|元|块|人民币)?/i;

export function toNumber(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

/** Find the first money-like amount in the text. */
export function findAmount(text: string): { value: number; index: number; length: number } | null {
  const re = new RegExp(AMOUNT_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = toNumber(m[1]);
    if (!Number.isFinite(n)) continue;
    const scale = m[2] ? MAGNITUDE[m[2].toLowerCase()] ?? MAGNITUDE[m[2]] ?? 1 : 1;
    return { value: n * scale, index: m.index, length: m[0].length };
  }
  return null;
}

export type DateHit = {
  start: Date;
  end: Date | null;
  hasTime: boolean;
  text: string;
  index: number;
};

/**
 * Chinese date engine: `chrono.zh.casual` plus the two gaps it leaves —
 * 后天/大后天 and 周末. Kept as a module singleton; cloning per call would
 * rebuild the whole refiner chain on every keystroke.
 */
const zhChrono = (() => {
  const c = chrono.zh.casual.clone();
  c.parsers.push({
    pattern: () => /(大后天|后天)/g,
    extract: (context, match) => {
      const offset = match[1] === "大后天" ? 3 : 2;
      const d = new Date(context.refDate);
      d.setDate(d.getDate() + offset);
      return context.createParsingResult(match.index ?? 0, match[0], {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
      });
    },
  });
  c.parsers.push({
    pattern: () => /(这|本|下)?周末/g,
    extract: (context, match) => {
      const d = new Date(context.refDate);
      // Saturday of the week implied by 这/本 (current) or 下 (next).
      let ahead = (6 - d.getDay() + 7) % 7;
      if (match[1] === "下") ahead += 7;
      else if (ahead === 0) ahead = 7;
      d.setDate(d.getDate() + ahead);
      return context.createParsingResult(match.index ?? 0, match[0], {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
      });
    },
  });
  return c;
})();

export function findDate(text: string, ref: Date = new Date()): DateHit | null {
  // Mixed input ("明天 3pm") is common: ask both engines and take the leftmost hit.
  const results = hasCJK(text)
    ? [...zhChrono.parse(text, ref, { forwardDate: true }), ...chrono.casual.parse(text, ref, { forwardDate: true })].sort(
        (a, b) => a.index - b.index,
      )
    : chrono.parse(text, ref, { forwardDate: true });
  if (!results.length) return null;
  const r = results[0];
  // chrono is happy to read a bare number as a date; require something date-like.
  if (/^\d+$/.test(r.text.trim())) return null;

  let start = r.start.date();
  let hasTime = r.start.isCertain("hour");
  let matched = r.text;

  // "明天 3pm": the Chinese engine finds the day, the English engine finds the
  // clock. Neither result is complete, so graft the time onto the day.
  if (hasCJK(text) && !hasTime) {
    const timed = results.find((x) => x.start.isCertain("hour"));
    if (timed) {
      start = new Date(start);
      start.setHours(timed.start.get("hour") ?? 0, timed.start.get("minute") ?? 0, 0, 0);
      hasTime = true;
      // `r` is leftmost, so the timed hit can only be the same or further right.
      matched = text.slice(r.index, Math.max(r.index + r.text.length, timed.index + timed.text.length));
    }
  }

  return { start, end: r.end ? r.end.date() : null, hasTime, text: matched, index: r.index };
}

export function removeRange(text: string, index: number, length: number) {
  return text.slice(0, index) + " " + text.slice(index + length);
}

/**
 * List separators. `STRONG` is safe anywhere; `WEAK` also splits on 和/跟/与/以及
 * and is only for parsers that already know they are reading a list (checklist,
 * poll, random pick), where 和 inside a compound word is not a concern.
 */
export const LIST_STRONG_RE = /\s*(?:,|;|、|，|；|\n|&|\band\b)\s*/i;
export const LIST_WEAK_RE = /\s*(?:,|;|、|，|；|\n|&|\band\b|以及|和|跟|与)\s*/i;

export function formatAmount(n: number, currency: Currency = DEFAULT_CURRENCY) {
  const locale = currency === "₹" ? "en-IN" : currency === "¥" ? "zh-CN" : "en-US";
  const rounded = Math.round(n * 100) / 100;
  return (
    currency +
    rounded.toLocaleString(locale, {
      minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}
