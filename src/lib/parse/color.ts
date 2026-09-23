import type { ColorMood } from "@/lib/jev/types";
import { hexToOklch, oklchToHex, rgbToHex } from "@/lib/color";
import { CJK_RE } from "./common";

export type ColorData = {
  hex: string | null;
  name: string | null;
  source: "hex" | "rgb" | "named" | "mood" | null;
};

export const NAMED_COLORS: Record<string, string> = {
  red: "#e03131",
  crimson: "#c2255c",
  scarlet: "#f03e3e",
  maroon: "#862e2e",
  burgundy: "#7a1f3d",
  pink: "#f06595",
  rose: "#e64980",
  coral: "#ff7f6b",
  salmon: "#fa8072",
  peach: "#ffb38a",
  orange: "#ff7a1a",
  tangerine: "#ff8c2b",
  amber: "#f59f00",
  gold: "#e8b000",
  yellow: "#fcc419",
  mustard: "#d4a017",
  lemon: "#fff06a",
  cream: "#f7f0dc",
  beige: "#e8dcc4",
  sand: "#d8c49c",
  tan: "#c9a77c",
  brown: "#8b5a2b",
  chocolate: "#5d3a1a",
  olive: "#808a2f",
  lime: "#82c91e",
  green: "#2f9e44",
  sage: "#9caf88",
  mint: "#96f2d7",
  emerald: "#0ca678",
  forest: "#2b5c34",
  teal: "#0c8599",
  turquoise: "#22b8cf",
  cyan: "#15aabf",
  sky: "#74c0fc",
  blue: "#1c7ed6",
  navy: "#1b2a5c",
  cobalt: "#2451b7",
  indigo: "#4c6ef5",
  violet: "#7950f2",
  purple: "#7048e8",
  lavender: "#b197fc",
  lilac: "#c8a2c8",
  magenta: "#d6336c",
  plum: "#8e4585",
  grey: "#868e96",
  gray: "#868e96",
  slate: "#5c6b7a",
  charcoal: "#343a40",
  black: "#141414",
  white: "#fafaf9",
  ivory: "#fffff0",
};

/**
 * Specific references with a known color: pop culture, brands, gems and compound names.
 * Unambiguous enough that the offline classifier treats them as a strong color signal.
 */
export const REFERENCE_COLORS: Record<string, string> = {
  "minecraft diamond": "#4aedd9",
  "minecraft grass": "#7cbd6b",
  "minecraft emerald": "#17dd62",
  "minecraft gold": "#fcee4b",
  "minecraft redstone": "#ff0000",
  "tiffany blue": "#0abab5",
  tiffany: "#0abab5",
  "barbie pink": "#e0218a",
  barbie: "#e0218a",
  "spotify green": "#1db954",
  "coca cola red": "#f40009",
  "coke red": "#f40009",
  "netflix red": "#e50914",
  "facebook blue": "#1877f2",
  "twitter blue": "#1da1f2",
  "instagram pink": "#e1306c",
  "discord blurple": "#5865f2",
  blurple: "#5865f2",
  "starbucks green": "#00704a",
  "ferrari red": "#ff2800",
  "ikea blue": "#0058a3",
  "ikea yellow": "#ffda1a",
  "mcdonalds yellow": "#ffc72c",
  "hermes orange": "#f37021",
  "klein blue": "#002fa7",
  "millennial pink": "#f3cfc6",
  "matrix green": "#00ff41",
  "shrek green": "#b5c91f",
  "minion yellow": "#fce029",
  "pikachu yellow": "#f6d02f",
  pikachu: "#f6d02f",
  "hulk green": "#5ba331",
  "smurf blue": "#3d8ed9",
  "barney purple": "#7a3fa0",
  diamond: "#b9f2ff",
  ruby: "#e0115f",
  sapphire: "#0f52ba",
  amethyst: "#9966cc",
  jade: "#00a86b",
  topaz: "#ffc87c",
  pearl: "#eae0c8",
  onyx: "#353839",
  "sky blue": "#87ceeb",
  "baby blue": "#89cff0",
  "baby pink": "#f4c2c2",
  "hot pink": "#ff69b4",
  "neon green": "#39ff14",
  "electric blue": "#7df9ff",
  "midnight blue": "#191970",
  "forest green": "#228b22",
  "blood red": "#8a0303",
  "brick red": "#b22222",
  "royal blue": "#4169e1",
  "powder blue": "#b0e0e6",
  "army green": "#4b5320",
  "hunter green": "#355e3b",
  "burnt orange": "#cc5500",
  "rose gold": "#b76e79",
  "dusty rose": "#c4a4a7",
  "off white": "#f5f5f0",
  "off-white": "#f5f5f0",
  terracotta: "#e2725b",
  denim: "#1560bd",
  champagne: "#f7e7ce",
  copper: "#b87333",
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  blush: "#de5d83",
};

