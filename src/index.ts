#!/usr/bin/env node

// Handle CLI subcommands
if (process.argv[2] === "init") {
  import("./cli/init.js");
} else {
  // MCP Server mode
  startServer();
}

async function startServer() {
  const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const { IntervalsClient } = await import("./client.js");
  const { registerTools } = await import("./tools.js");
  const { registerResources } = await import("./resources.js");

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

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
