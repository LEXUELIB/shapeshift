"use client";

import { CalendarDays } from "lucide-react";
import type { CountdownData } from "@/lib/parse/countdown";
import { isZh, t } from "@/lib/i18n";
import { formatDate, formatNumber } from "./display";
import { AnimatedNumber, Chip, Field, HeroNumber, Meta, Missing } from "./shared";
import type { CardProps } from "./types";

const long = (d: Date) => formatDate(d, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export function CountdownCard({ data }: CardProps<CountdownData>) {
  if (data.days === null || !data.date) {
    return (
      <Field index={0}>
        <Missing>{t("Type a date or a holiday, like “days until christmas”")}</Missing>
      </Field>
    );
  }
  const past = data.days < 0;
  const n = Math.abs(data.days);
  const weeks = Math.floor(n / 7);
  const title = data.title || t("then");

  return (
    <div className="flex flex-col gap-3">
      <Field index={0} className="flex flex-wrap items-end gap-x-3 gap-y-1">
        {data.days === 0 ? (
          <HeroNumber className="text-[44px] leading-[48px]">{t("Today")}</HeroNumber>
        ) : (
          <>
            {/* Chinese puts the verb before the number: 距离圣诞节还有 12 天. */}
            {isZh && <span className="pb-1.5 text-[17px] leading-6 font-[550] text-ink-2">{past ? `${title}已经过去` : `距离${title}还有`}</span>}
            <HeroNumber className="text-[44px] leading-[48px]">
              <AnimatedNumber value={n} format={(v) => formatNumber(Math.round(v))} />
            </HeroNumber>
            <span className="pb-1.5 text-[17px] leading-6 font-[550] text-ink-2">
              {isZh ? t("days") : `${t("days")} ${t(past ? "since" : "until")} ${title}`}
            </span>
          </>
        )}
      </Field>
      <Field index={1} className="flex flex-wrap items-center gap-2">
        <Chip icon={CalendarDays}>{long(data.date)}</Chip>
        {weeks >= 2 && (
          <Meta>
            {weeks} {t("weeks")}
            {n % 7 ? `, ${n % 7} ${t("days")}` : ""}
          </Meta>
        )}
      </Field>
    </div>
  );
}
