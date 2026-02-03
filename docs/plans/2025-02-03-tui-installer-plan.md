# TUI Installer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an interactive `mcp-intervals init` command that detects MCP clients and configures them with the user's Intervals API token.

**Architecture:** New CLI module (`src/cli/`) with three files: `init.ts` (main entry), `clients.ts` (client detection/config), `api.ts` (token validation). Uses `@inquirer/prompts` for interactive TUI.

**Tech Stack:** TypeScript, @inquirer/prompts, Node.js fs/path APIs

---

### Task 1: Add @inquirer/prompts dependency

**Files:**
- Modify: `package.json`

**Step 1: Install the dependency**

Run:
```bash
npm install @inquirer/prompts
```

**Step 2: Verify installation**

Run:
```bash
npm ls @inquirer/prompts
```

Expected: Shows `@inquirer/prompts@7.x.x` installed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @inquirer/prompts dependency for TUI installer"
```

---

### Task 2: Create API validation module

**Files:**
- Create: `src/cli/api.ts`

**Step 1: Create the api.ts file**

```typescript
#!/usr/bin/env node

export interface ValidationResult {
  valid: boolean;
  workspace?: string;
  error?: string;
}

export async function validateToken(token: string): Promise<ValidationResult> {
  try {
    const authHeader = "Basic " + Buffer.from(`${token}:X`).toString("base64");

    const response = await fetch("https://api.myintervals.com/me/", {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = (await response.json()) as { me?: { company?: string } };
      return {
        valid: true,
        workspace: data.me?.company || "Unknown workspace",
      };
    }

    if (response.status === 401) {
      return { valid: false, error: "Invalid API token" };
    }

    return { valid: false, error: `API error: ${response.status}` };
  } catch (error) {
    if (error instanceof Error && error.message.includes("fetch")) {
      return { valid: false, error: "Network error - could not reach Intervals API" };
    }
    return { valid: false, error: String(error) };
  }
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npm run build
```

Expected: No errors, `dist/cli/api.js` created

**Step 3: Commit**

```bash
git add src/cli/api.ts
git commit -m "feat(cli): add API token validation module"
```

---

### Task 3: Create clients detection module

**Files:**
- Create: `src/cli/clients.ts`

**Step 1: Create the clients.ts file**

```typescript
#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface McpClient {
  id: string;
  name: string;
  configPath: string;
  detected: boolean;
}

interface McpConfig {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

function expandPath(p: string): string {
  if (p.startsWith("~")) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

function getClientPaths(): Array<{ id: string; name: string; path: string }> {
  const platform = os.platform();
  const home = os.homedir();

  const clients: Array<{ id: string; name: string; path: string }> = [];

  // Claude Code (global)
  clients.push({
    id: "claude-code-global",
    name: "Claude Code (global)",
    path: path.join(home, ".claude.json"),
  });

  // Claude Code (project)
  clients.push({
    id: "claude-code-project",
    name: "Claude Code (project)",
    path: path.join(process.cwd(), ".mcp.json"),
  });

  // Claude Desktop
  if (platform === "darwin") {
    clients.push({
      id: "claude-desktop",
      name: "Claude Desktop",
      path: path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
    });
  } else if (platform === "win32") {
    clients.push({
      id: "claude-desktop",
      name: "Claude Desktop",
      path: path.join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json"),
    });
  }

  // Cursor
  if (platform === "darwin" || platform === "linux") {
    clients.push({
      id: "cursor",
      name: "Cursor",
      path: path.join(home, ".cursor", "mcp.json"),
    });
  } else if (platform === "win32") {
    clients.push({
      id: "cursor",
      name: "Cursor",
      path: path.join(home, ".cursor", "mcp.json"),
    });
  }

  // Windsurf
  if (platform === "darwin" || platform === "linux") {
    clients.push({
      id: "windsurf",
      name: "Windsurf",
      path: path.join(home, ".codeium", "windsurf", "mcp_config.json"),
    });
  } else if (platform === "win32") {
    clients.push({
      id: "windsurf",
      name: "Windsurf",
      path: path.join(process.env.APPDATA || "", "Codeium", "windsurf", "mcp_config.json"),
    });
  }

  return clients;
}

export function detectClients(): McpClient[] {
  const clientPaths = getClientPaths();

  return clientPaths.map((client) => {
    const configPath = expandPath(client.path);
    let detected = false;

    // Check if file exists OR if parent directory exists (we can create the file)
    if (fs.existsSync(configPath)) {
      detected = true;
    } else {
      const parentDir = path.dirname(configPath);
      if (fs.existsSync(parentDir)) {
        detected = true;
      }
    }

    return {
      id: client.id,
      name: client.name,
      configPath,
      detected,
    };
  });
}

export function readConfig(configPath: string): McpConfig {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content) as McpConfig;
  } catch {
    throw new Error(`Invalid JSON in ${configPath}`);
  }
}

export function writeConfig(configPath: string, config: McpConfig): void {
  const dir = path.dirname(configPath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create backup if file exists
  if (fs.existsSync(configPath)) {
    const backupPath = configPath + ".bak";
    fs.copyFileSync(configPath, backupPath);
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

export function configureClient(configPath: string, token: string): void {
  const config = readConfig(configPath);

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  config.mcpServers.intervals = {
    command: "npx",
    args: ["-y", "mcp-intervals"],
    env: {
      INTERVALS_API_TOKEN: token,
    },
  };

  writeConfig(configPath, config);
}

export function hasExistingConfig(configPath: string): boolean {
  try {
    const config = readConfig(configPath);
    return config.mcpServers?.intervals !== undefined;
  } catch {
    return false;
  }
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npm run build
```

Expected: No errors, `dist/cli/clients.js` created

**Step 3: Commit**

```bash
git add src/cli/clients.ts
git commit -m "feat(cli): add MCP client detection and configuration module"
```

---

### Task 4: Create main init command

**Files:**
- Create: `src/cli/init.ts`

**Step 1: Create the init.ts file**

```typescript
#!/usr/bin/env node

import { checkbox, confirm, password } from "@inquirer/prompts";
import { detectClients, configureClient, hasExistingConfig, McpClient } from "./clients.js";
import { validateToken } from "./api.js";

async function main() {
  console.log("\n🔍 Detecting MCP clients...\n");

  const clients = detectClients();
  const detectedClients = clients.filter((c) => c.detected);
  const notFoundClients = clients.filter((c) => !c.detected);

  // Show detection results
  console.log("Found installed clients:");
  for (const client of detectedClients) {
    console.log(`  ✓ ${client.name}`);
  }
  for (const client of notFoundClients) {
    console.log(`  ✗ ${client.name} (not found)`);
  }
  console.log();

  if (detectedClients.length === 0) {
    console.log("❌ No MCP clients detected. Please install Claude Code, Claude Desktop, Cursor, or Windsurf first.\n");
    process.exit(1);
  }

  // Let user select which clients to configure
  const selectedIds = await checkbox({
    message: "Select clients to configure:",
    choices: detectedClients.map((client) => {
      const hasExisting = hasExistingConfig(client.configPath);
      return {
        name: `${client.name}  ${shortenPath(client.configPath)}${hasExisting ? " (will overwrite)" : ""}`,
        value: client.id,
        checked: !hasExisting, // Don't pre-check if already configured
      };
    }),
  });

  if (selectedIds.length === 0) {
    console.log("\n❌ No clients selected. Exiting.\n");
    process.exit(0);
  }

  const selectedClients = detectedClients.filter((c) => selectedIds.includes(c.id));

  // Get API token
  const token = await password({
    message: "Enter your Intervals API token:",
    mask: "*",
  });

  if (!token || token.trim() === "") {
    console.log("\n❌ No token provided. Exiting.\n");
    process.exit(1);
  }

  // Validate token
  console.log("\n🔄 Validating token...");
  const validation = await validateToken(token.trim());

  if (!validation.valid) {
    console.log(`\n❌ ${validation.error}`);
    console.log("   You can find your API token at: https://[subdomain].myintervals.com/account/api/\n");

    const continueAnyway = await confirm({
      message: "Save configuration anyway (without validation)?",
      default: false,
    });

    if (!continueAnyway) {
      process.exit(1);
    }
  } else {
    console.log(`✓ Token valid! Connected to workspace "${validation.workspace}"\n`);
  }

  // Confirm
  console.log("Will configure:");
  for (const client of selectedClients) {
    console.log(`  • ${client.name}`);
  }
  console.log();

  const confirmed = await confirm({
    message: "Proceed with configuration?",
    default: true,
  });

  if (!confirmed) {
    console.log("\n❌ Cancelled.\n");
    process.exit(0);
  }

  // Configure each client
  console.log();
  for (const client of selectedClients) {
    try {
      configureClient(client.configPath, token.trim());
      console.log(`✓ Configuration saved to ${shortenPath(client.configPath)}`);
    } catch (error) {
      console.log(`✗ Failed to configure ${client.name}: ${error}`);
    }
  }

  console.log("\n🎉 Done! Restart your MCP clients to use mcp-intervals.\n");
}

function shortenPath(p: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (home && p.startsWith(home)) {
    return "~" + p.slice(home.length);
  }
  return p;
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npm run build
```

Expected: No errors, `dist/cli/init.js` created

**Step 3: Commit**

```bash
git add src/cli/init.ts
git commit -m "feat(cli): add interactive init command"
```

---

### Task 5: Update package.json with bin entry

**Files:**
- Modify: `package.json`

**Step 1: Add the new bin entry**

In `package.json`, update the `bin` field to:

```json
{
  "bin": {
    "mcp-intervals": "dist/index.js",
    "mcp-intervals-init": "dist/cli/init.js"
  }
}
```

Also add `dist/cli` to the `files` array:

```json
{
  "files": [
    "dist"
  ]
}
```

(Already includes `dist`, so no change needed for files)

**Step 2: Verify build includes CLI**

Run:
```bash
npm run build && ls -la dist/cli/
```

Expected: Shows `api.js`, `clients.js`, `init.js`

**Step 3: Test locally**

Run:
```bash
node dist/cli/init.js
```

Expected: Shows TUI installer interface

**Step 4: Commit**

```bash
git add package.json
git commit -m "feat: add mcp-intervals-init binary entry point"
```

---

### Task 6: Add alternative `init` subcommand to main entry

**Files:**
- Modify: `src/index.ts`

**Step 1: Add subcommand detection at the start of index.ts**

Add this at the very beginning of `src/index.ts`, after the shebang and before imports:

```typescript
#!/usr/bin/env node

// Handle CLI subcommands
if (process.argv[2] === "init") {
  import("./cli/init.js");
} else {
  // Original MCP server code below
```

And wrap the existing code in the else branch, ending with:

```typescript
} // end of else block
```

The full file becomes:

```typescript
#!/usr/bin/env node

// Handle CLI subcommands
if (process.argv[2] === "init") {
  import("./cli/init.js");
} else {
  import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
  import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
  import { IntervalsClient } from "./client.js";
  import { registerTools } from "./tools.js";
  import { registerResources } from "./resources.js";

  const API_TOKEN = process.env.INTERVALS_API_TOKEN;

  if (!API_TOKEN) {
    console.error(
      "Error: INTERVALS_API_TOKEN environment variable is required."
    );
    process.exit(1);
  }

  const client = new IntervalsClient(API_TOKEN);

  const server = new McpServer({
    name: "mcp-intervals",
    version: "1.0.0",
  });

  registerTools(server, client);
  registerResources(server, client);

  async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }

  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
```

**Step 2: Verify build and both modes work**

Run:
```bash
npm run build
```

Test init mode:
```bash
node dist/index.js init
```

Expected: Shows TUI installer

Test server mode (will fail without token, that's OK):
```bash
node dist/index.js
```

Expected: Shows "Error: INTERVALS_API_TOKEN environment variable is required."

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: support 'mcp-intervals init' subcommand"
```

---

### Task 7: Update README with installation instructions

**Files:**
- Modify: `README.md`

**Step 1: Add Quick Start section to README**

Add after the initial description:

```markdown
## Quick Start

Run the interactive installer:

```bash
npx mcp-intervals init
```

This will:
1. Detect installed MCP clients (Claude Code, Claude Desktop, Cursor, Windsurf)
2. Ask which clients to configure
3. Prompt for your Intervals API token
4. Validate the token
5. Save the configuration

## Manual Installation

If you prefer manual setup, add to your MCP client config:

```json
{
  "mcpServers": {
    "intervals": {
      "command": "npx",
      "args": ["-y", "mcp-intervals"],
      "env": {
        "INTERVALS_API_TOKEN": "your-token-here"
      }
    }
  }
}
```
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add quick start with npx init command"
```

---

### Task 8: Test end-to-end

**Step 1: Build the project**

Run:
```bash
npm run build
```

**Step 2: Test the init command**

Run:
```bash
node dist/index.js init
```

Verify:
- Shows detected clients
- Can select/deselect with space
- Token input is masked
- Validation works (use invalid token to test error)
- Configuration is saved correctly

**Step 3: Verify config file was created/updated**

Check one of the config files that was selected during the test.

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during e2e testing"
```
