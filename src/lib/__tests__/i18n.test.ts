import { describe, expect, test } from "bun:test";
import { registry, CARD_INTENTS } from "@/components/intents/registry";
import { LOCALE, ZH, isZh, t, tx, pick } from "@/lib/i18n";

describe("i18n catalog", () => {
  test("the locale is the build-time default (zh) unless NEXT_PUBLIC_LOCALE=en", () => {
    expect(LOCALE).toBe(process.env.NEXT_PUBLIC_LOCALE === "en" ? "en" : "zh");
    expect(isZh).toBe(LOCALE === "zh");
  });

  test("t() returns the Chinese entry, or falls back to the English key", () => {
    if (isZh) {
      expect(t("Event")).toBe("日程");
      expect(t("Timer")).toBe("计时");
      expect(t("Close")).toBe("关闭");
    } else {
      expect(t("Event")).toBe("Event");
    }
    // Never blank, even for a string that has no entry.
    expect(t("a string no catalog will ever contain")).toBe("a string no catalog will ever contain");
  });

  test("tx() and pick() choose per locale", () => {
    expect(tx("Shopping", "购物")).toBe(isZh ? "购物" : "Shopping");
    expect(pick("en", "zh")).toBe(isZh ? "zh" : "en");
  });

  test("the expense category Shopping is not the checklist header Shopping", () => {
    // The checklist header is 采购; the expense category must not inherit it.
    expect(ZH["Shopping"]).toBe("采购");
    expect(tx("Shopping", "购物")).toBe(isZh ? "购物" : "Shopping");
    expect(tx("Shopping", "购物")).not.toBe(ZH["Shopping"]);
  });

  test("every catalog value is non-empty; only key names and symbols stay Latin", () => {
    const cjk = /[\u3400-\u4dbf\u4e00-\u9fff]/;
    // Key names (Tab, Esc) and symbols (of, 0%) have no Chinese form.
    const scriptFree = new Set(["Tab", "Esc", "of", "0%"]);
    const latin: string[] = [];
    for (const [en, zh] of Object.entries(ZH)) {
      expect(en.length).toBeGreaterThan(0);
      expect(zh.length).toBeGreaterThan(0);
      if (!cjk.test(zh)) latin.push(en);
    }
    expect(latin.sort()).toEqual([...scriptFree].sort());
  });
});

describe("registry localization", () => {
  test("every card label resolves through t() and is Chinese on the zh build", () => {
    const cjk = /[\u3400-\u4dbf\u4e00-\u9fff]/;
    for (const intent of CARD_INTENTS) {
      const { label } = registry[intent];
      expect(label.length).toBeGreaterThan(0);
      if (isZh) {
        // The label is `t(english)`, so it must not still be the English word.
        expect(cjk.test(label)).toBe(true);
        expect(label).not.toMatch(/^[A-Za-z ]+$/);
      }
    }
  });

  test("Chinese examples are Chinese input, not translated UI copy", () => {
    if (!isZh) return;
    const cjk = /[\u4e00-\u9fff]/;
    for (const intent of CARD_INTENTS) {
      expect(cjk.test(registry[intent].example)).toBe(true);
    }
    expect(registry.event.example).toBe("明天下午三点和普里亚视频会议");
    expect(registry.todo.example).toBe("买牛奶、鸡蛋、面包和咖啡");
    expect(registry.convert.example).toBe("5英里等于多少公里");
    expect(registry.travel.example).toBe("下周末去三亚");
    expect(registry.expense.example).toBe("午饭花了45元");
    expect(registry.timer.example).toBe("25分钟专注");
    expect(registry.habit.example).toBe("每周三次健身");
    expect(registry.poll.example).toBe("周五吃披萨还是汉堡？");
    expect(registry.countdown.example).toBe("12月25日还有多少天");
    expect(registry.timezone.example).toBe("北京下午3点换成纽约时间");
    expect(registry.random.example).toBe("掷2个骰子");
    expect(registry.goal.example).toBe("今年读12本书，已读4本");
    expect(registry.contact.example).toBe("李雷 13800138000 lilei@mail.com");
    expect(registry.color.example).toBe("天蓝色");
  });

  test("summaries fall back to localized words, never an English placeholder", () => {
    const summary = registry.event.summary({ title: "", date: null, hasTime: false, people: [], link: null, location: null });
    expect(summary).toBe(t("Event"));
    expect(registry.split.summary({ total: null, people: null, currency: "₹" })).toBe(t("Split"));
    expect(registry.convert.summary({ value: null, from: null, to: null, result: null })).toBe(t("Conversion"));
  });
});
