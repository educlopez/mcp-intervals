import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  IntervalsClient,
  NotificationOptions,
  QueryParams,
} from "../client.js";

// --- Shared result + schema helpers ---

export function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

/** Person/owner/assignee style fields accept one ID or a comma-delimited list. */
export const idOrList = z.union([z.number(), z.string()]);

export const limitParam = z
  .number()
  .optional()
  .describe("Maximum number of results to return");

export const offsetParam = z
  .number()
  .optional()
  .describe("Number of results to skip (pagination)");

/**
 * Notification controls appended to every write tool (POST/PUT/DELETE).
 * Both default to off: no header is sent, so the API sends no emails.
 */
export const notificationShape = {
  send_notifications: z
    .boolean()
    .optional()
    .describe(
      "Send email notifications to the people involved. Emails are NOT sent unless this is true."
    ),
  disable_action_notes: z
    .boolean()
    .optional()
    .describe(
      "Suppress the automatic action notes Intervals adds to tasks/milestones when they change. Action notes are created unless this is true."
    ),
};

/** Split the notification flags off validated tool args. */
export function splitNotifications<T extends Record<string, unknown>>(
  args: T & { send_notifications?: boolean; disable_action_notes?: boolean }
): { fields: Omit<T, "send_notifications" | "disable_action_notes">; notify: NotificationOptions } {
  const { send_notifications, disable_action_notes, ...fields } = args;
  return {
    fields,
    notify: {
      sendNotifications: send_notifications,
      disableActionNotes: disable_action_notes,
    },
  };
}

// --- Declarative endpoint tools ---

type Args = Record<string, unknown>;

export interface EndpointSpec {
  name: string;
  description: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** API collection path without trailing slash, e.g. "/client". */
  path: string;
  /**
   * Name of the schema field holding the record ID. It is placed in the URL
   * (`/client/12/`) and never sent in the body or query string.
   */
  idParam?: string;
  schema: z.ZodRawShape;
  /** Extra body fields always sent (e.g. `{ stop: true }`). */
  fixedBody?: Args;
  /** Pre-process validated args (e.g. resolve a local task ID to the internal one). */
  prepare?: (args: Args, client: IntervalsClient) => Promise<Args>;
}

export function registerEndpoints(
  server: McpServer,
  client: IntervalsClient,
  specs: EndpointSpec[]
) {
  for (const spec of specs) {
    const isWrite = spec.method !== "GET";
    const shape = isWrite
      ? { ...spec.schema, ...notificationShape }
      : spec.schema;

    server.tool(
      spec.name,
      spec.description,
      shape,
      {
        readOnlyHint: !isWrite,
        destructiveHint: spec.method === "DELETE",
      },
      async (rawArgs: Args) => {
        const args = spec.prepare
          ? await spec.prepare(rawArgs, client)
          : rawArgs;
        const { fields: withId, notify } = splitNotifications(args);

        // The record ID goes in the URL only; never leak it into body/query.
        let path = spec.path;
        let fields: Args = withId;
        if (spec.idParam) {
          const { [spec.idParam]: id, ...rest } = withId;
          if (id === undefined || id === null) {
            throw new Error(`${spec.name}: missing required parameter "${spec.idParam}"`);
          }
          path = `${spec.path}/${encodeURIComponent(String(id))}`;
          fields = rest;
        }

        switch (spec.method) {
          case "GET":
            return jsonResult(await client.get(path, fields as QueryParams));
          case "DELETE":
            return jsonResult(
              await client.delete(path, fields as QueryParams, notify)
            );
          case "POST":
            return jsonResult(
              await client.post(path, { ...fields, ...spec.fixedBody }, notify)
            );
          case "PUT":
            return jsonResult(
              await client.put(path, { ...fields, ...spec.fixedBody }, notify)
            );
        }
      }
    );
  }
}
