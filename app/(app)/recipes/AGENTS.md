# Recipe Area Instructions

## Scope

These instructions apply to `app/(app)/recipes` and all recipe implementations below `screens`. They extend the repository-root `AGENTS.md`; follow both files.

- Preserve pre-existing recipe edits and untracked recipe folders.
- Keep recipe changes isolated to the requested slug unless a shared renderer contract must change.
- Do not reformat large word lists or rewrite image collections incidentally.

## How recipes are discovered

`screens.json` is the canonical registry used by the gallery, sidebar, route generation, playlists, device bitmap routes, and mixups.

For a slug named `example-screen`, the runtime expects:

```text
screens/example-screen/example-screen.tsx
screens/example-screen/getData.ts       # only when hasDataFetch is true
```

The slug, folder, and component filename must match exactly. `lib/recipes/recipe-renderer.ts` constructs those dynamic import paths directly. The `componentPath` field in `screens.json` is descriptive metadata and is not used by the current dynamic loader.

Each registry entry should retain the established metadata shape:

- `title`, `description`, `published`, `category`, `tags`, and `version`
- `createdAt`, `updatedAt`, and `author`
- `componentPath` matching the conventional location for human readers
- `hasDataFetch`
- JSON-serializable `props`
- `params` when users can configure the recipe
- `renderSettings` when renderer behavior differs from the default

In production, unpublished entries are hidden and `fetchRecipeConfig` rejects them. Development shows them. Do not remove the `not-found` recipe or the safe unknown-slug fallback.

## Component contract

- Export the recipe component as the default export from `<slug>.tsx`.
- Accept optional `width` and `height` props and default them to 800 and 480 unless the recipe has a justified alternative.
- Treat dimensions as runtime values. Recipes can be rendered in portrait, custom device sizes, and mixup slots, not only at 800 by 480.
- Wrap image-rendered output in `PreSatori` and pass the effective width and height.
- Keep recipe components server-renderable. Do not add `"use client"`, hooks, browser globals, DOM measurement, or event-driven state to the image component.
- Keep output deterministic for identical inputs where practical. Time-varying and random data belongs in `getData.ts`, with stable fallback behavior and appropriate caching.
- Use explicit layout, sizing, and font choices. Takumi and Satori implement constrained layout engines and do not support the full browser CSS surface.
- Favor flex layouts and renderer-supported Tailwind classes. `PreSatori` translates responsive classes, gap classes, reset styles, font families, and dither classes for image rendering.
- Use local fonts configured in `lib/fonts.ts` when possible. External images must be reachable by the server-side renderer and need a fallback.

`renderSettings.doubleSizeForSharperText` makes the renderer create a double-size PNG and downsample it into the requested BMP dimensions. Keep this setting synchronized with the component's `PreSatori useDoubling` behavior. Test overflow, clipping, line wrapping, and image scaling whenever doubling changes.

## Parameters and fetched data

Supported parameter definition types are `string`, `number`, `boolean`, and `date`. Each definition may include `label`, `description`, `default`, and `placeholder`.

- Parameter values are loaded from `screen_configs` through `app/actions/screens-params.ts` when the database is available.
- Missing, null, and blank-string stored values fall back to registry defaults.
- With no database, definitions still provide their defaults.
- Never commit a real token, private URL, or user-specific value as a registry default.
- Parameter definitions are used as an allowlist when values are saved. Update definitions and consumers together.

For `hasDataFetch: false`, the renderer combines registry `props` with a nested `params` object.

For `hasDataFetch: true`:

- Export a default async function from `getData.ts`.
- The function receives configured params as its optional argument.
- A successful fetched object replaces the initial registry props and params. Return every prop the component requires, including `params` if the component explicitly consumes it.
- Invalid data, thrown errors, import failures, or the outer 10-second timeout leave the initial props in place. Components must render a useful state from defaults or partial data.
- Build-phase rendering skips remote data fetching. Do not make production builds depend on a live upstream service.
- Prefer `unstable_cache` with keys that include every input affecting the result. Choose revalidation based on the upstream data's useful lifetime.
- Validate and normalize untrusted upstream JSON before rendering it.
- Keep secrets, authorization headers, and server-only environment access in `getData.ts`. Never return or log tokens.
- Use timeouts or abort signals for network requests where appropriate. Provide local or deterministic fallback data.

## Rendering pipeline

The relevant flow is:

```text
screens.json
  -> dynamic component and optional getData.ts
  -> PreSatori normalization
  -> Takumi by default, or Satori with REACT_RENDERER=satori
  -> PNG
  -> utils/render-bmp.ts
  -> 1-bit, 2-bit, or 4-bit BMP
```

The supported grayscale level counts are 2, 4, and 16. Other values are rejected by `renderBmp`.

The gallery route displays direct React, PNG, and bitmap versions because browser output can differ from image-renderer output. The device route is `/api/bitmap/<slug>.bmp`; mixups call the same shared renderer at slot-specific dimensions.

Do not move shared rendering code into a recipe. Reusable renderer behavior belongs in `lib/recipes` or `utils`, and such changes require checking every recipe, the bitmap API, and mixups.

## Assets

- Keep recipe-specific images and helpers with that recipe.
- Put assets shared by the broader application in `public`.
- Preserve binary formats and dimensions unless conversion is part of the request.
- Do not mass-normalize bird image directories or run `scripts/normalize_image_extremes.py` without an explicit asset task.
- Avoid adding `.DS_Store`, `__pycache__`, `.pyc`, editor files, or generated previews.
- When a local image is resolved from the filesystem, keep path handling server-only and ensure a missing file produces a safe visual fallback.

## Change checklist

When adding a recipe:

1. Choose a lowercase kebab-case slug.
2. Add the matching folder and default component file.
3. Add `getData.ts` only if `hasDataFetch` is true.
4. Register the exact slug in `screens.json` with complete metadata, defaults, params, and render settings.
5. Confirm the component accepts dynamic dimensions and renders without a database.
6. Confirm external-data failure still produces valid output.
7. Search for the slug in device defaults, playlists, mixups, docs, and tests or fixtures before renaming or removing anything.

When removing or renaming a recipe, remember that database rows can retain its slug. Keep unknown-slug and unavailable-data behavior safe.

## Validation

Run checks proportional to the change:

```bash
pnpm lint
pnpm exec tsc --noEmit --incremental false
git diff --check
```

The repository can have unrelated baseline lint findings. Do not hide or fix them through broad unsafe formatting. Verify that the files you changed introduce no new findings.

Manually check, as applicable:

- `/recipes/<slug>` in React, PNG, and bitmap modes
- Landscape and portrait layouts
- Default 800 by 480 output and any relevant mixup or device dimensions
- `/api/bitmap/<slug>.bmp?width=800&height=480&grayscale=2`
- Grayscale 4 and 16 if the target device supports them
- Missing database, missing params, upstream timeout, invalid upstream data, and missing image fallbacks
- Both Takumi and Satori when changing shared renderer or compatibility code

Do not use a live paid or private upstream service merely for unrelated validation. Redact any credentials from commands, logs, screenshots, and reports.
