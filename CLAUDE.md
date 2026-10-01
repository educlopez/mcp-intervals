# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP server that integrates with the Intervals task management API. Exposes 104 tools and 3 resources via the Model Context Protocol, allowing Claude to manage tasks, projects, milestones, time entries, clients, invoices, payments, and documents in Intervals.

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
│                  # using Basic Auth. Typed methods for the hand-written tools plus
│                  # generic get/post/put/delete used by the endpoint tools. Maps
│                  # NotificationOptions to X-Intervals-* headers. requestBinary()
│                  # for file downloads.
├── tools/         # registerTools() in index.ts composes per-domain modules:
│   ├── helpers.ts   # EndpointSpec + registerEndpoints() (declarative zod-validated
│   │                # tools; ID goes in the URL only; adds send_notifications /
│   │                # disable_action_notes to every write tool)
│   ├── core.ts      # Hand-written tools: get_task, update_task, add_task_note,
│   │                # get_task_notes, get_project, get_milestone, add_time_entry,
│   │                # get_time_entries, get_documents, download_document
│   ├── tasks.ts     # tasks, task notes, saved filters, statuses/priorities
│   ├── time.ts      # timers, time entries, work types, expenses
│   ├── projects.ts  # projects, milestones, notes, team, modules, work types,
│   │                # labels, default modules, requests
│   ├── people.ts    # clients, people, contacts, groups, quota
│   ├── billing.ts   # invoices, items, notes, terms, payments, payment types
│   └── documents.ts # get/create/update document records
├── resources.ts   # registerResources(): 2 MCP resources (intervals://statuses,
│                  # intervals://priorities)
└── utils.ts       # parseTaskIdFromUrl(): accepts Intervals URLs or numeric IDs
                   # getMimeTypeFromFilename(), isImageMimeType(): image detection helpers
```

**Data flow:** Claude → MCP stdio transport → `index.ts` → `tools/`/`resources.ts` → `IntervalsClient` → Intervals REST API

## Key Implementation Details

- **ES Modules** — `"type": "module"` in package.json; imports require `.js` extensions in compiled output
- **Module system** — TypeScript uses `Node16` module resolution
- **Tool parameters** — Validated with Zod schemas at runtime. New API endpoints are added as an `EndpointSpec` in the matching `src/tools/*.ts` domain file (tool names have no `intervals_` prefix; record IDs are camelCase params like `clientId`, API fields keep API names like `projectid`)
- **Notifications** — Write tools take optional `send_notifications` / `disable_action_notes`; the client sends `X-Intervals-Send-Notifications: t` / `X-Intervals-Disable-Action-Notes: t` only when true (API default: no emails)
- **Task ID resolution** — `get_task` accepts both Intervals URLs (`/tasks/view/123`) and numeric IDs; `utils.ts` handles parsing. Local IDs (displayed in UI) are resolved to internal IDs via `getTaskByLocalId()`
- **Document support** — `get_task` automatically fetches attached documents and includes metadata in the response. `download_document` returns images inline as base64 `ImageContent` blocks so the AI can see them. Document records can be created and updated via `create_document` / `update_document`, but the API does not support uploading file content
- **Auth** — `INTERVALS_API_TOKEN` env var, encoded as Basic Auth (`token:X` base64)
- **Transport** — Stdio-based (stdin/stdout), configured in `.mcp.json` for Claude Code

**Permissions:** some collection endpoints (`worktype`, `invoice`, `expense`, `module`, `payment`) return 403 depending on the user's permission group. Project-scoped alternatives exist: `get_project_worktypes` and `get_project_modules`.

## Environment Setup

Requires `INTERVALS_API_TOKEN` environment variable. For local development, create a `.env` file (gitignored). The `.mcp.json` file configures the server for Claude Code with the token in the `env` block.
