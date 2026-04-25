@AGENTS.md
@.agents/skills/coding-standards/SKILL.md
@.agents/skills/next-best-practices/SKILL.md

# MyHealth — Project Instructions

## What This Is

MyHealth is a full-stack health & fitness tracking platform built with Next.js 16 (App Router), Tailwind CSS v4, Shadcn UI v4, and Lucide Icons. It supports dual-mode fitness planning: a Smart Engine (guided TDEE-based) and an Expert Mode (fully manual).

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.2.4 — App Router, Server Actions |
| Styling | Tailwind CSS v4 |
| Components | Shadcn UI v4 (uses `@base-ui/react`, **not** Radix UI) |
| Icons | Lucide React |
| Language | TypeScript strict — no `any`, no implicit types |
| Theming | `next-themes` (light/dark/system) + custom `data-color` attribute (6 colour themes) |
| Data layer | **Dummy mode** — module-level singleton (`globalThis.__myhealthStore`) in `lib/mock-store.ts`; will be replaced with a real DB (Prisma) when ready |
| Auth | Mock context in `lib/auth-context.tsx` — demo users: `member` / `member123` (user), `admin` / `admin123` (admin) |

---

## Running the App

```bash
npm run dev        # starts on http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run build
```

> **Note:** Node.js v25 breaks npm `.bin/` shims. All scripts invoke binaries via `node node_modules/...` directly — do not change this.

---

## Architecture

### Key files

```
lib/
  types.ts              — all shared TypeScript types (source of truth for all data models)
  mock-store.ts         — dummy data layer: in-memory store + CRUD helpers (no "use client" — server-safe; will be replaced with Prisma)
  auth-context.tsx      — client-side AuthProvider
  actions.ts            — all Server Actions (mutations)
  calculations.ts       — TDEE / macro math (Mifflin-St Jeor, Harris-Benedict, Katch-McArdle)
  color-themes.ts       — colour theme IDs, swatch hex values, storage key, default
hooks/
  useCalculations.ts    — client hooks for derived macro/calorie state
components/
  AppShell.tsx          — sidebar (md+) + mobile bottom nav + ThemeToggle
  MacroDonut.tsx        — SVG donut chart (no external chart lib)
  LoginForm.tsx
  ThemeProvider.tsx     — next-themes wrapper (attribute="class", defaultTheme="system")
  ThemeToggle.tsx       — cycles System → Light → Dark; shows SunMoon/Sun/Moon icon
  ColorThemeProvider.tsx — reads data-color from DOM on mount, exposes setColorTheme()
  ColorPicker.tsx       — row of coloured swatches; active one shows a checkmark
  onboarding/           — GuidedSetup, ManualSetup
  diet/                 — FoodLog (log + water tracker + clear-day), NutritionPlanner
  workout/              — PlanBuilder, ExerciseLogger
  admin/                — UserManagement, GlobalSettings
app/
  layout.tsx                  — providers: ThemeProvider > ColorThemeProvider > AuthProvider;
                                inline <script> sets data-color from localStorage before hydration
  page.tsx                    — login
  onboarding/page.tsx         — mode selection + setup flow
  dashboard/page.tsx          — main dashboard (macro donuts, calorie progress)
  dashboard/nutrition/        — food log (per-meal entries, water tracker, clear-day) + nutrition plans
  dashboard/workout/          — exercise log + plan builder
  dashboard/admin/            — user table + global settings (admin only)
  dashboard/settings/         — Appearance card (colour + dark mode), profile editor, mode switcher
```

### Provider tree (app/layout.tsx)

```
ThemeProvider          ← next-themes, class-based dark mode
  ColorThemeProvider   ← data-color attribute, localStorage persistence
    AuthProvider       ← mock session
      {children}
```

### Data flow

- All reads go through `lib/actions.ts` fetch actions (e.g. `fetchFoodLog`, `fetchNutritionPlans`). In production these become Prisma queries — the call sites stay the same.
- All writes go through `lib/actions.ts` Server Actions, which mutate the store then return the updated value.
- After a mutation, components call `refreshUser()` from auth context or re-read the store locally.

