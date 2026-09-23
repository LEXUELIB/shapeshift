import { capitalize, collapse, findDate, hasCJK, removeRange } from "./common";
import { fw, ZH_TAIL } from "./zh";

export type PollData = { title: string; options: string[] };

const QUESTION_START = /^(?:should|shall|what|which|where|when|who|do|does|would|want|let'?s|vote|poll)\b/i;
const CONTEXT = /\s+((?:for|on|at|this|next|tonight|tomorrow|today)\b.*)$/i;
/** `还是`/`或者` join the options; the ASCII separators keep working in mixed text. */
const SPLIT = /\s*(?:,|;|\bor\b|\bvs\.?\b|\/|还是|或者|或是|或)\s*/i;
/** A verb between the context and the first option ("周五吃披萨" → context + 披萨). */
const ZH_LEAD = /^(?:吃|喝|去|看|买|玩|选|做|用|要|叫|点)/;

export function parsePoll(text: string, ref?: Date): PollData {
  let t = collapse(fw(text))
    .replace(/[?？]+$/, "")
    .replace(/[。.!！]+$/, "")
    .replace(ZH_TAIL, "");
  let stem: string | null = null;

  const colon = t.indexOf(":");
  if (colon > 0) {
    stem = t.slice(0, colon).trim();
    t = t.slice(colon + 1).trim();
  }

  let parts = t.split(SPLIT).filter(Boolean);
  if (parts.length < 2) return { title: stem ? `${capitalize(stem)}?` : "", options: [] };

  if (hasCJK(t)) {
    // Chinese puts the context first: "周五吃披萨还是汉堡" → options 披萨 / 汉堡.
    const date = findDate(parts[0], ref);
    if (date && date.index <= 1) {
      stem = `${stem ?? ""}${date.text}`;
      parts[0] = removeRange(parts[0], date.index, date.text.length).trim();
    }
    const lead = parts[0].match(ZH_LEAD);
    if (lead && parts[0].length > lead[0].length) {
      stem = `${stem ?? ""}${lead[0]}`;
      parts[0] = parts[0].slice(lead[0].length);
    }
    parts = parts.map((p) => p.trim().replace(ZH_TAIL, "")).filter(Boolean);
    if (parts.length < 2) return { title: stem ? `${capitalize(stem)}?` : "", options: [] };
    return { title: `${stem ?? ""}${parts.join("或")}?`, options: parts };
  }

  let context: string | null = null;
  const last = parts[parts.length - 1];
  const cm = last.match(CONTEXT);
  if (cm && cm.index !== undefined && cm.index > 0) {
    context = cm[1];
    parts[parts.length - 1] = last.slice(0, cm.index);
  }

  if (!stem && QUESTION_START.test(parts[0])) {
    const words = parts[0].split(" ");
    const take = Math.max(1, parts[1].split(" ").length);
    if (words.length > take) {
      stem = words.slice(0, words.length - take).join(" ");
      parts[0] = words.slice(words.length - take).join(" ");
    }
  }

  parts = parts.map((p) => p.trim()).filter(Boolean);
  const base = capitalize(stem ?? parts.join(" or "));
  parts = parts.map(capitalize);
  const title = `${base}${context ? ` ${context}` : ""}?`;
  return { title, options: parts };
}

export function completePoll(d: PollData) {
  return Math.min(1, d.options.length / 2) * 0.8 + (d.title ? 0.2 : 0);
}
