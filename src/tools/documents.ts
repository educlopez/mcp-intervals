import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IntervalsClient } from "../client.js";
import { EndpointSpec, registerEndpoints } from "./helpers.js";

const documentFields = {
  personid: z.number().describe("Person ID of the document owner (use get_people)"),
  title: z.string().describe("Document title (max 255 characters)"),
  notes: z.string().describe("Document body/notes"),
  public: z.boolean().describe("Whether the document is publicly visible"),
  active: z.boolean().describe("Whether the document is active"),
};

// get_documents and download_document (binary) live in core.
const specs: EndpointSpec[] = [
  {
    name: "get_document",
    description:
      "Get a single document's metadata by ID. Use download_document to retrieve file contents.",
    method: "GET",
    path: "/document",
    idParam: "documentId",
    schema: { documentId: z.number().describe("Document ID") },
  },
  {
    name: "create_document",
    description:
      "Create a document record (title/notes). Note: the Intervals API does not support uploading file attachments.",
    method: "POST",
    path: "/document",
    schema: {
      personid: documentFields.personid,
      title: documentFields.title,
      notes: documentFields.notes.optional(),
      public: documentFields.public.optional(),
      active: documentFields.active.optional(),
    },
  },
  {
    name: "update_document",
    description: "Update a document record. Only provide fields you want to change.",
    method: "PUT",
    path: "/document",
    idParam: "documentId",
    schema: {
      documentId: z.number().describe("Document ID to update"),
      personid: documentFields.personid.optional(),
      title: documentFields.title.optional(),
      notes: documentFields.notes.optional(),
      public: documentFields.public.optional(),
      active: documentFields.active.optional(),
    },
  },
];

export function registerDocumentTools(server: McpServer, client: IntervalsClient) {
  registerEndpoints(server, client, specs);
}
