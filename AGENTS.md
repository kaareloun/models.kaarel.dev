# AGENTS.md

Guidelines for coding agents working in this repo.

- Never add comments to code. If code needs a comment to be understood, rename things or restructure instead. Docs live in README.md only when the user asks.
- Keep README.md minimal. Do not add sections, env docs, or examples unless explicitly asked.
- Make the smallest change that solves the task. Do not refactor unrelated code, do not reformat untouched lines.
- Match existing conventions: double quotes, semicolons, 2-space indent, `~` path alias, named exports, zod for validation.
- Never add dependencies without asking.
- Keep server-only code (fs, fetch jobs) in `src/openrouter/` and server functions in `src/serverFunctions/`; never import node built-ins into client bundles.
- Persisted app state lives in `src/data/` (gitignored). Never commit anything from there.
- No emojis in code, UI text, or commit messages.
- Verify with `bun run typecheck` and `bun run build` before finishing any change. Run relevant scripts (e.g. `bun run watch`) when touching the background watcher.
- Never commit or push unless explicitly asked.
- When a source of truth exists (API, docs, bundled code), verify against it instead of guessing.
