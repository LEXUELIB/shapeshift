import { collapse, titleCase } from "./common";
import { fw } from "./zh";

export type ContactData = { name: string; phone: string | null; email: string | null; initials: string };

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?\(?\d{3,5}\)?[\s-]?\d{3,5}[\s-]?\d{0,5}/;
const NOISE =
  /\b(?:save|add|contact|number|phone|email|mail|is|his|her|their|new)\b|保存|添加|新建|联系人|通讯录|手机号?码?|电话号码?|邮箱|邮件|姓名|名字|叫|是/gi;

/**
 * Mainland mobiles are 11 digits starting 13x–19x and group 3-4-4; a `+86`
 * prefix is kept. The Indian 5+5 split only applies to bare 10-digit numbers.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (/^1[3-9]\d{9}$/.test(digits)) return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  if (/^861[3-9]\d{9}$/.test(digits)) return `+86 ${formatPhone(digits.slice(2))}`;
  if (/^00861[3-9]\d{9}$/.test(digits)) return `+86 ${formatPhone(digits.slice(4))}`;
  // Mainland landline: 0 + area code, so avoid the Indian 5+5 split.
  if (/^0\d{9,11}$/.test(digits)) {
    const area = digits.startsWith("010") || digits.length === 10 ? 3 : 4;
    const local = digits.slice(area);
    const mid = local.length === 8 ? 4 : 3;
    return `${digits.slice(0, area)} ${local.slice(0, mid)} ${local.slice(mid)}`;
  }
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return raw.trim();
}

export function parseContact(text: string): ContactData {
  let rest = collapse(fw(text));
  const em = rest.match(EMAIL_RE);
  const email = em ? em[0].toLowerCase() : null;
  if (em) rest = rest.replace(em[0], " ");

  let phone: string | null = null;
  const pm = rest.match(PHONE_RE);
  if (pm && pm[0].replace(/\D/g, "").length >= 7) {
    phone = formatPhone(pm[0]);
    rest = rest.replace(pm[0], " ");
  }

  const name = titleCase(
    rest
      .replace(NOISE, " ")
      .replace(/[^a-z\u4e00-\u9fff\s'.-]/gi, " ")
      .trim(),
  );
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return { name, phone, email, initials };
}

export function completeContact(d: ContactData) {
  return (d.name ? 0.4 : 0) + (d.phone || d.email ? 0.4 : 0) + (d.phone && d.email ? 0.2 : 0);
}
