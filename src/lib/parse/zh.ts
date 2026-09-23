/**
 * Shared Simplified-Chinese helpers for the parsers.
 *
 * `common.ts` is frozen, so anything the Chinese rules need beyond the shared
 * API lives here: width normalization and a small Chinese numeral reader.
 * Both are pure and allocation-cheap — the parsers run on every keystroke.
 */

/** Full-width ASCII (U+FF01–U+FF5E) → half-width; ideographic space → space. */
export function fw(s: string): string {
  return s.replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\u3000/g, " ");
}

const DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  壹: 1,
  二: 2,
  两: 2,
  贰: 2,
  三: 3,
  叁: 3,
  四: 4,
  肆: 4,
  五: 5,
  伍: 5,
  六: 6,
  陆: 6,
  七: 7,
  柒: 7,
  八: 8,
  捌: 8,
  九: 9,
  玖: 9,
};
const SMALL: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };
const BIG: Record<string, number> = { 万: 1e4, 亿: 1e8 };

/** Character class source for a Chinese numeral (use inside a larger regex). */
export const ZH_NUM = "零〇一二三四五六七八九十百千万亿两壹贰叁肆伍陆柒捌玖";

/**
 * `三` → 3, `二十五` → 25, `一百零五` → 105, `半` → 0.5.
 * Returns null for anything that is not a Chinese numeral.
 */
export function zhNumber(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return Number(s);
  if (s === "半") return 0.5;
  let total = 0;
  let section = 0;
  let current = 0;
  let seen = false;
  for (const ch of s) {
    const d = DIGITS[ch];
    if (d !== undefined) {
      current = d;
      seen = true;
      continue;
    }
    const small = SMALL[ch];
    if (small !== undefined) {
      section += (current || 1) * small;
      current = 0;
      seen = true;
      continue;
    }
    const big = BIG[ch];
    if (big !== undefined) {
      total += (section + current) * big;
      section = 0;
      current = 0;
      seen = true;
      continue;
    }
    return null;
  }
  return seen ? total + section + current : null;
}

/** Sentence-final particles that carry no meaning once a field has been read. */
export const ZH_TAIL = /[吗呢吧啊嘛呀哦噢啦]+$/;

/**
 * Drop the spaces that a `replace(…, " ")` leaves between hanzi: Chinese does
 * not separate words, so "读 书" would otherwise reach the card.
 */
export function tightenZh(s: string): string {
  return s
    .replace(/(?<=[\u4e00-\u9fff])[ \t]+(?=[\u4e00-\u9fff])/g, "")
    .replace(/(?<=[\u4e00-\u9fff])[ \t]+(?=[，。！？、；：）】」])/g, "");
}
