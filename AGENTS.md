# AGENTS.md

## Scope and instruction priority

This file applies to the entire repository. A more deeply nested `AGENTS.md`, if one is added later, overrides this file for files below its directory.

- Follow the user's request first, then the closest applicable `AGENTS.md`.
- Inspect `git status --short` before editing. Preserve all pre-existing changes and untracked files.
- Keep changes focused. Do not reformat, regenerate, delete, or rename unrelated files.
- Do not commit, push, publish images, run release scripts, or destroy database volumes unless the user explicitly asks.
- Prefer repository evidence over stale documentation. Some older docs refer to `app/recipes`; the current implementation lives under `app/(app)/recipes`.

## Project overview

BYOS Next.js is a self-hosted server and management UI for TRMNL e-ink devices. It registers devices, schedules recipes through playlists and mixups, collects logs and telemetry, and renders React recipes into device-ready BMP images.

Core stack:

- Next.js 16 App Router with React 19 and strict TypeScript
- Tailwind CSS 4, shadcn/ui, Radix UI, and Lucide icons
- PostgreSQL accessed through Kysely
- Better Auth with optional authentication and admin support
- Takumi as the default JSX-to-PNG renderer, with Satori as an alternative
- Sharp plus custom bitmap code for 1-bit, 2-bit, and 4-bit BMP output
- Biome for formatting and linting
- pnpm with a committed lockfile

Default display output is 800 by 480 pixels. Device configuration can override dimensions, orientation, and 2, 4, or 16 grayscale levels.

## Runtime and setup

### Tool versions

- CI currently uses Node.js 20 and pnpm 10. Use those versions when reproducing CI.
- The Dockerfile currently defaults to Node.js 24 and activates pnpm 11.5.2.
- `package.json` has no `engines` or `packageManager` field, so do not change tool versions or rewrite the lockfile incidentally.

Install dependencies with:

```bash
pnpm install --frozen-lockfile
```

Do not substitute npm or Yarn unless the task specifically requires package-manager migration work.

### Environment

Local environment files are secret-bearing and must never be printed, copied into source, or committed. Read only variable names when diagnosing configuration.

Relevant variables found in the implementation and deployment files include:

- Database: `DATABASE_URL`, `POSTGRES_PASSWORD`
- Authentication: `AUTH_ENABLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL`
- Rendering and diagnostics: `REACT_RENDERER`, `DEBUG`
- Recipe integrations: `GOOGLE_GENERATIVE_AI_API_KEY`, `BIRDNET_URL`, `WIKIPEDIA_ACCESS_TOKEN`, `FORCE_WIKIPEDIA_RESERVOIR`, `HA_URL`, `HA_TOKEN`

`AUTH_ENABLED` is enabled unless its value is exactly `false`. A missing database allows limited recipe preview behavior, but device management and persistence require PostgreSQL. Password-reset email delivery in `lib/email.ts` is currently a console-only placeholder, even though a future `RESEND_API_KEY` integration is mentioned in comments.

### Common commands

| Command | Purpose and cautions |
| --- | --- |
| `pnpm dev` | Regenerates SQL statements, formats source directories, then starts Next.js with Turbopack. It can modify tracked files before the server starts. |
| `pnpm lint` | Runs the non-writing Biome check over `app`, `components`, `lib`, `utils`, and `hooks`. This is the main CI gate. |
| `pnpm exec tsc --noEmit --incremental false` | Runs an explicit TypeScript check without updating `tsconfig.tsbuildinfo`. There is no package script for type checking. |
| `pnpm format` | Writes formatting changes across the main source directories. Do not use for a narrowly scoped change unless broad formatting is intended. |
| `pnpm lint:fix` | Runs Biome with writing and unsafe fixes. Inspect the resulting diff carefully. |
| `pnpm generate:sql` | Rebuilds `lib/database/sql-statements.ts` from every migration, then formats all main source directories. |
| `pnpm generate:types` | Regenerates `lib/database/db.d.ts` from a reachable PostgreSQL schema. Requires `DATABASE_URL`. |
| `pnpm build` | Runs the `prebuild` lifecycle first, which regenerates SQL and formats source, then creates the standalone Next.js build. Review the worktree before and after. |
| `pnpm start` | Starts an already built production application. |

