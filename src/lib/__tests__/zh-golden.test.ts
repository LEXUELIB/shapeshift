import { describe, expect, test } from "bun:test";
import { rawState } from "@/lib/decide";
import { mockClassify } from "@/lib/jev/mock";
import type { CardIntent } from "@/lib/jev/types";
import { parseFor } from "@/lib/parse";

/**
 * Golden set for the zh-CN pass: every row must survive BOTH layers —
 * the classifier must commit to the right card, and the deterministic parser
 * must extract the right values. See reports/zh-cn-golden-set.md.
 *
 * REF is 2026-09-22 10:00 local (a Tuesday).
 */
const REF = new Date(2026, 8, 22, 10, 0);

function committed(text: string): CardIntent {
  const state = rawState(mockClassify(text));
  expect({ text, kind: state.kind }).toEqual({ text, kind: "committed" });
  return (state as { kind: "committed"; intent: CardIntent }).intent;
}

const dayOf = (d: Date | null) => (d ? d.getDate() : null);
const monthOf = (d: Date | null) => (d ? d.getMonth() : null);

describe("zh-CN golden set · classification", () => {
  const rows: [string, CardIntent][] = [
    ["明天下午三点和普里亚视频会议", "event"],
    ["提醒我明天交房租", "reminder"],
    ["买牛奶、鸡蛋、面包和咖啡", "todo"],
    ["25分钟专注", "timer"],
    ["每周三次健身", "habit"],
    ["天蓝色", "color"],
    ["2400块分3个人", "split"],
    ["午饭花了45元", "expense"],
    ["5英里等于多少公里", "convert"],
    ["3450的18%", "calc"],
    ["下周末去三亚", "travel"],
    ["周五吃披萨还是汉堡？", "poll"],
    ["李雷 13800138000 lilei@mail.com", "contact"],
    ["12月25日还有多少天", "countdown"],
    ["北京下午3点换成纽约时间", "timezone"],
    ["掷2个骰子", "random"],
    ["今年读12本书，已读4本", "goal"],
  ];

  for (const [text, intent] of rows) {
    test(`${text} → ${intent}`, () => {
      expect(committed(text)).toBe(intent);
    });
  }
});

