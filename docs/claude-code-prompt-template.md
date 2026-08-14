# Claude Code Prompt Template

Copy this template into Claude Code after discussing the task with Codex.

```md
You are working in the local GASOLISTO project folder.

## Project Context

GASOLISTO is a Next.js 14 App Router + TypeScript app for comparing fuel station prices in Spain. It uses Tailwind CSS, Leaflet/OpenStreetMap, OSRM, Nominatim, the public MITECO fuel-price API, and localStorage for client-only user data.

The current local folder is the live codebase. Treat Notion as documentation that may lag behind the repo.

## Goal

[Describe the exact change to implement.]

## User-Facing Success Criteria

- [Observable outcome 1.]
- [Observable outcome 2.]
- [Observable outcome 3.]

## Likely Areas To Inspect

- [Path or feature area 1.]
- [Path or feature area 2.]
- [Path or feature area 3.]

## Implementation Requirements

- Follow existing project patterns.
- Keep the change tightly scoped.
- Preserve current behavior outside the requested change.
- Use typed TypeScript and existing helpers/components where appropriate.
- Keep UI consistent with the current app style.

## Non-Goals

- Do not rewrite unrelated modules.
- Do not change deployment setup unless explicitly requested.
- Do not add new dependencies unless the task clearly requires it.
- Do not update Notion; Codex will do that after review.

## Required Checks

Run:

- `npm run typecheck`
- `npm run build`

If the change affects UI/UX, also verify the relevant flow manually in the browser.

## Completion Report

When finished, report:

- Files changed.
- Behavior changed.
- Checks run and results.
- Any known risks or follow-up suggestions.
```
