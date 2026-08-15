# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build      # Compile TypeScript to dist/
npm link           # Install the CLI globally after building
ragnarok --help    # Test the CLI
```

There is no test runner configured yet. `npm start` runs via `ts-node` (dev only, not the built output).

## Architecture

This is a Node.js CLI tool (ESM, `"type": "module"`) built with TypeScript and [Commander.js](https://github.com/tj/commander.js). It is intended to be a RAG (Retrieval-Augmented Generation) knowledge base manager.

The entry point is `src/index.ts`, which defines the CLI commands using Commander and is the only file with the `#!/usr/bin/env node` shebang (required for `npm link` to work correctly).

The domain layer lives under `src/domain/` and follows a ports-and-adapters pattern:

- **Entities** (`domain/entities/`) — plain TypeScript interfaces (e.g., `Knowledge`)
- **Repositories** (`domain/repositories/`) — interfaces defining persistence contracts (e.g., `KnowledgeRepository` with `create` / `search`)
- **Services** (`domain/services/`) — interfaces for external capabilities (e.g., `EmbedingService` for generating vector embeddings)

`src/container.ts` is the planned DI composition root (currently empty — implementations go here when adapters are added).

`src/common/common.utils.ts` holds shared utilities (currently only `getVersion()`, which reads `package.json` at runtime).

## TypeScript notes

- `moduleResolution: "nodenext"` — all local imports must use explicit `.js` extensions, even for `.ts` source files.
- `verbatimModuleSyntax` is enabled — use `import type` for type-only imports.
- `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are on — be explicit about `undefined`.
