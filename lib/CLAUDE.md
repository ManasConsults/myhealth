# lib/ — Data layer

**Prisma 7 + PostgreSQL.** `lib/db.ts` exports the shared `prisma` client singleton.

## Prisma 7 specifics

- **Config**: `prisma.config.ts` (root) — datasource URL and seed command live here, not in `schema.prisma`.
- **Generated client**: `generated/prisma/client.ts` — import as `@/generated/prisma/client`. Regenerate after every schema change.
- **Driver adapter**: `PrismaClient` requires `PrismaPg` adapter — see `lib/db.ts`. Never call `new PrismaClient()` without an adapter.
- **After schema changes**: `npm run db:push && npm run db:generate`, then **restart the dev server** (Next.js does not hot-reload `generated/`).

## Rules

1. **Reads and writes** go through Server Actions in `lib/actions.ts` only. No component or hook touches `prisma` directly.
2. **`lib/db.ts`** must not have `"use client"` — imported by Server Actions.
3. **`auth-context.tsx`, `ColorThemeProvider.tsx`, `ThemeProvider.tsx`** must have `"use client"`.
4. **New model sequence**: define type in `lib/types.ts` → add Prisma model in `prisma/schema.prisma` → `npm run db:push && npm run db:generate` → add Server Actions to `lib/actions.ts` → wire UI last.
5. **Passwords** are SHA-256 hashed via Node.js `crypto` — no bcrypt dependency. Hashing: `createHash("sha256").update(password).digest("hex")`.
6. **Auth** is handled by Auth.js v5 (`next-auth@^5.0.0-beta.31`). Config lives in `auth.ts` (root). Route handler at `app/api/auth/[...nextauth]/route.ts`. Route protection in `proxy.ts` (Next.js v16 — NOT `middleware.ts`).
7. **`useAuth()`** in `lib/auth-context.tsx` wraps Auth.js `useSession()` / `signIn()` / `signOut()`. The hook interface is unchanged — no component rewrites needed when updating auth internals.
8. **User status flow**: new users default to `status: "pending"`. Only `status: "approved"` users can log in. Admins approve/reject via `approveUser(id)` / `rejectUser(id)` Server Actions.

## DB scripts

```bash
npm run db:generate   # regenerate Prisma client after schema changes (then restart dev server)
npm run db:push       # push schema changes to DB without a migration file — use for dev
npm run db:migrate    # create and apply a named migration — use before production deploys
npm run db:seed       # wipe and re-seed with demo data
npm run db:studio     # open Prisma Studio in browser
```
