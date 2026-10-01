import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IntervalsClient } from "../client.js";
import { EndpointSpec, registerEndpoints } from "./helpers.js";
import { localTaskId, resolveLocalTask } from "./tasks.js";

const timeFields = {
  worktypeid: z.number().describe("Work type ID (use get_worktypes)"),
  personid: z.number().describe("Person ID (use get_me or get_people)"),
  date: z.string().describe("Date of the work (YYYY-MM-DD)"),
  time: z.number().describe("Hours worked in decimal (e.g. 1.5 for 1h 30m)"),
  billable: z.boolean().describe("Whether the time is billable"),
  projectid: z.number().describe("Project ID to associate the time with"),
  moduleid: z.number().describe("Module ID to associate the time with (use get_project_modules)"),
  description: z.string().describe("Description of the work performed"),
};

const specs: EndpointSpec[] = [
  // --- Timers ---
  {
    name: "get_timers",
    description: "List all active timers for the currently authenticated user.",
    method: "GET",
    path: "/timer",
    schema: {},
  },
  {
    name: "start_timer",
    description:
      "Start a timer for a person, optionally on a task. Use get_me to get the current user's person ID.",
    method: "POST",
    path: "/timer",
    schema: {
      personid: z.number().describe("Person ID to start the timer for (use get_me or get_people)"),
      taskId: localTaskId.optional(),
    },
    prepare: resolveLocalTask("taskId", "taskid"),
  },
  {
    name: "stop_timer",
    description: "Stop a running timer by its timer ID (use get_timers).",
    method: "PUT",
    path: "/timer",
    idParam: "timerId",
    schema: { timerId: z.number().describe("Timer ID to stop") },
    fixedBody: { stop: true },
  },

  // --- Time entries (add_time_entry / get_time_entries live in core) ---
  {
    name: "update_time_entry",
    description:
      "Update an existing time entry. Only provide fields you want to change.",
    method: "PUT",
    path: "/time",
    idParam: "timeEntryId",
    schema: {
      timeEntryId: z.number().describe("Time entry ID to update"),
      worktypeid: timeFields.worktypeid.optional(),
      personid: timeFields.personid.optional(),
      date: timeFields.date.optional(),
      time: timeFields.time.optional(),
      billable: timeFields.billable.optional(),
      projectid: timeFields.projectid.optional(),
      moduleid: timeFields.moduleid.optional(),
      taskId: localTaskId.optional(),
      description: timeFields.description.optional(),
    },
    prepare: resolveLocalTask("taskId", "taskid"),
  },
  {
    name: "delete_time_entry",
    description:
      "Delete a time entry by ID. Permanently deletes; cannot be undone.",
    method: "DELETE",
    path: "/time",
    idParam: "timeEntryId",
    schema: { timeEntryId: z.number().describe("Time entry ID to delete") },
  },

  // --- Work types ---
  {
    name: "get_worktypes",
    description: "List all available work types with their IDs. Use these IDs when adding time entries.",
    method: "GET",
    path: "/worktype",
    schema: {},
  },

  // --- Expenses ---
  {
    name: "get_expenses",
    description: "List expense entries, optionally filtered by project or date range.",
    method: "GET",
    path: "/expense",
    schema: {
      projectid: z.number().optional().describe("Filter by project ID"),
      datebegin: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      dateend: z.string().optional().describe("End date (YYYY-MM-DD)"),
    },
  },
  {
    name: "create_expense",
    description:
      "Create an expense entry for a project. Requires project, date, expense amount, and fee amount.",
    method: "POST",
    path: "/expense",
    schema: {
      projectid: z.number().describe("Project ID (use get_projects)"),
      date: z.string().describe("Expense date (YYYY-MM-DD)"),
      expense: z.number().describe("Expense amount"),
      fee: z.number().describe("Fee amount"),
      personid: z.number().optional().describe("Person ID (defaults to the authenticated user)"),
      note: z.string().optional().describe("Expense note (max 255 characters)"),
    },
  },
];

export function registerTimeTools(server: McpServer, client: IntervalsClient) {
  registerEndpoints(server, client, specs);
}
