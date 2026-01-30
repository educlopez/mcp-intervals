# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP server that integrates with the Intervals task management API. Exposes 6 tools and 2 resources via the Model Context Protocol, allowing Claude to manage tasks, projects, and milestones in Intervals.

## Commands

- `npm run build` — Compile TypeScript (`src/` → `dist/`)
- `npm run dev` — Run server in development mode with tsx
- `npm start` — Run compiled server from `dist/index.js`

No test framework is currently configured.

## Architecture

```
src/
├── index.ts       # Server entry point: reads INTERVALS_API_TOKEN env var,
│                  # creates client, registers tools/resources, connects stdio
├── client.ts      # IntervalsClient class: HTTP client for api.myintervals.com
│                  # using Basic Auth. Methods for tasks, notes, projects, milestones.
├── tools.ts       # registerTools(): 6 MCP tools (get_task, update_task,
│                  # add_task_note, get_task_notes, get_project, get_milestone)
├── resources.ts   # registerResources(): 2 MCP resources (intervals://statuses,
│                  # intervals://priorities)
└── utils.ts       # parseTaskIdFromUrl(): accepts Intervals URLs or numeric IDs
```

**Data flow:** Claude → MCP stdio transport → `index.ts` → `tools.ts`/`resources.ts` → `IntervalsClient` → Intervals REST API

## Key Implementation Details

- **ES Modules** — `"type": "module"` in package.json; imports require `.js` extensions in compiled output
- **Module system** — TypeScript uses `Node16` module resolution
- **Tool parameters** — Validated with Zod schemas at runtime
- **Task ID resolution** — `get_task` accepts both Intervals URLs (`/tasks/view/123`) and numeric IDs; `utils.ts` handles parsing. Local IDs (displayed in UI) are resolved to internal IDs via `getTaskByLocalId()`
- **Auth** — `INTERVALS_API_TOKEN` env var, encoded as Basic Auth (`token:X` base64)
- **Transport** — Stdio-based (stdin/stdout), configured in `.mcp.json` for Claude Code

## Environment Setup

Requires `INTERVALS_API_TOKEN` environment variable. For local development, create a `.env` file (gitignored). The `.mcp.json` file configures the server for Claude Code with the token in the `env` block.
