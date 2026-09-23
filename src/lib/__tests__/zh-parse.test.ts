import { describe, expect, test } from "bun:test";
import { hexToOklch } from "@/lib/color";
import { pick } from "@/lib/i18n";
import { parseFor } from "@/lib/parse";
import { formatPhone, parseContact } from "@/lib/parse/contact";
import { parseConvert } from "@/lib/parse/convert";
import { parseCountdown } from "@/lib/parse/countdown";
import { parseHabit } from "@/lib/parse/habit";
import { parsePoll } from "@/lib/parse/poll";
import { formatIn, parseTimezone } from "@/lib/parse/timezone";
import { describeRandom, rollRandom } from "@/lib/parse/random";
import { zhNumber } from "@/lib/parse/zh";

/**
 * Simplified-Chinese coverage for every parser that has one.
 *
 * The intent/classification half of the golden set lives in `zh-golden.test.ts`;
 * this file only asserts what the deterministic parsers extract, plus the
 * Chinese-specific shims (斤/两, +86, cst, full-width punctuation).
 *
 * REF is 2026-09-22 10:00 local (a Tuesday).
 */
const REF = new Date(2026, 8, 22, 10, 0);
const dayOf = (d: Date | null) => (d ? d.getDate() : null);
const monthOf = (d: Date | null) => (d ? d.getMonth() : null);

describe("zh · event", () => {
  test("1 · 明天下午三点和普里亚视频会议", () => {
    const d = parseFor("event", "明天下午三点和普里亚视频会议", { ref: REF });
    expect(dayOf(d.date)).toBe(23);
    expect(d.date?.getHours()).toBe(15);
    expect(d.hasTime).toBe(true);
    expect(d.people).toContain("普里亚");
    // `link` is a UI label (locale-dependent); `title` echoes the user's own word.
    expect(d.link).toBe(pick("Video call", "视频会议"));
    expect(d.title).toBe("视频会议");
  });

  test("mixed 明天 3pm keeps both halves", () => {
    const d = parseFor("event", "明天 3pm 开会", { ref: REF });
    expect(dayOf(d.date)).toBe(23);
    expect(d.hasTime).toBe(true);
    expect(d.title).toBe("开会");
  });

  test("用腾讯会议 → link, 在星巴克 → location", () => {
    expect(parseFor("event", "用腾讯会议开会", { ref: REF }).link).toBe(pick("Tencent Meeting", "腾讯会议"));
    const d = parseFor("event", "在星巴克和李雷开会", { ref: REF });
    expect(d.location).toBe("星巴克");
    expect(d.people).toContain("李雷");
  });
});

describe("zh · reminder", () => {
  test("2 · 提醒我明天交房租", () => {
    const d = parseFor("reminder", "提醒我明天交房租", { ref: REF });
    expect(d.task).toContain("交房租");
    expect(dayOf(d.when)).toBe(23);
    expect(d.hasTime).toBe(false);
  });

  test("记得/别忘了 and 紧急/重要 are stripped", () => {
    expect(parseFor("reminder", "记得买牛奶", { ref: REF }).task).toBe("买牛奶");
    expect(parseFor("reminder", "别忘了交房租 紧急", { ref: REF }).task).toBe("交房租");
    expect(parseFor("reminder", "提醒我尽快交房租", { ref: REF }).task).toBe("交房租");
  });
});

describe("zh · checklist", () => {
  test("3 · 买牛奶、鸡蛋、面包和咖啡", () => {
    const d = parseFor("todo", "买牛奶、鸡蛋、面包和咖啡");
    expect(d.items).toHaveLength(4);
    for (const item of ["牛奶", "鸡蛋", "面包", "咖啡"]) expect(d.items).toContain(item);
    expect(d.verb).toBe("buy");
  });

  test("full-width comma and header", () => {
    expect(parseFor("todo", "买牛奶，鸡蛋，面包和咖啡").items).toHaveLength(4);
    expect(parseFor("todo", "待办：洗车、交房租").items).toEqual(["洗车", "交房租"]);
  });
});

