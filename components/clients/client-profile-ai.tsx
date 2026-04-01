"use client";

// components/clients/client-profile-ai.tsx
// Handles AI summary generation. Shown to admins only.
// Staff see the stored summary but not this button.

import { useState } from "react";
import { useLocale } from "next-intl";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";

interface ClientProfileAIProps {
  clientId: string;
  initialSummary: string | null;
  initialSummaryAt: string | null;
  isAdmin: boolean;
}

export function ClientProfileAI({
  clientId,
  initialSummary,
  initialSummaryAt,
  isAdmin,
}: ClientProfileAIProps) {
  const locale = useLocale();
  const [summary, setSummary] = useState(initialSummary);
  const [summaryAt, setSummaryAt] = useState(initialSummaryAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Generation failed");
        return;
      }
      setSummary(json.data.aiSummary);
      setSummaryAt(json.data.aiSummaryAt);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function formatSummaryDate(iso: string): string {
    return new Date(iso).toLocaleDateString(
      locale === "es" ? "es-CU" : "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Summary</h2>
            {summaryAt && (
              <p className="text-xs text-zinc-500">
                Generated {formatSummaryDate(summaryAt)}
              </p>
            )}
          </div>
        </div>

        {isAdmin && (
          <Button
            onClick={handleGenerate}
            disabled={loading}
            size="sm"
            className={
              summary
                ? "border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white border text-xs gap-1.5"
                : "bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
            }
            variant={summary ? "outline" : "default"}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : summary ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Generate summary
              </>
            )}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading && (
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-3 w-3/4 rounded bg-zinc-800" />
          <div className="h-3 w-full rounded bg-zinc-800" />
          <div className="h-3 w-5/6 rounded bg-zinc-800" />
          <div className="h-3 w-2/3 rounded bg-zinc-800 mt-2" />
          <div className="h-3 w-full rounded bg-zinc-800" />
        </div>
      )}

      {!loading && summary && (
        <div
          className="prose prose-sm prose-invert max-w-none text-zinc-300
          prose-headings:text-white prose-headings:font-semibold prose-headings:text-sm
          prose-p:text-zinc-400 prose-p:leading-relaxed
          prose-strong:text-zinc-200
          prose-h2:mt-4 prose-h2:mb-1"
        >
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}

      {!loading && !summary && !error && (
        <p className="text-sm text-zinc-600 py-2">
          {isAdmin
            ? "No summary yet. Click 'Generate summary' to create one using AI."
            : "No AI summary has been generated for this client yet."}
        </p>
      )}
    </div>
  );
}
