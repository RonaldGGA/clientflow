# SKILL: LLM Integration

## Call Pattern — Always
```ts
async function callLLM(prompt: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    // Primary: Gemini 2.5 Flash
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_AI_API_KEY! },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: controller.signal,
    })
    const data = await response.json()
    return data.candidates[0].content.parts[0].text
  } catch (primaryError) {
    // Fallback: OpenRouter
    try {
      const fallback = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      })
      const fallbackData = await fallback.json()
      return fallbackData.choices[0].message.content
    } catch {
      throw new Error('Report generation unavailable. Try again later.')
    }
  } finally {
    clearTimeout(timeout)
  }
}
```

## Prompt Construction
- Prompt builder lives in `lib/prompts/weekly-report.ts` only — never inline in route handlers.
- Never send raw Prisma objects to the LLM.
- Prepare a clean summary object, convert to readable string, then pass.

```ts
// BAD — raw DB objects
const prompt = `Here is the data: ${JSON.stringify(visits)}`

// GOOD — clean summary
const summary = {
  weekRevenue: 1240,
  totalVisits: 34,
  bestDay: 'Friday',
  topService: 'Corte + Barba (19 visits)',
  inactiveClients: ['Pedro Ruiz', 'Ana Torres'],
  staffBreakdown: [{ name: 'Carlos', visits: 18 }, { name: 'Miguel', visits: 16 }],
}
const prompt = buildWeeklyReportPrompt(summary)
```

## Prompt Rules
- Write the prompt in the same language the report should be generated in.
- Be explicit about format: "Write 3-4 paragraphs in natural language. No bullet points. No markdown."
- Include a constraint on length: "Maximum 200 words."
- Always include the week date range in the prompt for context.

## What Never Goes in a Prompt
- Raw IDs
- Internal field names (`businessId`, `deletedAt`)
- Prices as Decimal objects — convert to plain numbers first
- More data than needed — the LLM doesn't need individual visit records, only aggregates