describe("zh · timer", () => {
  test("4 · 25分钟专注", () => {
    const d = parseFor("timer", "25分钟专注");
    expect(d.seconds).toBe(1500);
    expect(d.label).toBe("专注");
  });

  test("小时 / 秒 / 番茄钟 / 半小时", () => {
    expect(parseFor("timer", "2小时").seconds).toBe(7200);
    expect(parseFor("timer", "45秒").seconds).toBe(45);
    expect(parseFor("timer", "番茄钟").seconds).toBe(1500);
    expect(parseFor("timer", "半小时").seconds).toBe(1800);
  });

  test("clock form still works", () => expect(parseFor("timer", "1:30").seconds).toBe(90));
});

describe("zh · habit", () => {
  test("5 · 每周三次健身", () => {
    const d = parseHabit("每周三次健身");
    expect(d.perWeek).toBe(3);
    expect(d.title).toBe("健身");
    expect(d.days).toEqual([1, 3, 5]);
  });

  test("每天 / 工作日 / 周一", () => {
    expect(parseHabit("每天跑步").days).toHaveLength(7);
    expect(parseHabit("工作日背单词").days).toEqual([1, 2, 3, 4, 5]);
    expect(parseHabit("周一和周四游泳").days).toEqual([1, 4]);
  });
});

describe("zh · colour", () => {
  test("6 · 天蓝色 resolves to a blue", () => {
    const d = parseFor("color", "天蓝色");
    expect(d.name).toBe("天蓝");
    expect(d.hex).toBe("#74c0fc");
    const o = hexToOklch(d.hex!)!;
    expect(o.h).toBeGreaterThan(200);
    expect(o.h).toBeLessThan(300);
  });

  test("compound names beat their head character", () => {
    expect(parseFor("color", "薄荷绿").name).toBe("薄荷绿");
    expect(parseFor("color", "藏青色").name).toBe("藏青");
    expect(parseFor("color", "紫罗兰").hex).toBe("#7950f2");
  });

  test("Chinese modifiers lighten / darken", () => {
    const light = parseFor("color", "浅蓝色");
    expect(light.name).toBe("蓝");
    expect(hexToOklch(light.hex!)!.l).toBeGreaterThan(hexToOklch("#1c7ed6")!.l);
    const dark = parseFor("color", "深红色");
    expect(hexToOklch(dark.hex!)!.l).toBeLessThan(hexToOklch("#e03131")!.l);
  });

  test("a Chinese word with no colour still returns nothing", () => {
    expect(parseFor("color", "今天").hex).toBeNull();
  });
});

describe("zh · split", () => {
  test("7 · 2400块分3个人", () => {
    const d = parseFor("split", "2400块分3个人");
    expect(d.total).toBe(2400);
    expect(d.people).toBe(3);
    expect(d.currency).toBe("¥");
    expect(d.total! / d.people!).toBe(800);
  });

  test("人均 reads a per-head amount", () => {
    expect(parseFor("split", "3个人人均800").total).toBe(2400);
    expect(parseFor("split", "分成四份 2000").people).toBe(4);
  });

  test("English split is untouched", () => {
    const d = parseFor("split", "split 2400 between 3");
    expect(d).toEqual({ total: 2400, people: 3, currency: "₹" });
  });
});

describe("zh · expense", () => {
  test("8 · 午饭花了45元", () => {
    const d = parseFor("expense", "午饭花了45元");
    expect(d.amount).toBe(45);
    expect(d.currency).toBe("¥");
    expect(d.item).toBe("午饭");
  });

  test("在…上 names the item", () => {
    expect(parseFor("expense", "在超市花了45元").item).toBe("超市");
    expect(parseFor("expense", "买书付了120块").amount).toBe(120);
  });
});

