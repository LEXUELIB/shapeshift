/**
 * Bilingual text layer.
 *
 * Deliberately not a runtime i18n framework: the locale is a build-time
 * constant, so server and client render identically and there is no provider,
 * no hydration mismatch and no re-render cost on a keystroke path. English
 * source strings stay the keys, which keeps upstream merges cheap.
 *
 *   NEXT_PUBLIC_LOCALE=zh   (default) Chinese UI, English input still parsed
 *   NEXT_PUBLIC_LOCALE=en             English UI
 *
 * Use `t("Save")` for strings that have a catalog entry, and `tx("Today", "今天")`
 * for one-offs. `t` falls back to the English key, so a missing entry degrades to
 * English rather than to a blank.
 */
export type Locale = "en" | "zh";

export const LOCALE: Locale = process.env.NEXT_PUBLIC_LOCALE === "en" ? "en" : "zh";
export const isZh = LOCALE === "zh";

/** English source string → Chinese. Add entries here, never inline zh in components. */
export const ZH: Record<string, string> = {
  // ── Shell ──────────────────────────────────────────────────
  "Choose a card": "选择卡片",
  "Force the input into a specific card type": "把输入强制变成指定卡片",
  "Show as…": "显示为…",
  "No card type matches. Try “timer” or “poll”.": "没有匹配的卡片类型，试试「计时」或「投票」。",
  "Did you mean": "你是指",
  "Left and right arrows highlight a choice, Enter picks it.": "左右方向键切换选项，回车选择。",
  "Type a plan, a list, a color or a sum. It becomes a card.": "写个计划、清单、颜色或算式，它会变成一张卡片。",
  "Saved": "已保存",
  "Type anything": "输入任何内容",
  "Type anything. Enter adds the card, Escape clears, Tab keeps a preview, slash opens every card type.":
    "输入任何内容。回车保存卡片，Esc 清空，Tab 保留预览，斜杠打开全部卡片类型。",
  "cached": "缓存",
  "Save": "保存",
  "Add": "添加",
  "Tab": "Tab",
  "Esc": "Esc",
  "to cancel": "取消",
  "to clear": "清空",
  "to keep as": "保留为",
  "Undo": "撤销",
  "Deleted": "已删除",
  "Jev is busy. Using offline mode for now.": "Jev 忙不过来，暂时用离线模式。",
  "Close": "关闭",
  "Command Palette": "命令面板",
  "Search for a command to run...": "搜索要执行的命令…",

  // ── Card labels (registry) ─────────────────────────────────
  "Event": "日程",
  "Reminder": "提醒",
  "Checklist": "清单",
  "Timer": "计时",
  "Habit": "习惯",
  "Color": "颜色",
  "Split": "分账",
  "Expense": "记账",
  "Convert": "换算",
  "Calculate": "计算",
  "Trip": "出行",
  "Poll": "投票",
  "Contact": "联系人",
  "Bookmark": "书签",
  "Countdown": "倒数日",
  "Time zone": "时区",
  "Random": "随机",
  "Goal": "目标",
  "Note": "笔记",
  "Shopping": "采购",
  "Focus": "专注",
  "Break": "休息",
  "Stopwatch": "秒表",
  "Work": "出差",
  "Leisure": "休闲",
  "Repeats": "重复",
  "Urgent": "紧急",
  "Upbeat note": "轻快笔记",
  "Excited note": "兴奋笔记",
  "Stressed note": "焦虑笔记",
  "Reflective note": "沉思笔记",
  "Untitled event": "未命名日程",
  "Untitled habit": "未命名习惯",

  // ── Common card actions ────────────────────────────────────
  "Add date": "加日期",
  "Date": "日期",
  "Change date": "改日期",
  "Add time": "加时间",
  "Add place": "加地点",
  "Add people": "加参与人",
  "Add item": "加一项",
  "Add option": "加选项",
  "Add duration": "加时长",
  "Add destination": "加目的地",
  "Add dates": "加日期",
  "Change dates": "改日期",
  "Add how often": "加频率",
  "Add what it was for": "加用途",
  "Add a target, like “read 12 books, 4 done”": "加个目标，比如「今年读12本书，已读4本」",
  "Add a place or zone, like “3pm pst in ist” or “time in tokyo”": "加地点或时区，比如「北京下午3点换成纽约时间」",
  "Type a value with a unit, like 5 miles in km": "输入带单位的值，比如「5英里等于多少公里」",
  "Type a date or a holiday, like “days until christmas”": "输入日期或节日，比如「距离元旦还有多少天」",
  "Type a hex code like #ff6b35 or a color name": "输入十六进制色值如 #ff6b35，或颜色名",
  "Paste a link": "粘贴链接",
  "Ask the group": "问问大家",
  "Total": "总额",
  "People": "人数",
  "Each person pays": "人均",
  "Done": "已完成",
  "Less progress": "减少进度",
  "More progress": "增加进度",
  "Fewer people": "减少人数",
  "More people": "增加人数",
  "Lightness": "明度",
  "Picked from the mood": "按色调挑选",
  "From unit": "源单位",
  "To unit": "目标单位",
  "Swap units": "交换单位",
  "Flip again": "再抛一次",
  "Pick again": "再选一次",
  "Roll again": "再掷一次",
  "Use": "使用",
  "Option": "选项",
  "of": "/",
  "next day": "次日",
  "previous day": "前一天",
  "Pause": "暂停",
  "Resume": "继续",
  "Start": "开始",
  "Reset": "重置",
  "No amount yet": "还没有金额",
  "No name yet": "还没有名字",
  "No phone yet": "还没有电话",
  "No email yet": "还没有邮箱",
  "No note": "没有备注",
  "No task yet": "还没有任务",
  "Anytime": "随时",
  "Today": "今天",
  "Tomorrow": "明天",
  "Video call": "视频通话",
  "Phone call": "电话",
  "Road trip": "自驾",
  "Days of the week": "星期",
  "Category": "分类",
  "Question": "问题",
  "0%": "0%",

  // ── Expense categories ─────────────────────────────────────
  // NB: "Shopping" above is the *checklist* header (采购). The expense category
  // "Shopping" means 购物 and must use tx("Shopping", "购物") — a shared English
  // key cannot carry two meanings.
  "Food & drink": "餐饮",
  "Transport": "交通",
  "Bills": "账单",
  "Entertainment": "娱乐",
  "Health": "健康",
  "Other": "其他",

  // ── Announcements / row affordances ────────────────────────
  "Showing": "正在显示",
  "Updated": "已更新",
  "Added": "已添加",
  "Edit": "编辑",
  "Delete": "删除",
  "Go to Shapeshift": "回到 Shapeshift",
  "Try again": "重试",
  "Unable to load Shapeshift": "Shapeshift 加载失败",
  "Something broke while rendering. Your saved items are safe in this browser.":
    "渲染时出错了。你保存的内容还安全地留在这个浏览器里。",
  "This page doesn’t exist": "这个页面不存在",
  "Shapeshift is a single page.": "Shapeshift 只有一个页面。",
  "An input that becomes what you mean.": "输入什么，就变成什么。",
  "Shapeshift — an input that becomes what you mean": "Shapeshift —— 输入什么，就变成什么",
  "One text box that morphs into the right UI as you type: events, checklists, timers, colors, bill splits and more. Powered by TypeSafe AI's Jev.":
    "一个输入框，边打字边变成合适的界面：日程、清单、计时、颜色、分账等等。由 TypeSafe AI 的 Jev 驱动。",
  "Shapeshift: an input that becomes what you mean": "Shapeshift：输入什么，就变成什么",
  "Shapeshift: a text box morphing into an event card as you type": "Shapeshift：边打字边变成日程卡片的输入框",
  "Expected { text: string }": "需要 { text: string }",

  // ── Summary fallbacks (registry) ───────────────────────────
  "Conversion": "单位换算",
  "Time zones": "时区换算",
  "Link": "链接",
  "since": "前",
  "until": "后",
  "then": "那天",
  "days": "天",
  "day": "天",
  "weeks": "周",
  "Pick one of": "从候选中选一个",
};

export function t(en: string): string {
  if (LOCALE === "en") return en;
  return ZH[en] ?? en;
}

/** For strings that only need a Chinese variant and do not belong in the catalog. */
export function tx(en: string, zh: string): string {
  return LOCALE === "en" ? en : zh;
}

/** Pick a locale-specific value inline. */
export function pick<T>(en: T, zh: T): T {
  return LOCALE === "en" ? en : zh;
}
