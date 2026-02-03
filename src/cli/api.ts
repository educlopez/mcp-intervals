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
