import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  accent?: boolean;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  description,
  accent = false,
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-400">{label}</span>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accent
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-zinc-800 text-zinc-400",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div>
        <p className="text-2xl font-semibold tracking-tight text-white">
          {value}
        </p>
        {description && (
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        )}
      </div>
    </div>
  );
}
