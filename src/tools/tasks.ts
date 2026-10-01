import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IntervalsClient } from "../client.js";
import {
  EndpointSpec,
  idOrList,
  limitParam,
  offsetParam,
  registerEndpoints,
} from "./helpers.js";

const localTaskId = z
  .number()
  .describe("The local task ID (as shown in the Intervals web UI)");

// Resolve the local task ID shown in the UI to the internal API ID.
const resolveLocalTask =
  (field: string, target: string) =>
  async (args: Record<string, unknown>, client: IntervalsClient) => {
    const { [field]: localId, ...rest } = args;
    // localId must be required in the tool schema; without it the request would
    // hit a URL with no task id.
    if (localId === undefined) return rest;
    return { ...rest, [target]: await client.resolveTaskId(Number(localId)) };
  };

const taskFields = {
  projectid: z.number().describe("Project ID the task belongs to (use get_projects)"),
  moduleid: z.number().describe("Module ID the task belongs to (use get_project_modules)"),
  title: z.string().describe("Task title"),
  statusid: z.number().describe("Status ID (use get_task_statuses)"),
  priorityid: z.number().describe("Priority ID (use get_task_priorities)"),
  ownerid: idOrList.describe(
    "Person ID of the task owner, or comma-delimited list of IDs (e.g. '22,334') (use get_people)"
  ),
  dateopen: z.string().describe("Date the task was opened (YYYY-MM-DD)"),
  milestoneid: z.number().describe("Milestone ID to associate the task with (use get_milestones)"),
  summary: z.string().describe("Task description/summary (HTML accepted)"),
  assigneeid: idOrList.describe("Person ID to assign the task to, or comma-delimited list of IDs"),
  followerid: idOrList.describe("Person ID to add as a follower, or comma-delimited list of IDs"),
  estimate: z.number().describe("Estimated hours to complete"),
  datedue: z.string().describe("Due date (YYYY-MM-DD)"),
  dateclosed: z.string().describe("Date closed (YYYY-MM-DD)"),
};

const filterFields = {
  personid: z.number().describe("Person ID to save the filter for"),
  title: z.string().describe("Filter name (max 255 characters)"),
  params: z.string().describe("Serialized filter parameters string"),
  date: z.string().describe("Filter date"),
};

const specs: EndpointSpec[] = [
  // --- Tasks ---
  {
    name: "get_tasks",
    description:
      "List tasks with optional filters. Filter by project, module, milestone, assignee, status, or priority. Each ID filter accepts one ID or a comma-delimited list. To filter open vs. closed tasks use statusid (IDs from get_task_statuses).",
    method: "GET",
    path: "/task",
    schema: {
      projectid: idOrList.optional().describe("Project ID(s)"),
      moduleid: idOrList.optional().describe("Module ID(s)"),
      milestoneid: idOrList.optional().describe("Milestone ID(s)"),
      assigneeid: idOrList.optional().describe("Assignee person ID(s)"),
      statusid: idOrList.optional().describe("Status ID(s) (use get_task_statuses)"),
      priorityid: idOrList.optional().describe("Priority ID(s) (use get_task_priorities)"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "create_task",
    description:
      "Create a new task in a project. Requires project, module, title, status, priority, owner, and open date. Emails are not sent unless send_notifications is true.",
    method: "POST",
    path: "/task",
    schema: {
      projectid: taskFields.projectid,
      moduleid: taskFields.moduleid,
      title: taskFields.title,
      statusid: taskFields.statusid,
      priorityid: taskFields.priorityid,
      ownerid: taskFields.ownerid,
      dateopen: taskFields.dateopen,
      milestoneid: taskFields.milestoneid.optional(),
      summary: taskFields.summary.optional(),
      assigneeid: taskFields.assigneeid.optional(),
      followerid: taskFields.followerid.optional(),
      estimate: taskFields.estimate.optional(),
      datedue: taskFields.datedue.optional(),
      dateclosed: taskFields.dateclosed.optional(),
    },
  },
  {
    name: "delete_task",
    description:
      "Delete a task by its local ID (as shown in the Intervals web UI). Permanently deletes; cannot be undone.",
    method: "DELETE",
    path: "/task",
    idParam: "id",
    schema: { taskId: localTaskId },
    prepare: resolveLocalTask("taskId", "id"),
  },

  // --- Task notes (get_task_notes / add_task_note live in core) ---
  {
    name: "update_task_note",
    description:
      "Update a task note by note ID (Administrator only). Only provide fields you want to change.",
    method: "PUT",
    path: "/tasknote",
    idParam: "taskNoteId",
    schema: {
      taskNoteId: z.number().describe("Task note ID to update"),
      note: z.string().optional().describe("Note body (HTML supported)"),
      public: z.boolean().optional().describe("Whether the note is publicly visible"),
    },
  },
  {
    name: "delete_task_note",
    description:
      "Delete a task note by note ID (Administrator only). Permanently deletes; cannot be undone.",
    method: "DELETE",
    path: "/tasknote",
    idParam: "taskNoteId",
    schema: { taskNoteId: z.number().describe("Task note ID to delete") },
  },

  // --- Saved task list filters ---
  {
    name: "get_task_filters",
    description: "List saved task list filters.",
    method: "GET",
    path: "/tasklistfilter",
    schema: { limit: limitParam, offset: offsetParam },
  },
  {
    name: "get_task_filter",
    description: "Get a single saved task list filter by ID.",
    method: "GET",
    path: "/tasklistfilter",
    idParam: "taskFilterId",
    schema: { taskFilterId: z.number().describe("Task filter ID") },
  },
  {
    name: "create_task_filter",
    description: "Save a new task list filter.",
    method: "POST",
    path: "/tasklistfilter",
    schema: {
      ...filterFields,
      subfilterid: z.number().optional().describe("Sub-filter ID"),
      shared: z.boolean().optional().describe("Whether the filter is shared"),
      scheduled: z.boolean().optional().describe("Whether the filter is scheduled"),
    },
  },
  {
    name: "update_task_filter",
    description: "Update a saved task list filter. Only provide fields you want to change.",
    method: "PUT",
    path: "/tasklistfilter",
    idParam: "taskFilterId",
    schema: {
      taskFilterId: z.number().describe("Task filter ID to update"),
      personid: filterFields.personid.optional(),
      title: filterFields.title.optional(),
      params: filterFields.params.optional(),
      date: filterFields.date.optional(),
      subfilterid: z.number().optional().describe("Sub-filter ID"),
      shared: z.boolean().optional().describe("Whether the filter is shared"),
      scheduled: z.boolean().optional().describe("Whether the filter is scheduled"),
    },
  },

  // --- Lookups ---
  {
    name: "get_task_statuses",
    description: "List all task statuses with their IDs. Use these IDs when creating, updating or filtering tasks.",
    method: "GET",
    path: "/taskstatus",
    schema: {},
  },
  {
    name: "get_task_priorities",
    description: "List all task priorities with their IDs. Use these IDs when creating, updating or filtering tasks.",
    method: "GET",
    path: "/taskpriority",
    schema: {},
  },
];

export function registerTaskTools(server: McpServer, client: IntervalsClient) {
  registerEndpoints(server, client, specs);
}

export { localTaskId, resolveLocalTask };
