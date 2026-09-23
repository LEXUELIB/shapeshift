import convert from "convert-units";
import { pick } from "@/lib/i18n";
import { fw } from "./zh";

export type ConvertData = {
  value: number | null;
  from: string | null;
  to: string | null;
  result: number | null;
};

/** Aliases → convert-units abbreviations. Chinese names map onto the same keys. */
export const UNIT_ALIASES: Record<string, string> = {
  km: "km", kms: "km", kilometer: "km", kilometers: "km", kilometre: "km", kilometres: "km",
  mi: "mi", mile: "mi", miles: "mi",
  m: "m", meter: "m", meters: "m", metre: "m", metres: "m",
  cm: "cm", centimeter: "cm", centimeters: "cm", centimetre: "cm", centimetres: "cm",
  mm: "mm", millimeter: "mm", millimeters: "mm",
  ft: "ft", foot: "ft", feet: "ft",
  in: "in", inch: "in", inches: "in",
  yd: "yd", yard: "yd", yards: "yd",
  kg: "kg", kgs: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg",
  g: "g", gram: "g", grams: "g",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  oz: "oz", ounce: "oz", ounces: "oz",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  gal: "gal", gallon: "gal", gallons: "gal",
  cup: "cup", cups: "cup",
  c: "C", "°c": "C", celsius: "C", centigrade: "C",
  f: "F", "°f": "F", fahrenheit: "F",
  k: "K", kelvin: "K",
  "km/h": "km/h", kmh: "km/h", kph: "km/h",
  mph: "m/h",
  // ── Chinese ────────────────────────────────────────────────
  公里: "km", 千米: "km",
  英里: "mi",
  米: "m",
  厘米: "cm", 公分: "cm",
  毫米: "mm",
  英尺: "ft",
  英寸: "in",
  码: "yd",
  公斤: "kg", 千克: "kg",
  克: "g",
  斤: "斤", 两: "两",
  磅: "lb",
  盎司: "oz",
  升: "l", 公升: "l",
  毫升: "ml",
  加仑: "gal",
  摄氏度: "C",
  华氏度: "F",
  开尔文: "K",
};

/**
 * 斤 (500 g) and 两 (50 g) have no `convert-units` counterpart, so they are
 * converted through grams: value × gramsPer(from) ÷ gramsPer(to).
 */
const CN_MASS: Record<string, number> = { 斤: 500, 两: 50 };

const DEFAULT_TARGET: Record<string, string> = {
  km: "mi", mi: "km", m: "ft", cm: "in", mm: "in", ft: "m", in: "cm", yd: "m",
  kg: "lb", g: "oz", lb: "kg", oz: "g",
  l: "gal", ml: "fl-oz", gal: "l", cup: "ml",
  C: "F", F: "C", K: "C",
  "km/h": "m/h", "m/h": "km/h",
  斤: "g", 两: "g",
};

export const UNIT_LABELS: Record<string, string> = {
  km: pick("km", "公里"), mi: pick("mi", "英里"), m: pick("m", "米"), cm: pick("cm", "厘米"), mm: pick("mm", "毫米"),
  ft: pick("ft", "英尺"), in: pick("in", "英寸"), yd: pick("yd", "码"),
  kg: pick("kg", "公斤"), g: pick("g", "克"), lb: pick("lb", "磅"), oz: pick("oz", "盎司"),
  mcg: "mcg", mg: "mg", mt: "t", t: "ton",
  l: pick("L", "升"), ml: pick("mL", "毫升"), gal: pick("gal", "加仑"), cup: pick("cup", "杯"),
  "fl-oz": pick("fl oz", "液盎司"), tsp: pick("tsp", "茶匙"), Tbs: pick("tbsp", "汤匙"), pnt: pick("pint", "品脱"), qt: pick("qt", "夸脱"),
  C: pick("°C", "摄氏度"), F: pick("°F", "华氏度"), K: pick("K", "开尔文"),
  "km/h": "km/h", "m/h": pick("mph", "英里/小时"), "m/s": "m/s", knot: pick("knot", "节"),
  斤: pick("jin", "斤"), 两: pick("liang", "两"),
};

const UNIT_PATTERN = Object.keys(UNIT_ALIASES)
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace(/[/.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

/** `to`/`in`/`=` and their Chinese equivalents, plus a redundant 多少/几. */
const CONNECTOR = String.raw`(?:等于|换算成|转换成|换成|换算为|换为|折合成?|是多少|是几|多少|为|是|to|in|into|as|=|->|→)`;

const FULL_RE = new RegExp(
  String.raw`(-?\d+(?:\.\d+)?)\s*(${UNIT_PATTERN})\s*${CONNECTOR}\s*(?:多少|几)?\s*(?:的)?\s*(${UNIT_PATTERN})(?![a-z])`,
  "i",
);
const PART_RE = new RegExp(String.raw`(-?\d+(?:\.\d+)?)\s*(${UNIT_PATTERN})(?![a-z])`, "i");

export function unitOptions(unit: string): string[] {
  try {
    const measure = convert().describe(unit as convert.Unit).measure;
    return convert()
      .possibilities(measure)
      .filter((u) => u in UNIT_LABELS);
  } catch {
    return [];
  }
}

export function convertValue(value: number, from: string, to: string): number | null {
  const fg = CN_MASS[from];
  const tg = CN_MASS[to];
  if (fg !== undefined || tg !== undefined) {
    const grams = fg !== undefined ? value * fg : convertValue(value, from, "g");
    if (grams === null || !Number.isFinite(grams)) return null;
    return tg !== undefined ? grams / tg : convertValue(grams, "g", to);
  }
  try {
    return convert(value).from(from as convert.Unit).to(to as convert.Unit);
  } catch {
    return null;
  }
}

export function parseConvert(text: string): ConvertData {
  const t = fw(text).toLowerCase().replace(/degrees?\s+/g, "°").replace(/°\s+/g, "°");
  const full = t.match(FULL_RE);
  if (full) {
    const value = Number(full[1]);
    const from = UNIT_ALIASES[full[2]];
    const to = UNIT_ALIASES[full[3]];
    const result = convertValue(value, from, to);
    if (result !== null) return { value, from, to, result };
  }
  const part = t.match(PART_RE);
  if (part) {
    const value = Number(part[1]);
    const from = UNIT_ALIASES[part[2]];
    const to = DEFAULT_TARGET[from] ?? null;
    return { value, from, to, result: to ? convertValue(value, from, to) : null };
  }
  return { value: null, from: null, to: null, result: null };
}

export function completeConvert(d: ConvertData) {
  return (d.value !== null ? 0.4 : 0) + (d.from ? 0.3 : 0) + (d.result !== null ? 0.3 : 0);
}
