import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IntervalsClient } from "../client.js";
import { EndpointSpec, limitParam, offsetParam, registerEndpoints } from "./helpers.js";

const itemFields = {
  invoiceid: z.number().describe("Invoice ID (use get_invoices)"),
  name: z.string().describe("Line item name (max 255 characters)"),
  amount: z.number().describe("Line item amount"),
  description: z.string().describe("Line item description"),
  quantity: z.number().describe("Quantity"),
  rate: z.number().describe("Rate"),
};

const invoiceNoteFields = {
  invoiceid: z.number().describe("Invoice ID (use get_invoices)"),
  title: z.string().describe("Note title (max 255 characters)"),
  note: z.string().describe("Note body"),
  date: z.string().describe("Note date (YYYY-MM-DD HH:MM:SS)"),
};

const paymentFields = {
  projectid: z.number().describe("Project ID (use get_projects)"),
  date: z.string().describe("Payment date (YYYY-MM-DD)"),
  amount: z.number().describe("Payment amount"),
  typeid: z.number().describe("Payment type ID (use get_payment_types)"),
  invoiceid: z.number().describe("Invoice ID to apply the payment to (use get_invoices)"),
  reference: z.string().describe("Reference number (max 35 characters)"),
  note: z.string().describe("Payment note (max 255 characters)"),
};

