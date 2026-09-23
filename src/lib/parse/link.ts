import { capitalize, collapse, tidy } from "./common";
import { fw } from "./zh";

export type LinkData = { url: string | null; domain: string | null; monogram: string; note: string };

/**
 * `\b` cannot separate a Chinese domain label from surrounding hanzi, so the
 * bare-domain branch uses a lookbehind and accepts CJK labels ("例子.中国").
 */
const URL_RE =
  /(?<![a-z0-9-])((?:https?:\/\/|www\.)[^\s]+|[a-z0-9\u4e00-\u9fff-]+(?:\.[a-z0-9\u4e00-\u9fff-]+)*\.(?:com|dev|io|app|org|net|co|ai|in|so|xyz|me|design|sh|gg|tv|cn|top|site|tech|中国|公司|网络)(?:\/[^\s]*)?)/i;

export function parseLink(text: string): LinkData {
  const src = fw(text);
  const m = src.match(URL_RE);
  if (!m) return { url: null, domain: null, monogram: "", note: capitalize(tidy(src)) };
  const raw = m[1].replace(/[.,)\]。，、！？；;]+$/, "");
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let domain: string | null = null;
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    domain = raw.replace(/^https?:\/\//, "").split("/")[0];
  }
  const note = capitalize(tidy(collapse(src.replace(m[0], " "))));
  return { url, domain, monogram: (domain?.[0] ?? "").toUpperCase(), note };
}

export function completeLink(d: LinkData) {
  return (d.url ? 0.8 : 0) + (d.note ? 0.2 : 0);
}
