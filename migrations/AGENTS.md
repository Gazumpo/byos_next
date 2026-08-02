# Database Migration Instructions

## Scope

These instructions apply to every SQL file under `migrations`. They extend the repository-root `AGENTS.md`.

Migration work can affect local Docker databases, hosted PostgreSQL, authentication, tenancy, and generated TypeScript. Treat it as persistent production data work.

## Migration model

- Migration files are ordered lexically and currently run from `0000` through `0009`.
- The next migration should use the four-digit prefix `0010_` followed by a concise snake-case description.
- Add a new migration for every deployed schema change. Never rewrite an earlier migration that might already have run.
- Fresh Docker databases execute every file in lexical order through `/docker-entrypoint-initdb.d`.
- Existing Docker volumes do not execute newly added files automatically.
- The maintenance server action executes generated migration strings sequentially against `DATABASE_URL`.
- The maintenance runner does not wrap the complete migration set in one transaction. It stops on errors except for a small allowlist of messages such as `already exists` and duplicate-key errors.
- Existing migrations are not uniformly rerunnable. In particular, enum creation and policy creation are not consistently guarded. Do not assume the current set is idempotent merely because many tables, columns, and indexes use `IF NOT EXISTS`.

Never delete or recreate a database volume to make a migration succeed unless the user explicitly authorizes that destructive operation and recovery is understood.

## File structure and SQL conventions

Start new migrations with generator-readable metadata:

```sql
-- Title: Short Human-Readable Title
-- Description: What changes and why
```

Then follow these rules:

- Use PostgreSQL syntax supported by PostgreSQL 16, the version in `docker-compose.yml`.
- Qualify application objects with the `public` schema when ambiguity is possible.
- Quote identifiers only when required, especially Better Auth's case-sensitive column names.
- Prefer explicit constraint and index names so later migrations can inspect or replace them safely.
- Make additions rerunnable where practical with `IF NOT EXISTS`, catalog checks, or guarded `DO` blocks.
- Do not use a broad `EXCEPTION WHEN OTHERS` block to hide failures.
- Consider an explicit transaction inside a multi-statement migration when all operations are transaction-safe. Verify behavior in both the Docker initializer and maintenance runner.
- Plan backfills before adding `NOT NULL`, unique constraints, foreign keys, or stricter enum values to populated tables.
- Consider lock duration and table rewrites for changes to device logs and other growing tables.
- Add indexes for new foreign keys and frequent lookup or ordering paths when justified by application queries.
- Define intentional `ON DELETE` behavior for new foreign keys.
- Never embed production credentials, tokens, URLs, or user data in a migration.

The current tenancy migration contains deployment-specific assumptions about the `postgres` owner, `byos_db`, and the `byos_app` role. Understand those assumptions before changing RLS or grants. Do not copy hard-coded role passwords or database names into new migrations. Prefer current-database and existing-role logic that can work in Docker and managed PostgreSQL when the feature permits it.

## Tenancy and RLS

Migration `0009_add_user_tenancy.sql` enables and forces RLS for:

- `devices`
- `playlists`
- `mixups`
- `screen_configs`

Policies allow rows belonging to `app.current_user_id` and rows with a null `user_id`. Application UI queries use `SET ROLE byos_app` through `withUserScope` or `withUserScopeTransaction`.

For a new tenant-owned table:

1. Add a `user_id` reference to Better Auth's `"user"("id")` with deliberate delete behavior.
2. Add an index on `user_id`.
3. Enable and, if consistent with the current security model, force RLS.
4. Add explicit policies for every required operation.
5. Grant the required table and sequence privileges to `byos_app`.
6. Ensure future default privileges are sufficient or add a specific grant.
7. Update application creation paths to set the current user ID.
8. Verify authenticated users cannot read or mutate one another's rows.
9. Verify auth-disabled mode can still access intentionally unclaimed rows.

Child tables such as `playlist_items` and `mixup_slots` currently rely on their parent relationship rather than having their own `user_id` policies. Do not change that model casually. Ensure any child-table query or mutation proves access through its tenant-owned parent when security is relevant.

## Generated files and schema types

`scripts/generate-sql-statements.js` reads all `.sql` files, sorts them, and rewrites `lib/database/sql-statements.ts`.

- Never edit `lib/database/sql-statements.ts` by hand.
- `pnpm generate:sql` also runs the broad repository formatter. Inspect the full worktree before and after.
- The generator builds its schema-health query by matching conventional `CREATE TABLE` statements. Its current regular expression does not discover every quoted or unusually named table. If a new table must be part of health validation and is not detected, update and test the generator rather than hand-editing generated output.
- `validate_schema` checks only that discovered base tables exist in `public`. It does not validate columns, constraints, policies, grants, indexes, enum values, or data backfills.

`lib/database/db.d.ts` is generated from a live `public` schema:

```bash
pnpm generate:types
```

This requires a valid `DATABASE_URL` with the new migration already applied. Never hand-edit the generated type file. Review generated changes for unexpected drops, nullability changes, enum changes, and database-driver types.

Update dependent code when a schema change affects:

- `lib/types.ts` application-facing types
- Kysely queries in `app/actions`, `app/api`, and `lib`
- inserts, updates, JSON serialization, and date conversions
- RLS scoping and `user_id` assignment
- database health checks and maintenance UI
- API and deployment documentation

## Validation

Do not validate a migration against an important or shared database without explicit authorization.

For a schema change:

1. Review the pre-change worktree.
2. Apply migrations in order to a disposable or approved development PostgreSQL 16 database.
3. Test both a fresh schema and an upgrade from the previous schema state.
4. Run `pnpm generate:sql` and inspect all resulting diffs.
5. Run `pnpm generate:types` against the migrated schema when its types changed.
6. Run `pnpm lint` and `pnpm exec tsc --noEmit --incremental false`.
7. Run targeted application checks for every affected read and write path.
8. Verify constraints, indexes, RLS policies, grants, and representative data with read-only catalog queries.
9. Confirm a deliberate failure does not leave an unsafe partial schema.
10. Document any manual deployment step required for existing Docker volumes or hosted databases.

Before handoff, review the SQL migration, generated SQL, generated types, and application changes together. Report which database environments were tested and never include connection strings or credentials.
