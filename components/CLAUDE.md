# Component rules

## Shadcn v4 — critical

`asChild` does not exist. Always use controlled state:

```tsx
// WRONG — TypeScript error
<DialogTrigger asChild><Button>Open</Button></DialogTrigger>

// CORRECT
<Button onClick={() => setOpen(true)}>Open</Button>
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>...</DialogContent>
</Dialog>
```

## Design tokens

Never hardcode colours. Use semantic tokens only: `background`, `foreground`, `muted`, `primary`, `card`, `border`, `destructive`, `accent`, etc. These respond to both light/dark mode and the active colour theme automatically.

Six colour themes via `data-color` on `<html>`: `teal` (default), `blue`, `green`, `purple`, `rose`, `orange`.

## Patterns

- **Cards**: `shadow-md` + `hover:shadow-xl hover:-translate-y-1 transition-all duration-200` — baked into `components/ui/card.tsx`, no extra classes needed at call sites.
- **Sidebar**: `m-3 rounded-2xl shadow-xl overflow-hidden h-[calc(100vh-1.5rem)]`. Main content: `md:ml-64`. No `border-r` or `h-full`.
- **Touch targets**: `min-w-11 min-h-11` on all interactive elements on mobile.
- **Layout**: page content `max-w-4xl mx-auto`, section gap `space-y-6`, grid gaps `gap-3` (stats) / `gap-4` (cards).
- **Font**: Inter via `--font-sans`. Do not use Geist.
- **Breakpoints**: default = single column + bottom nav; `sm` = 2-col grids; `md` = sidebar + multi-col.
