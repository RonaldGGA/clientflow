# SKILL: Design System

## Non-Negotiable Rules
- Never deviate from this palette — no inline colors outside these values.
- Never use Tailwind color classes outside this system (no `bg-blue-500`, no `text-gray-300`).
- Use CSS variables defined in `globals.css` — components reference variables, not raw values.

---

## Color Palette

```css
/* globals.css */
:root {
  --bg:               #0f1117;  /* Page background */
  --surface:          #1a1d27;  /* Cards, sidebar, modals */
  --border:           #2a2d3a;  /* Dividers, input borders */
  --accent:           #10b981;  /* Primary buttons, positive metrics */
  --accent-hover:     #059669;  /* Button hover state */
  --text-primary:     #f1f5f9;  /* Headings, body text */
  --text-secondary:   #94a3b8;  /* Labels, metadata, placeholders */
  --danger:           #ef4444;  /* Errors, inactive client flag */
  --warning:          #f59e0b;  /* Minor alerts */
  --success:          #10b981;  /* Same as accent — positive states */
}
```

### Tailwind Mapping (extend in tailwind.config)
```js
colors: {
  bg:        '#0f1117',
  surface:   '#1a1d27',
  border:    '#2a2d3a',
  accent:    '#10b981',
  'accent-hover': '#059669',
  'text-primary':   '#f1f5f9',
  'text-secondary': '#94a3b8',
  danger:    '#ef4444',
  warning:   '#f59e0b',
}
```

---

## Typography

- **Font:** Inter via `next/font/google` — loaded once in `app/layout.tsx`.
- **Scale:**

| Use | Class |
|---|---|
| Page title | `text-2xl font-bold text-text-primary` |
| Section heading | `text-lg font-semibold text-text-primary` |
| Body | `text-sm text-text-primary` |
| Label / metadata | `text-xs text-text-secondary` |
| Metric number | `text-3xl font-bold text-text-primary` |
| Metric label | `text-sm text-text-secondary` |

---

## Layout

### Sidebar
- Width: `240px` fixed on desktop
- Background: `bg-surface`
- Border right: `border-r border-border`
- On mobile (`< md`): hidden — replaced by bottom navigation bar
- Active nav item: `bg-accent/10 text-accent` (10% accent opacity background)
- Inactive nav item: `text-text-secondary hover:text-text-primary`

### Page Container
```tsx
<main className="ml-[240px] min-h-screen bg-bg p-6">
  <div className="max-w-6xl mx-auto">
    {children}
  </div>
</main>
```

### Cards
```tsx
<div className="bg-surface border border-border rounded-xl p-5">
```
- No box shadows — border only.
- Padding: always `p-5` or `p-6`. Never `p-2` or `p-3` on cards.

---

## Components

### Metric Card
```tsx
<div className="bg-surface border border-border rounded-xl p-5">
  <p className="text-xs text-text-secondary uppercase tracking-wide">{label}</p>
  <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
  <p className="text-xs text-text-secondary mt-1">{sublabel}</p>
</div>
```

### Primary Button
```tsx
<button className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
```

### Danger Button
```tsx
<button className="bg-danger/10 hover:bg-danger/20 text-danger text-sm font-medium px-4 py-2 rounded-lg transition-colors">
```

### Tables
- No column borders — only `border-b border-border` between rows.
- Header: `text-xs text-text-secondary uppercase tracking-wide`.
- Row hover: `hover:bg-surface/60`.
- No zebra striping.

### Badges
```tsx
// Active client
<span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full">Active</span>

// Inactive client (⚠️)
<span className="bg-danger/10 text-danger text-xs px-2 py-0.5 rounded-full">Inactive</span>
```

### Form Inputs
```tsx
<input className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent w-full" />
```

### Loading State
- Use shadcn/ui `Skeleton` with `bg-surface` base.
- Never show empty white space — always a skeleton.

### Empty State
```tsx
<div className="flex flex-col items-center justify-center py-16 text-text-secondary">
  <Icon className="w-8 h-8 mb-3 opacity-40" />
  <p className="text-sm">{message}</p>
</div>
```

---

## Charts (Recharts)
- Background: transparent (inherits `--bg`)
- Bar fill: `#10b981` (accent)
- Grid lines: `#2a2d3a` (border color)
- Axis text: `#94a3b8` (text-secondary)
- Tooltip background: `#1a1d27` (surface)
- No legend unless chart has multiple series

---

## Rules the Agent Must Never Break
1. Dark mode only — no light mode toggle, no system preference detection.
2. No gradients except on the accent color for hover transitions.
3. No animations beyond `transition-colors` and `transition-opacity`.
4. No emojis in the UI except the ⚠️ inactive client flag.
5. All icons from `lucide-react` only — no mixing icon libraries.
6. Spacing uses Tailwind scale only — no arbitrary values like `mt-[13px]`.
