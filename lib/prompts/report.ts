// ---------------------------------------------------------------------------
// Report prompt — lib/prompts/report.ts
// Never inline this in route handlers.
// ---------------------------------------------------------------------------

export interface TopService {
  name: string;
  count: number;
  revenue: number;
}

export interface TopClient {
  name: string;
  visits: number;
}

export interface StaffActivity {
  name: string;
  visits: number;
  revenue: number;
}

export interface WeeklyStats {
  businessName: string;
  weekStart: string; // e.g. "Monday, Mar 24, 2026"
  weekEnd: string; // e.g. "Sunday, Mar 30, 2026"
  totalVisits: number;
  totalRevenue: number;
  previousWeekVisits: number;
  previousWeekRevenue: number;
  topServices: TopService[];
  topClients: TopClient[];
  staffActivity: StaffActivity[];
}

export function buildReportPrompt(stats: WeeklyStats): string {
  const visitsDelta = stats.totalVisits - stats.previousWeekVisits;
  const revenueDelta = stats.totalRevenue - stats.previousWeekRevenue;

  const visitsTrend =
    visitsDelta > 0
      ? `+${visitsDelta} vs last week`
      : visitsDelta < 0
        ? `${visitsDelta} vs last week`
        : "same as last week";

  const revenueTrend =
    revenueDelta > 0
      ? `+$${revenueDelta.toFixed(2)} vs last week`
      : revenueDelta < 0
        ? `-$${Math.abs(revenueDelta).toFixed(2)} vs last week`
        : "same as last week";

  const topServicesText = stats.topServices
    .map(
      (s, i) =>
        `${i + 1}. ${s.name} — ${s.count} visit${s.count !== 1 ? "s" : ""}, $${s.revenue.toFixed(2)} revenue`,
    )
    .join("\n");

  const topClientsText = stats.topClients
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} — ${c.visits} visit${c.visits !== 1 ? "s" : ""}`,
    )
    .join("\n");

  const staffText = stats.staffActivity
    .map(
      (s) =>
        `- ${s.name}: ${s.visits} visit${s.visits !== 1 ? "s" : ""}, $${s.revenue.toFixed(2)} revenue`,
    )
    .join("\n");

  return `You are a business analyst writing a friendly, concise weekly summary for the owner of a small business called "${stats.businessName}".

Write a weekly report in clear, natural language. Be specific with numbers. Keep it professional but warm — this is a small business owner, not a Fortune 500 executive. Use markdown formatting with clear sections.

## Weekly Data: ${stats.weekStart} – ${stats.weekEnd}

**Overview:**
- Total visits: ${stats.totalVisits} (${visitsTrend})
- Total revenue: $${stats.totalRevenue.toFixed(2)} (${revenueTrend})

**Top services:**
${topServicesText || "No services recorded this week."}

**Top clients:**
${topClientsText || "No returning clients this week."}

**Staff activity:**
${staffText || "No staff activity recorded."}

---

Write the report now. Structure it with these markdown sections:
1. ## Weekly Summary (2-3 sentences overview, highlight wins or concerns)
2. ## Services (what sold well and why it matters)
3. ## Clients (notable client activity)
4. ## Team (staff performance, balanced and constructive)
5. ## Looking Ahead (1-2 actionable suggestions based on the data)

Do not repeat the raw numbers table — weave the numbers into natural sentences.
Keep the total length under 400 words.`;
}
