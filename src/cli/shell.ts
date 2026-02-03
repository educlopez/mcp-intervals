import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export type ShellType = "zsh" | "bash" | "powershell";

export interface ShellInfo {
  type: ShellType;
  profilePath: string;
  detected: boolean;
}

export interface ExistingToken {
  found: boolean;
  value?: string;
  partial?: string; // e.g., "7ni6***chj"
  lineNumber?: number;
}

const TOKEN_VAR_NAME = "INTERVALS_API_TOKEN";

/**
 * Detect the user's shell and return profile path
 */
export function detectShell(): ShellInfo {
  const platform = os.platform();
  const home = os.homedir();

  if (platform === "win32") {
    // Windows: assume PowerShell
    const profilePath = process.env.USERPROFILE
      ? path.join(
          process.env.USERPROFILE,
          "Documents",
          "PowerShell",
          "Microsoft.PowerShell_profile.ps1"
        )
      : path.join(home, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1");

    return {
      type: "powershell",
      profilePath,
      detected: true,
    };
  }

  // macOS/Linux: check $SHELL
  const shellEnv = process.env.SHELL || "";

  if (shellEnv.endsWith("zsh")) {
    return {
      type: "zsh",
      profilePath: path.join(home, ".zshrc"),
      detected: true,
    };
  }

  if (shellEnv.endsWith("bash")) {
    // On macOS, prefer .bash_profile for login shells
    const bashProfile = path.join(home, ".bash_profile");
    const bashrc = path.join(home, ".bashrc");

    if (platform === "darwin" && fs.existsSync(bashProfile)) {
      return {
        type: "bash",
        profilePath: bashProfile,
        detected: true,
      };
    }

    return {
      type: "bash",
      profilePath: bashrc,
      detected: true,
    };
  }

  // Default to zsh on macOS, bash on Linux
  if (platform === "darwin") {
    return {
      type: "zsh",
      profilePath: path.join(home, ".zshrc"),
      detected: false,
    };
  }

  return {
    type: "bash",
    profilePath: path.join(home, ".bashrc"),
    detected: false,
  };
}

/**
 * Get profile path for a specific shell type
 */
export function getProfilePath(shellType: ShellType): string {
  const platform = os.platform();
  const home = os.homedir();

  switch (shellType) {
    case "zsh":
      return path.join(home, ".zshrc");
    case "bash":
      if (platform === "darwin") {
        const bashProfile = path.join(home, ".bash_profile");
        if (fs.existsSync(bashProfile)) {
          return bashProfile;
        }
      }
      return path.join(home, ".bashrc");
    case "powershell":
      return process.env.USERPROFILE
        ? path.join(
            process.env.USERPROFILE,
            "Documents",
            "PowerShell",
            "Microsoft.PowerShell_profile.ps1"
          )
        : path.join(home, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1");
  }
}

/**
 * Create partial token for display (e.g., "7ni6***chj")
 */
function maskToken(token: string): string {
  if (token.length <= 6) {
    return "***";
  }
  const start = token.slice(0, 4);
  const end = token.slice(-3);
  return `${start}***${end}`;
}

/**
 * Check if token already exists in shell profile
 */
export function findExistingToken(profilePath: string, shellType: ShellType): ExistingToken {
  if (!fs.existsSync(profilePath)) {
    return { found: false };
  }

  const content = fs.readFileSync(profilePath, "utf-8");
  const lines = content.split("\n");

  // Pattern depends on shell type
  const pattern =
    shellType === "powershell"
      ? /\$env:INTERVALS_API_TOKEN\s*=\s*["']([^"']+)["']/
      : /export\s+INTERVALS_API_TOKEN\s*=\s*["']?([^"'\s]+)["']?/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(pattern);
    if (match) {
      const value = match[1];
      return {
        found: true,
        value,
        partial: maskToken(value),
        lineNumber: i + 1,
      };
    }
  }

  return { found: false };
}

/**
 * Format the export line for the given shell
 */
function formatExportLine(token: string, shellType: ShellType): string {
  if (shellType === "powershell") {
    return `$env:${TOKEN_VAR_NAME} = "${token}"`;
  }
  return `export ${TOKEN_VAR_NAME}="${token}"`;
}

/**
 * Save token to shell profile
 */
export function saveTokenToProfile(
  profilePath: string,
  shellType: ShellType,
  token: string
): { success: boolean; error?: string } {
  try {
    const dir = path.dirname(profilePath);

    // Create directory if it doesn't exist (for PowerShell profile)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const exportLine = formatExportLine(token, shellType);
    const existingToken = findExistingToken(profilePath, shellType);

    if (!fs.existsSync(profilePath)) {
      // Create new file
      fs.writeFileSync(profilePath, exportLine + "\n", { mode: 0o644 });
      return { success: true };
    }

    let content = fs.readFileSync(profilePath, "utf-8");

    if (existingToken.found) {
      // Replace existing line
      const pattern =
        shellType === "powershell"
          ? /\$env:INTERVALS_API_TOKEN\s*=\s*["'][^"']*["']/g
          : /export\s+INTERVALS_API_TOKEN\s*=\s*["']?[^"'\s]*["']?/g;

      content = content.replace(pattern, exportLine);
    } else {
      // Append to file
      const newline = content.endsWith("\n") ? "" : "\n";
      content = content + newline + "\n# Intervals API token\n" + exportLine + "\n";
    }

    fs.writeFileSync(profilePath, content, { mode: 0o644 });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get the command to reload the shell profile
 */
export function getReloadCommand(profilePath: string, shellType: ShellType): string {
  if (shellType === "powershell") {
    return ". $PROFILE";
  }
  // Use ~ notation for display
  const home = os.homedir();
  const displayPath = profilePath.startsWith(home)
    ? "~" + profilePath.slice(home.length)
    : profilePath;
  return `source ${displayPath}`;
}

/**
 * Get manual instruction line for when auto-save fails
 */
export function getManualInstruction(token: string, shellType: ShellType): string {
  return formatExportLine(token, shellType);
}
