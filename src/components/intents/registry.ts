import {
  AlarmClock,
  CalendarClock,
  Dices,
  Globe,
  Target,
  Bell,
  Briefcase,
  CalendarDays,
  Calculator,
  CircleAlert,
  Coffee,
  Contact,
  Focus,
  Link2,
  ListChecks,
  Palette,
  Repeat,
  Ruler,
  ShoppingCart,
  StickyNote,
  Sun,
  Timer,
  Users,
  Vote,
  Wallet,
} from "lucide-react";
import type { CardIntent } from "@/lib/jev/types";
import { isZh, t, tx } from "@/lib/i18n";
import { formatAmount } from "@/lib/parse/common";
import { UNIT_LABELS } from "@/lib/parse/convert";
import { formatClock } from "@/lib/parse/timer";
import { describeRandom } from "@/lib/parse/random";
import type { GatedSignals } from "@/lib/signals";
import { CalcCard } from "./CalcCard";
import { CountdownCard } from "./CountdownCard";
import { formatNumber, formatRemaining, formatZoneTime } from "./display";
import { GoalCard } from "./GoalCard";
import { RandomCard } from "./RandomCard";
import { TimezoneCard } from "./TimezoneCard";
import { ColorPicker } from "./ColorPicker";
import { ContactCard } from "./ContactCard";
import { ConvertCard } from "./ConvertCard";
import { EventCard } from "./EventCard";
import { ExpenseRow } from "./ExpenseRow";
import { HabitCard } from "./HabitCard";
import { CATEGORY_ICON, TRANSPORT_ICON } from "./icons";
import { LinkCard } from "./LinkCard";
import { NoteCard } from "./NoteCard";
import { PollCard } from "./PollCard";
import { ReminderPill } from "./ReminderPill";
import { formatWhen } from "./shared";
import { SplitCard } from "./SplitCard";
import { TimerRing } from "./TimerRing";
import { TodoList } from "./TodoList";
import { TravelCard } from "./TravelCard";
import type { BadgeSpec, Registry } from "./types";

const repeats = (s: GatedSignals): BadgeSpec[] => (s.recurring ? [{ id: "repeat", label: t("Repeats"), icon: Repeat }] : []);
const urgent = (s: GatedSignals): BadgeSpec[] => (s.urgent ? [{ id: "urgent", label: t("Urgent"), icon: CircleAlert, tone: "caution" }] : []);

/** A list row: `2 items · milk, eggs` / `2 项 · 买牛奶、鸡蛋`. */
const listCount = (n: number) => (isZh ? `${n} 项` : `${n} item${n === 1 ? "" : "s"}`);

const TONE_LABEL = {
  neutral: "Note",
  positive: "Upbeat note",
  excited: "Excited note",
  stressed: "Stressed note",
  reflective: "Reflective note",
} as const;

const TONE_EDGE = {
  neutral: null,
  positive: "var(--positive)",
  excited: "var(--brand)",
  stressed: "var(--caution)",
  reflective: "var(--line-strong)",
} as const;

/**
 * intent → everything needed to render it. Adding a UI type means one entry here,
 * one criterion in questions.ts, one parser and one component.
 */
