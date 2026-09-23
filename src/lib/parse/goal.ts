import { capitalize, collapse, hasCJK, tidy } from "./common";
import { fw, tightenZh } from "./zh";

export type GoalData = { title: string; current: number; target: number | null; unit: string | null };

const n = (s: string) => Number(s.replace(/,/g, ""));
const NUM = String.raw`(\d[\d,]*(?:\.\d+)?)(k)?`;
const UNIT = String.raw`(books?|km|kms|miles?|pages?|workouts?|runs?|steps?|kg|lbs?|hours?|articles?|courses?|本|页|公里|千米|斤|次|天|元|个|小时|分钟|篇|章节|课|步)`;
/** Chinese "done" markers: 已读4本 / 已完成4 / 读了4. */
const DONE_ZH = String.raw`(?:已(?:经)?[\u4e00-\u9fff]{0,3}?|完成|读了|看了|做了|跑了|学了|写了|存了|练了)\s*${NUM}`;
const CLEAN_ZH = /今年|本年|这个月|本月|这周|本周|目标|进度|已完成|完成|已|还差|剩下|剩余|总共|一共|读了|看了|做了|跑了|学了|写了|存了/g;

export function parseGoal(text: string): GoalData {
  const src = fw(text);
  let rest = ` ${collapse(src)} `;
  let current = 0;
  let target: number | null = null;
  const val = (num: string, k?: string) => n(num) * (k ? 1000 : 1);

  // "4 of 12", "4/12", "4 out of 12"
  const of = rest.match(new RegExp(String.raw`\b${NUM}\s*(?:of|/|out of)\s*${NUM}\b`, "i"));
  if (of) {
    current = val(of[1], of[2]);
    target = val(of[3], of[4]);
    rest = rest.replace(of[0], " ");
  } else {
    // "... 4 done", "saved 12000", "已读4本"
    const done = rest.match(
      new RegExp(String.raw`(?:\b(?:saved|done|finished|completed|at)\s+${NUM}|\b${NUM}\s*(?:done|so far|completed|finished|in)\b|${DONE_ZH})`, "i"),
    );
    if (done) {
      current = val(done[1] ?? done[3] ?? done[5], done[2] ?? done[4] ?? done[6]);
      rest = rest.replace(done[0], " ");
    }
    const t = rest.match(new RegExp(String.raw`\b${NUM}\b`, "i"));
    if (t) {
      target = val(t[1], t[2]);
      rest = rest.replace(t[0], " ");
    }
  }

  // A unit is whatever sits directly after a number: "12 books", "12本".
  const adjacent = src.match(new RegExp(String.raw`\d[\d,]*\s*${UNIT}`, "i"));
  const legacy = rest.match(
    /^\s*(?:[a-z]+\s+)?(books?|km|kms|miles?|pages?|workouts?|runs?|steps?|kg|lbs?|hours?|articles?|courses?|₹|rs|\$|dollars|rupees)\b/i,
  );
  const unit = (adjacent?.[1] ?? legacy?.[1])?.toLowerCase() ?? null;
  // A Chinese unit sits after its number, so it reads as debris once the
  // numbers are gone; drop it so the title is "读书", not "读本书本".
  if (unit && hasCJK(unit)) rest = rest.replace(new RegExp(unit, "g"), " ");

  rest = rest.replace(/\b(?:goal|target|progress|this year|this month|so far|done|by (?:end of )?\w+|in (?:january|february|march|april|may|june|july|august|september|october|november|december))\b/gi, " ");
  rest = rest.replace(/[,;]+/g, " ");
  if (hasCJK(src)) rest = rest.replace(CLEAN_ZH, " ");
  const title = hasCJK(src) ? tightenZh(tidy(rest)) : capitalize(tidy(rest));
  return { title, current: Math.min(current, target ?? current), target, unit };
}

export function completeGoal(d: GoalData) {
  return (d.target ? 0.6 : 0) + (d.title ? 0.3 : 0) + (d.current ? 0.1 : 0);
}
