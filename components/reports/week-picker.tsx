"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLastMonday(): Date {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday
  const diff = day === 0 ? 13 : day + 6; // go back to last Monday
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

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return `${fmt(monday)} – ${fmt(sunday)}, ${sunday.getFullYear()}`;
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WeekPickerProps {
  value: Date; // always a Monday
  onChange: (monday: Date) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeekPicker({ value, onChange }: WeekPickerProps) {
  const lastMonday = getLastMonday();

  // Can't navigate into the future past the last completed week
  const isAtMax = toISODate(value) >= toISODate(lastMonday);

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
        {formatWeekLabel(value)}
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
          Last week
        </Button>
      )}
    </div>
  );
}

export { getLastMonday };