describe("zh · convert", () => {
  test("9 · 5英里等于多少公里", () => {
    const d = parseConvert("5英里等于多少公里");
    expect(d.from).toBe("mi");
    expect(d.to).toBe("km");
    expect(d.result).toBeGreaterThan(7.9);
    expect(d.result).toBeLessThan(8.2);
  });

  test("摄氏度 / 公斤 / 升", () => {
    expect(parseConvert("30摄氏度等于多少华氏度").result).toBeCloseTo(86, 1);
    expect(parseConvert("10公斤换算成磅").result).toBeCloseTo(22.05, 1);
    expect(parseConvert("2升是多少毫升").result).toBe(2000);
  });

  test("斤 and 两 shim through grams", () => {
    const jin = parseConvert("2斤等于多少克");
    expect(jin).toMatchObject({ value: 2, from: "斤", to: "g" });
    expect(jin.result).toBe(1000);
    expect(parseConvert("1斤等于多少两").result).toBe(10);
    expect(parseConvert("500克等于多少斤").result).toBe(1);
  });

  test("English conversion is untouched", () => {
    const c = parseConvert("5 miles in km");
    expect(c.from).toBe("mi");
    expect(c.to).toBe("km");
    expect(c.result).toBeCloseTo(8.047, 2);
  });
});

describe("zh · calc", () => {
  test("10 · 3450的18%", () => expect(parseFor("calc", "3450的18%").result).toBe(621));
  test("百分之", () => expect(parseFor("calc", "百分之20的500").result).toBe(100));
  test("加 减 乘 除", () => {
    expect(parseFor("calc", "10加5").result).toBe(15);
    expect(parseFor("calc", "10减4").result).toBe(6);
    expect(parseFor("calc", "3乘以7").result).toBe(21);
    expect(parseFor("calc", "12除以4").result).toBe(3);
    expect(parseFor("calc", "5加3等于多少").result).toBe(8);
  });
  test("English calc is untouched", () => {
    expect(parseFor("calc", "18% of 3450").result).toBeCloseTo(621);
    expect(parseFor("calc", "20% off 1500").result).toBe(1200);
  });
});

describe("zh · trip", () => {
  test("11 · 下周末去三亚", () => {
    const d = parseFor("travel", "下周末去三亚", { ref: REF });
    expect(d.destination).toBe("三亚");
    expect(monthOf(d.start)).toBe(9);
    expect(dayOf(d.start)).toBe(3);
  });

  test("从…到…", () => {
    const d = parseFor("travel", "从北京飞到上海", { ref: REF });
    expect(d.origin).toBe("北京");
    expect(d.destination).toBe("上海");
  });
});

describe("zh · poll", () => {
  test("12 · 周五吃披萨还是汉堡？", () => {
    const d = parsePoll("周五吃披萨还是汉堡？", REF);
    expect(d.options).toEqual(["披萨", "汉堡"]);
  });

  test("或者 is also a separator", () => {
    expect(parsePoll("喝咖啡或者喝茶", REF).options).toEqual(["咖啡", "喝茶"]);
  });

  test("English poll is untouched", () => {
    const p = parsePoll("pizza or burgers for friday?");
    expect(p.options).toEqual(["Pizza", "Burgers"]);
    expect(p.title).toBe("Pizza or burgers for friday?");
  });
});

describe("zh · contact", () => {
  test("13 · 李雷 13800138000 lilei@mail.com", () => {
    const d = parseContact("李雷 13800138000 lilei@mail.com");
    expect(d.name).toBe("李雷");
    expect(d.phone).toBe("138 0013 8000");
    expect(d.email).toBe("lilei@mail.com");
  });

  test("+86 mobile keeps the country code", () => {
    expect(parseContact("+86 13800138000 李雷").phone).toBe("+86 138 0013 8000");
    expect(formatPhone("+8613800138000")).toBe("+86 138 0013 8000");
  });

  test("mainland landlines avoid the Indian 5+5 split", () => {
    expect(formatPhone("01012345678")).toBe("010 1234 5678");
    expect(formatPhone("0101234567")).toBe("010 123 4567");
    expect(formatPhone("98200 12345")).toBe("98200 12345");
  });
});

