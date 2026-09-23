import { capitalize, collapse, findDate, removeRange, tidy } from "./common";
import { fw } from "./zh";

export type ReminderData = { task: string; when: Date | null; hasTime: boolean };

const TRIGGER_EN = /\s(?:please\s+)?(?:remind me(?:\s+to)?|reminder:?|don'?t forget(?:\s+to)?|remember to)\s/i;
const TRIGGER_ZH = /(?:请|麻烦)?\s*(?:提醒我|提醒一下|提醒|记得要|记得|记着|别忘了|别忘记|不要忘记|待办[:：]?|记住|记一下)(?:要|去|得)?/g;
const URGENT_ZH = /(?:紧急|重要|尽快|马上|立刻|优先)/g;

export function parseReminder(text: string, ref?: Date): ReminderData {
  let rest = ` ${collapse(fw(text))} `;
  rest = rest.replace(TRIGGER_EN, " ");
  rest = rest.replace(TRIGGER_ZH, " ");
  rest = rest.replace(/\s(?:urgent(?:ly)?|asap|important|!+)(?=\s|$)/gi, " ");
  rest = rest.replace(URGENT_ZH, " ");
  const date = findDate(rest, ref);
  if (date) rest = removeRange(rest, date.index, date.text.length);
  return { task: capitalize(tidy(rest)), when: date?.start ?? null, hasTime: date?.hasTime ?? false };
}

export function completeReminder(d: ReminderData) {
  return (d.task ? 0.55 : 0) + (d.when ? 0.3 : 0) + (d.hasTime ? 0.15 : 0);
}
