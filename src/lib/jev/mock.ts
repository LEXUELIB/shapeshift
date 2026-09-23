import { completenessFor } from "@/lib/parse";
import { LIST_WEAK_RE } from "@/lib/parse/common";
import { REFERENCE_RE } from "@/lib/parse/color";
import { ZONES } from "@/lib/parse/timezone";
import {
  type Answer,
  type CardIntent,
  COLOR_MOODS,
  type ColorMood,
  EVENT_MODES,
  EXPENSE_CATEGORIES,
  INTENT_KEYS,
  type IntentKey,
  type IntentResult,
  noneResult,
  TIMER_KINDS,
  TONES,
  TRANSPORTS,
  TRIP_TYPES,
} from "./types";

/** Keep in sync with questions.ts (asserted in tests). */
export const MOCK_QUESTION_COUNT = 14;
export const MOCK_MODEL = "jev-offline";

const has = (re: RegExp, t: string) => re.test(t);

/** A `\b`-delimited English rule with the same clause in Chinese appended. */
const withZh = (source: string, zh: string) => new RegExp(`${source}|(?:${zh})`, "i");

/**
 * Content length: one point per Latin word, one per three Han/kana/hangul
 * characters. Chinese is written without spaces, so `text.split(/\s+/)` counts a
 * whole sentence as one "word" — this metric keeps a typical Chinese sentence and
 * a typical English sentence in the same band, which is what the length-based
 * heuristics below (note ramps, one-word "none") actually key off.
 */
const CJK_RUN = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]+/g;
const CJK_WEIGHT = 1 / 3;

function contentLength(t: string): number {
  let cjk = 0;
  const latin = t.replace(CJK_RUN, (run) => {
    cjk += run.length;
    return " ";
  });
  const words = latin.split(/\s+/).filter(Boolean).length;
  return words + cjk * CJK_WEIGHT;
}

