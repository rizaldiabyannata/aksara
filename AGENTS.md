<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Aksara project context

- Before project work, read `CLAUDE.md` for the current architecture, commands, and trust boundaries. For a feature, read the relevant section of `docs/PRD_Web_App_Belajar_Kelas_VI.md`.
- Read the vault hub at `~/Documents/Projects-Notes/Obsidian Vault/Projects/Aksara/Aksara Project Context.md` before project work. Open only notes relevant to the task. Before editing vault notes, read the vault's `CLAUDE.md` and follow its note conventions. The repository is the source of truth when a note differs from current code.
- Use Bun for this project. Check the relevant guide under `node_modules/next/dist/docs/` before changing Next.js code.
- Prefer codebase-memory MCP graph tools for structural code discovery when available. If the MCP server is unavailable, use local source search and state that limitation.
- Project skills live in `.agents/skills/`. Use the relevant skill for work it covers.

## Working principles

Favor deliberate, verifiable changes over rushing. Scale the process to the task: a trivial edit needs a direct fix, not a new approval ceremony. Apply these principles alongside the project context and trust boundaries in `CLAUDE.md`.

### 1. Think before coding

- Inspect the repository to resolve factual questions before asking the user. State material assumptions explicitly; distinguish verified facts from guesses.
- When multiple interpretations would change the result, explain the alternatives and their tradeoffs. Ask about the unresolved decision instead of silently choosing.
- If a simpler approach fully meets the request, recommend it and explain the tradeoff.
- Pause work that depends on a material ambiguity and ask a focused question. Continue independent investigation when useful.
- Agree on scope and a plan before implementing a new feature. A request to implement an already supplied or approved plan is authorization; do not ask for the same approval again.

### 2. Simplicity first

- Build the smallest complete solution to the request. Prefer existing project helpers, components, and patterns.
- Add abstractions only when they reduce real duplication or complexity. Keep speculative features, configuration, and future flexibility out of the change.
- Validate real trust boundaries and handle failures supported by the code or runtime evidence. Preserve authentication, authorization, answer-key protection, and server-side timing checks.
- Before finishing, ask whether a senior engineer could make the solution substantially simpler without losing required behavior. Simplify when the answer is yes.

### 3. Surgical changes

- Every changed line must support the request or a necessary fix caused by the change. Match the surrounding style.
- Preserve unrelated user changes. Keep adjacent cleanup, formatting, refactors, and pre-existing dead code outside the diff; report relevant unrelated findings separately.
- Remove imports, variables, and helpers made unused by your own changes. Preserve pre-existing code unless its removal is required by the task.
- When committing, stage only the task's changes, including only the relevant hunks in files shared with other work.

### 4. Goal-driven execution

- Define observable success criteria before implementation. For multi-step work, state a short plan pairing each step with its verification.
- For a bug, reproduce it with a focused failing test before fixing it. For validation, test invalid inputs. For a refactor, establish the relevant behavior before and after the change.
- Use meaningful checks appropriate to the change; documentation-only and trivial reversible edits do not need artificial tests. Use the Bun commands and test-database safeguards in `CLAUDE.md`; run Vitest and Playwright serially.
- Verify user-facing behavior in the browser when relevant, including keyboard use, 44 px interaction targets, and 360 px layouts.
- Continue until the agreed criteria are met or a concrete blocker requires user input. Report what was verified, what remains unverified, and any failing checks; distinguish failures caused by this task from unrelated existing failures using evidence.
