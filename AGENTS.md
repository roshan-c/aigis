**Commands**
- Build: `bun run build` (outputs `dist/`, target `bun`); Install: `bun install`.
- Dev: `bun run dev`; Start: `bun run start`; Lint: `bunx eslint . --ext .ts`.

**Testing**
- Runner: `bun test` (no tests yet); Single file: `bun test path/to/file.test.ts`.
- Single test: `bun test -t "name or regex"`.

**Code Style**
- Imports: ESM; use `import type`; relative paths; `.ts` extensions allowed (tsconfig `verbatimModuleSyntax`, `allowImportingTsExtensions`).
- Formatting/spacing: tabs; single quotes; semicolons; trailing commas (multiline); Stroustrup braces; space-before-blocks; no space before function parens (except async arrows); object-curly spacing.
- Misc: ≤2 statements/line; avoid inline comments; limit empty lines; prefer const; no var; no yoda; max 4 nested callbacks.
- Errors: try/catch async handlers; `console.error` logging; user-safe messages; chunk Discord replies to 2000 chars.

**Types & Naming**
- TS strict; avoid `any`; prefer `unknown` + narrowing; validate external inputs with Zod.
- Names: PascalCase types/interfaces; camelCase vars/functions; UPPER_SNAKE for env keys (e.g., `DISCORD_TOKEN`, `OPENAI_API_KEY`).

**Cursor/Copilot**
- No `.cursor/rules` or `.github/copilot-instructions.md` found.