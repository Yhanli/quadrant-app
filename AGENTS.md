# Quadrant — Agent Guide

> ⚠️ **Expo HAS CHANGED.** This project is on **Expo SDK 54**. Read the exact
> versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any
> code. Do not rely on memory of older Expo/React Native APIs.

## What this app is

Quadrant is a values-based personal-productivity app built around Stephen
Covey's Urgent/Important matrix. The matrix is the primary experience, not a
secondary view. Optimise for **intentional living and value alignment**, not
task throughput. See the product vision in the repo's product notes / the
concept brief — when a change conflicts with that philosophy (e.g. turning the
matrix into a plain task list), flag it rather than silently implementing it.

Quadrants (internal id → user-facing name):
- `Q1` → 🔥 **Do Now** (Important + Urgent)
- `Q2` → 🌱 **Grow** (Important + Not Urgent)
- `Q3` → 📨 **Respond** (Urgent + Not Important)
- `Q4` → 🍃 **Let Go** (Not Important + Not Urgent)

Values (each task has one or more): Health, Family, Growth, Financial Security,
Adventure, Community. Colours are earthy/muted — never neon or saturated.

## Tech stack

React Native 0.81 · Expo SDK ~54 · Expo Router ~6 (file-based) · React 19 ·
TypeScript. State is React Context; persistence is AsyncStorage. No test
framework is configured.

## Commands

- `npm start` / `npx expo start` — start the dev server (Metro)
- `npm run ios` / `npm run android` / `npm run web` — start on a platform
- `npm run lint` — `expo lint` (eslint-config-expo). Run before finishing.
- There is **no test script**. Don't claim tests pass; verify by running the app.

## Architecture — where things actually live

**Almost the entire app is in one file:** `components/quadrant-dashboard.tsx`
(~950 lines). Despite the name, it contains far more than a dashboard. It
exports:
- `HomeScreen` — the matrix landing screen + "Completed Today" section
- `QuadrantDetailScreen` — per-quadrant detail screen with task composer
- `QuadrantAppProvider` — Context provider wrapping the app

The files under `app/` are thin Expo Router shells that just render these:
- `app/_layout.tsx` — root Stack + wraps everything in `QuadrantAppProvider`
- `app/index.tsx` — renders `<HomeScreen />` (the start route)
- `app/quadrant/[quadrant].tsx` — renders `<QuadrantDetailScreen />`

That's the whole app: `components/` contains only `quadrant-dashboard.tsx`,
`hooks/` contains only `use-color-scheme.ts(.web)`. The `create-expo-app`
template scaffolding (tabs group, modal route, themed components, `constants/`
theme) has been removed.

Inside `quadrant-dashboard.tsx`, the important pieces:
- Types: `Quadrant`, `Value`, `Task`, `TaskDraft`
- `QUADRANTS`, `VALUE_OPTIONS`, `VALUE_STYLES` — config/colour maps
- `QuadrantProvider` + `useQuadrantData()` — state, `addTaskToQuadrant`,
  `toggleTaskCompletion`, `saveTask`; persists to AsyncStorage under
  `quadrant_tasks` (key `TASK_STORAGE_KEY`). Writes are gated on `hasHydrated`
  so the initial load doesn't overwrite stored data.
- `determineQuadrant(important, urgent)` — maps the two booleans to Q1–Q4
- `TaskEditorModal`, `QuadrantTaskComposer`, `QuadrantSummaryCard`, `TaskCard`
- One `StyleSheet.create` block at the bottom holds all styling and the real
  warm palette (off-whites `#F7F6F3`/`#FAFAF8`, sage `#556B4D`, etc.).

## Conventions & gotchas

- **Styling/colours are hardcoded** in the `styles` block and `VALUE_STYLES` in
  `quadrant-dashboard.tsx` — there is no shared theme module. If a design system
  is wanted, extract from there rather than reintroducing the old template theme.
- Path alias `@/*` maps to the repo root (see `tsconfig.json`).
- Keep the matrix as the primary surface; detail screens exist to support it.
- New persisted fields must round-trip through the `Task` shape JSON-stored under
  `quadrant_tasks` — migrate/guard when changing that shape.

## Doc-vs-reality note

The concept brief lists "AsyncStorage persistence" as the next priority, but it
is **already implemented** (`QuadrantProvider`). Treat the brief as product
philosophy, not a current task list.
