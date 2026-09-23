import { collapse, findDate, hasCJK, removeRange, titleCase } from "./common";
import { fw, tightenZh } from "./zh";

export type TravelData = { destination: string | null; origin: string | null; start: Date | null; end: Date | null };

/**
 * "this weekend" = the coming Sat–Sun (or the current one).
 * "next weekend" = the one after that when we're already at/near a weekend,
 * otherwise the coming one (how people usually mean it mid-week).
 */
function weekend(ref: Date, next: boolean): [Date, Date] {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const sat = new Date(d);
  sat.setDate(d.getDate() + (day === 0 ? -1 : 6 - day));
  if (next && (day === 5 || day === 6 || day === 0)) sat.setDate(sat.getDate() + 7);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return [sat, sun];
}

const STOP_WORDS =
  /\s+(?:to|next|this|on|for|from|in|by|via|tomorrow|today|tonight|with|and|trip|flight|train|bus|weekend|week|month|work|business|vacation|holiday|leave|leaving|return(?:ing)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day)?|\d)\b.*$/i;

/**
 * Chinese place capture: `去三亚`, `从北京到上海`. The trailing words that are
 * part of the sentence rather than the name are peeled with a lookahead.
 */
const ZH_DEST = /(?:去往|前往|飞到|飞往|抵达|去|到)\s*([\u4e00-\u9fff]{1,12}?)(?=\s*(?:旅游|旅行|玩|度假|出差|行程|的|，|。|！|？|,|\.|!|\?|$))/;
const ZH_ORIGIN = /(?:从|由)\s*([\u4e00-\u9fff]{1,12}?)(?=\s*(?:到|去|飞|前往|出发|启程|，|。|,|\.|$))/;

export function parseTravel(text: string, ref: Date = new Date()): TravelData {
  const src = fw(text);
  const zh = hasCJK(src);
  let rest = ` ${collapse(src)} `;
  let start: Date | null = null;
  let end: Date | null = null;

  const wk = rest.match(/\b(this|next)\s+weekend\b/i);
  if (wk) {
    [start, end] = weekend(ref, wk[1].toLowerCase() === "next");
    rest = rest.replace(wk[0], " ");
  } else {
    // "12-15 oct" → chrono handles ranges; normalise en dashes first.
    const date = findDate(rest.replace(/[–—]/g, "-"), ref);
    if (date) {
      start = date.start;
      end = date.end;
      rest = removeRange(rest, date.index, date.text.length);
    }
  }

  const grab = (re: RegExp) => {
    const m = rest.match(re);
    if (!m) return null;
    const place = ` ${m[1]}`.replace(STOP_WORDS, "").trim();
    return place ? titleCase(place) : null;
  };
  const grabZh = (re: RegExp) => {
    if (!zh) return null;
    const m = rest.match(re);
    if (!m) return null;
    const place = tightenZh(m[1].trim());
    return place || null;
  };

  const destination = grab(/\b(?:to|for|visit(?:ing)?|in)\s+([a-z][a-z .'-]{1,40})/i) ?? grabZh(ZH_DEST);
  const origin = grab(/\bfrom\s+([a-z][a-z .'-]{1,40})/i) ?? grabZh(ZH_ORIGIN);
  return { destination, origin, start, end };
}

export function completeTravel(d: TravelData) {
  return (d.destination ? 0.5 : 0) + (d.start ? 0.35 : 0) + (d.end ? 0.15 : 0);
}