There is currently no automated test suite and no `test` script. The CI job named `typecheck` also runs `pnpm lint`; it does not invoke TypeScript directly. Compensate with targeted manual checks and the explicit TypeScript command above.

Docker development uses the base and development override together:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

Production and Raspberry Pi deployment details are in `docs/raspberry-pi.md`. The main compose file maps host port 3001 to container port 3000. SQL mounted into `/docker-entrypoint-initdb.d` runs only when the Postgres volume is first created.

## Repository map

- `app/(app)`: authenticated application pages for the dashboard, devices, playlists, mixups, recipes, tools, maintenance, logs, and admin users.
- `app/(auth)`: sign-in, sign-up, and password-recovery pages.
- `app/actions`: server actions for devices, playlists, mixups, screen parameters, maintenance, logs, and database initialization.
- `app/api`: public device endpoints, bitmap rendering endpoints, Better Auth, and proxy routes for the upstream TRMNL API.
- `app/(app)/recipes/screens.json`: canonical recipe registry and default parameters.
- `app/(app)/recipes/screens/<slug>`: recipe component, optional `getData.ts`, and recipe-specific assets.
- `app/(app)/tools`: bitmap font and image dithering tools registered in `tools.json`.
- `components`: feature components grouped by dashboard area.
- `components/ui`: local shadcn/Radix primitives. Reuse these before creating another primitive.
- `lib/database`: Kysely connection, generated schema types, generated migration strings, RLS-scoped access, and database health checks.
- `lib/auth`: Better Auth server and browser clients plus current-user helpers.
- `lib/recipes`: the shared recipe loading and rendering pipeline.
- `lib/api`: forwarding helpers for `usetrmnl.com` API routes.
- `lib/mixup`: responsive mixup layout definitions.
- `utils`: Satori/Takumi preprocessing, Tailwind compatibility, dithering, PNG rendering, and BMP encoding.
- `migrations`: ordered PostgreSQL schema migrations.
- `scripts`: SQL generation and offline image-normalization utilities.
- `public`: fonts, logos, screenshots, fallback bitmaps, and other static assets.
- `docs`: API, recipe, and Raspberry Pi documentation.
- `.github/workflows`: lint CI, release automation, and multi-architecture container publishing.

Large or generated files need special care:

- `lib/database/sql-statements.ts` is generated from `migrations/*.sql`. Never edit it by hand.
- `lib/database/db.d.ts` is generated by Kysely codegen from a live schema. Never edit it by hand.
- `tsconfig.tsbuildinfo` is a compiler cache. Avoid changing or reviewing it as source.
- `app/(app)/recipes/screens/word/words.tsx` is a large static word list. Do not reformat it incidentally.
- Recipe image directories, `public`, bitmap fonts, and font files contain binary or bulk assets. Preserve formats and avoid mass rewrites.
- Tracked `.DS_Store`, `.pyc`, and cache artifacts are historical repository noise. Do not add more of them or clean existing ones without a dedicated request.

## Architecture and data flow

### Pages, authentication, and data

- `proxy.ts` protects application pages when auth is enabled. All paths beginning with `/api` are intentionally public at this layer for device compatibility, so each sensitive API route must enforce its own requirements.
- `components/main-layout-server.tsx` is the server-side application shell. It obtains request-scoped session and initial data, then passes serializable data to `ClientMainLayout`.
- `lib/getInitData.ts` centralizes request-deduplicated dashboard data loading with React `cache()`.
- Add `"use client"` only where browser APIs, state, effects, or event handlers require it. Keep data access and secrets in server components, server actions, or route handlers.
- Next.js 16 route `params` and `searchParams` are promises in this codebase. Await them and follow nearby route signatures.

### Database and tenancy

- The global Kysely connection is in `lib/database/db.ts`.
- Migration `0009_add_user_tenancy.sql` adds `user_id`, row-level security policies, and the `byos_app` role for tenant-owned tables.
- UI operations on tenant-owned `devices`, `playlists`, `mixups`, and `screen_configs` should use `withUserScope` or `withUserScopeTransaction`. New tenant-owned rows must carry the current `user_id`.
- Use scoped transactions for related multi-table writes, as the playlist and mixup save actions do.
- Public device protocol, setup, logging, schema initialization, and selected child-table operations currently use the direct `db` connection. Do not casually convert between direct and scoped access. First determine whether the caller is a user session, a public device, or an administrative operation.
- Check `checkDbConnection()` before optional-database operations and retain existing empty or fallback behavior.
- Server actions generally return `{ success, error? }` and call `revalidatePath` after mutations. Preserve this contract for UI callers.

