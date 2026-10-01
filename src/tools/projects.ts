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

const projectFields = {
  name: z.string().describe("Project name (max 255 characters)"),
  datestart: z.string().describe("Project start date (YYYY-MM-DD)"),
  billable: z.boolean().describe("Whether the project is billable"),
  active: z.boolean().describe("Whether the project is active"),
  clientid: z.number().describe("Client ID (use get_clients)"),
  managerid: z.number().describe("Person ID of the project manager (use get_people)"),
  description: z.string().describe("Project description"),
  dateend: z.string().describe("Project end date (YYYY-MM-DD)"),
  budget: z.number().describe("Budget amount"),
  alert_percent: z.number().describe("Budget alert threshold percentage"),
};

const milestoneFields = {
  projectid: z.number().describe("Project ID (use get_projects)"),
  ownerid: idOrList.describe("Person ID of the milestone owner, or comma-delimited list of IDs"),
  title: z.string().describe("Milestone title (max 255 characters)"),
  datedue: z.string().describe("Due date (YYYY-MM-DD)"),
  complete: z.boolean().describe("Whether the milestone is complete"),
  description: z.string().describe("Milestone description"),
};

const requestFields = {
  personid: z.number().describe("Person ID submitting the request (use get_people)"),
  priorityid: z.number().describe("Priority ID (use get_task_priorities)"),
  title: z.string().describe("Request title (max 255 characters)"),
  projectid: z.number().describe("Project ID to associate with (use get_projects)"),
  datedue: z.string().describe("Due date (YYYY-MM-DD)"),
  description: z.string().describe("Request description (HTML supported)"),
};

const active = z.boolean().optional().describe("Filter by active state");

