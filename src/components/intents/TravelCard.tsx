"use client";

import { ArrowRight, CalendarRange } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { zhCN } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TravelData } from "@/lib/parse/travel";
import { isZh, t } from "@/lib/i18n";
import { connector, formatDate } from "./display";
import { TRANSPORT_ICON } from "./icons";
import { Chip, Field, IconSwap, Meta, Placeholder } from "./shared";
import type { CardProps } from "./types";

/** Chinese month/weekday headers; undefined keeps react-day-picker's en-US default. */
const CALENDAR_LOCALE = isZh ? zhCN : undefined;

const short = (d: Date) => formatDate(d, { weekday: "short", month: "short", day: "numeric" });

export function TravelCard({ data, signals, interactive }: CardProps<TravelData>) {
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const from = range?.from ?? data.start ?? undefined;
  const to = range ? range.to : (data.end ?? undefined);
  const Icon = TRANSPORT_ICON[signals.transport ?? "unspecified"];

  return (
    <div className="flex flex-col gap-3">
      <Field index={0} className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-ink-2">
          <IconSwap icon={Icon} iconClassName="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          {data.destination ? (
            <h2 className="flex flex-wrap items-center gap-x-2 text-[17px] leading-6 font-[550]">
              {data.origin && (
                <>
                  <span className="text-ink-2">{data.origin}</span>
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                </>
              )}
              {data.destination}
            </h2>
          ) : (
            <Placeholder insert={connector("to")}>{t("Add destination")}</Placeholder>
          )}
          {signals.transport && <Meta className="capitalize">{signals.transport === "car" ? t("Road trip") : signals.transport}</Meta>}
        </div>
      </Field>
      <Field index={1}>
        <Popover>
          <PopoverTrigger asChild disabled={!interactive}>
            <button type="button" aria-label={from ? t("Change dates") : t("Add dates")} className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {from ? (
                <Chip icon={CalendarRange}>
                  {short(from)}
                  {to && to.getTime() !== from.getTime() ? ` – ${short(to)}` : ""}
                </Chip>
              ) : (
                <Placeholder>{t("Add dates")}</Placeholder>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar locale={CALENDAR_LOCALE} mode="range" selected={{ from, to }} onSelect={setRange} numberOfMonths={1} />
          </PopoverContent>
        </Popover>
      </Field>
    </div>
  );
}
