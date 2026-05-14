# MyHealth

Full-stack health tracking app — Next.js 16, Tailwind CSS v4, Shadcn UI v4, Prisma 7, PostgreSQL.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Node v25**: npm `.bin/` shims are broken. All scripts use `node node_modules/...` directly — don't change this.

## Environment variables

Create a `.env` file at the root:

```
DATABASE_URL=postgresql://...
AUTH_SECRET=...
```

`prisma.config.ts` loads `.env` via `dotenv/config`. `DATABASE_URL` must be set before running any `db:*` script.

## Database scripts

```bash
npm run db:generate   # regenerate Prisma client after schema changes (restart dev server after)
npm run db:push       # push schema to DB without a migration — dev only
npm run db:migrate    # create and apply a named migration — required before non-prod / prod deploys
npm run db:seed       # wipe and re-seed with demo data
npm run db:studio     # open Prisma Studio in browser
```

## Deploying to non-prod

Run these steps in order before pushing to a non-prod environment:

### 1. Create a migration

If you changed `prisma/schema.prisma`, create a named migration first:

```bash
npm run db:migrate
# enter a descriptive name when prompted, e.g. "add_exercise_library"
```

This writes a SQL file to `prisma/migrations/` — commit it alongside the schema change.

### 2. Apply the migration to the target database

Point `DATABASE_URL` at the non-prod database, then:

```bash
DATABASE_URL=postgresql://<non-prod-url> node node_modules/prisma/build/index.js migrate deploy
```

`migrate deploy` applies all pending migrations without prompting — safe to run in CI.

### 3. Regenerate the Prisma client

```bash
npm run db:generate
```

### 4. Build and verify

```bash
npm run typecheck
npm run build
```

Fix any type errors before deploying.

### 5. Deploy

Push to your non-prod branch / trigger the deployment pipeline.

## Schema change workflow

Always follow this sequence:

1. Update types in `lib/types.ts`
2. Update `prisma/schema.prisma`
3. `npm run db:push && npm run db:generate` (dev only — no migration file)
4. Restart the dev server (Next.js does not hot-reload `generated/`)
5. Add Server Actions in `lib/actions.ts`
6. Wire up the UI last

Before merging / deploying, replace step 3 with `npm run db:migrate` to create a proper migration file.

## Auth demo users

| Username | Password   | Role  |
|----------|-----------|-------|
| member   | member123 | user  |
| admin    | admin123  | admin |

New registrations default to `pending` status and must be approved by an admin before they can log in.
