import { capitalize, type Currency, detectCurrency, findAmount, removeRange, tidy } from "./common";
import { fw } from "./zh";

export type ExpenseData = { amount: number | null; item: string; currency: Currency };

const ON_EN = /\b(?:on|for|at|in)\s+(.+)$/i;
/** "在超市花了45元" → the item is what follows 在. */
const ON_ZH = /(?:在|去)\s*([\w\u4e00-\u9fff]+?)\s*(?:上|买了|买|花了|花|付了|付|消费|吃|喝)/;
const NOISE_EN = /\b(?:spent|paid|pay|bought|cost|costs|rupees|rs|bucks|dollars|today|yesterday)\b/gi;
const NOISE_ZH = /花了|花掉|花|买了|买|付了|付|消费了|消费|支出|一共|总共|大概|大约|差不多|用了|用了钱|钱|今天|昨天|前天|早上|中午|晚上/g;

export function parseExpense(text: string): ExpenseData {
  const src = fw(text);
  const amount = findAmount(src);
  const rest = amount ? removeRange(src, amount.index, amount.length) : src;
  const zh = rest.match(ON_ZH);
  const en = rest.match(ON_EN);
  let item = zh ? zh[1] : en ? en[1] : rest;
  item = item.replace(NOISE_EN, " ").replace(NOISE_ZH, " ");
  return { amount: amount?.value ?? null, item: capitalize(tidy(item)), currency: detectCurrency(text) };
}

export function completeExpense(d: ExpenseData) {
  return (d.amount ? 0.6 : 0) + (d.item ? 0.4 : 0);
}
