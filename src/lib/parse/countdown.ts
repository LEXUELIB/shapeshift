import { pick } from "@/lib/i18n";
import { capitalize, collapse, findDate, hasCJK, removeRange, tidy } from "./common";
import { fw, tightenZh } from "./zh";

export type CountdownData = { title: string; date: Date | null; days: number | null };

/** Fixed-date holidays chrono doesn't know by name: [month (0-based), day]. */
const HOLIDAYS: Record<string, [number, number]> = {
  christmas: [11, 25],
  xmas: [11, 25],
  "christmas eve": [11, 24],
  "new year": [0, 1],
  "new years": [0, 1],
  "new year's": [0, 1],
  "new years eve": [11, 31],
  "new year's eve": [11, 31],
  halloween: [9, 31],
  "valentine's day": [1, 14],
  "valentines day": [1, 14],
  valentines: [1, 14],
  "independence day": [7, 15],
  "republic day": [0, 26],
};

/**
 * Chinese festivals. 元旦/劳动节/国庆/双十一 are fixed; 春节, 除夕, 元宵, 端午
 * and 中秋 follow the lunar calendar, and 清明 is a solar term — those are
 * tabulated per year (2024–2031) because chrono knows none of them.
 */
type Festival = { label: string; fixed?: [number, number]; perYear?: Record<number, [number, number]> };

const FESTIVALS: Record<string, Festival> = {
  元旦: { label: pick("New Year's Day", "元旦"), fixed: [0, 1] },
  春节: {
    label: pick("Spring Festival", "春节"),
    perYear: { 2024: [1, 10], 2025: [0, 29], 2026: [1, 17], 2027: [1, 6], 2028: [0, 26], 2029: [1, 13], 2030: [1, 3], 2031: [0, 23] },
  },
  除夕: {
    label: pick("Chinese New Year's Eve", "除夕"),
    perYear: { 2024: [1, 9], 2025: [0, 28], 2026: [1, 16], 2027: [1, 5], 2028: [0, 25], 2029: [1, 12], 2030: [1, 2], 2031: [0, 22] },
  },
  元宵: {
    label: pick("Lantern Festival", "元宵"),
    perYear: { 2024: [1, 24], 2025: [1, 12], 2026: [2, 3], 2027: [1, 20], 2028: [1, 9], 2029: [1, 27], 2030: [1, 17], 2031: [1, 6] },
  },
  清明: {
    label: pick("Qingming", "清明"),
    perYear: { 2024: [3, 4], 2025: [3, 4], 2026: [3, 5], 2027: [3, 5], 2028: [3, 4], 2029: [3, 4], 2030: [3, 5], 2031: [3, 5] },
  },
  劳动节: { label: pick("Labour Day", "劳动节"), fixed: [4, 1] },
  端午: {
    label: pick("Dragon Boat Festival", "端午"),
    perYear: { 2024: [5, 10], 2025: [4, 31], 2026: [5, 19], 2027: [5, 9], 2028: [4, 28], 2029: [5, 16], 2030: [5, 5], 2031: [5, 24] },
  },
  中秋: {
    label: pick("Mid-Autumn Festival", "中秋"),
    perYear: { 2024: [8, 17], 2025: [9, 6], 2026: [8, 25], 2027: [8, 15], 2028: [9, 3], 2029: [8, 22], 2030: [8, 12], 2031: [9, 1] },
  },
  国庆: { label: pick("National Day", "国庆"), fixed: [9, 1] },
  双十一: { label: pick("Singles' Day", "双十一"), fixed: [10, 11] },
  五一: { label: pick("Labour Day", "劳动节"), fixed: [4, 1] },
  十一: { label: pick("National Day", "国庆"), fixed: [9, 1] },
  过年: {
    label: pick("Spring Festival", "春节"),
    perYear: { 2024: [1, 10], 2025: [0, 29], 2026: [1, 17], 2027: [1, 6], 2028: [0, 26], 2029: [1, 13], 2030: [1, 3], 2031: [0, 23] },
  },
};

const ZH_CLEAN = /距离|距|离|还有|还|倒计时|倒数|多少天|多少|几天|多久|到|是|的|了|呢|吗/g;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function daysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

/** The next occurrence of a per-year date: this year, or next if already past. */
function nextOccurrence(ref: Date, [month, day]: [number, number]) {
  let date = new Date(ref.getFullYear(), month, day);
  if (daysBetween(ref, date) < 0) date = new Date(ref.getFullYear() + 1, month, day);
  return date;
}

export function parseCountdown(text: string, ref: Date = new Date()): CountdownData {
  const src = fw(text);
  let rest = ` ${collapse(src)} `;
  let date: Date | null = null;
  let title = "";

  const names = Object.keys(HOLIDAYS).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const re = new RegExp(`\\b${name.replace(/'/g, "'?")}\\b`, "i");
    const m = rest.match(re);
    if (!m) continue;
    const [month, day] = HOLIDAYS[name];
    date = nextOccurrence(ref, [month, day]);
    title = name.replace(/\b\w/g, (c) => c.toUpperCase()).replace("'S", "'s");
    rest = rest.replace(m[0], " ");
    break;
  }

  if (!date) {
    const keys = Object.keys(FESTIVALS).sort((a, b) => b.length - a.length);
    for (const name of keys) {
      const idx = rest.indexOf(name);
      if (idx < 0) continue;
      const fest = FESTIVALS[name];
      const md = fest.fixed ?? fest.perYear?.[ref.getFullYear()] ?? fest.perYear?.[ref.getFullYear() + 1];
      if (!md) continue;
      date = nextOccurrence(ref, md);
      title = fest.label;
      rest = rest.slice(0, idx) + " " + rest.slice(idx + name.length);
      break;
    }
  }

  if (!date) {
    const hit = findDate(rest, ref);
    if (hit) {
      date = hit.start;
      rest = removeRange(rest, hit.index, hit.text.length);
    }
  }

  if (!title) {
    const zh = hasCJK(src);
    rest = rest.replace(
      /\b(?:how many|days?|weeks?|until|till|til|to go|left|countdown|count down|before|is it|are there|the)\b/gi,
      " ",
    );
    if (zh) rest = rest.replace(ZH_CLEAN, " ");
    rest = rest.replace(/\?/g, " ");
    const cleaned = tidy(rest);
    title = zh ? tightenZh(cleaned) : capitalize(cleaned);
  }

  return { title, date, days: date ? daysBetween(ref, date) : null };
}

export function completeCountdown(d: CountdownData) {
  return (d.date ? 0.7 : 0) + (d.title ? 0.3 : 0);
}
