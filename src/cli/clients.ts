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
    let detected = false;

    // Check if file exists OR if parent directory exists (we can create the file)
    if (fs.existsSync(client.path)) {
      detected = true;
    } else {
      const parentDir = path.dirname(client.path);
      if (fs.existsSync(parentDir)) {
        detected = true;
      }
    }

    return {
      id: client.id,
      name: client.name,
      configPath: client.path,
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

export function configureClient(configPath: string): void {
  const config = readConfig(configPath);

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Don't include token in config - it's stored in shell profile
  config.mcpServers.intervals = {
    command: "npx",
    args: ["-y", "mcp-intervals"],
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
