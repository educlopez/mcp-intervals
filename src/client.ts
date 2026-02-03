export interface IntervalsRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
  params?: Record<string, string | number | boolean>;
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
    const { method = "GET", body, params } = options;

    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        searchParams.set(key, String(value));
      }
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: "application/json",
    };

    const fetchOptions: RequestInit = { method, headers };

    if (body) {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Intervals API error ${response.status}: ${text}`
      );
    }

    return response.json() as Promise<T>;
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

  async updateTask(id: number, fields: Record<string, unknown>) {
    const data = await this.request<Record<string, unknown>>(
      `/task/${id}/`,
      { method: "PUT", body: fields }
    );
    return data;
  }

  // --- Task Notes ---

  async getTaskNotes(taskId: number) {
    const data = await this.request<Record<string, unknown>>(
      `/tasknote/`,
      { params: { taskid: taskId } }
    );
    return data;
  }

  async addTaskNote(
    taskId: number,
    note: string,
    isPublic: boolean = true
  ) {
    const data = await this.request<Record<string, unknown>>(
      `/tasknote/`,
      {
        method: "POST",
        body: { taskid: taskId, note, public: isPublic },
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

  async addTimeEntry(fields: {
    taskid: number;
    worktypeid: number;
    date: string;
    time: number;
    billable: boolean;
    description?: string;
  }) {
    // First get the current user's person ID
    const me = await this.getMe();
    const personid = me.personid as number;

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
          ...(fields.description && { description: fields.description }),
        },
      }
    );
    return data;
  }

  async getTimeEntries(params: {
    taskid?: number;
    personid?: number;
    datebegin?: string;
    dateend?: string;
  } = {}) {
    const data = await this.request<Record<string, unknown>>(
      `/time/`,
      { params: params as Record<string, string | number | boolean> }
    );
    return data;
  }

  // --- Me (current user) ---

  async getMe() {
    const data = await this.request<{ me: Record<string, unknown> }>(
      `/me/`
    );
    return data.me;
  }
}
