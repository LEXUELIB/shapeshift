import { type Currency, detectCurrency, findAmount } from "./common";
import { fw } from "./zh";

export type SplitData = { total: number | null; people: number | null; currency: Currency };

const WORD_NUM: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};
const NUM = String.raw`(\d+|two|three|four|five|six|seven|eight|nine|ten|两|二|三|四|五|六|七|八|九|十)`;
const PEOPLE_ZH = "个人|人|位|份|口";

/** "3 people" / "分3个人" / "分成三份" */
const PEOPLE_BEFORE = new RegExp(
  String.raw`(?:between|among|amongst|with|by|for|into|分给|分成|分|给|和|跟|与)\s*${NUM}\s*(?:people|persons|friends|of us|ways|${PEOPLE_ZH})?`,
  "i",
);
const PEOPLE_AFTER = new RegExp(String.raw`${NUM}\s*(?:ways|people|persons|friends|of us|${PEOPLE_ZH})`, "i");

export function parseSplit(text: string): SplitData {
  const src = fw(text);
  let rest = src;
  let people: number | null = null;

  const n = rest.match(PEOPLE_BEFORE) ?? rest.match(PEOPLE_AFTER);
  if (n) {
    people = WORD_NUM[n[1].toLowerCase()] ?? Number(n[1]);
    rest = rest.replace(n[0], " ");
  } else {
    // "split 900 between me, rahul and priya" → count names
    const names = rest.match(/\b(?:between|among|with)\s+(.+)$/i);
    if (names) {
      const parts = names[1].split(/\s*(?:,|&|\band\b|、|和|跟|与)\s*/i).filter((p) => /[a-z\u4e00-\u9fff]/i.test(p));
      if (parts.length >= 2) people = parts.length;
      else if (parts.length === 1 && !/\d/.test(parts[0])) people = 2;
      rest = rest.replace(names[0], " ");
    }
  }

  const amount = findAmount(rest);
  // "3个人人均800" reads as per-head, so the bill is the amount × people.
  const perHead = people && amount && /人均|\bAA\b|各付|平摊/.test(src) ? amount.value * people : null;
  return {
    total: perHead ?? amount?.value ?? null,
    people: people && people > 0 ? people : null,
    currency: detectCurrency(text),
  };
}

export function completeSplit(d: SplitData) {
  return (d.total ? 0.55 : 0) + (d.people ? 0.45 : 0);
}
