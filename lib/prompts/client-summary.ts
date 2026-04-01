// ---------------------------------------------------------------------------
// Client summary prompt — lib/prompts/client-summary.ts
// Never inline this in route handlers.
// ---------------------------------------------------------------------------

export interface ClientVisitForSummary {
  serviceName: string;
  actualPrice: number;
  staffName: string;
  date: string; // ISO string
  notes: string | null;
}

export interface ClientSummaryStats {
  clientName: string;
  businessName: string;
  phone: string | null;
  notes: string | null;
  totalVisits: number;
  totalSpend: number;
  firstVisit: string; // ISO string
  lastVisit: string; // ISO string
  visits: ClientVisitForSummary[];
}

export function buildClientSummaryPrompt(
  stats: ClientSummaryStats,
  locale: string,
): string {
  const language = locale === "es" ? "Spanish" : "English";

  const serviceCounts: Record<string, number> = {};
  for (const v of stats.visits) {
    serviceCounts[v.serviceName] = (serviceCounts[v.serviceName] ?? 0) + 1;
  }
  const favoriteService =
    Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "unknown";

  const avgSpend =
    stats.totalVisits > 0 ? stats.totalSpend / stats.totalVisits : 0;

  const firstDate = new Date(stats.firstVisit);
  const lastDate = new Date(stats.lastVisit);
  const daySpan = Math.round(
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const avgDaysBetween =
    stats.totalVisits > 1
      ? Math.round(daySpan / (stats.totalVisits - 1))
      : null;

  const recentVisits = [...stats.visits]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const visitsText = recentVisits
    .map(
      (v) =>
        `- ${new Date(v.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}: ${v.serviceName} with ${v.staffName} — $${v.actualPrice.toFixed(2)}${v.notes ? ` (note: ${v.notes})` : ""}`,
    )
    .join("\n");

  return `You are a business assistant helping a small business owner understand one of their clients.
IMPORTANT: Write the entire summary in ${language}. All sentences and labels must be in ${language}. Names and numbers stay as-is.

Write a short, friendly, insightful summary of this client's history. The goal is to help staff personalize their service when this client walks in. Be specific but concise.

## Client Data

**Name:** ${stats.clientName}
${stats.phone ? `**Phone:** ${stats.phone}` : ""}
${stats.notes ? `**Notes on file:** ${stats.notes}` : ""}

**Visit history:**
- Total visits: ${stats.totalVisits}
- Total spend: $${stats.totalSpend.toFixed(2)}
- Average per visit: $${avgSpend.toFixed(2)}
- Favorite service: ${favoriteService}
- First visit: ${new Date(stats.firstVisit).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
- Last visit: ${new Date(stats.lastVisit).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
${avgDaysBetween ? `- Visits roughly every ${avgDaysBetween} days` : "- Only one visit on record"}

**Recent visits (newest first):**
${visitsText || "No visits recorded."}

---

Write the summary now. Structure it with these sections:

1. ## Client Overview (2-3 sentences: who is this client, how long have they been coming, how valuable are they)
2. ## Preferences (what services do they gravitate toward, any patterns in pricing or staff)
3. ## Notes & Patterns (anything worth knowing before they walk in — visit frequency, notes, trends)

Keep it under 200 words. Write in ${language}. Do not invent information not present in the data.
Do not use placeholder text — this summary is shown directly to the business owner and staff.`;
}
