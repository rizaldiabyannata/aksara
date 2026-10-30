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
