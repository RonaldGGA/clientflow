"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VisitFilters {
  from: string;
  to: string;
  staffId: string;
}

interface StaffMember {
  id: string;
  name: string | null;
}

interface VisitsFiltersProps {
  isAdmin: boolean;
  filters: VisitFilters;
  onChange: (filters: VisitFilters) => void;
}

// ---------------------------------------------------------------------------
// Date preset helpers
// ---------------------------------------------------------------------------

type DatePreset = "today" | "week" | "month" | "custom";

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  function fmt(d: Date) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  const today = fmt(now);

  if (preset === "today") {
    return { from: today, to: today };
  }

  if (preset === "week") {
    const day = now.getDay(); // 0 = Sunday
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    return { from: fmt(monday), to: today };
  }

  if (preset === "month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(firstDay), to: today };
  }

  return { from: "", to: "" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VisitsFilters({
  isAdmin,
  filters,
  onChange,
}: VisitsFiltersProps) {
  const [preset, setPreset] = useState<DatePreset | "">("");
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // Load staff list for admin filter
  useEffect(() => {
    if (!isAdmin) return;

    fetch("/api/employees")
      .then((r) => r.json())
      .then((res) => setStaff(res.data?.members ?? []))
      .catch(() => {
        // Non-critical — filter just won't show members
      });
  }, [isAdmin]);

  function applyPreset(value: DatePreset) {
    setPreset(value);
    if (value === "custom") {
      // Keep current from/to — user will type manually
      return;
    }
    const range = getPresetRange(value);
    onChange({ ...filters, from: range.from, to: range.to });
  }

  function handleFromChange(value: string) {
    setPreset("custom");
    onChange({ ...filters, from: value });
  }

  function handleToChange(value: string) {
    setPreset("custom");
    onChange({ ...filters, to: value });
  }

  function handleStaffChange(value: string | null) {
    // "all" or null maps to empty string (no filter)
    onChange({
      ...filters,
      staffId: value === "all" || value === null ? "" : value,
    });
  }

  function handleClear() {
    setPreset("");
    onChange({ from: "", to: "", staffId: "" });
  }

  const hasActiveFilters =
    filters.from !== "" || filters.to !== "" || filters.staffId !== "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date presets */}
      {(["today", "week", "month"] as DatePreset[]).map((p) => (
        <Button
          key={p}
          variant="outline"
          size="sm"
          onClick={() => applyPreset(p)}
          className={`border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white capitalize ${
            preset === p
              ? "bg-zinc-800 border-emerald-600 text-emerald-400"
              : "bg-transparent"
          }`}
        >
          {p === "week" ? "This week" : p === "month" ? "This month" : "Today"}
        </Button>
      ))}

      {/* Custom date range */}
      <Input
        type="date"
        value={filters.from}
        onChange={(e) => handleFromChange(e.target.value)}
        className="w-36 bg-zinc-800 border-zinc-700 text-white text-sm scheme-dark]"
        placeholder="From"
      />
      <span className="text-zinc-500 text-sm">–</span>
      <Input
        type="date"
        value={filters.to}
        onChange={(e) => handleToChange(e.target.value)}
        className="w-36 bg-zinc-800 border-zinc-700 text-white text-sm scheme-dark]"
        placeholder="To"
      />

      {/* Staff filter — admin only */}
      {isAdmin && (
        <Select
          value={filters.staffId || "all"}
          onValueChange={handleStaffChange}
        >
          <SelectTrigger className="w-44 bg-zinc-800 border-zinc-700 text-white text-sm">
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all" className="text-white focus:bg-zinc-700">
              All staff
            </SelectItem>
            {staff.map((m) => (
              <SelectItem
                key={m.id}
                value={m.id}
                className="text-white focus:bg-zinc-700"
              >
                {m.name ?? m.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-zinc-500 hover:text-white"
        >
          Clear
        </Button>
      )}
    </div>
  );
}