/** Everyday words that name a color only in context ("coffee" is usually a drink). Parser-only. */
export const EVOCATIVE_COLORS: Record<string, string> = {
  ocean: "#1f6f8b",
  sea: "#2e8bc0",
  grass: "#5fa641",
  lava: "#cf1020",
  sunset: "#fd5e53",
  sunflower: "#ffc512",
  cherry: "#d2042d",
  wine: "#722f37",
  coffee: "#6f4e37",
  mocha: "#967969",
  latte: "#c5a582",
  rust: "#b7410e",
  eggplant: "#614051",
  avocado: "#568203",
  pistachio: "#93c572",
  flamingo: "#fc8eac",
  bubblegum: "#ffc1cc",
  snow: "#fffafa",
  fire: "#e25822",
  blood: "#8a0303",
  sky: "#87ceeb",
};

/**
 * Chinese colour words. Hanzi have no word boundaries, so these are matched by
 * scanning for the longest name that ends furthest right in the text — the
 * equivalent of the "last word wins" rule used for English.
 * Longer compounds (天蓝, 薄荷绿, 藏青) therefore beat their head character.
 */
export const ZH_NAMED_COLORS: Record<string, string> = {
  大红: "#f03e3e",
  朱红: "#f03e3e",
  玫瑰红: "#e64980",
  粉红: "#f06595",
  桃红: "#ff7f6b",
  珊瑚红: "#ff7f6b",
  珊瑚: "#ff7f6b",
  酒红: "#722f37",
  砖红: "#b22222",
  中国红: "#f40009",
  红: "#e03131",
  樱花粉: "#f4c2c2",
  芭比粉: "#e0218a",
  荧光粉: "#ff69b4",
  粉: "#f06595",
  橘黄: "#ff8c2b",
  橘: "#ff7a1a",
  橙: "#ff7a1a",
  柠檬黄: "#fff06a",
  芥末黄: "#d4a017",
  米黄: "#f7f0dc",
  奶油色: "#f7f0dc",
  黄: "#fcc419",
  米色: "#e8dcc4",
  奶茶色: "#c5a582",
  沙色: "#d8c49c",
  驼色: "#c9a77c",
  咖啡色: "#6f4e37",
  巧克力色: "#5d3a1a",
  棕: "#8b5a2b",
  橄榄绿: "#808a2f",
  草绿: "#82c91e",
  薄荷绿: "#96f2d7",
  翡翠绿: "#0ca678",
  森林绿: "#2b5c34",
  墨绿: "#2b5c34",
  青绿: "#0ca678",
  松石绿: "#22b8cf",
  抹茶绿: "#93c572",
  绿: "#2f9e44",
  天青: "#15aabf",
  青: "#0c8599",
  天蓝: "#74c0fc",
  深蓝: "#1b2a5c",
  藏青: "#1b2a5c",
  藏蓝: "#1b2a5c",
  宝蓝: "#2451b7",
  蒂芙尼蓝: "#0abab5",
  靛蓝: "#4c6ef5",
  灰蓝: "#5c6b7a",
  蓝灰: "#5c6b7a",
  蓝: "#1c7ed6",
  紫罗兰: "#7950f2",
  薰衣草: "#b197fc",
  丁香紫: "#c8a2c8",
  梅红: "#8e4585",
  洋红: "#d6336c",
  紫: "#7048e8",
  炭黑: "#343a40",
  灰: "#868e96",
  黑: "#141414",
  象牙白: "#fffff0",
  白: "#fafaf9",
  银: "#c0c0c0",
  香槟金: "#f7e7ce",
  玫瑰金: "#b76e79",
  古铜: "#cd7f32",
  铜: "#b87333",
  金: "#e8b000",
};

const ZH_COLOR_KEYS = Object.keys(ZH_NAMED_COLORS).sort((a, b) => b.length - a.length);

