# API Route Instructions

## Scope

These instructions apply to all Next.js route handlers and helpers below `app/api`. They extend the repository-root `AGENTS.md`.

This API serves device firmware, browser UI compatibility, image rendering, Better Auth, local database data, and upstream TRMNL proxying. Identify the route class before changing its behavior.

## Security boundary

`proxy.ts` treats every path beginning with `/api` as public. Global page authentication does not protect these handlers.

- Every new sensitive route must implement its own authentication and authorization.
- Never infer that a browser session exists. Device firmware callers do not have Better Auth cookies.
- A route using `withUserScope` derives tenancy from the request session when present; callers without a session see only rows permitted for the null user context.
- Device setup, display, current display, and logging use device credentials and selected direct database access for firmware compatibility.
- Better Auth owns `/api/auth/[...all]`; it returns 404 when auth is disabled.
- Do not expose maintenance, admin, cross-tenant, or secret-bearing operations merely because neighboring API routes are public.

Treat `Authorization`, `Access-Token`, API keys, session cookies, MAC addresses, user records, log payloads, and telemetry as sensitive. Never log raw credentials or echo them in error messages. When touching existing code that logs credentials, redact or omit those values within the changed path where behavior can be preserved.

## Route classes

### Device protocol

- `/api/setup` registers or reconnects devices. It requires `ID` and `Model`; `Access-Token` is optional during setup.
- `/api/display` requires `Access-Token`, resolves direct, playlist, or mixup display mode, updates telemetry, and returns the next image URL.
- `/api/display/current` requires `Access-Token` and returns the current direct screen details.
- `/api/log` accepts device log batches on POST. GET intentionally returns 404; successful POST returns 204.

Header names are firmware protocol contracts:

- `ID`
- `Access-Token`
- `Model`
- `Refresh-Rate`
- `Battery-Voltage`
- `FW-Version`
- `RSSI`

Preserve exact response fields such as `status`, `api_key`, `friendly_id`, `image_url`, `filename`, `refresh_rate`, firmware flags, and `special_function`. Several device errors intentionally use HTTP 200 with an error value in the JSON `status` field. Do not normalize these to conventional HTTP status codes without confirming firmware compatibility and updating `docs/api.md`.

Retain no-database fallbacks where they exist. Setup and logging acknowledge or skip work; display returns a fallback recipe image.

### Bitmap output

- `/api/bitmap/[[...slug]]` renders a registered recipe or a safe fallback.
- `/api/bitmap/mixup/[id]` loads a mixup from PostgreSQL, renders its slots, composites PNG, and converts to BMP.
- `/api/test-img/[[...slug]]` is a legacy rendering and cache test path, not the canonical production recipe endpoint.

Bitmap responses must use `Content-Type: image/bmp` and preserve valid byte length and cache behavior. Supported grayscale counts are 2, 4, and 16. Default dimensions are 800 by 480, with positive width and height query overrides used by devices and mixups.

Treat dimensions and grayscale as untrusted input. Parse finite integers, reject unsupported grayscale values, and use reasonable resource bounds when strengthening validation. Preserve the established fallback-image behavior for ordinary unknown slugs and renderer failures.

Any shared rendering change also falls under `app/(app)/recipes/AGENTS.md` and must be tested against direct recipes, bitmap output, portrait output, and mixups.

### Local compatibility data

- `/api/devices` and `/api/devices/[id]` expose TRMNL-shaped device data through RLS-scoped queries.
- `/api/playlists/items` lists compatibility-shaped playlist items through direct child-table access.
- `/api/playlists/items/[id]` accepts a `visible` boolean but currently does not persist visibility because the schema has no such column.
- `/api/me` is a compatibility stub and does not validate a real user identity.

Do not claim that compatibility-only fields are persisted when they are not. Do not extend the `/api/me` stub with real account data without route-local authentication and tenancy review.

### Upstream TRMNL proxy

Categories, IPs, models, palettes, markup, and plugin-setting routes forward requests to `https://usetrmnl.com` through `lib/api/proxy.ts`.

- Preserve the original query string.
- `Access-Token` is forwarded by the JSON proxy when present.
- `Authorization` is forwarded only when `forwardAuth: true`, currently used for plugin-setting routes.
- JSON request bodies are reserialized for supported write methods.
- Archive upload uses multipart forwarding and must allow the runtime to set the multipart boundary.
- Preserve upstream HTTP status and JSON response shape.
- Return a controlled 502 response when the upstream request fails.
- Do not add open-ended caller-controlled upstream hosts or paths. Keep proxy destinations constructed from trusted route code.

The current proxy assumes JSON responses except for multipart request input. If an upstream endpoint returns binary, streaming, empty, or non-JSON content, update the helper deliberately and test content type, body, headers, and status propagation.

## Handler conventions

- Use App Router named exports such as `GET`, `POST`, `PATCH`, and `DELETE`.
- In this Next.js version, dynamic `params` are promises. Await them before use.
- Parse and validate path values, headers, query values, JSON, and form data at the route boundary.
- Catch malformed JSON or form input and return a deliberate client error instead of an accidental generic 500.
- Avoid trusting TypeScript casts as runtime validation. Narrow `unknown` values before database or renderer use.
- Use `NextResponse.json` for JSON and `Response` for binary or text responses.
- Set content types explicitly for non-JSON output.
- Check `checkDbConnection()` before database-dependent work and preserve the route's established unavailable-database status or fallback.
- Use `withUserScope` for session-owned tables. Use direct `db` only when the device, compatibility, child-table, or administrative contract requires it and the security effect is understood.
- Keep multi-table mutations transactional where possible.
- Use `lib/logger.ts` with a stable `source`, minimal metadata, and redacted values.
- Do not expose stack traces, raw database errors, upstream secrets, or internal connection details to callers.

Do not silently broaden CORS, accepted methods, authentication modes, or response payloads. Avoid caching personalized, credentialed, or device-specific JSON unless the cache key and privacy model are explicit.

## Contract changes

Before changing an existing response or status:

1. Identify whether the consumer is firmware, the browser UI, an upstream TRMNL client, or internal rendering code.
2. Search the repository for the route, field name, and header name.
3. Preserve backward compatibility when practical.
4. Update `docs/api.md` and any deployment or device instructions.
5. Add a safe fallback or transition path for stored device and playlist data.

New routes should document method, authentication, headers, request body, response body, status behavior, database effects, and whether they are safe without a browser session.

## Validation

Run:

```bash
pnpm lint
pnpm exec tsc --noEmit --incremental false
git diff --check
```

Then exercise changed routes with realistic but non-secret test values:

- Required and missing authentication or device headers
- Valid and malformed JSON or form data
- Valid, missing, and invalid dynamic IDs
- Database ready and unavailable behavior
- Authenticated user, different user, and no-session tenancy where applicable
- Upstream success, non-2xx JSON, timeout, connection failure, and non-JSON behavior when proxy code changes
- Device-compatible HTTP status and body status combinations
- BMP content type, signature, dimensions, grayscale, fallback, and error behavior for rendering changes

Do not call live private, paid, or production services unless the task requires it and authorization is clear. Prefer local requests, fixtures, mocks, or a disposable development database. Never include real tokens in shell history, tool output, logs, screenshots, or the final report.
