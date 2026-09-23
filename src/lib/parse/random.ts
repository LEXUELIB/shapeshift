import { pick } from "@/lib/i18n";
import { collapse, hasCJK, LIST_WEAK_RE } from "./common";
import { fw, zhNumber } from "./zh";

export type RandomData =
  | { kind: "dice"; count: number; sides: number }
  | { kind: "coin" }
  | { kind: "number"; min: number; max: number }
  | { kind: "pick"; options: string[] };

const WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

const COIN_EN = /\b(coin|heads|tails|toss)\b/;
const COIN_ZH = /硬币|正反面|正反|抛硬|掷硬|投硬|钢镚/;
const DICE_EN = /\b(\d+|a|an|one|two|three|four|five|six)?\s*(?:dice|die)\b/;
const DICE_ZH = /(\d+|[零〇一二三四五六七八九十两]+)?\s*(?:个|颗|粒)?\s*(?:骰子|色子|骰)/;
const RNG_EN = /\b(number|random|between|pick|choose|rng)\b/;
const RNG_ZH = /随机|随便|任选|抽一个|抽个/;
/** The frame around a Chinese pick: "帮我从…里选一个" / "选一个：…". */
const PICK_ZH_HEAD = /^.*?(?:从|在)\s*/;
const PICK_ZH_TAIL = /(?:里边|里面|当中|中间|里|中)\s*(?:选一个|挑一个|选择一个|帮我选|帮忙选|选|挑).*$/;
const PICK_ZH_LEAD = /^(?:帮我|帮忙|随机|随便|任选|抽一个|抽个|选一个|挑一个|选择一个|选|挑)\s*[:：]?\s*/;

export function parseRandom(text: string): RandomData {
  const t = collapse(fw(text)).toLowerCase();

  if (COIN_EN.test(t) || COIN_ZH.test(t)) return { kind: "coin" };

  const dnd = t.match(/\b(\d+)?d(\d+)\b/);
  if (dnd) return { kind: "dice", count: clamp(Number(dnd[1] ?? 1), 1, 10), sides: clamp(Number(dnd[2]), 2, 1000) };

  const dice = t.match(DICE_EN);
  if (dice) return { kind: "dice", count: clamp(diceCount(dice[1]), 1, 10), sides: 6 };

  const diceZh = t.match(DICE_ZH);
  if (diceZh) return { kind: "dice", count: clamp(diceCount(diceZh[1]), 1, 10), sides: 6 };

  const range =
    t.match(/\b(-?\d+)\s*(?:-|–|to|and)\s*(-?\d+)\b/) ?? t.match(/(?:从|在)?\s*(-?\d+)\s*(?:到|至|~|-)\s*(-?\d+)/);
  if (range && (RNG_EN.test(t) || RNG_ZH.test(t) || /从|到|至/.test(t))) {
    const [a, b] = [Number(range[1]), Number(range[2])];
    return { kind: "number", min: Math.min(a, b), max: Math.max(a, b) };
  }

  const list = t.replace(/^.*?\b(?:pick|choose|decide|random(?:ly)?|between)\b\s*(?:one|a random one)?\s*(?:from|between|of|:)?\s*/, "");
  const options = list
    .split(/\s*(?:,|\bor\b|\/|\n)\s*/)
    .map(cleanOption)
    .filter(Boolean)
    .map(capitalizeFirst);
  if (options.length >= 2) return { kind: "pick", options };

  // "从披萨、汉堡、寿司里选一个"
  if (hasCJK(t)) {
    const zh = t
      .replace(PICK_ZH_HEAD, "")
      .replace(PICK_ZH_TAIL, " ")
      .replace(PICK_ZH_LEAD, "")
      .replace(/[：:，,。.！!？?]/g, " ");
    const zhOptions = zh
      .split(LIST_WEAK_RE)
      .map(cleanOption)
      .filter(Boolean)
      .map(capitalizeFirst);
    if (zhOptions.length >= 2) return { kind: "pick", options: zhOptions };
  }

  return { kind: "number", min: 1, max: 100 };
}

function diceCount(raw: string | undefined): number {
  if (!raw) return 1;
  return WORDS[raw] ?? zhNumber(raw) ?? Number(raw);
}

function cleanOption(s: string): string {
  return s.trim().replace(/[?.!]+$/, "");
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function clamp(n: number, lo: number, hi: number) {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
}

export function rollRandom(d: RandomData, rand: () => number = Math.random): string[] {
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  switch (d.kind) {
    case "coin":
      return [rand() < 0.5 ? pick("Heads", "正面") : pick("Tails", "反面")];
    case "dice":
      return Array.from({ length: d.count }, () => String(int(1, d.sides)));
    case "number":
      return [String(int(d.min, d.max))];
    case "pick":
      return [d.options[int(0, d.options.length - 1)]];
  }
}

export function describeRandom(d: RandomData) {
  switch (d.kind) {
    case "coin":
      return pick("Coin flip", "抛硬币");
    case "dice":
      return d.sides === 6
        ? pick(`${d.count} ${d.count === 1 ? "die" : "dice"}`, `${d.count} 个骰子`)
        : `${d.count}d${d.sides}`;
    case "number":
      return pick(`Number from ${d.min} to ${d.max}`, `${d.min} 到 ${d.max} 之间`);
    case "pick":
      return pick(`Pick one of ${d.options.length}`, `从 ${d.options.length} 个里选一个`);
  }
}

export function completeRandom() {
  return 1;
}
