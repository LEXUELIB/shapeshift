import { capitalize, collapse, LIST_WEAK_RE } from "./common";
import { fw } from "./zh";

export type TodoData = { items: string[]; verb: string | null };

/** List headers, English and Chinese. */
const HEADER = /^(?:to ?do(?: list)?|shopping list|grocery list|list|待办(?:清单|列表)?|购物清单|采购清单|清单|列表)\s*[:：]?\s*/i;
/** A leading verb becomes `verb`; the items are then read on their own. */
const VERB = /^(?:(buy|get|pick up|grab|order)\s+|(?:要买|买点|去买|购买|采购|买)\s*)/i;
/** The same words again, for items that were not at the head of the list. */
const ITEM_PREFIX = /^(?:(?:buy|get|also)\s+|(?:要买|买点|去买|购买|采购|买|还有|以及|然后)\s*)/i;

export function parseTodo(text: string): TodoData {
  let rest = collapse(fw(text).replace(/\n/g, ", "));
  rest = rest.replace(HEADER, "");
  let verb: string | null = null;
  const vm = rest.match(VERB);
  if (vm) {
    verb = vm[1] ? vm[1].toLowerCase() : "buy";
    rest = rest.slice(vm[0].length);
  }
  const items = rest
    .split(LIST_WEAK_RE)
    .map((s) => s.trim().replace(ITEM_PREFIX, "").replace(/[.!?。！？]+$/, ""))
    .filter(Boolean)
    .map(capitalize);
  return { items, verb };
}

export function completeTodo(d: TodoData) {
  return Math.min(1, d.items.length / 3);
}
