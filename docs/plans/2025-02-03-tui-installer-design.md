# TUI Installer Design

## Overview

Add an interactive TUI command `mcp-intervals init` that guides users through configuring the MCP server for multiple clients without requiring git clone or manual setup.

## Command

```bash
npx mcp-intervals init
```

## User Flow

1. **Detect installed MCP clients** — Scan for Claude Code, Claude Desktop, Cursor, Windsurf
2. **Show detected clients** — Let user select which to configure (multi-select with checkboxes)
3. **Request API token** — Password input, hidden while typing
4. **Validate token** — Call Intervals API `/me` endpoint, show workspace name on success
5. **Confirm and save** — Write configuration to selected clients
6. **Done** — Show success message with restart instructions

## File Structure

```
src/
├── index.ts              # MCP server (unchanged)
├── cli/
│   ├── init.ts           # Main installer command
│   ├── clients.ts        # Client detection and configuration
│   └── api.ts            # Token validation with Intervals API
```

## Client Detection

| Client | Platform | Config Path |
|--------|----------|-------------|
| Claude Code (global) | macOS/Linux | `~/.claude.json` |
| Claude Code (global) | Windows | `%USERPROFILE%\.claude.json` |
| Claude Code (project) | All | `./.mcp.json` (cwd) |
| Claude Desktop | macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop | Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | macOS | `~/.cursor/mcp.json` |
| Cursor | Windows | `%USERPROFILE%\.cursor\mcp.json` |
| Windsurf | macOS | `~/.codeium/windsurf/mcp_config.json` |
| Windsurf | Windows | `%APPDATA%\Codeium\windsurf\mcp_config.json` |

**Detection logic:**
- File exists → "installed"
- Parent directory exists but not file → "installed" (will create file)
- Parent directory doesn't exist → "not found"

## Configuration Format

All clients use the same format:

```json
{
  "mcpServers": {
    "intervals": {
      "command": "npx",
      "args": ["-y", "mcp-intervals"],
      "env": {
        "INTERVALS_API_TOKEN": "user-token-here"
      }
    }
  }
}
```

**Save behavior:**
- Merge with existing config (preserve other MCP servers)
- Ask before overwriting existing `intervals` entry
- Create `.bak` backup before modifying

## Token Validation

```typescript
async function validateToken(token: string): Promise<{ valid: boolean; workspace?: string }> {
  const response = await fetch('https://api.myintervals.com/me/', {
    headers: {
      'Authorization': `Basic ${Buffer.from(token + ':X').toString('base64')}`
    }
  });

  if (response.ok) {
    const data = await response.json();
    return { valid: true, workspace: data.me.company };
  }
  return { valid: false };
}
```

## Error Handling

| Situation | Behavior |
|-----------|----------|
| Invalid token | Show error, allow retry |
| No internet | Ask if save without validation |
| Permission denied | Show error with fix instructions |
| Corrupt config (invalid JSON) | Offer to backup and recreate |

## Dependencies

**New:**
- `@inquirer/prompts` — Interactive TUI prompts

## package.json Changes

```json
{
  "bin": {
    "mcp-intervals": "dist/index.js",
    "mcp-intervals-init": "dist/cli/init.js"
  },
  "dependencies": {
    "@inquirer/prompts": "^7.0.0"
  }
}
```

## Example Session

```
$ npx mcp-intervals init

🔍 Detecting MCP clients...

Found installed clients:
  ✓ Claude Code (global)
  ✓ Claude Code (this project)
  ✓ Claude Desktop
  ✗ Cursor (not found)
  ✓ Windsurf

? Select clients to configure: (use arrows, space to select)
  ◉ Claude Code (global)     ~/.claude.json
  ◯ Claude Code (project)    ./.mcp.json
  ◉ Claude Desktop           ~/Library/.../claude_desktop_config.json
  ◯ Windsurf                  ~/.codeium/windsurf/mcp_config.json

? Enter your Intervals API token: **********************

🔄 Validating token...
✓ Token valid! Connected to workspace "Acme Corp"

? Confirm configuration:
  • Claude Code (global)
  • Claude Desktop

  [Confirm] [Cancel]

✓ Configuration saved to ~/.claude.json
✓ Configuration saved to ~/Library/.../claude_desktop_config.json

🎉 Done! Restart your MCP clients to use mcp-intervals.
```