// ── Shared English + Chinese word banks ──────────────────────
const DATE_WORDS = /\b(today|tonight|tomorrow|tmrw|mon(day)?|tue(s(day)?)?|wed(nesday)?|thu(rs(day)?)?|fri(day)?|sat(urday)?|sun(day)?|next week|this week|noon|midnight|morning|evening|\d{1,2}\s?(am|pm)|\d{1,2}:\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/;
/** Chinese dates and clock times. Han is not a `\w` char, so `\b` is useless here. */
const DATE_WORDS_ZH = /今天|今晚|明天|明日|后天|大后天|昨天|周[一二三四五六日天]|星期[一二三四五六日天]|礼拜[一二三四五六日天]|下周|这周|本周|下个?月|这个?月|周末|平时|上午|下午|晚上|中午|早上|凌晨|\d{1,2}月\d{1,2}[日号]|\d{1,2}点(半|\d{1,2}分)?/;
const GATHER = /\b(dinner|lunch|breakfast|brunch|coffee|meeting|meet|call|sync|standup|party|drinks|date|catch ?up|interview|appointment|hangout|1:1|session with|with [a-z]+)\b/;
const GATHER_ZH =
  /会议|开会|例会|见面|聚餐|聚会|饭局|午饭|晚饭|吃(饭|个饭)|喝(咖啡|茶|酒)|约(会|饭|见)|面试|生日|派对|一起|碰(个)?面|电话会|视频会/;
const UNIT = withZh(
  "(km|kms|kilomet(er|re)s?|mi|miles?|m|met(er|re)s?|cm|mm|ft|feet|foot|in|inch(es)?|yd|yards?|kg|kgs|kilos?|g|grams?|lbs?|pounds?|oz|ounces?|l|lit(er|re)s?|ml|gal(lons?)?|cups?|°?c|°?f|celsius|fahrenheit|kelvin|mph|kph|km/h)",
  "公里|千米|英里|海里|米|厘米|毫米|英尺|英寸|码|公斤|千克|斤|克|磅|盎司|吨|升|毫升|加仑|摄氏|华氏",
);
const CONVERT_FULL = new RegExp(`\\d\\s*(?:${UNIT.source})\\s*(?:to|in|into|as|=|->|等于|换算成?|换成|是多少)\\s*(?:多少|几)?\\s*(?:${UNIT.source})`, "i");
const CONVERT_PART = new RegExp(`\\d\\s*(?:${UNIT.source})`, "i");
const ZH_CONVERT_WORD = /等于|换算|换成|是多少|多少(公里|千米|英里|米|厘米|毫米|英尺|英寸|公斤|千克|斤|克|磅|吨|升|毫升|加仑|摄氏|华氏)/;
const ZH_AMOUNT_VERB = /(花了|支付了?|付了|消费了?|买了|一共|总共|花销|开支|费用|支出|账单)\s*\d/;
const COLOR_WORDS = withZh(
  "\\b(red|crimson|scarlet|maroon|burgundy|pink|rose|coral|salmon|peach|orange|tangerine|amber|gold|yellow|mustard|lemon|cream|beige|sand|tan|brown|chocolate|olive|lime|green|sage|mint|emerald|forest|teal|turquoise|cyan|sky|blue|navy|cobalt|indigo|violet|purple|lavender|lilac|magenta|plum|grey|gray|slate|charcoal|black|white|ivory)(ish)?\\b",
  "红|大红|朱红|深红|粉红|粉色|桃红|玫瑰|珊瑚|橙|橘|橙色|琥珀|金|金黄|黄|芥末|柠檬|奶油|米|米色|沙|棕|棕[色褐]|咖啡色|巧克力|橄榄|青柠|绿|绿色|草绿|薄荷绿|薄荷|翠绿|森林绿|青|青色|蓝绿|绿松石|天蓝|浅蓝|深蓝|藏青|宝蓝|靛|紫|紫色|紫罗兰|薰衣草|丁香|洋红|梅红|灰|灰色|石板|炭黑|黑|黑色|白|白色|象牙|米白",
);
const COLOR_WORDS_END = new RegExp(`${COLOR_WORDS.source}\\s*$`, "i");
const ZH_COLOR_SUFFIX = /[\u4e00-\u9fff]{1,4}色(的)?$/;
const ZH_BARE_COLOR = /(天蓝|藏青|薄荷绿|薄荷|粉红|桃红|酒红|朱红|宝蓝|靛蓝|湖蓝|雾霾蓝|玫瑰金|香槟金|银灰|炭黑|象牙白|米白|奶油白|柠檬黄|芥末黄|草绿|翠绿|墨绿)/;

/**
 * "minecraft diamond", "tiffany blue", "ruby": specific references that only mean a
 * color. The leading `\b` becomes a lookbehind so a bare reference still matches
 * after a space-free Chinese run ("我喜欢红宝石"), while a reference embedded in a
 * longer Latin word still does not.
 */
const COLOR_REFERENCE = new RegExp(REFERENCE_RE.source.replace(/^\\b(?=\()/, "(?<![a-z0-9])"), "i");

const ZONE_WORD = new RegExp(`\\b(${Object.keys(ZONES).sort((a, b) => b.length - a.length).join("|")})\\b`, "g");
/** Chinese zone names, incl. the mainland keys timezone.ts is adding. */
const ZH_ZONES = [
  "北京时间", "北京", "上海", "香港", "台北", "纽约", "洛杉矶", "旧金山", "西雅图", "丹佛", "芝加哥", "多伦多",
  "伦敦", "巴黎", "柏林", "阿姆斯特丹", "迪拜", "孟买", "德里", "班加罗尔", "新德里", "印度",
  "新加坡", "东京", "首尔", "悉尼", "奥克兰",
];
const ZH_ZONE_RE = new RegExp(ZH_ZONES.sort((a, b) => b.length - a.length).join("|"), "g");
const CLOCK = /\b\d{1,2}(:\d{2})?\s*(am|pm)\b|\b\d{1,2}:\d{2}\b|\b(noon|midnight)\b|\d{1,2}(点|时)(半|\d{1,2}分)?|(上午|下午|晚上|早上|凌晨)\d{1,2}/;
const ZH_TIME = /时间|几点|现在|时刻/;
const ZH_TZ_HINT = /时间|时区|几点|时差|现在/;

type Scores = Partial<Record<IntentKey, number>>;

function intentScores(raw: string): Scores {
  const t = raw.toLowerCase().trim();
  const len = contentLength(t);
  const s: Scores = {};
  const add = (k: IntentKey, v: number) => (s[k] = (s[k] ?? 0) + v);
  const num = /\d/.test(t);

  if (has(/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|dev|io|app|org|net|co|ai|in|so|cn)\b/, t)) add("link", 6);
  if (has(/#[0-9a-f]{3}\b|#[0-9a-f]{6}\b|rgba?\(/, t)) add("color", 7);
  if (has(/#[0-9a-f]{1,5}$/, t)) add("color", 3);
  if (has(COLOR_WORDS, t)) add("color", 2.5);
  if (has(COLOR_REFERENCE, t)) add("color", 4.5);
  if (has(/\b(colou?r|shade|hue) (of|like)\b/, t)) add("color", 3);
  if (has(ZH_COLOR_SUFFIX, t)) add("color", 1.5);
  if (has(ZH_BARE_COLOR, t)) add("color", 1.5);
  if (has(COLOR_WORDS_END, t)) add("color", 1.5);
  if (has(/\b(colou?r|shade|hue|palette|tone of)\b|颜色|色值|配色|色调/, t)) add("color", 2);
  if (has(/[\w.+-]+@[\w-]+\.\w+/, t)) add("contact", 5);
  if (has(/(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{3,5}/, t)) add("contact", 4);
  // Mainland mobile: 1[3-9] + 9 digits, so "13800138000" and "138 0013 8000".
  if (has(/\b1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}\b/, t)) add("contact", 4);
  if (has(/\b(remind|reminder|don'?t forget|remember to)\b|提醒我|提醒一下|记得|别忘了|待办|缴费|交房租|交水电|交话费|还信用|还花呗|续费/, t)) add("reminder", 6);
  if (has(/\b(split|divide|share)\b|分成|平分|人均|AA|摊/, t)) add("split", num ? 5 : 3);
  if (has(/\b(between|among)\s+(\d+|two|three|four|five|six)\b/, t) && num) add("split", 2);
  if (has(/\d\s*个?人\s*(平摊|均摊|分|AA)|分\s*(\d+|几)\s*个?人|分给\s*(\d+|几)\s*个?人|\d+\s*人\s*(平分|均分|AA|分)/, t) && num) add("split", 4);
  if (has(/\b(spent|paid|bought|cost|expense)\b|花了|消费|付了|支付了?|买了|支出|花销|费用|一共|总共/, t)) add("expense", num ? 5 : 3);
  // "·45", "￥45" and "45元" are money on their own; a large bare number is not.
  if (has(/^(₹|rs\.?|\$|¥|￥)\s?\d/, t) || has(/\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:元|块钱?|人民币)$/, t) || (num && has(ZH_AMOUNT_VERB, t))) add("expense", 2);
  if (has(CONVERT_FULL, t)) add("convert", 7);
  else if (has(CONVERT_PART, t) && !has(/\b(min|mins|minutes?|hours?|hrs?|sec|secs?)\b|分钟|小时|个小时|秒钟?/, t)) {
    if (len <= 3 || has(ZH_CONVERT_WORD, t)) add("convert", 2);
  }
  if (has(/\bconvert\b|换算/, t)) add("convert", 3);
  if (has(/^[\d\s+\-*/x×÷^().,%]+$/, t) && has(/\d\s*[+\-*/x×÷^%]\s*[\d(]/, t)) add("calc", 7);
  if (has(/\d\s*%\s*(of|off)\b/, t)) add("calc", 6);
  if (has(/\d+\s*的\s*\d+(\.\d+)?\s*(%|％)/, t)) add("calc", 6);
  if (has(/\b(what'?s|calculate|compute)\b.*\d|百分之/, t)) add("calc", 3);
  if (has(/\b(timer|countdown|stopwatch|pomodoro)\b|计时|倒计时|秒表|番茄钟|定时/, t)) add("timer", 6);
  if (has(/\b\d+\s*(h|hr|hrs|hours?|m|min|mins|minutes?|s|sec|secs|seconds?)\b|\d+\s*(个)?(小时|分钟|分|秒钟|秒)/, t)) add("timer", 3);
  if (has(/\b(focus|break|rest|nap|deep work)\b|专注|休息|小憩|深度工作/, t) && has(/\d/, t)) add("timer", 2.5);
  if (has(/\b(every\s*day|daily|every (morning|night|evening)|each (day|morning)|\d\s*x\s*a\s*week|times a week|habit|weekly|every (mon|tue|wed|thu|fri|sat|sun))|每天|每日|每周|每月|每年|天天|习惯|坚持|定期|常常|一周\s*[一二三四五六七八九十\d]\s*次|一周\s*[两三四五六七八九十\d]\s*次|每[日天周月年]\s*[一二三四五六七八九十\d两]\s*次/, t)) add("habit", 5);
  if (has(/\b(flight|fly|flying|trip|travel|vacation|holiday|train to|bus to|road ?trip|visit|getaway)\b|(?<![这那过得到底迟知觉想说看收遇感])(去|到|飞)(?:了)?[\u4e00-\u9fff]{2,8}|行程|出差|度假|旅游|旅行|机票|航班/, t)) add("travel", 5);
  if (has(/\bto [a-z]+/, t) && has(/\b(next weekend|this weekend|flight|trip)\b/, t)) add("travel", 1);
  if (has(/\b(or|vs)\b|还是|或者/, t) && (t.endsWith("?") || t.endsWith("？"))) add("poll", 5.5);
  else if (has(/\b\w+ or \w+|[\u4e00-\u9fff]{1,8}(还是|或者)[\u4e00-\u9fff]{1,8}/, t)) add("poll", 2);
  if (has(/\b(poll|vote)\b|投票|选哪个|哪个好/, t)) add("poll", 3);
  // Countdown: "days until christmas", "还有多少天到12月25日"
  if (has(/\b(days?|weeks?|sleeps?)\s+(until|till|til|to go|left|before)\b|\bcount ?down\b|\bhow (many days|long) (until|till|til)\b|还有(多少|几)天|还有\d+天|倒数|距离?.*还有|距.*还有/, t)) add("countdown", 6.5);
  // Time zones: two zones, a clock time plus a zone, or "time in tokyo"
  const zoneHits = (t.match(ZONE_WORD)?.length ?? 0) + (t.match(ZH_ZONE_RE)?.length ?? 0) + (has(/时区/, t) ? 1 : 0);
  if (zoneHits >= 2 && (has(CLOCK, t) || has(/\b(in|to)\b|换成|换算|转换|变成/, t) || has(ZH_TZ_HINT, t))) add("timezone", 7);
  else if (zoneHits === 1 && (has(CLOCK, t) || has(/\btime\b/, t) || has(ZH_TIME, t))) add("timezone", 5.5);
  // Random: dice, coins, "random number", "pick one"
  if (has(/\b(roll|flip|toss)\b|\b\d*d\d+\b|\bcoin\b|\bdice\b|\bdie\b|\brandom\b|\b(pick|choose) (one|a random|for me)\b|掷|骰子|抛硬币|随机|选一个/, t)) add("random", 6.5);
  // Goal: "4 of 12 books", "already read 4 of 12", "目标 12 本"
  if (has(/\b\d[\d,]*\s*(of|\/|out of)\s*\d[\d,]*\b/, t) && has(/[a-z]{3,}/, t)) add("goal", 4.5);
  if (has(/\b(goal|target)\b|目标|计划完成|今年|今年内|已读|已完成|已跑|已攒/, t)) add("goal", 3);
  if (has(/\b(done|so far|saved|completed|finished)\b/, t) && has(/\d/, t)) add("goal", (t.match(/\d+/g)?.length ?? 0) >= 2 ? 5 : 2.5);
  if (has(/(?:已|完成|读了?|做了?|看了?|跑了?|攒了?|存了?)\s*\d/, t)) add("goal", 5);
  const listSeps = (t.match(new RegExp(LIST_WEAK_RE.source, "g")) ?? []).length;
  if (listSeps >= 2) add("todo", 4);
  else if (listSeps === 1 && has(/^(buy|get|todo|to do|groceries)\b|^(买|采购|清单)/, t)) add("todo", 3);
  if (has(/^(buy|get|pick up|grab)\b|^买|^采购/, t)) add("todo", 2);
  const gather = has(GATHER, t) || has(GATHER_ZH, t);
  if (has(DATE_WORDS, t) || has(DATE_WORDS_ZH, t)) add("event", gather || len <= 6 ? 2.5 : 1);
  if (gather) add("event", 3);
  if (has(/\b(on|over|via) (zoom|meet|teams|facetime)\b|腾讯会议|飞书|钉钉|微信(会议|通话)?|视频会议/, t)) add("event", 2);
  if (has(/\b(i think|i feel|felt|feeling|thinking|wonder|realized|idea|thought|maybe we)\b|觉得|感觉|想到|意识到|也许|好像|思考|反思/, t)) add("note", 2);
  if (len >= 8) add("note", 3);
  else if (len >= 5) add("note", 2.2);
  else if (len >= 4) add("note", 1);
  if (t.length < 3) add("none", 8);
  else if (len <= 1 && !num) add("none", 3);
  else add("none", 0.5);

  // Mutual exclusions mirror the criteria wording.
  if ((s.split ?? 0) >= 5) s.calc = Math.min(s.calc ?? 0, 1);
  if ((s.convert ?? 0) >= 7) s.calc = Math.min(s.calc ?? 0, 1);
  if ((s.reminder ?? 0) >= 6) {
    s.event = Math.min(s.event ?? 0, 2.5);
    s.habit = Math.min(s.habit ?? 0, 2);
  }
  if ((s.habit ?? 0) >= 5) s.event = Math.min(s.event ?? 0, 2);
  if ((s.travel ?? 0) >= 5) s.event = Math.min(s.event ?? 0, 2);
  if ((s.poll ?? 0) >= 5) s.event = Math.min(s.event ?? 0, 2);
  if ((s.contact ?? 0) >= 4) s.timer = 0;
  if ((s.timer ?? 0) >= 3) s.convert = Math.min(s.convert ?? 0, 1);
  if ((s.link ?? 0) >= 6) s.note = 0;
  if ((s.countdown ?? 0) >= 6) s.event = Math.min(s.event ?? 0, 2);
  if ((s.timezone ?? 0) >= 5.5) {
    s.event = Math.min(s.event ?? 0, 2);
    s.convert = Math.min(s.convert ?? 0, 1);
    s.timer = Math.min(s.timer ?? 0, 1);
  }
  if ((s.random ?? 0) >= 6) {
    s.poll = Math.min(s.poll ?? 0, 2);
    s.calc = Math.min(s.calc ?? 0, 1);
    s.convert = Math.min(s.convert ?? 0, 1);
  }
  if ((s.goal ?? 0) >= 4.5) s.calc = Math.min(s.calc ?? 0, 1);
  return s;
}

function softmax(scores: Scores, temp = 1): Record<IntentKey, number> {
  const exps = INTENT_KEYS.map((k) => Math.exp((scores[k] ?? 0) / temp));
  const sum = exps.reduce((a, b) => a + b, 0);
  return Object.fromEntries(INTENT_KEYS.map((k, i) => [k, exps[i] / sum])) as Record<IntentKey, number>;
}

function pick<T extends string>(values: readonly T[], value: T, confidence: number): Answer<T> {
  const rest = (1 - confidence) / Math.max(1, values.length - 1);
  const probabilities = Object.fromEntries(values.map((v) => [v, v === value ? confidence : rest])) as Record<T, number>;
  return { value, confidence, probabilities };
}

function choose<T extends string>(values: readonly T[], t: string, rules: [RegExp, T][], fallback: T): Answer<T> {
  for (const [re, v] of rules) if (re.test(t)) return pick(values, v, 0.86);
  return pick(values, fallback, 0.74);
}

export function mockClassify(text: string): IntentResult {
  const t = text.toLowerCase().trim();
  if (t.length < 2) return noneResult({ model: MOCK_MODEL, questionCount: MOCK_QUESTION_COUNT, source: "mock" });

  const probs = softmax(intentScores(t), 0.8);
  const top = INTENT_KEYS.reduce((a, b) => (probs[b] > probs[a] ? b : a));
  const intent: Answer<IntentKey> = { value: top, confidence: probs[top], probabilities: probs };

  const colorMood: Answer<ColorMood> = choose(COLOR_MOODS, t, [
    [/\b(pastel|soft|pale|baby|light)\b|浅|淡|粉嫩|柔和/, "pastel"],
    [/\b(dark|deep|midnight|navy)\b|深|暗|藏青|墨|炭黑/, "dark"],
    [/\b(neon|vivid|bright|electric|hot)\b|荧光|鲜艳|亮|电光/, "vivid"],
    [/\b(warm|sunset|fire|red|orange|yellow|amber|coral|peach|gold)\b|暖|红(?!枣|糖|薯)|橙(?!子|汁)|橘|黄(?!瓜|豆|焖鸡)|金黄|金|珊瑚|桃|琥珀|夕阳/, "warm"],
    [/\b(cool|ocean|sea|sky|blue|green|teal|purple|mint|ice)\b|冷|蓝(?!球|莓)|绿(?!茶|豆)|青|紫|薄荷|天蓝|海洋|冰/, "cool"],
    [/\b(grey|gray|beige|sand|stone|neutral|cream)\b|灰|米|沙|石|中性|奶油|象牙/, "neutral"],
  ], "neutral");

  const readiness = top === "none" ? 0 : Math.min(2, completenessFor(top as CardIntent, text, { colorMood: colorMood.value }) * 2);

  const recurring = /\b(every|daily|weekly|monthly|each (day|week|morning)|\dx a week|times a week|repeat)|每天|每日|每周|每月|每年|天天|定期|常常|习惯|坚持/.test(t) ? 0.88 : 0.08;
  const urgentHit = /\b(urgent|asap|immediately|right now|important|critical|!!)|紧急|加急|尽快|马上|立刻|赶紧|十万火急|!!/.test(t);
  const soonHit = /\b(today|tonight|soon|by \d|deadline|tomorrow)\b|今天|今晚|明天|后天|马上|尽快|截止|ddl/.test(t);
  const urgencyScore = urgentHit ? 1.75 : soonHit ? 0.9 : 0.2;

  return {
    intent,
    readiness,
    signals: {
      isQuestion: /\?\s*$|^(what|why|how|when|where|who|should|could|would|is|are|do|does|can)\b|[吗呢？]|是不是|要不要|有没有|什么|为什么|怎么|哪[个里儿]|几点|多少|还是/.test(t) ? 0.9 : 0.06,
      recurring,
      urgency: { score: urgencyScore, confidence: 0.8 },
      tone: choose(TONES, t, [
        [/\b(worried|stressed|anxious|ugh|deadline|panic|tired|frustrat)|压力|焦虑|担心|紧张|好烦|崩溃|来不及|加班|累死|烦死/, "stressed"],
        [/\b(can'?t wait|excited|yay|so pumped|!{1,}$)|期待|太棒了|好激动|兴奋|迫不及待|终于/, "excited"],
        [/\b(grateful|happy|love|thankful|glad|great)\b|谢谢|感谢|开心|高兴|太好了|满意|真好/, "positive"],
        [/\b(wonder|thinking about|realized|reflect|maybe|lately|i think)\b|觉得|感觉|想到|意识到|也许|好像|思考|反思|其实/, "reflective"],
      ], "neutral"),
      eventMode: choose(EVENT_MODES, t, [
        [/\b(zoom|meet|teams|facetime|video|skype|discord)\b|视频|腾讯会议|飞书|钉钉|微信会议|视频会议|线上/, "video_call"],
        [/\b(phone|call|ring)\b|电话|打电话|通话|语音/, "phone_call"],
        [/\b(dinner|lunch|breakfast|coffee|drinks|party|at [a-z]+)\b|见面|聚餐|聚会|吃饭|午饭|晚饭|咖啡|喝酒|派对|碰面|一起/, "in_person"],
      ], "unspecified"),
      transport: choose(TRANSPORTS, t, [
        [/\b(flight|fly|flying|plane|airport)\b|飞机|航班|机票|机场|飞/, "flight"],
        [/\b(train|rail)\b|高铁|火车|动车|列车/, "train"],
        [/\b(bus|coach)\b|大巴|巴士|公交|客车|地铁/, "bus"],
        [/\b(drive|car|road ?trip)\b|自驾|开车|驾车|汽车|打车/, "car"],
      ], "unspecified"),
      tripType: choose(TRIP_TYPES, t, [
        [/\b(work|business|conference|client|offsite|meeting)\b|出差|商务|会议|客户|考察/, "work"],
        [/\b(vacation|holiday|beach|getaway|leisure|visit|weekend)\b|度假|旅游|旅行|周末|游玩|休假|出去玩/, "leisure"],
      ], "unspecified"),
      expenseCategory: choose(EXPENSE_CATEGORIES, t, [
        [/\b(uber|ola|cab|taxi|fuel|petrol|metro|bus|train|auto|parking)\b|滴滴|高德|打车|地铁|公交|加油|油费|停车|高铁|火车|机票|车费/, "transport"],
        [/\b(food|lunch|dinner|breakfast|coffee|groceries|swiggy|zomato|pizza|restaurant|drinks)\b|外卖|美团|饿了么|午饭|晚饭|早餐|咖啡|餐厅|饭店|超市|买菜|奶茶|吃的/, "food"],
        [/\b(rent|electricity|wifi|internet|bill|recharge|netflix|spotify|subscription)\b|话费|宽带|网费|房租|水电|电费|水费|燃气|账单|充值|会员|订阅/, "bills"],
        [/\b(movie|concert|game|tickets?|show)\b|电影|演唱会|话剧|门票|游戏|展览/, "entertainment"],
        [/\b(medicine|doctor|pharmacy|gym|hospital)\b|医院|看病|药|挂号|体检|健身房|健身|诊所/, "health"],
        [/\b(shoes|shirt|clothes|amazon|phone|laptop|headphones|gift)\b|淘宝|京东|拼多多|衣服|鞋|手机|电脑|耳机|礼物|购物|买了/, "shopping"],
      ], "other"),
      colorMood,
      timerKind: choose(TIMER_KINDS, t, [
        [/\b(focus|pomodoro|deep work|study|work)\b|专注|番茄|深度工作|学习|工作/, "focus"],
        [/\b(break|rest|nap|breather)\b|休息|小憩|放松|歇一会/, "break"],
        [/\b(stopwatch|count up)\b|秒表|正计时/, "stopwatch"],
      ], "countdown"),
      hasExplicitOptions: (/\b\w+\s+(or|vs)\s+\w+/.test(t) || /[\u4e00-\u9fff]{1,8}(还是|或者)[\u4e00-\u9fff]{1,8}/.test(t) || /\?|？/.test(t)) ? 0.9 : 0.05,
      isShoppingList: /\b(buy|get|groceries|shopping|milk|eggs|bread|coffee|pick up|order)\b|买|采购|清单|购物|超市|下单/.test(t) ? 0.88 : 0.1,
    },
    latencyMs: Math.round(90 + Math.random() * 130),
    questionCount: MOCK_QUESTION_COUNT,
    model: MOCK_MODEL,
    source: "mock",
  };
}

export async function mockClassifyAsync(text: string, signal?: AbortSignal): Promise<IntentResult> {
  const result = mockClassify(text);
  await new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, result.latencyMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
  return result;
}
