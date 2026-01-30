# mcp-intervals

[![npm version](https://img.shields.io/npm/v/mcp-intervals)](https://www.npmjs.com/package/mcp-intervals)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

MCP server for [Intervals](https://www.myintervals.com/) task management. Lets Claude read and update tasks, add notes, and browse projects and milestones directly from your Intervals account.

## Setup

### 1. Get your Intervals API token

1. Log in to your Intervals account
2. Go to **Options** (bottom-left) > **My Account** > **API Access**
3. Copy your **API token**

### 2. Install in Claude Code

```bash
claude mcp add intervals -e INTERVALS_API_TOKEN=YOUR_TOKEN -- npx -y mcp-intervals
```

Replace `YOUR_TOKEN` with your actual API token.

### 3. Install in Claude Desktop

Add this to your config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "intervals": {
      "command": "npx",
      "args": ["-y", "mcp-intervals"],
      "env": {
        "INTERVALS_API_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

<details>
<summary><strong>Cursor</strong></summary>

Add to `.cursor/mcp.json` in your project or `~/.cursor/mcp.json` globally:

```json
{
  "mcpServers": {
    "intervals": {
      "command": "npx",
      "args": ["-y", "mcp-intervals"],
      "env": {
        "INTERVALS_API_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Windsurf</strong></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "intervals": {
      "command": "npx",
      "args": ["-y", "mcp-intervals"],
      "env": {
        "INTERVALS_API_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

</details>

## Available Tools

| Tool | Description |
|------|-------------|
| `get_task` | Get task details by local ID or Intervals URL |
| `update_task` | Update task status, assignee, priority, title, due date, or owner |
| `add_task_note` | Add a comment/note to a task (supports HTML) |
| `get_task_notes` | Retrieve all comments/notes on a task |
| `get_project` | Get project details (name, client, dates, budget) |
| `get_milestone` | Get milestone details (title, due date, progress) |

## Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Task Statuses | `intervals://statuses` | List of all status IDs for use with `update_task` |
| Task Priorities | `intervals://priorities` | List of all priority IDs for use with `update_task` |

## Example Usage

Once installed, you can ask Claude things like:

- "Get the details of task 1234"
- "Update task 1234 status to closed"
- "Add a note to task 1234 saying the fix has been deployed"
- "Show me all notes on task 1234"
- "What are the details of project 5?"

## License

MIT
