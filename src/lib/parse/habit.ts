import { pick } from "@/lib/i18n";
import { capitalize, collapse, hasCJK, tidy } from "./common";
import { fw, ZH_NUM, zhNumber } from "./zh";

export type HabitData = { title: string; days: number[]; perWeek: number | null; label: string | null };

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_RE = /\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|sday|urday|rsday)?s?\b/gi;
const EN_EVERY_DAY = /\b(?:every\s*day|daily|every (?:morning|night|evening|afternoon)|each (?:day|morning|night))\b/i;
const EN_MORNING = /\b(?:every|each)\s+(morning|night|evening|afternoon)\b/i;

/** 周一 … 周日／星期天, and the frequency forms around them. */
const ZH_DAY_INDEX: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
const ZH_DAYS = /(?:周|星期|礼拜)([一二三四五六日天])/g;
const ZH_FREQ = new RegExp(`(?:每|一)?\\s*(?:周|星期|礼拜)\\s*([${ZH_NUM}]+)\\s*次|([${ZH_NUM}]+)\\s*次\\s*(?:每|一)\\s*(?:周|星期)`);
const ZH_EVERY_DAY = /每天|每日|天天|每一天/;
const ZH_WEEKDAYS = /工作日/;
const ZH_WEEKENDS = /周末/;
const ZH_WEEKLY = /每周|每星期|每礼拜/;
const ZH_PART_RE = /早上|早晨|上午|中午|下午|傍晚|晚上|夜里/;
const ZH_PART: Record<string, string> = { morning: "早上", night: "晚上", evening: "傍晚", afternoon: "下午" };
const ZH_CLEAN = /每周|每星期|每礼拜|一周|每天|每日|天天|坚持|习惯|例行|目标|我要|我想|开始|一下/g;

export function parseHabit(text: string): HabitData {
  const src = fw(text);
  const zh = hasCJK(src);
  let rest = ` ${collapse(src)} `;
  let days: number[] = [];
  let perWeek: number | null = null;
  let label: string | null = null;

  const nx = rest.match(/\b(\d|once|twice|thrice)\s*(?:x|times?)?\s*(?:a|per|each|every)\s+week\b/i);
  if (nx) {
    const word = nx[1].toLowerCase();
    perWeek = word === "once" ? 1 : word === "twice" ? 2 : word === "thrice" ? 3 : Number(word);
    rest = rest.replace(nx[0], " ");
    label = pick(`${perWeek}× a week`, `${perWeek} 次/周`);
  } else {
    const zhFreq = rest.match(ZH_FREQ);
    const count = zhFreq ? zhNumber(zhFreq[1] ?? zhFreq[2]) : null;
    if (count && count > 0) {
      perWeek = count;
      rest = rest.replace(zhFreq![0], " ");
      label = pick(`${count}× a week`, `${count} 次/周`);
    }
  }

  if (EN_EVERY_DAY.test(rest)) {
    days = [0, 1, 2, 3, 4, 5, 6];
    const part = rest.match(EN_MORNING);
    // "Every morning" echoes words the user typed, so it follows the input
    // language; the generic "Daily" is chrome and follows the build locale.
    label = part ? (zh ? `每天${ZH_PART[part[1].toLowerCase()]}` : `Every ${part[1].toLowerCase()}`) : pick("Daily", "每天");
    rest = rest.replace(/\b(?:every\s*day|daily|every (?:morning|night|evening|afternoon)|each (?:day|morning|night))\b/gi, " ");
  } else if (ZH_EVERY_DAY.test(rest)) {
    days = [0, 1, 2, 3, 4, 5, 6];
    const part = rest.match(ZH_PART_RE);
    label = part ? `每天${part[0]}` : pick("Daily", "每天");
    rest = rest.replace(ZH_EVERY_DAY, " ").replace(ZH_PART_RE, " ");
  } else if (/\b(?:weekdays|every weekday)\b/i.test(rest)) {
    days = [1, 2, 3, 4, 5];
    label = pick("Weekdays", "工作日");
    rest = rest.replace(/\b(?:every\s+)?weekdays?\b/gi, " ");
  } else if (ZH_WEEKDAYS.test(rest)) {
    days = [1, 2, 3, 4, 5];
    label = pick("Weekdays", "工作日");
    rest = rest.replace(ZH_WEEKDAYS, " ");
  } else if (/\b(?:weekends|every weekend)\b/i.test(rest)) {
    days = [0, 6];
    label = pick("Weekends", "周末");
    rest = rest.replace(/\b(?:every\s+)?weekends?\b/gi, " ");
  } else if (ZH_WEEKENDS.test(rest)) {
    days = [0, 6];
    label = pick("Weekends", "周末");
    rest = rest.replace(ZH_WEEKENDS, " ");
  } else {
    const found = new Set<number>();
    rest = rest.replace(DAY_RE, (m: string, d: string) => {
      const i = DAYS.indexOf(d.slice(0, 3).toLowerCase());
      if (i >= 0) found.add(i);
      return " ";
    });
    if (zh) {
      rest = rest.replace(ZH_DAYS, (_m: string, d: string) => {
        const i = ZH_DAY_INDEX[d];
        if (i !== undefined) found.add(i);
        return " ";
      });
    }
    if (found.size) {
      days = [...found].sort();
      if (!label) {
        label =
          days.length === 1
            ? zh
              ? `每周${"日一二三四五六"[days[0]]}`
              : `Every ${fullDay(days[0])}`
            : pick(`${days.length}× a week`, `${days.length} 次/周`);
      }
    }
  }

  if (!label && (/\bweekly\b/i.test(rest) || ZH_WEEKLY.test(rest))) {
    perWeek = 1;
    label = pick("Weekly", "每周");
  }

  rest = rest.replace(/\b(?:every|each|weekly|habit|routine|start|i want to|i will|i'll|and)\b/gi, " ");
  rest = rest.replace(/\b(?:in the )?(?:morning|night|evening)s?\b/gi, " ");
  if (zh) rest = rest.replace(ZH_CLEAN, " ");
  if (!days.length && perWeek) days = spread(perWeek);
  return { title: capitalize(tidy(rest)), days, perWeek, label };
}

function fullDay(i: number) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i];
}

/** Evenly spread N sessions across Mon–Sun so the week strip has a sensible default. */
function spread(n: number): number[] {
  const order = [1, 3, 5, 0, 2, 4, 6];
  const presets: Record<number, number[]> = { 1: [1], 2: [2, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] };
  return (presets[n] ?? order.slice(0, Math.min(7, n))).sort();
}

export function completeHabit(d: HabitData) {
  return (d.title ? 0.5 : 0) + (d.label ? 0.5 : 0);
}
