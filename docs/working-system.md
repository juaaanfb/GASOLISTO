# GASOLISTO Working System

This project uses a "Codex as brain, Claude Code as builder" workflow.

## Source Of Truth

- The live codebase is this local `GASOLISTO` folder.
- Notion is the living product and technical memory.
- GitHub becomes the delivery and review surface once the current local repo is connected to the correct remote.
- Vercel deploys happen after local validation, not before.

If Notion and the local repo disagree, inspect the repo first and then update Notion when the task closes.

## Roles

- User: product owner and final taste/priority holder.
- Codex: technical lead, product thinking partner, prompt author, reviewer, and documentation closer.
- Claude Code: implementation engine working in the same local folder.

## Task Flow

1. Discuss the idea with Codex.
2. Codex turns the idea into a scoped implementation prompt for Claude Code.
3. Claude Code implements in the local `GASOLISTO` folder.
4. Codex reviews the resulting changes.
5. Codex prepares any corrective prompt if needed.
6. Codex updates Notion only when the task is closed.

## Prompt Requirements

Every Claude Code prompt should include:

- Current project context.
- Goal.
- User-facing success criteria.
- Likely files or areas to inspect.
- Implementation steps.
- Acceptance criteria.
- Required checks.
- Explicit non-goals.

Use `docs/claude-code-prompt-template.md` as the base.

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