const specs: EndpointSpec[] = [
  // --- Projects (get_project lives in core) ---
  {
    name: "get_projects",
    description: "List projects, optionally filtered by client or active state.",
    method: "GET",
    path: "/project",
    schema: {
      clientid: z.number().optional().describe("Filter by client ID"),
      active,
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "create_project",
    description: "Create a new project. Requires name, start date, billable flag, and active flag.",
    method: "POST",
    path: "/project",
    schema: {
      name: projectFields.name,
      datestart: projectFields.datestart,
      billable: projectFields.billable,
      active: projectFields.active,
      clientid: projectFields.clientid.optional(),
      managerid: projectFields.managerid.optional(),
      description: projectFields.description.optional(),
      dateend: projectFields.dateend.optional(),
      budget: projectFields.budget.optional(),
      alert_percent: projectFields.alert_percent.optional(),
    },
  },
  {
    name: "update_project",
    description: "Update an existing project. Only provide fields you want to change.",
    method: "PUT",
    path: "/project",
    idParam: "projectId",
    schema: {
      projectId: z.number().describe("Project ID to update"),
      name: projectFields.name.optional(),
      datestart: projectFields.datestart.optional(),
      billable: projectFields.billable.optional(),
      active: projectFields.active.optional(),
      clientid: projectFields.clientid.optional(),
      managerid: projectFields.managerid.optional(),
      description: projectFields.description.optional(),
      dateend: projectFields.dateend.optional(),
      budget: projectFields.budget.optional(),
      alert_percent: projectFields.alert_percent.optional(),
    },
  },

  // --- Milestones (get_milestone lives in core) ---
  {
    name: "get_milestones",
    description: "List milestones, optionally filtered by project.",
    method: "GET",
    path: "/milestone",
    schema: {
      projectid: z.number().optional().describe("Filter by project ID"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "create_milestone",
    description:
      "Create a milestone within a project. Requires project, owner, title, due date, and complete status.",
    method: "POST",
    path: "/milestone",
    schema: {
      projectid: milestoneFields.projectid,
      ownerid: milestoneFields.ownerid,
      title: milestoneFields.title,
      datedue: milestoneFields.datedue,
      complete: milestoneFields.complete,
      description: milestoneFields.description.optional(),
    },
  },
  {
    name: "update_milestone",
    description: "Update an existing milestone. Only provide fields you want to change.",
    method: "PUT",
    path: "/milestone",
    idParam: "milestoneId",
    schema: {
      milestoneId: z.number().describe("Milestone ID to update"),
      projectid: milestoneFields.projectid.optional(),
      ownerid: milestoneFields.ownerid.optional(),
      title: milestoneFields.title.optional(),
      datedue: milestoneFields.datedue.optional(),
      complete: milestoneFields.complete.optional(),
      description: milestoneFields.description.optional(),
    },
  },

  // --- Milestone notes ---
  {
    name: "get_milestone_notes",
    description: "List notes on milestones.",
    method: "GET",
    path: "/milestonenote",
    schema: {
      milestoneid: z.number().optional().describe("Filter by milestone ID"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "create_milestone_note",
    description: "Add a note to a milestone.",
    method: "POST",
    path: "/milestonenote",
    schema: {
      milestoneid: z.number().describe("Milestone ID (use get_milestones)"),
      note: z.string().describe("Note body (HTML supported)"),
      public: z.boolean().describe("Whether the note is publicly visible"),
    },
  },
  {
    name: "update_milestone_note",
    description: "Update a milestone note (Administrator only). Only provide fields you want to change.",
    method: "PUT",
    path: "/milestonenote",
    idParam: "milestoneNoteId",
    schema: {
      milestoneNoteId: z.number().describe("Milestone note ID to update"),
      milestoneid: z.number().optional().describe("Milestone ID"),
      note: z.string().optional().describe("Note body (HTML supported)"),
      public: z.boolean().optional().describe("Whether the note is publicly visible"),
    },
  },
  {
    name: "delete_milestone_note",
    description:
      "Delete a milestone note by ID (Administrator only). Permanently deletes; cannot be undone.",
    method: "DELETE",
    path: "/milestonenote",
    idParam: "milestoneNoteId",
    schema: { milestoneNoteId: z.number().describe("Milestone note ID to delete") },
  },

  // --- Project notes ---
  {
    name: "get_project_notes",
    description: "List project notes.",
    method: "GET",
    path: "/projectnote",
    schema: {
      projectid: z.number().optional().describe("Filter by project ID"),
      clientid: z.number().optional().describe("Filter by client ID"),
      authorid: z.number().optional().describe("Filter by author person ID"),
      search: z.string().optional().describe("Search text"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "get_project_note",
    description: "Get a single project note by ID.",
    method: "GET",
    path: "/projectnote",
    idParam: "projectNoteId",
    schema: { projectNoteId: z.number().describe("Project note ID") },
  },
  {
    name: "create_project_note",
    description: "Create a note on a project. The project must be active.",
    method: "POST",
    path: "/projectnote",
    schema: {
      projectid: z.number().describe("Project ID (use get_projects)"),
      title: z.string().describe("Note title (max 255 characters)"),
      note: z.string().describe("Note body (HTML supported)"),
      secure: z.boolean().describe("Whether the note is secure (restricted visibility)"),
    },
  },
  {
    name: "update_project_note",
    description: "Update a project note. Only provide fields you want to change.",
    method: "PUT",
    path: "/projectnote",
    idParam: "projectNoteId",
    schema: {
      projectNoteId: z.number().describe("Project note ID to update"),
      projectid: z.number().optional().describe("Project ID"),
      title: z.string().optional().describe("Note title (max 255 characters)"),
      note: z.string().optional().describe("Note body (HTML supported)"),
      secure: z.boolean().optional().describe("Whether the note is secure (restricted visibility)"),
    },
  },
  {
    name: "delete_project_note",
    description:
      "Delete a project note by ID. Permanently deletes; cannot be undone.",
    method: "DELETE",
    path: "/projectnote",
    idParam: "projectNoteId",
    schema: { projectNoteId: z.number().describe("Project note ID to delete") },
  },

  // --- Project team ---
  {
    name: "get_project_team",
    description: "List team members on a project.",
    method: "GET",
    path: "/projectteam",
    schema: { projectid: z.number().describe("Project ID (use get_projects)") },
  },
  {
    name: "add_project_team_member",
    description: "Add a person to a project team (Administrator only).",
    method: "POST",
    path: "/projectteam",
    schema: {
      projectid: z.number().describe("Project ID (use get_projects)"),
      personid: z.number().describe("Person ID to add (use get_people)"),
      securenotes: z.boolean().optional().describe("Whether the person can access secure project notes"),
    },
  },
  {
    name: "remove_project_team_member",
    description: "Remove a person from a project team (Administrator only).",
    method: "DELETE",
    path: "/projectteam",
    schema: {
      projectid: z.number().describe("Project ID (use get_projects)"),
      personid: z.number().describe("Person ID to remove"),
    },
  },

  // --- Project modules ---
  {
    name: "get_project_modules",
    description: "List modules assigned to projects. Module IDs are needed when creating tasks.",
    method: "GET",
    path: "/projectmodule",
    schema: {
      projectid: z.number().optional().describe("Filter by project ID"),
      active,
      personid: z.number().optional().describe("Filter by person ID"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "add_project_module",
    description:
      "Add a module to a project. Provide moduleid to use a default module, or module (name) to create a custom one.",
    method: "POST",
    path: "/projectmodule",
    schema: {
      projectid: z.number().describe("Project ID (use get_projects)"),
      active: z.boolean().describe("Whether the module is active on this project"),
      moduleid: z.number().optional().describe("Default module ID (required for a default module; use get_modules)"),
      module: z.string().optional().describe("Custom module name (required for a custom module, max 155 characters)"),
      description: z.string().optional().describe("Module description"),
    },
  },
  {
    name: "update_project_module",
    description: "Update a project module assignment.",
    method: "PUT",
    path: "/projectmodule",
    idParam: "projectModuleId",
    schema: {
      projectModuleId: z.number().describe("Project module ID to update"),
      active: z.boolean().describe("Whether the module is active on this project"),
      module: z.string().optional().describe("Updated module name (max 155 characters)"),
      description: z.string().optional().describe("Module description"),
    },
  },
  {
    name: "remove_project_module",
    description: "Remove a module from a project.",
    method: "DELETE",
    path: "/projectmodule",
    idParam: "projectModuleId",
    schema: { projectModuleId: z.number().describe("Project module ID to delete") },
  },

  // --- Project work types ---
  {
    name: "get_project_worktypes",
    description: "List work types assigned to projects.",
    method: "GET",
    path: "/projectworktype",
    schema: {
      projectid: z.number().optional().describe("Filter by project ID"),
      active,
      personid: z.number().optional().describe("Filter by person ID"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "add_project_worktype",
    description:
      "Add a work type to a project. Provide worktypeid for a default work type, or worktype (name) + hourlyrate for a custom one.",
    method: "POST",
    path: "/projectworktype",
    schema: {
      projectid: z.number().describe("Project ID (use get_projects)"),
      active: z.boolean().describe("Whether the work type is active on this project"),
      worktypeid: z.number().optional().describe("Default work type ID (use get_worktypes)"),
      worktype: z.string().optional().describe("Custom work type name (max 155 characters)"),
      hourlyrate: z.number().optional().describe("Hourly rate (required for a custom work type)"),
      esttime: z.number().optional().describe("Estimated hours"),
    },
  },
  {
    name: "update_project_worktype",
    description: "Update a project work type assignment.",
    method: "PUT",
    path: "/projectworktype",
    idParam: "projectWorktypeId",
    schema: {
      projectWorktypeId: z.number().describe("Project work type ID to update"),
      active: z.boolean().optional().describe("Whether the work type is active on this project"),
      esttime: z.number().optional().describe("Estimated hours"),
    },
  },
  {
    name: "remove_project_worktype",
    description: "Remove a work type from a project.",
    method: "DELETE",
    path: "/projectworktype",
    idParam: "projectWorktypeId",
    schema: { projectWorktypeId: z.number().describe("Project work type ID to delete") },
  },

  // --- Project labels ---
  {
    name: "get_project_labels",
    description: "List project labels (used to categorize and color-code projects).",
    method: "GET",
    path: "/projectlabel",
    schema: { active, limit: limitParam, offset: offsetParam },
  },
  {
    name: "get_project_label",
    description: "Get a single project label by ID.",
    method: "GET",
    path: "/projectlabel",
    idParam: "projectLabelId",
    schema: { projectLabelId: z.number().describe("Project label ID") },
  },
  {
    name: "create_project_label",
    description: "Create a project label.",
    method: "POST",
    path: "/projectlabel",
    schema: {
      name: z.string().describe("Label name (max 55 characters)"),
      color: z.string().describe("6-character hex color (e.g. FF5733)"),
      priority: z.number().describe("Sort order (higher value = higher priority)"),
      active: z.boolean().describe("Whether the label is active"),
    },
  },
  {
    name: "update_project_label",
    description: "Update a project label. Only provide fields you want to change.",
    method: "PUT",
    path: "/projectlabel",
    idParam: "projectLabelId",
    schema: {
      projectLabelId: z.number().describe("Project label ID to update"),
      name: z.string().optional().describe("Label name (max 55 characters)"),
      color: z.string().optional().describe("6-character hex color (e.g. FF5733)"),
      priority: z.number().optional().describe("Sort order (higher value = higher priority)"),
      active: z.boolean().optional().describe("Whether the label is active"),
    },
  },

  // --- Default modules ---
  {
    name: "get_modules",
    description: "List all default modules. Module IDs are required when creating tasks and time entries.",
    method: "GET",
    path: "/module",
    schema: { active, limit: limitParam, offset: offsetParam },
  },
  {
    name: "get_module",
    description: "Get a single default module by ID.",
    method: "GET",
    path: "/module",
    idParam: "moduleId",
    schema: { moduleId: z.number().describe("Module ID") },
  },
  {
    name: "create_module",
    description: "Create a default module.",
    method: "POST",
    path: "/module",
    schema: {
      name: z.string().describe("Module name (max 155 characters)"),
      description: z.string().optional().describe("Module description (max 155 characters)"),
      active: z.boolean().optional().describe("Whether the module is active"),
    },
  },
  {
    name: "update_module",
    description: "Update a default module. Only provide fields you want to change.",
    method: "PUT",
    path: "/module",
    idParam: "moduleId",
    schema: {
      moduleId: z.number().describe("Module ID to update"),
      name: z.string().optional().describe("Module name (max 155 characters)"),
      description: z.string().optional().describe("Module description (max 155 characters)"),
      active: z.boolean().optional().describe("Whether the module is active"),
    },
  },

  // --- Requests ---
  {
    name: "get_requests",
    description: "List work requests, optionally filtered by priority, person, or project.",
    method: "GET",
    path: "/request",
    schema: {
      priorityid: z.number().optional().describe("Filter by priority ID"),
      personid: z.number().optional().describe("Filter by person ID"),
      projectid: z.number().optional().describe("Filter by project ID"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "get_request",
    description: "Get full details of a single request by ID.",
    method: "GET",
    path: "/request",
    idParam: "requestId",
    schema: { requestId: z.number().describe("Request ID") },
  },
  {
    name: "create_request",
    description: "Create a work request.",
    method: "POST",
    path: "/request",
    schema: {
      personid: requestFields.personid,
      priorityid: requestFields.priorityid,
      title: requestFields.title,
      projectid: requestFields.projectid.optional(),
      datedue: requestFields.datedue.optional(),
      description: requestFields.description.optional(),
    },
  },
  {
    name: "update_request",
    description: "Update a request. Only provide fields you want to change.",
    method: "PUT",
    path: "/request",
    idParam: "requestId",
    schema: {
      requestId: z.number().describe("Request ID to update"),
      personid: requestFields.personid.optional(),
      priorityid: requestFields.priorityid.optional(),
      title: requestFields.title.optional(),
      projectid: requestFields.projectid.optional(),
      datedue: requestFields.datedue.optional(),
      description: requestFields.description.optional(),
    },
  },
  {
    name: "delete_request",
    description:
      "Delete a request by ID. Permanently deletes; cannot be undone.",
    method: "DELETE",
    path: "/request",
    idParam: "requestId",
    schema: { requestId: z.number().describe("Request ID to delete") },
  },
];

export function registerProjectTools(server: McpServer, client: IntervalsClient) {
  registerEndpoints(server, client, specs);
}
