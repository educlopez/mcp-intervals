export type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * Opt-in notification controls for write requests. The Intervals API sends no
 * emails by default, so nothing is added unless a flag is explicitly true.
 */
export interface NotificationOptions {
  /** Maps to `X-Intervals-Send-Notifications: t` (emails are NOT sent otherwise). */
  sendNotifications?: boolean;
  /** Maps to `X-Intervals-Disable-Action-Notes: t` (suppress automatic action notes). */
  disableActionNotes?: boolean;
}

export interface IntervalsRequestOptions extends NotificationOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
  params?: QueryParams;
}

function buildQueryString(params?: QueryParams): string {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export class IntervalsClient {
  private baseUrl = "https://api.myintervals.com";
  private authHeader: string;

  constructor(apiToken: string) {
    this.authHeader =
      "Basic " + Buffer.from(`${apiToken}:X`).toString("base64");
  }

  private async request<T>(
    path: string,
    options: IntervalsRequestOptions = {}
  ): Promise<T> {
    const {
      method = "GET",
      body,
      params,
      sendNotifications,
      disableActionNotes,
    } = options;

    const url = `${this.baseUrl}${path}${buildQueryString(params)}`;

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: "application/json",
    };
    if (sendNotifications) {
      headers["X-Intervals-Send-Notifications"] = "t";
    }
    if (disableActionNotes) {
      headers["X-Intervals-Disable-Action-Notes"] = "t";
    }

    const fetchOptions: RequestInit = { method, headers };

    if (body) {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Intervals API error ${response.status}: ${text.slice(0, 500)}`
      );
    }

    // Successful writes (e.g. DELETE) may return an empty body.
    const text = await response.text();
    if (!text.trim()) return {} as T;
    return JSON.parse(text) as T;
  }

  private async requestBinary(
    path: string,
    params?: QueryParams
  ): Promise<{ buffer: ArrayBuffer; contentType: string }> {
    const url = `${this.baseUrl}${path}${buildQueryString(params)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: this.authHeader },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Intervals API error ${response.status}: ${text.slice(0, 500)}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    return { buffer, contentType };
  }

  // --- Generic verbs (used by the declarative endpoint tools) ---
  // Paths are given without the trailing slash, e.g. "/client" or "/client/12".

  get(path: string, params?: QueryParams) {
    return this.request<Record<string, unknown>>(`${path}/`, { params });
  }

  post(
    path: string,
    body: Record<string, unknown>,
    notify: NotificationOptions = {}
  ) {
    return this.request<Record<string, unknown>>(`${path}/`, {
      method: "POST",
      body,
      ...notify,
    });
  }

  put(
    path: string,
    body: Record<string, unknown>,
    notify: NotificationOptions = {}
  ) {
    return this.request<Record<string, unknown>>(`${path}/`, {
      method: "PUT",
      body,
      ...notify,
    });
  }

  delete(
    path: string,
    params?: QueryParams,
    notify: NotificationOptions = {}
  ) {
    return this.request<Record<string, unknown>>(`${path}/`, {
      method: "DELETE",
      params,
      ...notify,
    });
  }

  // --- Task ---

  async getTask(id: number) {
    const data = await this.request<Record<string, unknown>>(
      `/task/${id}/`
    );
    return data;
  }

  async getTaskByLocalId(localId: number) {
    const data = await this.request<{
      task?: Array<Record<string, unknown>>;
      listcount?: number;
    }>(`/task/`, { params: { localid: localId } });

    if (!data.task || data.task.length === 0) {
      throw new Error(`No task found with local ID ${localId}`);
    }

    return data.task[0];
  }

  async resolveTaskId(localId: number): Promise<number> {
    const task = await this.getTaskByLocalId(localId);
    return Number(task.id);
  }

  async updateTask(
    id: number,
    fields: Record<string, unknown>,
    notify: NotificationOptions = {}
  ) {
    const data = await this.request<Record<string, unknown>>(
      `/task/${id}/`,
      { method: "PUT", body: fields, ...notify }
    );
    return data;
  }

  // --- Task Notes ---

  async getTaskNotes(taskId: number, filters: QueryParams = {}) {
    const data = await this.request<Record<string, unknown>>(
      `/tasknote/`,
      { params: { ...filters, taskid: taskId } }
    );
    return data;
  }

  async addTaskNote(
    taskId: number,
    note: string,
    isPublic: boolean = true,
    notify: NotificationOptions = {}
  ) {
    const data = await this.request<Record<string, unknown>>(
      `/tasknote/`,
      {
        method: "POST",
        body: { taskid: taskId, note, public: isPublic },
        ...notify,
      }
    );
    return data;
  }

  // --- Project ---

  async getProject(id: number) {
    const data = await this.request<Record<string, unknown>>(
      `/project/${id}/`
    );
    return data;
  }

  // --- Milestone ---

  async getMilestone(id: number) {
    const data = await this.request<Record<string, unknown>>(
      `/milestone/${id}/`
    );
    return data;
  }

  // --- Documents ---

  async getDocuments(
    params: QueryParams = {}
  ) {
    const data = await this.request<Record<string, unknown>>(`/document/`, {
      params,
    });
    return data;
  }

  async getDocument(id: number) {
    const data = await this.request<Record<string, unknown>>(
      `/document/${id}/`
    );
    return data;
  }

  async downloadDocument(
    id: number
  ): Promise<{ buffer: ArrayBuffer; contentType: string }> {
    return this.requestBinary(`/document/${id}/download/`);
  }

  // --- Resources (statuses & priorities) ---

  async getTaskStatuses() {
    const data = await this.request<Record<string, unknown>>(
      `/taskstatus/`
    );
    return data;
  }

  async getTaskPriorities() {
    const data = await this.request<Record<string, unknown>>(
      `/taskpriority/`
    );
    return data;
  }

  // --- Work Types ---

  async getWorkTypes() {
    const data = await this.request<Record<string, unknown>>(
      `/worktype/`
    );
    return data;
  }

  // --- Time Entries ---

  async addTimeEntry(
    fields: {
      taskid: number;
      worktypeid: number;
      date: string;
      time: number;
      billable: boolean;
      description?: string;
      personid?: number;
      moduleid?: number;
    },
    notify: NotificationOptions = {}
  ) {
    // Default to the current user's person ID
    let personid = fields.personid;
    if (personid === undefined) {
      const me = await this.getMe();
      personid = me.personid;
    }
    if (typeof personid !== "number") {
      throw new Error(
        "Could not determine current user's person ID from Intervals /me/ response."
      );
    }

    const data = await this.request<Record<string, unknown>>(
      `/time/`,
      {
        method: "POST",
        body: {
          taskid: fields.taskid,
          worktypeid: fields.worktypeid,
          personid,
          date: fields.date,
          time: fields.time,
          billable: fields.billable,
          ...(fields.moduleid !== undefined && { moduleid: fields.moduleid }),
          ...(fields.description && { description: fields.description }),
        },
        ...notify,
      }
    );
    return data;
  }

  async getTimeEntries(params: QueryParams = {}) {
    const data = await this.request<Record<string, unknown>>(
      `/time/`,
      { params }
    );
    return data;
  }

  // --- Me (current user) ---

  async getMe() {
    const data = await this.request<{
      personid: number;
      me?: Array<Record<string, unknown>>;
    }>(`/me/`);
    // Return the first user object with personid from the top-level response
    return { ...(data.me?.[0] ?? {}), personid: data.personid };
  }
}
