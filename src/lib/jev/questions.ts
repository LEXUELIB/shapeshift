import { choice, noul, score } from "@typesafe-ai/sdk";

/**
 * The full Jev question schema. Jev evaluates every question in parallel against
 * the same state, so we ask every signal every time (speculative fan-out) and let
 * code decide which ones matter for the chosen intent.
 *
 * Criteria rules: self-contained, non-overlapping, every signal has an escape option,
 * and never ask Jev to extract values, count or do date math.
 *
 * Every prompt and criterion is bilingual (English, then the Chinese equivalent) so
 * the online model reads Chinese input as reliably as English. Only the prose is
 * bilingual — keys and option identifiers are enums and never carry prose.
 */
export const questions = {
  // ── Which UI ────────────────────────────────────────────────
  intent: choice("What is the person trying to create with this text / 这个人想用这段文字创建什么", {
    event:
      "Scheduling a meeting, meal, call or gathering at a time, usually with other people / 安排会议、聚餐、通话或其他约会，通常有具体时间和其他人",
    reminder: "Asking to be reminded to do a single task themselves, e.g. 'remind me to…' / 让系统提醒自己做一件具体的事，例如「提醒我…」",
    todo: "Listing several separate things to do or buy / 列出几件要做或要买的事情清单",
    timer: "Starting a timer, countdown, focus session or stopwatch for a duration / 开始一个计时、倒计时、专注时段或秒表",
    habit: "Something they want to do repeatedly as a routine, e.g. daily or weekly / 想养成习惯、反复做的事，例如每天或每周",
    color: "Referring to a color: a hex code, rgb value, or a described color / 提到某种颜色：十六进制色值、rgb 值或描述出来的颜色",
    split: "Dividing an amount of money between several people / 把一笔钱分给几个人平摊",
    expense: "Recording money they spent on something / 记录自己花掉的一笔钱",
    convert: "Converting a value from one unit of measurement to another / 把数值从一种单位换算成另一种单位",
    calc: "A math calculation or percentage that is not splitting money or converting units / 数学计算或百分比，不是分钱也不是单位换算",
    travel: "Planning a trip, flight, train or stay to a destination / 计划出行：去某个目的地的行程、航班、火车或住宿",
    poll: "Asking a group to choose between options / 让大家在几个选项之间做选择",
    contact: "Saving a person's name with a phone number or email address / 保存某个人的姓名以及手机号或邮箱",
    link: "Saving a web link or URL, optionally with a note / 保存网址链接，可以附带一句备注",
    countdown: "Counting the days until a future date, holiday or event / 倒数距离某个未来日期、节日或事件还有多少天",
    timezone: "Converting a time of day between time zones or cities, or asking the time somewhere / 在不同时区或城市之间换算时间，或询问某地现在几点",
    random: "Asking for a random result: rolling dice, flipping a coin, a random number or letting chance pick / 要一个随机结果：掷骰子、抛硬币、随机数或随便选一个",
    goal: "Tracking progress toward a numeric target, such as 4 of 12 books read or money saved / 追踪某个数量目标的进度，例如 12 本书已读 4 本、攒钱进度",
    note: "Writing a thought, idea or note that is none of the above / 写下一个想法、感受或笔记，以上都不是",
    none: "Too short, unclear or unfinished to tell yet / 太短、不清楚或还没写完，暂时无法判断",
  }),

  readiness: score("How complete is this input for what the person is creating / 这段输入对于要创建的东西有多完整", [
    "Just started, key details missing / 刚开始，关键信息还缺失",
    "Partially specified, some details present / 部分完整，已有一些信息",
    "Fully specified, ready to act on / 信息齐全，可以直接执行",
  ]),

  // ── Signals that pick the UI variant ────────────────────────
  isQuestion: noul("The text is a question rather than an instruction or statement / 这段文字是在提问，而不是指令或陈述，例如带「吗/呢/？」或「什么、为什么、怎么、哪、几点、多少」"),
  recurring: noul("The text describes something that repeats on a schedule / 这段文字描述的是按计划重复发生的事，例如每天、每周、每周三次"),
  urgency: score("How urgent or time-sensitive the text sounds / 这段文字听起来有多紧急或时间紧迫", [
    "Not urgent at all / 完全不紧急",
    "Somewhat time-sensitive / 有点时间要求",
    "Urgent, needs attention immediately / 紧急，需要马上处理",
  ]),
  tone: choice("The emotional tone of the text / 这段文字的情绪基调", {
    neutral: "Plain and factual, no clear emotion / 平铺直叙、陈述事实，没有明显情绪",
    positive: "Happy, grateful or content / 开心、感激或满足",
    excited: "Enthusiastic or looking forward to something / 兴奋、期待某事",
    stressed: "Worried, frustrated or under pressure / 担心、烦躁或有压力",
    reflective: "Thoughtful, calm or introspective / 沉思、平静或内省",
  }),
  eventMode: choice("How the gathering or meeting would take place / 这次见面或会议以什么方式进行", {
    in_person: "Meeting physically at a place / 在线下某个地点当面见面",
    video_call: "A video call such as Zoom, Meet or FaceTime / 视频通话，例如 Zoom、腾讯会议、飞书、钉钉或微信视频",
    phone_call: "A phone call / 打电话",
    unspecified: "Not mentioned or not a meeting / 没有提到，或者这不是一次会议",
  }),
  transport: choice("How the person would travel / 这个人打算怎么出行", {
    flight: "By plane / 坐飞机",
    train: "By train / 坐火车或高铁",
    bus: "By bus / 坐大巴、巴士或公交",
    car: "By car or road trip / 开车或自驾",
    unspecified: "Not mentioned or not about travel / 没有提到，或者与出行无关",
  }),
  tripType: choice("The purpose of the trip / 这趟出行的目的", {
    work: "Work or business travel / 工作或商务出行，例如出差、见客户、开会",
    leisure: "Holiday, vacation or personal visit / 度假、旅游或私人游玩",
    unspecified: "Not mentioned or not about travel / 没有提到，或者与出行无关",
  }),
  expenseCategory: choice("What the money was spent on / 这笔钱花在了什么上面", {
    food: "Food, groceries, restaurants or drinks / 吃饭、买菜、外卖、餐厅或饮料，例如美团、饿了么",
    transport: "Cabs, fuel, tickets or commuting / 打车、油费、车票或通勤，例如滴滴、高德、地铁、公交、高铁",
    shopping: "Clothes, gadgets or other purchases / 衣服、数码产品或其它购物，例如淘宝、京东、拼多多",
    bills: "Rent, utilities, subscriptions or recharges / 房租、水电、话费、宽带、会员或订阅等固定账单",
    entertainment: "Movies, events, games or outings / 电影、演出、游戏或娱乐活动",
    health: "Medicine, doctor or fitness / 买药、看病或健身，例如医院、药店、健身房",
    other: "Something else or not about spending / 其它，或者与花钱无关",
  }),
  colorMood: choice("The feel of the color described / 所描述颜色的感觉", {
    warm: "Reds, oranges, yellows / 红、橙、黄等暖色",
    cool: "Blues, greens, purples / 蓝、绿、紫等冷色",
    neutral: "Greys, beiges, off-whites / 灰、米、灰白等中性色",
    vivid: "Very bright and saturated / 非常鲜艳、饱和度高，例如荧光色",
    pastel: "Soft and light / 柔和、浅淡，例如马卡龙色",
    dark: "Deep and dark / 深沉、暗，例如藏青、墨绿、炭黑",
  }),
  timerKind: choice("What kind of timer is wanted / 想要哪一种计时器", {
    countdown: "A plain countdown for a duration / 一个普通的倒计时",
    focus: "A focus or deep-work session / 专注或深度工作时段的计时，例如番茄钟",
    break: "A rest or break / 休息放松的计时",
    stopwatch: "Counting up with no end time / 没有终点的正计时秒表",
  }),
  hasExplicitOptions: noul("The text names two or more explicit options to pick between / 这段文字明确列出两个或更多可供选择的选项，例如「A 还是 B」「A 或者 B」"),
  isShoppingList: noul("The listed items are things to buy / 列出的条目是要买的东西，例如带「买、采购、购物」的清单"),
};

export const QUESTION_COUNT = Object.keys(questions).length;
