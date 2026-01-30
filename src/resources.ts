import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IntervalsClient } from "./client.js";

export function registerResources(
  server: McpServer,
  client: IntervalsClient
) {
  // --- Task Statuses ---
  server.resource(
    "task-statuses",
    "intervals://statuses",
    {
      description:
        "List of all task statuses with their IDs. Use these IDs when updating a task's status.",
      mimeType: "application/json",
    },
    async () => {
      const data = await client.getTaskStatuses();
      return {
        contents: [
          {
            uri: "intervals://statuses",
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  // --- Task Priorities ---
  server.resource(
    "task-priorities",
    "intervals://priorities",
    {
      description:
        "List of all task priorities with their IDs. Use these IDs when updating a task's priority.",
      mimeType: "application/json",
    },
    async () => {
      const data = await client.getTaskPriorities();
      return {
        contents: [
          {
            uri: "intervals://priorities",
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );
}
