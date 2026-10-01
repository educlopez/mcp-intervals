import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IntervalsClient } from "../client.js";
import { EndpointSpec, limitParam, offsetParam, registerEndpoints } from "./helpers.js";

const clientFields = {
  name: z.string().describe("Client name"),
  datecreated: z.string().describe("Date the client was created (YYYY-MM-DD)"),
  active: z.boolean().describe("Whether the client is active"),
  description: z.string().describe("Client description"),
  email: z.string().describe("Client email"),
  phone: z.string().describe("Client phone"),
  fax: z.string().describe("Client fax"),
  website: z.string().describe("Client website"),
  address: z.string().describe("Client address"),
};

const contactFields = {
  personid: z.number().describe("Person ID (use get_people)"),
  value: z.string().describe("The contact value (e.g. the phone number or email address)"),
  contacttypeid: z.number().describe("Contact type ID (use get_contact_types)"),
  contactdescriptorid: z.number().describe("Contact descriptor ID (use get_contact_descriptors)"),
};

const specs: EndpointSpec[] = [
  // --- Clients ---
  {
    name: "get_clients",
    description: "List clients, optionally filtered by active status.",
    method: "GET",
    path: "/client",
    schema: {
      active: z.boolean().optional().describe("Filter by active state"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "get_client",
    description: "Get full details of a single client by ID.",
    method: "GET",
    path: "/client",
    idParam: "clientId",
    schema: { clientId: z.number().describe("Client ID") },
  },
  {
    name: "create_client",
    description: "Create a client. Requires name, creation date, and active status.",
    method: "POST",
    path: "/client",
    schema: {
      name: clientFields.name,
      datecreated: clientFields.datecreated,
      active: clientFields.active,
      description: clientFields.description.optional(),
      email: clientFields.email.optional(),
      phone: clientFields.phone.optional(),
      fax: clientFields.fax.optional(),
      website: clientFields.website.optional(),
      address: clientFields.address.optional(),
    },
  },
  {
    name: "update_client",
    description: "Update a client. Only provide fields you want to change.",
    method: "PUT",
    path: "/client",
    idParam: "clientId",
    schema: {
      clientId: z.number().describe("Client ID to update"),
      name: clientFields.name.optional(),
      datecreated: clientFields.datecreated.optional(),
      active: clientFields.active.optional(),
      description: clientFields.description.optional(),
      email: clientFields.email.optional(),
      phone: clientFields.phone.optional(),
      fax: clientFields.fax.optional(),
      website: clientFields.website.optional(),
      address: clientFields.address.optional(),
    },
  },

  // --- People ---
  {
    name: "get_people",
    description: "List people (team members) in the account, optionally filtered by active status.",
    method: "GET",
    path: "/person",
    schema: {
      active: z.boolean().optional().describe("Filter by active state"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "get_person",
    description: "Get details of a single person by ID.",
    method: "GET",
    path: "/person",
    idParam: "personId",
    schema: { personId: z.number().describe("Person ID") },
  },
  {
    name: "get_me",
    description: "Get the profile of the currently authenticated user, including their person ID.",
    method: "GET",
    path: "/me",
    schema: {},
  },

  // --- Contacts ---
  {
    name: "get_contact_types",
    description: "List contact types (e.g. phone, email, website). Use the IDs with contact descriptor and person contact tools.",
    method: "GET",
    path: "/contacttype",
    schema: {},
  },
  {
    name: "get_contact_descriptors",
    description: "List contact descriptors for a contact type (e.g. 'Work', 'Mobile' for phone).",
    method: "GET",
    path: "/contactdescriptor",
    schema: { contacttypeid: z.number().describe("Contact type ID (use get_contact_types)") },
  },
  {
    name: "get_person_contacts",
    description: "List contact information (phone, email, etc.) for a person.",
    method: "GET",
    path: "/personcontact",
    schema: {
      personid: contactFields.personid,
      contacttypeid: z.number().optional().describe("Filter by contact type ID"),
      contactdescriptorid: z.number().optional().describe("Filter by contact descriptor ID"),
    },
  },
  {
    name: "create_person_contact",
    description: "Add a contact entry (phone number, email address, etc.) to a person.",
    method: "POST",
    path: "/personcontact",
    schema: { ...contactFields },
  },
  {
    name: "update_person_contact",
    description: "Update a person contact entry. Only provide fields you want to change.",
    method: "PUT",
    path: "/personcontact",
    idParam: "personContactId",
    schema: {
      personContactId: z.number().describe("Person contact ID to update"),
      personid: contactFields.personid.optional(),
      value: contactFields.value.optional(),
      contacttypeid: contactFields.contacttypeid.optional(),
      contactdescriptorid: contactFields.contactdescriptorid.optional(),
    },
  },
  {
    name: "delete_person_contact",
    description:
      "Delete a person contact entry by ID. Permanently deletes; cannot be undone.",
    method: "DELETE",
    path: "/personcontact",
    idParam: "personContactId",
    schema: { personContactId: z.number().describe("Person contact ID to delete") },
  },

  // --- Account ---
  {
    name: "get_groups",
    description: "List access level groups (Administrator, Manager, Resource, Executive).",
    method: "GET",
    path: "/group",
    schema: {},
  },
  {
    name: "get_quota",
    description: "Get current API quota usage: requests consumed, the daily limit, and when the quota resets.",
    method: "GET",
    path: "/quota",
    schema: {},
  },
];

export function registerPeopleTools(server: McpServer, client: IntervalsClient) {
  registerEndpoints(server, client, specs);
}
