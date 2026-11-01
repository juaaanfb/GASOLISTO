# GASOLISTO Working System

Current agreement, updated October 30, 2026: Codex is Cerebro Central (strategy, prioritization, review and documentation). Claude Code owns implementation. This supersedes the September agreement in which Codex also implemented code.

## Source Of Truth

- The live codebase is this local `GASOLISTO` folder.
- Notion is the living product and technical memory.
- GitHub (`juaaanfb/GASOLISTO`, branch `main`) provides backup, history, and delivery to Vercel.
- Vercel deploys happen after local validation, not before.

If Notion and the local repo disagree, inspect the repo first and then update Notion when the task closes.

## Roles

- User: product owner and final taste/priority holder.
- Codex: technical lead, product thinking partner, reviewer, prompt author and documentation closer.
- Claude Code: implementation engine for the bounded tasks authorized by Juan through Cerebro Central.
- Departments: specialized product, audit, marketing, and data analysis coordinated by the central chat.

## Task Flow

1. Discuss the idea with Codex.
2. Codex defines a small scope and observable acceptance criteria.
3. Juan sends the bounded prompt to Claude Code, which implements in the local `GASOLISTO` folder. A prepared prompt is not proof that Claude has started.
4. Codex reviews the changes and evidence, runs appropriate independent checks, and sends corrections back to Claude when needed.
5. Claude fixes issues and validates. Local commits are allowed only within the task authorization. Push, merge and deployment require release authorization; during the current paused relaunch they are prohibited. Check automatic deployment behavior before any backup push.
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

## Current Relaunch Constraints

- The final brand and domain remain undecided; no candidate has legal clearance.
- Keep Vercel paused. No purchases, external posts, credential or permission changes.
- Preserve all existing work. Do not edit the same source files concurrently across sessions.
- Local commits are not a verified off-device backup. Check the remote and deploy triggers before publishing any branch.
- Distinguish tests run by Claude, checks repeated by Cerebro and production verification. Mocked analytics capture does not demonstrate real PostHog ingestion.
- Current release gate: `docs/checklist-relanzamiento-2026-10-30.md`.

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
