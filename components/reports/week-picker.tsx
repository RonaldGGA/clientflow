"use client";

import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

function getLastMonday(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 13 : day + 6;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

interface WeekPickerProps {
  value: Date;
  onChange: (monday: Date) => void;
}

export function WeekPicker({ value, onChange }: WeekPickerProps) {
  const t = useTranslations("reports");
  const locale = useLocale();

  const lastMonday = getLastMonday();
  const isAtMax = toISODate(value) >= toISODate(lastMonday);

  const sunday = new Date(value);
  sunday.setDate(value.getDate() + 6);

  const dateLocale = locale === "es" ? "es-CU" : "en-US";
  const fmt = (d: Date) =>
    d.toLocaleDateString(dateLocale, { month: "short", day: "numeric" });
  const weekLabel = `${fmt(value)} – ${fmt(sunday)}, ${sunday.getFullYear()}`;

  function goBack() {
    onChange(addWeeks(value, -1));
  }

  function goForward() {
    if (!isAtMax) onChange(addWeeks(value, 1));
  }

  function goToLastWeek() {
    onChange(lastMonday);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={goBack}
        className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-white font-medium w-52 text-center text-sm">
        {weekLabel}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={goForward}
        disabled={isAtMax}
        className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-30"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      {!isAtMax && (
        <Button
          variant="ghost"
          size="sm"
          onClick={goToLastWeek}
          className="text-zinc-500 hover:text-white text-xs"
        >
          {t("lastWeek")}
        </Button>
      )}
    </div>
  );
}

export { getLastMonday };