describe("zh · countdown", () => {
  test("14 · 12月25日还有多少天", () => {
    const d = parseCountdown("12月25日还有多少天", REF);
    expect(monthOf(d.date)).toBe(11);
    expect(dayOf(d.date)).toBe(25);
  });

  test("Chinese festivals resolve to the right day", () => {
    const newYear = parseCountdown("距离元旦还有多少天", REF);
    expect(newYear.title).toBe(pick("New Year's Day", "元旦"));
    expect(newYear.date?.getFullYear()).toBe(2027);
    expect(dayOf(newYear.date)).toBe(1);

    const labour = parseCountdown("劳动节还有几天", REF);
    expect(monthOf(labour.date)).toBe(4);
    expect(dayOf(labour.date)).toBe(1);

    const national = parseCountdown("国庆节还有多少天", REF);
    expect(monthOf(national.date)).toBe(9);
    expect(dayOf(national.date)).toBe(1);

    const singles = parseCountdown("双十一还有几天", REF);
    expect(monthOf(singles.date)).toBe(10);
    expect(dayOf(singles.date)).toBe(11);

    // Lunar festivals: 2026 春节 is Feb 17, 中秋 Sep 25, 端午 Jun 19.
    const spring = parseCountdown("春节还有多少天", REF);
    expect(spring.date?.getFullYear()).toBe(2027);
    expect(monthOf(spring.date)).toBe(1);
    expect(dayOf(spring.date)).toBe(17);

    const midAutumn = parseCountdown("中秋节还有多少天", REF);
    expect(monthOf(midAutumn.date)).toBe(8);
    expect(dayOf(midAutumn.date)).toBe(25);

    const dragon = parseCountdown("端午节还有多少天", REF);
    expect(monthOf(dragon.date)).toBe(5);
    expect(dayOf(dragon.date)).toBe(19);
  });

  test("English holidays are untouched", () => {
    expect(parseCountdown("days until christmas", REF)).toMatchObject({ title: "Christmas", days: 94 });
  });
});

describe("zh · time zone", () => {
  test("15 · 北京下午3点换成纽约时间", () => {
    const d = parseTimezone("北京下午3点换成纽约时间", REF);
    expect(d.from.tz).toBe("Asia/Shanghai");
    expect(d.to?.tz).toBe("America/New_York");
    expect(d.isNow).toBe(false);
    expect(formatIn("Asia/Shanghai", d.instant!)).toBe("3:00 PM");
    expect(formatIn("America/New_York", d.instant!)).toBe("3:00 AM");
  });

  test("mainland cities all map to Asia/Shanghai", () => {
    for (const city of ["上海", "深圳", "广州", "杭州", "成都", "中国"]) {
      expect(parseTimezone(`${city}时间`, REF).from.tz === "Asia/Shanghai" || parseTimezone(`${city}时间`, REF).to?.tz === "Asia/Shanghai").toBe(true);
    }
    expect(parseTimezone("上海下午3点换成伦敦时间", REF).to?.tz).toBe("Europe/London");
  });

  test("cst is China Standard Time for Chinese text, US Central otherwise", () => {
    expect(parseTimezone("纽约上午9点换成cst", REF).to?.tz).toBe("Asia/Shanghai");
    expect(parseTimezone("9am cst", REF).from.tz).toBe("America/Chicago");
    expect(parseTimezone("3pm cst in ist", REF).from.tz).toBe("America/Chicago");
  });

  test("Chinese clock forms", () => {
    const d = parseTimezone("纽约上午九点半", REF);
    expect(d.from.tz).toBe("America/New_York");
    expect(formatIn("America/New_York", d.instant!)).toBe("9:30 AM");
    expect(parseTimezone("北京晚上八点", REF).instant).not.toBeNull();
  });
});

