"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { getLastMonday, WeekPicker } from "@/components/reports/week-picker";
import { ReportViewer } from "@/components/reports/report-viewer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Report {
  id: string;
  content: string;
  weekStart: string;
  weekEnd: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [selectedWeek, setSelectedWeek] = useState<Date>(getLastMonday);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if a report already exists for the selected week
  useEffect(() => {
    setReport(null);
    setError(null);
    setChecking(true);

    fetch(`/api/reports?weekStart=${toISODate(selectedWeek)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.report) setReport(res.data.report);
      })
      .catch(() => setError("Failed to check for existing report."))
      .finally(() => setChecking(false));
  }, [selectedWeek]);

  async function handleGenerate(force = false) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: toISODate(selectedWeek),
          force,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Something went wrong");
        return;
      }

      setReport(json.data.report);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isGenerating = loading;
  const hasReport = report !== null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Weekly Reports</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          AI-generated summaries of your business activity
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <WeekPicker value={selectedWeek} onChange={setSelectedWeek} />

        {!hasReport && !checking && (
          <Button
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        )}

        {hasReport && (
          <Button
            variant="outline"
            onClick={() => handleGenerate(true)}
            disabled={isGenerating}
            className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isGenerating ? "animate-spin" : ""}`}
            />
            {isGenerating ? "Regenerating..." : "Regenerate"}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* States */}
      {checking && (
        <p className="text-sm text-zinc-500">Checking for existing report...</p>
      )}

      {!checking && !hasReport && !isGenerating && !error && (
        <div className="rounded-lg border border-zinc-800 border-dashed px-6 py-16 text-center">
          <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">No report for this week yet.</p>
          <p className="text-zinc-500 text-xs mt-1">
            Click &quot;Generate Report&quot; to create one.
          </p>
        </div>
      )}

      {isGenerating && !hasReport && (
        <div className="rounded-lg border border-zinc-800 px-6 py-16 text-center">
          <Sparkles className="w-8 h-8 text-emerald-500 mx-auto mb-3 animate-pulse" />
          <p className="text-zinc-400 text-sm">Generating your report...</p>
          <p className="text-zinc-500 text-xs mt-1">
            This may take up to 15 seconds.
          </p>
        </div>
      )}

      {hasReport && <ReportViewer report={report} />}
    </div>
  );
}