export const registry: Registry = {
  event: {
    label: t("Event"),
    example: tx("dinner with priya friday 8pm", "明天下午三点和普里亚视频会议"),
    icon: CalendarDays,
    signals: ["eventMode", "recurring"],
    badges: repeats,
    summary: (d) => [d.title || t("Event"), d.date && Object.values(formatWhen(d.date, d.hasTime)).filter(Boolean).join(", ")].filter(Boolean).join(" · "),
    Component: EventCard,
  },
  reminder: {
    label: t("Reminder"),
    example: tx("remind me to call mom tomorrow", "提醒我明天交房租"),
    icon: Bell,
    signals: ["urgency", "recurring"],
    badges: (s) => [...urgent(s), ...repeats(s)],
    edge: (s) => (s.urgent ? "var(--caution)" : null),
    summary: (d) => [d.task || t("Reminder"), d.when && formatWhen(d.when, d.hasTime).day].filter(Boolean).join(" · "),
    Component: ReminderPill,
  },
  todo: {
    label: t("Checklist"),
    example: tx("buy milk, eggs, bread and coffee", "买牛奶、鸡蛋、面包和咖啡"),
    icon: ListChecks,
    signals: ["isShoppingList", "urgency"],
    headerIcon: (s) => (s.isShoppingList ? ShoppingCart : ListChecks),
    // "Shopping" is the checklist header (采购); the expense category is tx("Shopping", "购物").
    headerLabel: (s) => (s.isShoppingList ? t("Shopping") : t("Checklist")),
    badges: urgent,
    summary: (d) => `${listCount(d.items.length)} · ${d.items.slice(0, 3).join(tx(", ", "、"))}`,
    Component: TodoList,
  },
  timer: {
    label: t("Timer"),
    example: tx("25 min focus", "25分钟专注"),
    icon: Timer,
    signals: ["timerKind"],
    headerIcon: (s) => (s.timerKind === "focus" ? Focus : s.timerKind === "break" ? Coffee : s.timerKind === "stopwatch" ? AlarmClock : Timer),
    headerLabel: (s) => t(s.timerKind === "focus" ? "Focus" : s.timerKind === "break" ? "Break" : s.timerKind === "stopwatch" ? "Stopwatch" : "Timer"),
    summary: (d) => [d.label || t("Timer"), d.seconds && formatClock(d.seconds)].filter(Boolean).join(" · "),
    Component: TimerRing,
  },
  habit: {
    label: t("Habit"),
    example: tx("meditate every morning", "每周三次健身"),
    icon: Sun,
    signals: [],
    summary: (d) => [d.title || t("Habit"), d.label].filter(Boolean).join(" · "),
    Component: HabitCard,
  },
  color: {
    label: t("Color"),
    example: tx("#ff6b35", "天蓝色"),
    icon: Palette,
    signals: ["colorMood"],
    // A color name is a proper noun in the text, so it is not translated; only the fallback is.
    summary: (d) =>
      isZh
        ? [d.name ?? t("Color"), d.hex?.toUpperCase()].filter(Boolean).join(" · ")
        : [d.name ? d.name[0].toUpperCase() + d.name.slice(1) : "Color", d.hex?.toUpperCase()].filter(Boolean).join(" · "),
    Component: ColorPicker,
  },
  split: {
    label: t("Split"),
    example: tx("split 2400 between 3", "2400块分3个人"),
    icon: Users,
    signals: [],
    summary: (d) =>
      d.total && d.people
        ? isZh
          ? `${formatAmount(d.total, d.currency)} ÷ ${d.people} 人 = 每人 ${formatAmount(d.total / d.people, d.currency)}`
          : `${formatAmount(d.total, d.currency)} ÷ ${d.people} = ${formatAmount(d.total / d.people, d.currency)} each`
        : t("Split"),
    Component: SplitCard,
  },
  expense: {
    label: t("Expense"),
    example: tx("spent 450 on uber", "午饭花了45元"),
    icon: Wallet,
    signals: ["expenseCategory"],
    headerIcon: (s) => (s.expenseCategory ? CATEGORY_ICON[s.expenseCategory] : Wallet),
    summary: (d) => [d.amount !== null && formatAmount(d.amount, d.currency), d.item].filter(Boolean).join(" · ") || t("Expense"),
    Component: ExpenseRow,
  },
  convert: {
    label: t("Convert"),
    example: tx("5 miles in km", "5英里等于多少公里"),
    icon: Ruler,
    signals: [],
    summary: (d) =>
      d.value !== null && d.from && d.to && d.result !== null
        ? `${d.value} ${UNIT_LABELS[d.from] ?? d.from} = ${Number(d.result.toFixed(2))} ${UNIT_LABELS[d.to] ?? d.to}`
        : t("Conversion"),
    Component: ConvertCard,
  },
  calc: {
    label: t("Calculate"),
    example: tx("18% of 3450", "3450的18%"),
    icon: Calculator,
    signals: [],
    summary: (d) => (d.result !== null ? `${d.expression} = ${formatNumber(d.result)}` : d.expression),
    Component: CalcCard,
  },
  travel: {
    label: t("Trip"),
    example: tx("flight to goa next weekend", "下周末去三亚"),
    icon: TRANSPORT_ICON.flight,
    signals: ["transport", "tripType"],
    headerIcon: (s) => TRANSPORT_ICON[s.transport ?? "unspecified"],
    badges: (s) =>
      s.tripType === "work"
        ? [{ id: "work", label: t("Work"), icon: Briefcase }]
        : s.tripType === "leisure"
          ? [{ id: "leisure", label: t("Leisure"), icon: Sun }]
          : [],
    summary: (d) => (d.destination ? (isZh ? `去${d.destination}` : `Trip to ${d.destination}`) : t("Trip")),
    Component: TravelCard,
  },
  poll: {
    label: t("Poll"),
    example: tx("pizza or burgers for friday?", "周五吃披萨还是汉堡？"),
    icon: Vote,
    signals: ["hasExplicitOptions"],
    summary: (d) => d.title || d.options.join(" / ") || t("Poll"),
    Component: PollCard,
  },
  contact: {
    label: t("Contact"),
    example: tx("rahul 98200 12345 rahul@mail.com", "李雷 13800138000 lilei@mail.com"),
    icon: Contact,
    signals: [],
    summary: (d) => [d.name || t("Contact"), d.phone ?? d.email].filter(Boolean).join(" · "),
    Component: ContactCard,
  },
  link: {
    label: t("Bookmark"),
    example: tx("https://vercel.com/blog check later", "https://vercel.com/blog 稍后看"),
    icon: Link2,
    signals: [],
    summary: (d) => [d.domain ?? t("Link"), d.note].filter(Boolean).join(" · "),
    Component: LinkCard,
  },
  countdown: {
    label: t("Countdown"),
    example: tx("days until christmas", "12月25日还有多少天"),
    icon: CalendarClock,
    signals: [],
    summary: (d) =>
      d.days === null
        ? d.title || t("Countdown")
        : d.days === 0
          ? isZh
            ? `今天${d.title ? `：${d.title}` : ""}`
            : `${d.title || "It"} is today`
          : formatRemaining(d.days, d.title || t("then")),
    Component: CountdownCard,
  },
  timezone: {
    label: t("Time zone"),
    example: tx("3pm pst in ist", "北京下午3点换成纽约时间"),
    icon: Globe,
    signals: [],
    summary: (d) =>
      d.to && d.instant
        ? `${formatZoneTime(d.from.tz, d.instant)} ${d.from.label} → ${formatZoneTime(d.to.tz, d.instant)} ${d.to.label}`
        : t("Time zones"),
    Component: TimezoneCard,
  },
  random: {
    label: t("Random"),
    example: tx("roll 2d6", "掷2个骰子"),
    icon: Dices,
    signals: [],
    summary: (d) => describeRandom(d),
    Component: RandomCard,
  },
  goal: {
    label: t("Goal"),
    example: tx("read 12 books this year, 4 done", "今年读12本书，已读4本"),
    icon: Target,
    signals: [],
    summary: (d) => (d.target ? `${d.title || t("Goal")} · ${d.current}/${d.target}${d.unit ? ` ${d.unit}` : ""}` : d.title || t("Goal")),
    Component: GoalCard,
  },
  note: {
    label: t("Note"),
    example: tx("the city felt so quiet this morning", "今天早上城市特别安静"),
    icon: StickyNote,
    signals: ["tone", "isQuestion"],
    // The edge color is always paired with a tone word in the header, never color alone.
    headerLabel: (s) => t(s.tone ? TONE_LABEL[s.tone] : "Note"),
    edge: (s) => (s.tone ? TONE_EDGE[s.tone] : null),
    summary: (d) => d.title,
    Component: NoteCard,
  },
};

export const CARD_INTENTS = Object.keys(registry) as CardIntent[];
