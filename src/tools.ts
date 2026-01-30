import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IntervalsClient } from "./client.js";
import { parseTaskIdFromUrl } from "./utils.js";

export function registerTools(
  server: McpServer,
  client: IntervalsClient
) {
  // --- get_task ---
  server.tool(
    "get_task",
    "Retrieve full details of an Intervals task. Accepts a task URL (e.g. https://<subdomain>.intervalsonline.com/tasks/view/12345) or a numeric task ID.",
    {
      task: z
        .string()
        .describe(
          "Intervals task URL or numeric task ID"
        ),
    },
    async ({ task }) => {
      const taskId = parseTaskIdFromUrl(task);
      const data = await client.getTask(taskId);
      return {
        content: [
          { type: "text", text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // --- update_task ---
  server.tool(
    "update_task",
    "Update fields on an Intervals task (status, assignee, priority, title, due date, owner).",
    {
      taskId: z.number().describe("The numeric task ID"),
      statusid: z
        .number()
        .optional()
        .describe("New status ID (use intervals://statuses resource for valid IDs)"),
      assigneeid: z
        .number()
        .optional()
        .describe("New assignee person ID"),
      priorityid: z
        .number()
        .optional()
        .describe("New priority ID (use intervals://priorities resource for valid IDs)"),
      title: z.string().optional().describe("New task title"),
      datedue: z
        .string()
        .optional()
        .describe("New due date in YYYY-MM-DD format"),
      ownerid: z
        .number()
        .optional()
        .describe("New owner person ID"),
    },
    async ({ taskId, ...fields }) => {
      // Remove undefined fields
      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No fields provided to update.",
            },
          ],
        };
      }

      const data = await client.updateTask(taskId, updateData);
      return {
        content: [
          { type: "text", text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // --- add_task_note ---
  server.tool(
    "add_task_note",
    "Add a comment/note to an Intervals task.",
    {
      taskId: z.number().describe("The numeric task ID"),
      note: z
        .string()
        .describe("The note content (HTML is accepted)"),
      isPublic: z
        .boolean()
        .default(true)
        .describe(
          "Whether the note is visible to executive users (defaults to true)"
        ),
    },
    async ({ taskId, note, isPublic }) => {
      const data = await client.addTaskNote(
        taskId,
        note,
        isPublic
      );
      return {
        content: [
          { type: "text", text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // --- get_task_notes ---
  server.tool(
    "get_task_notes",
    "Retrieve all comments/notes on an Intervals task.",
    {
      taskId: z
        .number()
        .describe("The numeric task ID"),
    },
    async ({ taskId }) => {
      const data = await client.getTaskNotes(taskId);
      return {
        content: [
          { type: "text", text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // --- get_project ---
  server.tool(
    "get_project",
    "Retrieve details of an Intervals project (name, client, dates, budget, description).",
    {
      projectId: z
        .number()
        .describe("The numeric project ID"),
    },
    async ({ projectId }) => {
      const data = await client.getProject(projectId);
      return {
        content: [
          { type: "text", text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // --- get_milestone ---
  server.tool(
    "get_milestone",
    "Retrieve details of an Intervals milestone (title, due date, progress, description).",
    {
      milestoneId: z
        .number()
        .describe("The numeric milestone ID"),
    },
    async ({ milestoneId }) => {
      const data = await client.getMilestone(milestoneId);
      return {
        content: [
          { type: "text", text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );
}