describe("zh · random", () => {
  test("16 · 掷2个骰子", () => {
    const d = parseFor("random", "掷2个骰子");
    expect(d.kind).toBe("dice");
    if (d.kind === "dice") {
      expect(d.count).toBe(2);
      expect(d.sides).toBe(6);
    }
  });

  test("硬币 / 正反面", () => {
    expect(parseFor("random", "抛硬币").kind).toBe("coin");
    expect(parseFor("random", "掷硬币正反面").kind).toBe("coin");
    expect(rollRandom({ kind: "coin" }, () => 0.9)).toEqual([pick("Tails", "反面")]);
  });

  test("随机 range and 选一个 pick", () => {
    expect(parseFor("random", "从1到100随机")).toEqual({ kind: "number", min: 1, max: 100 });
    expect(parseFor("random", "从披萨、汉堡、寿司里选一个")).toEqual({
      kind: "pick",
      options: ["披萨", "汉堡", "寿司"],
    });
  });

  test("labels are localized", () => {
    expect(describeRandom({ kind: "coin" })).toBe(pick("Coin flip", "抛硬币"));
    expect(describeRandom({ kind: "dice", count: 2, sides: 6 })).toBe(pick("2 dice", "2 个骰子"));
    expect(describeRandom({ kind: "pick", options: ["a", "b"] })).toBe(pick("Pick one of 2", "从 2 个里选一个"));
  });

  test("English random is untouched", () => {
    expect(parseFor("random", "roll 2d6")).toEqual({ kind: "dice", count: 2, sides: 6 });
    expect(parseFor("random", "pick one: tacos, sushi or pizza")).toEqual({
      kind: "pick",
      options: ["Tacos", "Sushi", "Pizza"],
    });
  });
});

describe("zh · goal", () => {
  test("17 · 今年读12本书，已读4本", () => {
    const d = parseFor("goal", "今年读12本书，已读4本");
    expect(d.target).toBe(12);
    expect(d.current).toBe(4);
    expect(d.unit).toBe("本");
  });

  test("other Chinese units", () => {
    expect(parseFor("goal", "今年读300页书，已读120页")).toMatchObject({ current: 120, target: 300, unit: "页" });
    expect(parseFor("goal", "今年跑300公里，已跑120公里")).toMatchObject({ current: 120, target: 300, unit: "公里" });
    expect(parseFor("goal", "今年存5000元，已存2000元")).toMatchObject({ current: 2000, target: 5000, unit: "元" });
    expect(parseFor("goal", "今年去12次健身房，已去4次")).toMatchObject({ current: 4, target: 12, unit: "次" });
  });

  test("English goal is untouched", () => {
    expect(parseFor("goal", "read 12 books this year, 4 done")).toMatchObject({ current: 4, target: 12, unit: "books" });
    expect(parseFor("goal", "save 50k for a trip, saved 12k")).toMatchObject({ current: 12000, target: 50000 });
  });
});

describe("zh · link and note", () => {
  test("Chinese TLDs are recognised", () => {
    expect(parseFor("link", "看看 example.cn 这个").domain).toBe("example.cn");
    expect(parseFor("link", "https://foo.com.cn/x 收藏").domain).toBe("foo.com.cn");
    expect(parseFor("link", "read something.top").domain).toBe("something.top");
  });

  test("note splits on 。！？", () => {
    expect(parseFor("note", "今天天气很好。我们去公园吧")).toEqual({ title: "今天天气很好。", body: "我们去公园吧" });
    expect(parseFor("note", "第一件事！第二件事")).toEqual({ title: "第一件事！", body: "第二件事" });
  });
});

describe("zh · full-width punctuation and wide characters", () => {
  test("，、。！？ and full-width digits are normalised", () => {
    expect(parseFor("todo", "买牛奶，鸡蛋，面包和咖啡").items).toHaveLength(4);
    expect(parseFor("poll", "周五吃披萨还是汉堡？").options).toEqual(["披萨", "汉堡"]);
    expect(parseFor("calc", "３４５０的１８％").result).toBe(621);
    expect(parseFor("timer", "２５分钟专注").seconds).toBe(1500);
    expect(parseFor("split", "２４００块分３个人")).toMatchObject({ total: 2400, people: 3 });
    expect(parseContact("＋８６　１３８００１３８０００ 李雷").phone).toBe("+86 138 0013 8000");
    expect(parseFor("reminder", "提醒我明天交房租。", { ref: REF }).task).toBe("交房租");
  });
});

describe("zh · helper", () => {
  test("zhNumber reads Chinese numerals", () => {
    expect(zhNumber("三")).toBe(3);
    expect(zhNumber("二十五")).toBe(25);
    expect(zhNumber("一百零五")).toBe(105);
    expect(zhNumber("两")).toBe(2);
    expect(zhNumber("半")).toBe(0.5);
    expect(zhNumber("hello")).toBeNull();
  });
});