const specs: EndpointSpec[] = [
  // --- Invoices ---
  {
    name: "get_invoices",
    description: "List invoices, optionally filtered by client or status (draft, sent, paid).",
    method: "GET",
    path: "/invoice",
    schema: {
      clientid: z.number().optional().describe("Filter by client ID"),
      status: z.string().optional().describe("Invoice status: draft, sent, or paid"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "get_invoice",
    description: "Get full details of a single invoice by ID.",
    method: "GET",
    path: "/invoice",
    idParam: "invoiceId",
    schema: { invoiceId: z.number().describe("Invoice ID") },
  },
  {
    name: "create_invoice",
    description:
      "Create an invoice for a project. Requires project, date, term ID, and title.",
    method: "POST",
    path: "/invoice",
    schema: {
      projectid: z.number().describe("Project ID the invoice is for (use get_projects)"),
      date: z.string().describe("Invoice date (YYYY-MM-DD)"),
      termid: z.number().describe("Invoice term ID, e.g. Net 30 (use get_invoice_terms)"),
      title: z.string().describe("Invoice title (max 255 characters)"),
      description: z.string().optional().describe("Invoice description/notes"),
      termother: z.string().optional().describe("Custom payment terms text (max 255 characters)"),
      termotherdatedue: z.string().optional().describe("Custom due date when using termother (YYYY-MM-DD)"),
      addressfrom: z.string().optional().describe("From address on the invoice"),
      addressto: z.string().optional().describe("To address on the invoice"),
      purchaseorder: z.string().optional().describe("Purchase order number (max 55 characters)"),
      tax: z.number().optional().describe("Tax rate percentage"),
      datebegin: z.string().optional().describe("Billing period start date (YYYY-MM-DD)"),
      dateend: z.string().optional().describe("Billing period end date (YYYY-MM-DD)"),
    },
  },
  {
    name: "get_invoice_terms",
    description: "List invoice payment terms (e.g. Net 30, Upon Receipt). Use the IDs when creating invoices.",
    method: "GET",
    path: "/invoiceterm",
    schema: {},
  },

  // --- Invoice items ---
  {
    name: "get_invoice_items",
    description: "List line items for an invoice.",
    method: "GET",
    path: "/invoiceitem",
    schema: {
      invoiceid: z.number().describe("Invoice ID to list items for"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "create_invoice_item",
    description: "Add a line item to an invoice.",
    method: "POST",
    path: "/invoiceitem",
    schema: {
      invoiceid: itemFields.invoiceid,
      name: itemFields.name,
      amount: itemFields.amount,
      description: itemFields.description.optional(),
      quantity: itemFields.quantity.optional(),
      rate: itemFields.rate.optional(),
    },
  },
  {
    name: "update_invoice_item",
    description:
      "Update an invoice line item. Only custom line items support quantity, rate, and amount changes.",
    method: "PUT",
    path: "/invoiceitem",
    idParam: "invoiceItemId",
    schema: {
      invoiceItemId: z.number().describe("Invoice item ID to update"),
      invoiceid: itemFields.invoiceid.optional(),
      name: itemFields.name.optional(),
      amount: itemFields.amount.optional(),
      description: itemFields.description.optional(),
      quantity: itemFields.quantity.optional(),
      rate: itemFields.rate.optional(),
    },
  },
  {
    name: "delete_invoice_item",
    description:
      "Delete a custom invoice line item by ID. Permanently deletes; cannot be undone.",
    method: "DELETE",
    path: "/invoiceitem",
    idParam: "invoiceItemId",
    schema: { invoiceItemId: z.number().describe("Invoice item ID to delete") },
  },

  // --- Invoice notes ---
  {
    name: "get_invoice_notes",
    description: "List invoice notes, optionally for a single invoice.",
    method: "GET",
    path: "/invoicenote",
    schema: {
      invoiceid: z.number().optional().describe("Filter by invoice ID"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "create_invoice_note",
    description: "Add a note to an invoice.",
    method: "POST",
    path: "/invoicenote",
    schema: {
      invoiceid: invoiceNoteFields.invoiceid,
      title: invoiceNoteFields.title,
      note: invoiceNoteFields.note.optional(),
      date: invoiceNoteFields.date.optional(),
    },
  },
  {
    name: "update_invoice_note",
    description: "Update an invoice note. Only provide fields you want to change.",
    method: "PUT",
    path: "/invoicenote",
    idParam: "invoiceNoteId",
    schema: {
      invoiceNoteId: z.number().describe("Invoice note ID to update"),
      invoiceid: invoiceNoteFields.invoiceid.optional(),
      title: invoiceNoteFields.title.optional(),
      note: invoiceNoteFields.note.optional(),
      date: invoiceNoteFields.date.optional(),
    },
  },
  {
    name: "delete_invoice_note",
    description:
      "Delete an invoice note by ID. Permanently deletes; cannot be undone.",
    method: "DELETE",
    path: "/invoicenote",
    idParam: "invoiceNoteId",
    schema: { invoiceNoteId: z.number().describe("Invoice note ID to delete") },
  },

  // --- Payments ---
  {
    name: "get_payments",
    description: "List payments, optionally filtered by project or invoice.",
    method: "GET",
    path: "/payment",
    schema: {
      projectid: z.number().optional().describe("Filter by project ID"),
      invoiceid: z.number().optional().describe("Filter by invoice ID"),
      limit: limitParam,
      offset: offsetParam,
    },
  },
  {
    name: "get_payment",
    description: "Get full details of a single payment by ID.",
    method: "GET",
    path: "/payment",
    idParam: "paymentId",
    schema: { paymentId: z.number().describe("Payment ID") },
  },
  {
    name: "create_payment",
    description: "Record a payment against a project.",
    method: "POST",
    path: "/payment",
    schema: {
      projectid: paymentFields.projectid,
      date: paymentFields.date,
      amount: paymentFields.amount,
      typeid: paymentFields.typeid,
      invoiceid: paymentFields.invoiceid.optional(),
      reference: paymentFields.reference.optional(),
      note: paymentFields.note.optional(),
    },
  },
  {
    name: "update_payment",
    description: "Update a payment. Only provide fields you want to change.",
    method: "PUT",
    path: "/payment",
    idParam: "paymentId",
    schema: {
      paymentId: z.number().describe("Payment ID to update"),
      projectid: paymentFields.projectid.optional(),
      date: paymentFields.date.optional(),
      amount: paymentFields.amount.optional(),
      typeid: paymentFields.typeid.optional(),
      invoiceid: paymentFields.invoiceid.optional(),
      reference: paymentFields.reference.optional(),
      note: paymentFields.note.optional(),
    },
  },
  {
    name: "delete_payment",
    description:
      "Delete a payment by ID (Administrator only). Permanently deletes; cannot be undone.",
    method: "DELETE",
    path: "/payment",
    idParam: "paymentId",
    schema: { paymentId: z.number().describe("Payment ID to delete") },
  },
  {
    name: "get_payment_types",
    description: "List payment types (e.g. Cash, Check, Credit Card). Use the IDs when creating payments.",
    method: "GET",
    path: "/paymenttype",
    schema: {},
  },
];

export function registerBillingTools(server: McpServer, client: IntervalsClient) {
  registerEndpoints(server, client, specs);
}
