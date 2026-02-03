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
    "Retrieve full details of an Intervals task. Accepts a task URL (e.g. https://<subdomain>.intervalsonline.com/tasks/view/12345) or a numeric local task ID (the ID shown in the Intervals web UI).",
    {
      task: z
        .string()
        .describe(
          "Intervals task URL or numeric local task ID (as shown in the web UI)"
        ),
    },
    async ({ task }) => {
      const localId = parseTaskIdFromUrl(task);
      const data = await client.getTaskByLocalId(localId);
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
    "Update fields on an Intervals task (status, assignee, priority, title, description, due date, owner).",
    {
      taskId: z.number().describe("The local task ID (as shown in the Intervals web UI)"),
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
      summary: z
        .string()
        .optional()
        .describe("New task description/summary (HTML is accepted)"),
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

      const internalId = await client.resolveTaskId(taskId);
      const data = await client.updateTask(internalId, updateData);
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
      taskId: z.number().describe("The local task ID (as shown in the Intervals web UI)"),
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
      const internalId = await client.resolveTaskId(taskId);
      const data = await client.addTaskNote(
        internalId,
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
        .describe("The local task ID (as shown in the Intervals web UI)"),
    },
    async ({ taskId }) => {
      const internalId = await client.resolveTaskId(taskId);
      const data = await client.getTaskNotes(internalId);
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

  // --- add_time_entry ---
  server.tool(
    "add_time_entry",
    "Add a time entry to an Intervals task. Records time worked as billable or unbillable with a specific work type.",
    {
      taskId: z
        .number()
        .describe("The local task ID (as shown in the Intervals web UI)"),
      worktypeid: z
        .number()
        .describe("Work type ID (use intervals://worktypes resource for valid IDs)"),
      date: z
        .string()
        .describe("Date of the time entry in YYYY-MM-DD format"),
      time: z
        .number()
        .describe("Time worked in decimal hours (e.g., 1.5 for 1 hour 30 minutes)"),
      billable: z
        .boolean()
        .describe("Whether the time is billable (true) or unbillable (false)"),
      description: z
        .string()
        .optional()
        .describe("Optional description of work performed"),
    },
    async ({ taskId, worktypeid, date, time, billable, description }) => {
      const internalId = await client.resolveTaskId(taskId);
      const data = await client.addTimeEntry({
        taskid: internalId,
        worktypeid,
        date,
        time,
        billable,
        description,
      });
      return {
        content: [
          { type: "text", text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );

  // --- get_time_entries ---
  server.tool(
    "get_time_entries",
    "Retrieve time entries from Intervals. Can filter by task, person, or date range.",
    {
      taskId: z
        .number()
        .optional()
        .describe("Filter by local task ID (as shown in the Intervals web UI)"),
      datebegin: z
        .string()
        .optional()
        .describe("Start date filter in YYYY-MM-DD format"),
      dateend: z
        .string()
        .optional()
        .describe("End date filter in YYYY-MM-DD format"),
    },
    async ({ taskId, datebegin, dateend }) => {
      let internalTaskId: number | undefined;
      if (taskId) {
        internalTaskId = await client.resolveTaskId(taskId);
      }
      const data = await client.getTimeEntries({
        taskid: internalTaskId,
        datebegin,
        dateend,
      });
      return {
        content: [
          { type: "text", text: JSON.stringify(data, null, 2) },
        ],
      };
    }
  );
}
