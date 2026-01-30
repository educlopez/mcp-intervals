#!/usr/bin/env node

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
