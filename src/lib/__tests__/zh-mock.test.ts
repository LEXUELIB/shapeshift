import { describe, expect, test } from "bun:test";
import { mockClassify, MOCK_QUESTION_COUNT } from "@/lib/jev/mock";
import { intentResultSchema } from "@/lib/jev/types";
import { rawState } from "@/lib/decide";

/**
 * Chinese acceptance set — the classification half of reports/zh-cn-golden-set.md.
 * The parsing half lives in zh-golden.test.ts and is owned by the parser module.
 */
const EXAMPLES: [string, string][] = [
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

describe("zh mock classifier", () => {
  test("question count matches schema", () => expect(MOCK_QUESTION_COUNT).toBe(14));

  for (const [text, intent] of EXAMPLES) {
    test(`${text} → ${intent} (committed)`, () => {
      const r = mockClassify(text);
      expect(intentResultSchema.parse(r)).toBeTruthy();
      expect(r.intent.value).toBe(intent as never);
      expect(rawState(r)).toEqual({ kind: "committed", intent } as never);
    });
  }

  test("mixed script: 明天 3pm 开会 is still an event", () => {
    const r = mockClassify("明天 3pm 开会");
    expect(r.intent.value).toBe("event");
    expect(rawState(r)).toEqual({ kind: "committed", intent: "event" } as never);
  });

  test("、-separated shopping list is a todo and flagged as a shopping list", () => {
    const r = mockClassify("买牛奶、鸡蛋、面包和咖啡");
    expect(rawState(r)).toEqual({ kind: "committed", intent: "todo" } as never);
    expect(r.signals.isShoppingList).toBeGreaterThan(0.5);
  });

  // ── Signals, not just the intent key ───────────────────────
  test("Chinese video meeting → video_call", () => {
    expect(mockClassify("明天下午三点和普里亚视频会议").signals.eventMode.value).toBe("video_call");
  });

  test("Chinese colour name drives the mood", () => {
    expect(mockClassify("天蓝色").signals.colorMood.value).toBe("cool");
  });

  test("Chinese urgency words raise the urgency score", () => {
    expect(mockClassify("紧急！马上交房租").signals.urgency.score).toBeGreaterThan(1.2);
  });

  test("Chinese cadence reads as recurring", () => {
    expect(mockClassify("每周三次健身").signals.recurring).toBeGreaterThan(0.5);
  });

  test("a bare Chinese character stays uncommitted", () => {
    expect(mockClassify("买").intent.value).toBe("none");
  });
});
