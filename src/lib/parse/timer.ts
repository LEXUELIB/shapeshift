import { capitalize, collapse, tidy } from "./common";
import { fw, ZH_NUM, zhNumber } from "./zh";

export type TimerData = { seconds: number | null; label: string };

const UNIT: Record<string, number> = { h: 3600, m: 60, s: 1 };
/** Chinese duration units — `u[0]` is not enough to tell 分钟 from 米, so key on the word. */
const ZH_UNIT: Record<string, number> = { 小时: 3600, 钟头: 3600, 分钟: 60, 分: 60, 秒钟: 1, 秒: 1 };

const POMODORO = /\bpomodoro\b|番茄钟|番茄/;
const DURATION = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:个)?\\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s|小时|钟头|分钟|分|秒钟|秒)(?![a-z])`, "g");
const DURATION_ZH = new RegExp(`([${ZH_NUM}]+)\\s*(小时|钟头|分钟|分|秒钟|秒)`, "g");

const unitSeconds = (u: string) => UNIT[u[0]] ?? ZH_UNIT[u] ?? 1;

export function parseTimer(text: string): TimerData {
  let rest = ` ${collapse(fw(text)).toLowerCase()} `;
  let seconds = 0;
  let found = false;

  const special: [RegExp, number][] = [
    [POMODORO, 25 * 60],
    [/\bhalf an? hour\b|半小时|半个钟头/, 30 * 60],
    [/\ban? hour\b|一小时|一个小时/, 60 * 60],
    [/\ba minute\b|一分钟/, 60],
  ];
  for (const [re, s] of special) {
    if (!re.test(rest)) continue;
    seconds += s;
    found = true;
    if (re !== POMODORO) rest = rest.replace(re, " ");
  }

  rest = rest.replace(DURATION, (_, n: string, u: string) => {
    seconds += Number(n) * unitSeconds(u);
    found = true;
    return " ";
  });

  rest = rest.replace(DURATION_ZH, (_, n: string, u: string) => {
    const v = zhNumber(n);
    if (v !== null) {
      seconds += v * unitSeconds(u);
      found = true;
    }
    return " ";
  });

  // "1:30" style
  rest = rest.replace(/\b(\d{1,2}):(\d{2})\b/, (_, m: string, s: string) => {
    seconds += Number(m) * 60 + Number(s);
    found = true;
    return " ";
  });

  const label = tidy(rest.replace(/\b(?:timer|set|start|a|for|countdown|of)\b|计时器|倒计时|定时器|计时|定时|设置|开始/g, " "));
  return { seconds: found ? Math.round(seconds) : null, label: capitalize(label) };
}

export function completeTimer(d: TimerData) {
  return (d.seconds ? 0.8 : 0) + (d.label ? 0.2 : 0);
}

export function formatClock(total: number) {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 2, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
