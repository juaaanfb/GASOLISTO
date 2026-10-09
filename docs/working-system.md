# GASOLISTO Working System

Since September 22, 2026, Codex is both the project brain and implementation engine. Claude is no longer required.

## Source Of Truth

- The live codebase is this local `GASOLISTO` folder.
- Notion is the living product and technical memory.
- GitHub (`juaaanfb/GASOLISTO`, branch `main`) provides backup, history, and delivery to Vercel.
- Vercel deploys happen after local validation, not before.

If Notion and the local repo disagree, inspect the repo first and then update Notion when the task closes.

## Roles

- User: product owner and final taste/priority holder.
- Codex: technical lead, product thinking partner, implementation engine, reviewer, and documentation closer.
- Departments: specialized product, audit, marketing, and data analysis coordinated by the central chat.

## Task Flow

1. Discuss the idea with Codex.
2. Codex defines a small scope and observable acceptance criteria.
3. Codex implements in the local `GASOLISTO` folder.
4. Codex reviews the resulting changes.
5. Codex fixes issues, validates, pushes to GitHub, and verifies the Vercel deployment.
6. Codex updates Notion only when the task is closed.

## Prompt Requirements

Every implementation task should include:

- Current project context.
- Goal.
- User-facing success criteria.
- Likely files or areas to inspect.
- Implementation steps.
- Acceptance criteria.
- Required checks.
- Explicit non-goals.

`docs/claude-code-prompt-template.md` remains a historical reference, not a required dependency.

## Review Gate

Before a task is considered done:

- Run `npm run typecheck`.
- Run `npm run build`.
- Do a manual or visual review when the task affects UI/UX.
- Validate loading, empty, and error states when the task touches external data, maps, geolocation, routes, or fuel prices.

## Notion Closing Note

At task close, update Notion with:

- Decision made.
- What changed.
- Prompt or implementation summary.
- Final status.
- Next action.

Do not update Notion for every small intermediate step unless the task creates a durable decision.