### Store resilience (dev hot-reload)

`getStore()` in `mock-store.ts` validates all required array fields before trusting the cached `globalThis.__myhealthStore`. If any field is missing (e.g. after a hot-reload where a new field was added to `Store`), the store is rebuilt from seed. This prevents `Cannot read properties of undefined (reading 'filter')` errors during development.

---

## Dummy Mode — Database Conversion Contract

The app currently runs in **dummy mode**: all data lives in a module-level in-memory singleton (`globalThis.__myhealthStore` inside `lib/mock-store.ts`). Data is lost on server restart. This is intentional — the goal is to build every feature as if it were real, then swap the data layer for a real database (e.g. PostgreSQL via Prisma) in one pass.

### Rules that keep the code database-ready

1. **All reads go through `lib/mock-store.ts` helper functions.** Never access `globalThis.__myhealthStore` directly anywhere outside that file.
2. **All writes go through `lib/actions.ts` Server Actions.** No component, hook, or utility may mutate the store directly.
3. **New data models follow this exact sequence:**
   - Define the TypeScript type in `lib/types.ts`.
   - Add seed data and CRUD helpers to `lib/mock-store.ts`.
   - Add the corresponding Server Actions to `lib/actions.ts`.
   - Wire up the UI last.
4. **IDs are always `string`.** Helpers generate `id: \`prefix-${Date.now()}\`` for dummy mode — the type stays `string` so swapping to UUIDs from a DB is a no-op.
5. **No business logic in `mock-store.ts`.** It is a pure data-access layer: query, insert, update, delete — nothing else.
6. **No persistence hacks.** Do not add `localStorage`, `fs`, or any other persistence shim to the mock store — the point is to keep the conversion surface clean.
7. **Everything must work end-to-end as if real.** Dummy data should be realistic (correct units, plausible values). Features must be fully functional, not stubbed.

When the database is ready, `lib/mock-store.ts` is replaced with Prisma queries and `lib/actions.ts` is updated — nothing else should need to change.

---

## Dual-Mode Planning

**Guided (Smart Engine):** User inputs weight, height, age, goal, activity level → app calculates TDEE using the platform's default formula → derives daily calorie + macro targets automatically.

**Manual (Expert Mode):** User sets their own calorie and macro targets directly. Physical metrics are still collected for the profile.

The active formula is stored in `GlobalSettings` and is configurable from the Admin panel.

---

## Shadcn UI v4 — Critical Difference

Shadcn v4 uses `@base-ui/react` instead of Radix UI. **`asChild` does not exist** on any trigger component. Always use controlled `open` state with a plain `Button onClick` instead:

```tsx
// WRONG — will throw a TypeScript error
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>

// CORRECT
<Button onClick={() => setOpen(true)}>Open</Button>
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>...</DialogContent>
</Dialog>
```

---

## Design System

### Principles

- **Mobile-first always** — design for 375px, add breakpoints only where layout genuinely needs to change.
- **Modern, light aesthetic** — clean surfaces, generous whitespace, subtle muted backgrounds. Avoid heavy shadows or dense layouts.
- **Semantic tokens only** — never hardcode colors. Always use Shadcn tokens (`background`, `foreground`, `muted`, `primary`, `card`, `border`, `destructive`, etc.) so every component automatically responds to both the light/dark mode and the chosen colour theme.
- **Cards** — all `<Card>` components have `shadow-md` at rest and `hover:shadow-xl hover:-translate-y-1` on hover (`transition-all duration-200`), giving a clear lift effect. This is baked into `components/ui/card.tsx` — no extra classes needed at the call site.
- **Sidebar** — floats with `m-3 rounded-2xl shadow-xl overflow-hidden`. Height is `h-[calc(100vh-1.5rem)]` to stay within the viewport margin. The main content area uses `md:ml-64` to account for the sidebar width (14rem) plus its margins and gap. Do not use `border-r` or `h-full` on the sidebar. Background uses `--sidebar` token: `oklch(0.94 …)` in light mode (clearly distinct from the `oklch(0.99 …)` page background) and `oklch(0.14 …)` in dark mode (slightly deeper than the `oklch(0.12 …)` page background).
- **Touch targets** — minimum `min-w-11 min-h-11` (44px) on all interactive elements on mobile.

