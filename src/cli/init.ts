#!/usr/bin/env node

import * as p from "@clack/prompts";
import pc from "picocolors";
import { detectClients, configureClient, hasExistingConfig } from "./clients.js";
import { validateToken } from "./api.js";
import { searchMultiselect, cancelSymbol } from "./prompts/search-multiselect.js";
import {
  detectShell,
  getProfilePath,
  findExistingToken,
  saveTokenToProfile,
  getReloadCommand,
  getManualInstruction,
  type ShellType,
  type ShellInfo,
} from "./shell.js";

// Logo ASCII art with gradient grays (256-color)
const LOGO_LINES = [
  "██╗███╗   ██╗████████╗███████╗██████╗ ██╗   ██╗ █████╗ ██╗     ███████╗",
  "██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗██║   ██║██╔══██╗██║     ██╔════╝",
  "██║██╔██╗ ██║   ██║   █████╗  ██████╔╝██║   ██║███████║██║     ███████╗",
  "██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══██║██║     ╚════██║",
  "██║██║ ╚████║   ██║   ███████╗██║  ██║ ╚████╔╝ ██║  ██║███████╗███████║",
  "╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚══════╝",
];

// 256-color grays for gradient effect
const GRAYS = [
  "\x1b[38;5;250m", // lighter
  "\x1b[38;5;248m",
  "\x1b[38;5;245m",
  "\x1b[38;5;243m",
  "\x1b[38;5;240m",
  "\x1b[38;5;238m", // darker
];
const RESET = "\x1b[0m";

function showLogo(): void {
  console.log();
  LOGO_LINES.forEach((line, i) => {
    console.log(`${GRAYS[i]}${line}${RESET}`);
  });
}

function shortenPath(fullPath: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (home && fullPath.startsWith(home)) {
    return "~" + fullPath.slice(home.length);
  }
  return fullPath;
}

function maskToken(token: string): string {
  if (token.length <= 6) {
    return "***";
  }
  const start = token.slice(0, 4);
  const end = token.slice(-3);
  return `${start}***${end}`;
}