/** Longest Chinese colour name ending furthest right ("天蓝色" → 天蓝). */
function zhColor(text: string): { name: string; hex: string } | null {
  let best: { name: string; hex: string; end: number } | null = null;
  for (const key of ZH_COLOR_KEYS) {
    const idx = text.lastIndexOf(key);
    if (idx < 0) continue;
    const end = idx + key.length;
    if (!best || end > best.end || (end === best.end && key.length > best.name.length)) {
      best = { name: key, hex: ZH_NAMED_COLORS[key], end };
    }
  }
  return best ? { name: best.name, hex: best.hex } : null;
}

const escape = (k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[ -]/g, "[\\s-]?");
const phraseRe = (table: Record<string, string>) =>
  new RegExp(`\\b(${Object.keys(table).sort((a, b) => b.length - a.length).map(escape).join("|")})\\b`, "gi");
export const REFERENCE_RE = phraseRe(REFERENCE_COLORS);
const EVOCATIVE_RE = phraseRe(EVOCATIVE_COLORS);

const normalizeKey = (m: string) => m.toLowerCase().replace(/[\s-]+/g, " ");

/** The last matching phrase wins ("a sunset like a ruby" → ruby). */
function lastPhrase(text: string, re: RegExp, table: Record<string, string>) {
  let found: string | null = null;
  for (const m of text.matchAll(re)) {
    const key = normalizeKey(m[1]);
    const hit = key in table ? key : key.replace(/ /g, "-") in table ? key.replace(/ /g, "-") : null;
    if (hit) found = hit;
  }
  return found;
}

const MOOD_BASE: Record<ColorMood, string> = {
  warm: "#f76707",
  cool: "#3b5bdb",
  neutral: "#b8b2a7",
  vivid: "#f2206c",
  pastel: "#a5d8ff",
  dark: "#1f2a44",
};

function modifiers(text: string, hex: string) {
  const o = hexToOklch(hex);
  if (!o) return hex;
  if (/\b(light|pale|soft|pastel|baby)\b/i.test(text) || /浅|淡|柔和|淡雅|浅色|淡色|粉彩/.test(text))
    return oklchToHex({ l: Math.max(o.l, 0.86), c: o.c * 0.55, h: o.h });
  if (/\b(dark|deep|midnight)\b/i.test(text) || /深|暗|浓|墨色|深色|暗色/.test(text))
    return oklchToHex({ l: Math.min(o.l, 0.38), c: o.c * 0.85, h: o.h });
  if (/\b(bright|neon|vivid|electric)\b/i.test(text) || /亮|荧光|鲜艳|鲜亮|明艳|明亮/.test(text))
    return oklchToHex({ l: o.l, c: o.c * 1.25, h: o.h });
  if (/\b(muted|dusty|faded)\b/i.test(text) || /灰|做旧|低饱和|莫兰迪/.test(text))
    return oklchToHex({ l: o.l, c: o.c * 0.5, h: o.h });
  return hex;
}

export function parseColor(text: string, mood?: ColorMood | null): ColorData {
  const hex = text.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    return { hex: `#${h.toLowerCase()}`, name: null, source: "hex" };
  }
  const rgb = text.match(/rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i);
  if (rgb) {
    return { hex: rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3])), name: null, source: "rgb" };
  }
  // Specific references beat plain names: "minecraft diamond", "tiffany blue".
  const ref = lastPhrase(text, REFERENCE_RE, REFERENCE_COLORS);
  if (ref) return { hex: REFERENCE_COLORS[ref], name: ref, source: "named" };

  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  // Prefer the last color word ("a warm sunset orange" → orange).
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    const key = w in NAMED_COLORS ? w : w.endsWith("ish") && w.slice(0, -3) in NAMED_COLORS ? w.slice(0, -3) : null;
    if (key) {
      return { hex: modifiers(text, NAMED_COLORS[key]), name: key, source: "named" };
    }
  }
  const evocative = lastPhrase(text, EVOCATIVE_RE, EVOCATIVE_COLORS);
  if (evocative) return { hex: modifiers(text, EVOCATIVE_COLORS[evocative]), name: evocative, source: "named" };
  // Chinese names are matched boundary-free, so they run after the ASCII rules.
  const zh = text.match(CJK_RE) ? zhColor(text) : null;
  if (zh) return { hex: modifiers(text, zh.hex), name: zh.name, source: "named" };
  if (mood) return { hex: modifiers(text, MOOD_BASE[mood]), name: null, source: "mood" };
  return { hex: null, name: null, source: null };
}

export function completeColor(d: ColorData) {
  return d.source === "hex" || d.source === "rgb" ? 1 : d.source === "named" ? 0.8 : d.source === "mood" ? 0.5 : 0;
}