describe("zh-CN golden set · values", () => {
  test("1 · event picks up the Chinese date and time", () => {
    const d = parseFor("event", "明天下午三点和普里亚视频会议", { ref: REF });
    expect(dayOf(d.date)).toBe(23);
    expect(d.hasTime).toBe(true);
    expect(mockClassify("明天下午三点和普里亚视频会议").signals.eventMode.value).toBe("video_call");
  });

  test("2 · reminder keeps the task and the day", () => {
    const d = parseFor("reminder", "提醒我明天交房租", { ref: REF });
    expect(d.task).toContain("交房租");
    expect(dayOf(d.when)).toBe(23);
  });

  test("3 · checklist splits on 、 and 和", () => {
    const d = parseFor("todo", "买牛奶、鸡蛋、面包和咖啡", { ref: REF });
    expect(d.items).toHaveLength(4);
    for (const item of ["牛奶", "鸡蛋", "面包", "咖啡"]) {
      expect(d.items.some((x) => x.includes(item))).toBe(true);
    }
    expect(mockClassify("买牛奶、鸡蛋、面包和咖啡").signals.isShoppingList).toBeGreaterThan(0.65);
  });

  test("4 · timer reads 分钟", () => {
    expect(parseFor("timer", "25分钟专注", { ref: REF }).seconds).toBe(1500);
    expect(mockClassify("25分钟专注").signals.timerKind.value).toBe("focus");
  });

  test("5 · habit reads 每周三次", () => {
    expect(parseFor("habit", "每周三次健身", { ref: REF }).perWeek).toBe(3);
  });

  test("6 · colour resolves 天蓝色", () => {
    const d = parseFor("color", "天蓝色", { ref: REF });
    expect(d.hex ?? d.name).toBeTruthy();
    expect(mockClassify("天蓝色").signals.colorMood.value).toBe("cool");
  });

  test("7 · split reads 块 and 个人", () => {
    const d = parseFor("split", "2400块分3个人", { ref: REF });
    expect(d.total).toBe(2400);
    expect(d.people).toBe(3);
    expect(d.currency).toBe("¥");
  });

  test("8 · expense reads 花了…元 as ¥", () => {
    const d = parseFor("expense", "午饭花了45元", { ref: REF });
    expect(d.amount).toBe(45);
    expect(d.currency).toBe("¥");
    expect(mockClassify("午饭花了45元").signals.expenseCategory.value).toBe("food");
  });

  test("9 · convert reads 英里/公里", () => {
    const d = parseFor("convert", "5英里等于多少公里", { ref: REF });
    expect(d.from).toBe("mi");
    expect(d.to).toBe("km");
    expect(d.result).toBeGreaterThan(7.9);
    expect(d.result).toBeLessThan(8.2);
  });

  test("10 · calc reads N的M%", () => {
    expect(parseFor("calc", "3450的18%", { ref: REF }).result).toBe(621);
  });

  test("11 · travel finds a Chinese destination", () => {
    const d = parseFor("travel", "下周末去三亚", { ref: REF });
    expect(d.destination).toBe("三亚");
    expect(monthOf(d.start)).toBe(9);
    expect(dayOf(d.start)).toBe(3);
  });

  test("12 · poll splits on 还是", () => {
    const d = parseFor("poll", "周五吃披萨还是汉堡？", { ref: REF });
    expect(d.options).toHaveLength(2);
    expect(d.options.join("|")).toContain("披萨");
    expect(d.options.join("|")).toContain("汉堡");
  });

  test("13 · contact reads a +86 mobile", () => {
    const d = parseFor("contact", "李雷 13800138000 lilei@mail.com", { ref: REF });
    expect(d.name).toBe("李雷");
    expect(d.email).toBe("lilei@mail.com");
    expect(d.phone ?? "").toContain("138");
  });

  test("14 · countdown reads a Chinese date", () => {
    const d = parseFor("countdown", "12月25日还有多少天", { ref: REF });
    expect(monthOf(d.date)).toBe(11);
    expect(dayOf(d.date)).toBe(25);
  });

  test("15 · timezone knows 北京 and 纽约", () => {
    const d = parseFor("timezone", "北京下午3点换成纽约时间", { ref: REF });
    expect(d.from.tz).toBe("Asia/Shanghai");
    expect(d.to?.tz).toBe("America/New_York");
    expect(d.isNow).toBe(false);
  });

  test("16 · random reads 掷2个骰子", () => {
    const d = parseFor("random", "掷2个骰子", { ref: REF });
    expect(d.kind).toBe("dice");
    if (d.kind === "dice") {
      expect(d.count).toBe(2);
      expect(d.sides).toBe(6);
    }
  });

  test("17 · goal reads 已读4本 / 12本", () => {
    const d = parseFor("goal", "今年读12本书，已读4本", { ref: REF });
    expect(d.target).toBe(12);
    expect(d.current).toBe(4);
  });
});

describe("zh-CN golden set · mixed script and safety", () => {
  test("mixed 明天 + 3pm is still an event on the right day", () => {
    expect(committed("明天 3pm 开会")).toBe("event");
    const d = parseFor("event", "明天 3pm 开会", { ref: REF });
    expect(dayOf(d.date)).toBe(23);
    expect(d.hasTime).toBe(true);
  });

  test("a bare Chinese character stays uncommitted", () => {
    expect(rawState(mockClassify("好")).kind).not.toBe("committed");
  });

  test("English is untouched: no CJK ⇒ ₹ and English parsing still work", () => {
    const d = parseFor("split", "split 2400 between 3", { ref: REF });
    expect(d.total).toBe(2400);
    expect(d.people).toBe(3);
    expect(d.currency).toBe("₹");
  });
});
