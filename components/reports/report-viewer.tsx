"use client";

import { useTranslations, useLocale } from "next-intl";
import ReactMarkdown from "react-markdown";

interface Report {
  id: string;
  content: string;
  weekStart: string;
  weekEnd: string;
  createdAt: string;
}

interface ReportViewerProps {
  report: Report;
}

export function ReportViewer({ report }: ReportViewerProps) {
  const t = useTranslations("reports");
  const locale = useLocale();

  const generatedAt = new Date(report.createdAt).toLocaleDateString(
    locale === "es" ? "es-CU" : "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
      <p className="text-xs text-zinc-500">
        {t("generatedOn", { date: generatedAt })}
      </p>
      <div
        className="prose prose-invert prose-sm max-w-none
        prose-headings:text-white prose-headings:font-semibold
        prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2
        prose-p:text-zinc-300 prose-p:leading-relaxed
        prose-strong:text-white
        prose-ul:text-zinc-300 prose-li:marker:text-emerald-500
        prose-hr:border-zinc-700"
      >
        <ReactMarkdown>{report.content}</ReactMarkdown>
      </div>
    </div>
  );
}