### Light / Dark Mode

- Managed by `next-themes` (`ThemeProvider`). The `dark` class is set on `<html>`.
- `globals.css` defines `:root` (light) and `.dark` tokens.
- `<html suppressHydrationWarning>` prevents React hydration mismatch.
- `ThemeToggle` cycles System → Light → Dark and is present in the sidebar footer and mobile top bar.

### Colour Themes

Six themes are available, controlled via a `data-color` attribute on `<html>`:

| ID | Label | Approx hue |
|---|---|---|
| `teal` | Teal | 195 (default) |
| `blue` | Blue | 255 |
| `green` | Green | 145 |
| `purple` | Purple | 285 |
| `rose` | Rose | 10 |
| `orange` | Orange | 50 |

**How it works:**
- `globals.css` defines `html[data-color="X"]` overrides for the light variant and `html.dark[data-color="X"]` for dark. Only primary-related tokens are overridden (`--primary`, `--primary-foreground`, `--ring`, `--accent`, `--accent-foreground`, `--sidebar-primary`, `--sidebar-ring`).
- `app/layout.tsx` contains an inline `<script>` that reads `localStorage` and sets `data-color` before React hydrates — preventing a colour flash on page load.
- `ColorThemeProvider` syncs React state with the DOM attribute and persists to `localStorage` (key: `myhealth-color`).
- `ColorPicker` renders the swatches. Add it anywhere via `import { ColorPicker } from "@/components/ColorPicker"`.
- `useColorTheme()` exposes `{ colorTheme, setColorTheme }` anywhere inside `ColorThemeProvider`.

**When adding new UI:** use `text-primary`, `bg-primary`, `border-primary`, `ring`, `bg-accent` etc. — never hardcode a colour. The theme system does the rest.

### Typography

- **Font: Inter** — loaded via `next/font/google` with `variable: "--font-sans"` and `display: "swap"`. The variable name `--font-sans` wires directly into the `@theme inline` block in `globals.css`, so Tailwind's `font-sans` utility and `@apply font-sans` both pick it up automatically. Inter matches the clean, geometric feel of Apple's SF Pro on non-Apple devices; on Apple hardware the system will render it similarly.
- Monospace fallback: `ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace` — defined inline in `globals.css`, no import needed.
- **Do not** use `--font-geist-sans` or import `Geist` — that font has been removed.
- Scale: Tailwind defaults — `text-xs` through `text-2xl` only; no custom font sizes.

### Spacing & Layout

- Page max-width: `max-w-4xl mx-auto` for content pages.
- Section gap: `space-y-6` between major page sections.
- Card padding: `pt-4 pb-4` via `CardContent`.
- Grid gaps: `gap-3` for stat grids, `gap-4` for larger card grids.

### Responsive breakpoints

| Breakpoint | Behaviour |
|---|---|
| Default (< 768px) | Single column, bottom nav, stacked cards |
| `sm` (640px+) | Two-column grids for stats and macro cards |
| `md` (768px+) | Sidebar shown, bottom nav hidden, multi-column layouts |

---

## Coding Rules

- TypeScript always — no `any`, no implicit types.
- No new dependencies without checking `package.json` first.
- Server Actions live in `lib/actions.ts` — do not create action files elsewhere.
- `mock-store.ts` must **not** have `"use client"` — it is imported by Server Actions.
- `auth-context.tsx`, `ColorThemeProvider.tsx`, `ThemeProvider.tsx` must have `"use client"`.
- Comments only where logic is non-obvious (explain *why*, not *what*).
- No dead code, no unused imports.
- Canonical Tailwind classes only — e.g. `min-w-11` not `min-w-[44px]`, `bg-linear-to-br` not `bg-gradient-to-br`.
