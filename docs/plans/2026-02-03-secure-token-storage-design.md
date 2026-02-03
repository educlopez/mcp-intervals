# Secure Token Storage Design

## Overview

Improve `npx mcp-intervals init` to store the API token in the user's shell profile instead of MCP config files, enhancing security for cross-platform teams.

## Problem

Currently, the token is stored in `.mcp.json` or other MCP config files in plain text. This poses security risks as these files could accidentally be committed to git.

## Solution

Store the token in the user's shell profile as an environment variable. MCP config files will only contain the command reference without the token.

## New Installer Flow

1. Show logo
2. Detect user's shell (zsh/bash/PowerShell)
3. Check if `INTERVALS_API_TOKEN` already exists in profile
   - If exists: show partial token and ask if user wants to replace
   - If not: continue
4. Prompt for token
5. Validate token against Intervals API
6. Detect installed MCP clients
7. Select clients to configure
8. Save:
   - Token → shell profile
   - Config without token → MCP client files
9. Show instructions to reload shell

## Shell Profile Paths

| OS | Shell | File |
|---|---|---|
| macOS | zsh | `~/.zshrc` |
| macOS | bash | `~/.bashrc` or `~/.bash_profile` |
| Linux | zsh | `~/.zshrc` |
| Linux | bash | `~/.bashrc` |
| Windows | PowerShell | `$PROFILE` |

## Token Format in Profiles

```bash
# macOS/Linux (zsh/bash)
export INTERVALS_API_TOKEN="token"

# Windows PowerShell
$env:INTERVALS_API_TOKEN = "token"
```

## MCP Config Format (no token)

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

## Error Handling

1. **Profile doesn't exist** → create with permissions 644
2. **Can't detect shell** → ask user to select (zsh/bash/PowerShell)
3. **No write permissions** → show manual instructions with the line to add
4. **Token exists but different** → show both partial tokens, confirm replacement

## Post-Install Instructions

Show clear instructions to activate the token:

- zsh/bash: `source ~/.zshrc` or restart terminal
- PowerShell: `. $PROFILE` or restart PowerShell
