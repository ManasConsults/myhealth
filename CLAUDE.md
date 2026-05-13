@AGENTS.md
@.agents/skills/next-best-practices/SKILL.md

# MyHealth

Full-stack health tracking — Next.js 16 App Router, Tailwind CSS v4, Shadcn UI v4 (`@base-ui/react`), Lucide Icons, TypeScript strict.

**Live database** — Prisma 7 + PostgreSQL. `lib/db.ts` exports the shared client singleton. See `lib/CLAUDE.md` for the full data-layer contract.

## Critical rules

- **Node v25**: npm `.bin/` shims are broken — all scripts use `node node_modules/...` directly. Do not change this.
- **Shadcn v4**: `asChild` does not exist on any trigger. Use controlled `open` + plain `Button onClick`. See `components/CLAUDE.md`.
- **New model sequence**: `lib/types.ts` → `prisma/schema.prisma` → `npm run db:push && npm run db:generate` → `lib/actions.ts` → UI. In that order, always.
- **Server Actions**: all in `lib/actions.ts` only — no other action files.
- No new deps without checking `package.json` first.
- Canonical Tailwind only: `min-w-11` not `min-w-[44px]`, `bg-linear-to-br` not `bg-gradient-to-br`.

## Provider tree

```
ThemeProvider → ColorThemeProvider → AuthProvider → {children}
```

Auth demo users: `member`/`member123`, `admin`/`admin123`.

## Skills

`next-best-practices` is always loaded above (Next.js 16 has breaking API changes — too risky to skip).

For all others, add `@.agents/skills/<name>/SKILL.md` inline when the task matches:

| Skill | Load when |
|---|---|
| `frontend-patterns` | building React components, hooks, state, forms, data fetching |
| `frontend-design` | creating new pages or major UI layouts from scratch |
| `ui-ux-pro-max` | choosing color systems, typography, or visual design direction |
| `coding-standards` | reviewing or refactoring for naming, readability, or code quality |
| `security-review` | touching auth, API endpoints, or user input handling |
| `tdd` | writing tests or following red-green-refactor |
| `backend-patterns` | designing API endpoints or middleware |
