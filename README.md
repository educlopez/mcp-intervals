# mcp-intervals

[![npm version](https://img.shields.io/npm/v/mcp-intervals)](https://www.npmjs.com/package/mcp-intervals)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

MCP server for [Intervals](https://www.myintervals.com/) task management. Lets Claude read and update tasks, add notes, and browse projects and milestones directly from your Intervals account.

## Quick Start

Run the interactive installer:

```bash
npx mcp-intervals init
```

This will:
1. Detect your shell (zsh, bash, or PowerShell)
2. Store your API token securely in your shell profile (not in config files)
3. Detect installed MCP clients (Claude Code, Claude Desktop, Cursor, Windsurf)
4. Configure the selected clients

### Security

The installer stores your API token as an environment variable in your shell profile (`~/.zshrc`, `~/.bashrc`, or PowerShell profile), keeping it out of project files that might be committed to git. MCP config files only contain the command reference, not the token.

## Manual Setup

### 1. Get your Intervals API token

1. Log in to your Intervals account
2. Go to **Options** (bottom-left) > **My Account** > **API Access**
3. Copy your **API token**

### 2. Add the token to your shell profile

Add the following line to your shell profile:

**macOS/Linux (zsh)** - Add to `~/.zshrc`:
```bash
export INTERVALS_API_TOKEN="YOUR_TOKEN"
```

**macOS/Linux (bash)** - Add to `~/.bashrc` or `~/.bash_profile`:
```bash
export INTERVALS_API_TOKEN="YOUR_TOKEN"
```

**Windows (PowerShell)** - Add to your PowerShell profile:
```powershell
$env:INTERVALS_API_TOKEN = "YOUR_TOKEN"
```

Then reload your shell or restart your terminal.

### 3. Configure MCP clients

Add this to your MCP config file (token is read from environment):

**Claude Code:**
```bash
claude mcp add intervals --scope user -- npx -y mcp-intervals
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
```json
{
  "mcpServers": {
    "intervals": {
      "command": "npx",
      "args": ["-y", "mcp-intervals"]
    }
  }
}
```

<details>
<summary><strong>Cursor</strong></summary>

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "intervals": {
      "command": "npx",
      "args": ["-y", "mcp-intervals"]
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
      "args": ["-y", "mcp-intervals"]
    }
  }
}
```

</details>

## Available Tools

104 tools covering the full Intervals API. Tasks are addressed by the **local task ID** shown in the web UI (or a task URL for `get_task`); every other record uses its numeric API ID.

**Permissions:** some collection endpoints (`worktype`, `invoice`, `expense`, `module`, `payment`) return 403 depending on the user's permission group. Project-scoped alternatives exist: `get_project_worktypes` and `get_project_modules`.

| Area | Tools |
| ---- | ----- |
| Tasks | `get_task`, `get_tasks`, `create_task`, `update_task`, `delete_task`, `get_task_statuses`, `get_task_priorities` |
| Task notes | `get_task_notes`, `add_task_note`, `update_task_note`, `delete_task_note` |
| Task filters | `get_task_filters`, `get_task_filter`, `create_task_filter`, `update_task_filter` |
| Time | `add_time_entry`, `get_time_entries`, `update_time_entry`, `delete_time_entry`, `get_worktypes` |
| Timers | `get_timers`, `start_timer`, `stop_timer` |
| Expenses | `get_expenses`, `create_expense` |
| Projects | `get_project`, `get_projects`, `create_project`, `update_project` |
| Project team | `get_project_team`, `add_project_team_member`, `remove_project_team_member` |
| Project modules | `get_project_modules`, `add_project_module`, `update_project_module`, `remove_project_module` |
| Project work types | `get_project_worktypes`, `add_project_worktype`, `update_project_worktype`, `remove_project_worktype` |
| Project labels | `get_project_labels`, `get_project_label`, `create_project_label`, `update_project_label` |
| Project notes | `get_project_notes`, `get_project_note`, `create_project_note`, `update_project_note`, `delete_project_note` |
| Default modules | `get_modules`, `get_module`, `create_module`, `update_module` |
| Milestones | `get_milestone`, `get_milestones`, `create_milestone`, `update_milestone` |
| Milestone notes | `get_milestone_notes`, `create_milestone_note`, `update_milestone_note`, `delete_milestone_note` |
| Requests | `get_requests`, `get_request`, `create_request`, `update_request`, `delete_request` |
| Clients | `get_clients`, `get_client`, `create_client`, `update_client` |
| People | `get_people`, `get_person`, `get_me`, `get_groups`, `get_quota` |
| Contacts | `get_contact_types`, `get_contact_descriptors`, `get_person_contacts`, `create_person_contact`, `update_person_contact`, `delete_person_contact` |
| Invoices | `get_invoices`, `get_invoice`, `create_invoice`, `get_invoice_terms` |
| Invoice items | `get_invoice_items`, `create_invoice_item`, `update_invoice_item`, `delete_invoice_item` |
| Invoice notes | `get_invoice_notes`, `create_invoice_note`, `update_invoice_note`, `delete_invoice_note` |
| Payments | `get_payments`, `get_payment`, `create_payment`, `update_payment`, `delete_payment`, `get_payment_types` |
| Documents | `get_documents`, `get_document`, `download_document` (images inline, PDF text), `create_document`, `update_document` |

### Notifications

Every write tool (create/update/delete) accepts two optional booleans:

- `send_notifications` - sends `X-Intervals-Send-Notifications: t`. **Emails are not sent unless this is true** (the API default).
- `disable_action_notes` - sends `X-Intervals-Disable-Action-Notes: t` to suppress the automatic action notes Intervals adds to tasks and milestones.

## Resources

| Resource        | URI                      | Description                                           |
| --------------- | ------------------------ | ----------------------------------------------------- |
| Task Statuses   | `intervals://statuses`   | List of all status IDs for use with `update_task`     |
| Task Priorities | `intervals://priorities` | List of all priority IDs for use with `update_task`   |
| Work Types      | `intervals://worktypes`  | List of all work type IDs for use with time entries   |

## Example Usage

Once installed, you can ask Claude things like:

- "Get the details of task 1234"
- "Update task 1234 status to closed"
- "Update the description of task 1234 to explain the new requirements"
- "Add a note to task 1234 saying the fix has been deployed"
- "Show me all notes on task 1234"
- "Log 2 hours of billable time on task 1234 for today"
- "Add 30 minutes of unbillable time to task 1234 for code review"
- "Show me all time entries for task 1234"
- "What are the details of project 5?"

## License

MIT