### Device request flow

1. A device calls `/api/setup` or `/api/display`.
2. Device identity comes from exact protocol headers such as `ID` and `Access-Token`; display telemetry also uses `Refresh-Rate`, `Battery-Voltage`, `FW-Version`, and `RSSI`.
3. `/api/display` resolves the device's direct screen, playlist item, or mixup and computes refresh timing in its configured timezone.
4. The response points to `/api/bitmap/<slug>.bmp` or `/api/bitmap/mixup/<id>.bmp`.
5. The bitmap route loads the recipe, renders PNG, dithers it, and returns BMP bytes with device-oriented headers.

Preserve the device API's established JSON fields and status behavior. Firmware compatibility is more important than making responses look like conventional REST responses. Do not log raw API keys, auth tokens, secrets, or complete sensitive request headers in new code.

### Recipe rendering flow

- `screens.json` is the registry used by the gallery, sidebar, dynamic imports, playlists, and bitmap routes.
- `lib/recipes/recipe-renderer.ts` loads `<slug>/<slug>.tsx` and optional `<slug>/getData.ts` dynamically.
- Recipe JSX is normalized by `PreSatori` and the Tailwind compatibility helpers.
- Takumi is the default renderer. `REACT_RENDERER=satori` selects Satori.
- `utils/render-bmp.ts` converts rendered PNG data into TRMNL-compatible BMP output.
- Production build paths deliberately skip remote recipe fetching and output generation. Keep build behavior deterministic and offline-safe.
- Mixups render recipes at slot dimensions and composite them according to `lib/mixup/constants.ts`.

Recipe components must work in the constrained image renderer, not only in a browser. Favor explicit dimensions, flex layouts, local fonts, renderer-supported styles, and deterministic output. Test both direct React rendering and generated image output because they can differ.

## Common change workflows

### Adding or changing a recipe

1. Use a lowercase kebab-case slug.
2. Create `app/(app)/recipes/screens/<slug>/<slug>.tsx` with a default component export.
3. Add the matching entry to `app/(app)/recipes/screens.json`. The slug, directory name, and component filename must match exactly because dynamic imports rely on this convention.
4. If `hasDataFetch` is `true`, add `getData.ts` with a default async export. It should accept optional recipe params, return component props, handle upstream failure with useful fallback data, and finish within the renderer's 10-second timeout.
5. Define editable `params` in `screens.json` with supported types: `string`, `number`, `boolean`, or `date`. Recipes without data fetching receive runtime values in the `params` prop. Data-backed recipes receive them as the argument to `getData.ts`; successful fetched data replaces the initial props, so return `params` explicitly if the component also needs them.
6. Keep secrets and network calls in `getData.ts`, never in a client component or registry defaults.
7. Put recipe-only assets beside the recipe. Put generally reusable static assets in `public`.
8. Check `/recipes/<slug>` in React, PNG, and bitmap modes, both landscape and portrait when relevant. Also request `/api/bitmap/<slug>.bmp` with representative width, height, and grayscale query parameters.

When renaming or removing a recipe, search for its slug in playlists, defaults, device code, docs, and `screens.json`. Existing database rows may still refer to it, so retain a safe fallback.

### Changing the database schema

1. Add the next ordered migration under `migrations`. Do not rewrite a migration that may already have run in deployed databases.
2. Make the migration safe for the supported deployment path and consider existing rows, constraints, RLS, grants, indexes, and rollback/recovery implications.
3. Run `pnpm generate:sql`, then inspect all generated and formatting diffs.
4. Apply the schema to an appropriate development database before running `pnpm generate:types`.
5. Update application types or conversions and verify both auth-enabled tenancy and auth-disabled mono-user behavior.
6. Remember that Docker init migrations do not rerun on an existing volume. Never delete a volume merely to make a migration pass unless explicitly authorized.

### Changing an API route