async function main() {
  showLogo();
  console.log();

  p.intro(pc.bgCyan(pc.black(" intervals ")));

  const spinner = p.spinner();

  // Step 1: Detect shell
  spinner.start("Detecting shell...");
  let shellInfo: ShellInfo = detectShell();
  spinner.stop(
    shellInfo.detected
      ? `Detected ${shellInfo.type} shell`
      : `Could not detect shell, assuming ${shellInfo.type}`
  );

  // If shell not detected, ask user
  if (!shellInfo.detected) {
    console.log();
    const selectedShell = await p.select({
      message: "Which shell do you use?",
      options: [
        { value: "zsh", label: "zsh" },
        { value: "bash", label: "bash" },
        { value: "powershell", label: "PowerShell" },
      ],
    });

    if (p.isCancel(selectedShell)) {
      p.cancel("Installation cancelled");
      process.exit(0);
    }

    shellInfo = {
      type: selectedShell as ShellType,
      profilePath: getProfilePath(selectedShell as ShellType),
      detected: true,
    };
  }

  // Step 2: Check for existing token
  const existingToken = findExistingToken(shellInfo.profilePath, shellInfo.type);
  let token: string | symbol;

  if (existingToken.found && existingToken.value) {
    console.log();
    p.log.info(`Found existing token: ${pc.cyan(existingToken.partial)}`);
    p.log.message(pc.dim(`  in ${shortenPath(shellInfo.profilePath)}`));

    const replaceToken = await p.select({
      message: "What do you want to do?",
      options: [
        { value: "keep", label: "Keep existing token" },
        { value: "replace", label: "Replace with new token" },
      ],
    });

    if (p.isCancel(replaceToken)) {
      p.cancel("Installation cancelled");
      process.exit(0);
    }

    if (replaceToken === "keep") {
      token = existingToken.value;
    } else {
      console.log();
      token = await p.password({
        message: "Enter your new Intervals API token:",
      });
    }
  } else {
    // No existing token, ask for one
    console.log();
    token = await p.password({
      message: "Enter your Intervals API token:",
    });
  }

  if (p.isCancel(token) || !token || token.trim() === "") {
    p.cancel("No token provided");
    process.exit(1);
  }

  const finalToken = token.trim();

  // Step 3: Validate token
  spinner.start("Validating token...");
  const validation = await validateToken(finalToken);

  if (!validation.valid) {
    spinner.stop(pc.red("Token validation failed"));
    p.log.error(validation.error || "Invalid token");
    p.log.message(pc.dim("  Find your API token at: https://[subdomain].myintervals.com/account/api/"));
    console.log();

    const continueAnyway = await p.confirm({
      message: "Save configuration anyway (without validation)?",
      initialValue: false,
    });

    if (p.isCancel(continueAnyway) || !continueAnyway) {
      p.cancel("Installation cancelled");
      process.exit(1);
    }
  } else {
    spinner.stop(`Token valid! Connected to "${validation.workspace}"`);
  }

  // Step 4: Detect MCP clients
  spinner.start("Detecting MCP clients...");
  const clients = detectClients();
  const detectedClients = clients.filter((c) => c.detected);
  const notFoundClients = clients.filter((c) => !c.detected);
  spinner.stop(`${detectedClients.length} clients found`);

  // Show detection results
  console.log();
  p.log.message(pc.bold("Found installed clients:"));
  for (const client of detectedClients) {
    p.log.message(`  ${pc.green("✓")} ${client.name}`);
  }
  for (const client of notFoundClients) {
    p.log.message(`  ${pc.dim("✗")} ${pc.dim(client.name + " (not found)")}`);
  }

  if (detectedClients.length === 0) {
    p.cancel("No MCP clients detected. Install Claude Code, Claude Desktop, Cursor, or Windsurf first.");
    process.exit(1);
  }

  // Step 5: Select clients
  const clientChoices = detectedClients.map((client) => {
    const hasExisting = hasExistingConfig(client.configPath);
    return {
      value: client.id,
      label: client.name,
      hint: shortenPath(client.configPath) + (hasExisting ? " - will update" : ""),
    };
  });

  // Pre-select clients that don't have existing config
  const initialSelected = detectedClients
    .filter((c) => !hasExistingConfig(c.configPath))
    .map((c) => c.id);

  console.log();
  const selectedIds = await searchMultiselect({
    message: "Which clients do you want to configure?",
    items: clientChoices,
    initialSelected: initialSelected.length > 0 ? initialSelected : [detectedClients[0]?.id].filter(Boolean) as string[],
    required: true,
  });

  if (selectedIds === cancelSymbol || (Array.isArray(selectedIds) && selectedIds.length === 0)) {
    p.cancel("Installation cancelled");
    process.exit(0);
  }

  const selectedClients = detectedClients.filter((c) =>
    Array.isArray(selectedIds) && selectedIds.includes(c.id)
  );

  // Step 6: Show summary and confirm
  console.log();
  const summaryLines: string[] = [
    `${pc.bold("Token:")} ${shortenPath(shellInfo.profilePath)}`,
    "",
    pc.bold("MCP clients:"),
    ...selectedClients.map((c) => `  ${c.name}  ${pc.dim(shortenPath(c.configPath))}`),
  ];
  p.note(summaryLines.join("\n"), "Will configure");

  const confirmed = await p.confirm({
    message: "Proceed with configuration?",
    initialValue: true,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel("Installation cancelled");
    process.exit(0);
  }

  // Step 7: Save token to shell profile
  spinner.start("Saving token to shell profile...");
  const tokenResult = saveTokenToProfile(shellInfo.profilePath, shellInfo.type, finalToken);

  if (!tokenResult.success) {
    spinner.stop(pc.red("Failed to save token"));
    console.log();
    p.log.error(`Cannot write to ${shortenPath(shellInfo.profilePath)}`);
    p.log.message("");
    p.log.message(pc.bold("Add this line manually to your shell profile:"));
    p.log.message("");
    p.log.message(`  ${pc.cyan(getManualInstruction(finalToken, shellInfo.type))}`);
    console.log();
  } else {
    spinner.stop(`Token saved to ${shortenPath(shellInfo.profilePath)}`);
  }

  // Step 8: Configure MCP clients
  spinner.start("Configuring MCP clients...");
  const results: { client: string; success: boolean; error?: string }[] = [];

  for (const client of selectedClients) {
    try {
      configureClient(client.configPath);
      results.push({ client: client.name, success: true });
    } catch (error) {
      results.push({
        client: client.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  spinner.stop("Configuration complete");

  // Step 9: Show results
  console.log();
  if (successful.length > 0) {
    const resultLines = successful.map((r) => {
      const client = selectedClients.find((c) => c.name === r.client);
      return `${pc.green("✓")} ${r.client}  ${pc.dim(client ? shortenPath(client.configPath) : "")}`;
    });
    p.note(resultLines.join("\n"), pc.green(`Configured ${successful.length} client${successful.length !== 1 ? "s" : ""}`));
  }

  if (failed.length > 0) {
    console.log();
    p.log.error(pc.red(`Failed to configure ${failed.length} client${failed.length !== 1 ? "s" : ""}:`));
    for (const r of failed) {
      p.log.message(`  ${pc.red("✗")} ${r.client}: ${pc.dim(r.error)}`);
    }
  }

  // Step 10: Show reload instructions
  if (tokenResult.success) {
    console.log();
    const reloadCmd = getReloadCommand(shellInfo.profilePath, shellInfo.type);
    p.note(
      `${pc.bold("To activate the token, run:")}\n\n  ${pc.cyan(reloadCmd)}\n\nOr restart your terminal.`,
      "Next step"
    );
  }

  console.log();
  p.outro(pc.green("Done! Restart your MCP clients to use mcp-intervals."));
}

main().catch((error) => {
  p.log.error(error instanceof Error ? error.message : "Unknown error");
  process.exit(1);
});
