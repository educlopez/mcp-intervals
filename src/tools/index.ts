import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IntervalsClient } from "../client.js";
import { registerCoreTools } from "./core.js";
import { registerTaskTools } from "./tasks.js";
import { registerTimeTools } from "./time.js";
import { registerProjectTools } from "./projects.js";
import { registerPeopleTools } from "./people.js";
import { registerBillingTools } from "./billing.js";
import { registerDocumentTools } from "./documents.js";

export function registerTools(server: McpServer, client: IntervalsClient) {
  registerCoreTools(server, client);
  registerTaskTools(server, client);
  registerTimeTools(server, client);
  registerProjectTools(server, client);
  registerPeopleTools(server, client);
  registerBillingTools(server, client);
  registerDocumentTools(server, client);
}