- Follow existing App Router route handler signatures and return `Response` or `NextResponse` consistently.
- Validate untrusted headers, path values, query values, form data, and JSON at the boundary.
- Preserve upstream status and response shape in TRMNL proxy routes.
- Keep device endpoints usable without a browser session, while adding route-local authorization for any new sensitive operation.
- Use `lib/logger.ts` for operational events, but redact credentials and avoid storing unnecessarily sensitive telemetry.
- Add or update `docs/api.md` when the external contract changes.

### Changing UI or server actions

- Prefer server components for data loading and client components for interaction.
- Keep server actions in `app/actions` and start action-only modules with `"use server"`.
- Use the `@/` alias instead of long relative imports.
- Reuse types from `lib/types.ts`, generated database types where appropriate, and primitives from `components/ui`.
- Maintain tenant scoping, mutation result shapes, cache revalidation, loading states, and no-database fallbacks.
- Follow existing responsive Tailwind patterns and verify both light and dark themes.

## Code style

Biome is authoritative for source formatting and linting:

- Use tabs for indentation and double quotes in JavaScript and TypeScript.
- Let Biome organize imports.
- Keep TypeScript strict. Prefer precise types and `unknown` over introducing `any`.
- Use type-only imports when they improve clarity, although the Biome rule is not mandatory here.
- Use functional React components and established server/client boundaries.
- Use PascalCase for component symbols, camelCase for functions and variables, and kebab-case for route and recipe directories.
- Add comments for constraints and non-obvious decisions, not for line-by-line narration.
- Match the surrounding file when legacy code differs from current conventions.

Do not run a whole-repository formatter to fix one local issue. Biome's configured command already excludes generated build output, but it can still touch many tracked source files.

## Validation

Choose checks proportional to the change and report anything skipped or blocked.

Minimum checks for source changes:

```bash
pnpm lint
pnpm exec tsc --noEmit --incremental false
git diff --check
```

Additional checks:

- Recipe/rendering change: manually inspect the recipe page and PNG/BMP endpoints at relevant dimensions and grayscale levels.
- API change: exercise the route with realistic headers and both success and fallback/error cases.
- Database change: apply it to a disposable or approved development database, regenerate SQL and types, and verify RLS behavior.
- Docker change: run `docker compose config` with the same base and override files used by the target deployment.
- Build/runtime change: run `pnpm build`, but first note its generation and formatting side effects and compare the worktree afterward.
- Documentation-only change: inspect links, paths, commands, and `git diff --check`; source lint does not check Markdown.

Before handing off:

- Review `git diff --stat`, `git diff`, and `git status --short`.
- Confirm only intended files changed and distinguish pre-existing user changes in the report.
- Confirm generated files agree with their sources when generation was required.
- State which validations passed, failed, or were not run.

## Security and operational safeguards

- Never expose `.env` values, database URLs, API keys, Better Auth secrets, device access tokens, Home Assistant tokens, or Gemini credentials.
- Treat MAC addresses, device telemetry, logs, and user records as potentially sensitive.
- Do not send real password-reset email until `lib/email.ts` is replaced with an approved provider and configuration.
- Do not call live external APIs merely to validate unrelated changes. Recipe integrations include TRMNL, Gemini, Wikipedia, CoinGecko, Open-Meteo, Transperth, BirdNET, and Home Assistant.
- Maintenance actions can delete logs, devices, or repair schema state. Invoke them only when the task explicitly calls for those effects.
- Release scripts update versions, create commits and tags, and push. GitHub workflows can publish multi-architecture images. Do not trigger these as ordinary validation.
- Never use destructive Git commands to clean the worktree. Preserve user-owned modifications and untracked recipe work.

## Known repository caveats

- There is no test framework or automated test suite yet.
- CI's `typecheck` job is currently a second Biome lint run.
- `pnpm dev`, `pnpm generate:sql`, and `pnpm build` can create formatting changes outside the immediate task.
- Docker, CI, and the local environment may use different Node and pnpm major versions.
- The main compose file exposes the app on host port 3001, while some older documentation says 3000.
- Existing Postgres volumes do not automatically receive newly added migration files.
- README and recipe docs contain some legacy `app/recipes` paths. Use `app/(app)/recipes` for current code.
- The repository currently tracks several OS and compiler cache artifacts. Avoid expanding that noise in unrelated work.
