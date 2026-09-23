import { pick } from "@/lib/i18n";
import { capitalize, collapse, findDate, hasCJK, removeRange, tidy, titleCase } from "./common";
import { fw, tightenZh } from "./zh";

export type EventData = {
  title: string;
  date: Date | null;
  hasTime: boolean;
  people: string[];
  link: string | null;
  location: string | null;
};

const LINKS: Record<string, string> = {
  zoom: "Zoom",
  meet: "Google Meet",
  "google meet": "Google Meet",
  gmeet: "Google Meet",
  teams: "Teams",
  facetime: "FaceTime",
  skype: "Skype",
  discord: "Discord",
  whatsapp: "WhatsApp",
  腾讯会议: pick("Tencent Meeting", "腾讯会议"),
  飞书: pick("Feishu", "飞书"),
  钉钉: pick("DingTalk", "钉钉"),
  企业微信: pick("WeCom", "企业微信"),
  微信: pick("WeChat", "微信"),
  qq: "QQ",
  视频会议: pick("Video call", "视频会议"),
  视频通话: pick("Video call", "视频通话"),
  电话会议: pick("Conference call", "电话会议"),
};

/** Chinese media are named without a preposition ("和普里亚视频会议"). */
const LINK_ZH = /(?:用|在|通过)?\s*(腾讯会议|飞书|钉钉|企业微信|微信|视频会议|视频通话|电话会议|qq)/;

const STOP = /\s+(?:on|at|in|for|about|to|from|via|over)\s+.*$/i;
const PEOPLE_SPLIT = /\s*(?:,|&|\band\b|、|，|和|跟|与)\s*/i;
/** "和李雷开会" → the person is 李雷; the activity trails behind. */
const PEOPLE_TAIL = /(?:一起|一块儿?)?(?:开会|见面|吃饭|聚餐|聊天|聊聊|谈谈|碰面|视频|通话|会议|喝茶|喝咖啡)$/;
const LOC_ZH = /(?:在|于)\s*([\u4e00-\u9fff]{1,20}?)(?=\s*(?:和|跟|与|同|，|。|,|\.|!|！|$))/;

export function parseEvent(text: string, ref?: Date): EventData {
  const src = fw(text);
  let rest = ` ${collapse(src)} `;

  const date = findDate(rest, ref);
  if (date) rest = removeRange(rest, date.index, date.text.length);

  let link: string | null = null;
  let linkText: string | null = null;
  const linkEn = /\s(?:on|over|via)\s+(google meet|gmeet|zoom|meet|teams|facetime|skype|discord|whatsapp)\b/i;
  const lm = rest.match(linkEn);
  if (lm && lm.index !== undefined) {
    link = LINKS[lm[1].toLowerCase()] ?? null;
    linkText = lm[1];
    rest = removeRange(rest, lm.index, lm[0].length);
  } else if (hasCJK(src)) {
    const lz = rest.match(LINK_ZH);
    if (lz && lz.index !== undefined) {
      link = LINKS[lz[1].toLowerCase()] ?? null;
      linkText = lz[1];
      rest = removeRange(rest, lz.index, lz[0].length);
    }
  }

  let location: string | null = null;
  const locEn = /\s(?:at|in)\s+(?!\d)([a-z][\w' ]{1,40}?)(?=\s+(?:with|on|for)\s|\s*$)/i;
  const loc = rest.match(locEn);
  if (loc && loc.index !== undefined) {
    location = titleCase(loc[1].trim());
    rest = removeRange(rest, loc.index, loc[0].length);
  } else {
    const lz = rest.match(LOC_ZH);
    if (lz && lz.index !== undefined) {
      location = tightenZh(lz[1].trim());
      rest = removeRange(rest, lz.index, lz[0].length);
    }
  }

  let people: string[] = [];
  const withRe = /(?:\swith\s+|(?:和|跟|与|同)\s*)(.+)$/i;
  const wm = rest.match(withRe);
  if (wm && wm.index !== undefined) {
    const segment = wm[1].replace(STOP, "");
    // "和李雷开会" → the person is 李雷 and 开会 belongs back in the title.
    const tails: string[] = [];
    people = segment
      .split(PEOPLE_SPLIT)
      .map((p) => {
        const trimmed = p.trim();
        const cleaned = trimmed.replace(PEOPLE_TAIL, "").trim();
        if (cleaned !== trimmed && cleaned) tails.push(trimmed.slice(cleaned.length));
        return cleaned;
      })
      .filter((p) => p && p.split(" ").length <= 3 && !/^(the|my|a)$/i.test(p))
      .map((p) => titleCase(p));
    rest = `${rest.slice(0, wm.index)} ${wm[1].slice(segment.length)} ${tails.join(" ")}`;
  }

  let title = capitalize(tidy(rest));
  if (hasCJK(src)) title = tightenZh(title);
  // "…和普里亚视频会议" carries its subject in the medium word.
  if (!title && link) title = linkText ? capitalize(tightenZh(linkText)) : link;
  return {
    title,
    date: date?.start ?? null,
    hasTime: date?.hasTime ?? false,
    people,
    link,
    location,
  };
}

export function completeEvent(d: EventData) {
  return (d.title ? 0.35 : 0) + (d.date ? 0.3 : 0) + (d.hasTime ? 0.2 : 0) + (d.people.length || d.link || d.location ? 0.15 : 0);
}
