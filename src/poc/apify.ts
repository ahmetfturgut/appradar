import { z } from "zod";
import { type Job, sources } from "./plan.ts";

const Id = z.string().regex(/^[A-Za-z0-9]+$/);
export const Run = z.object({
  id: Id,
  actId: Id,
  status: z.enum(["READY", "RUNNING", "SUCCEEDED", "FAILED", "TIMING-OUT", "TIMED-OUT", "ABORTING", "ABORTED"]),
  buildId: Id,
  buildNumber: z.string().optional(),
  defaultDatasetId: Id,
  defaultKeyValueStoreId: Id,
  startedAt: z.iso.datetime({ offset: true }),
  finishedAt: z.iso.datetime({ offset: true }).nullish(),
  usageTotalUsd: z.number().nonnegative().nullish(),
  chargedEventCounts: z.record(z.string(), z.number().nonnegative()).optional(),
  platformUsageBillingModel: z.string().optional(),
  options: z.object({ maxTotalChargeUsd: z.number().nonnegative().nullish(), memoryMbytes: z.number().optional() }).optional(),
});
export type Run = z.infer<typeof Run>;

export function isTerminal(run: Run) {
  return ["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(run.status);
}

export class ApiError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export class ApifyClient {
  constructor(private readonly token: string, private readonly fetcher: typeof fetch = fetch) {
    if (!token.trim() || /[\r\n]/.test(token)) throw new ApiError("invalid_token_configuration");
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const method = init.method ?? "GET";
    // Only idempotent reads are retried. A lost POST response may mean a paid run exists.
    const attempts = method === "GET" ? 3 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      let response: Response;
      try {
        response = await this.fetcher(`https://api.apify.com/v2/${path}`, {
          ...init, redirect: "error", signal: AbortSignal.timeout(30000),
          headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        });
      } catch {
        if (method === "GET" && attempt < attempts - 1) continue;
        throw new ApiError(method === "POST" ? "start_result_unknown_do_not_retry" : "read_network_error");
      }
      if (response.ok) return response;
      if (method === "GET" && (response.status === 429 || response.status >= 500) && attempt < attempts - 1) {
        const requested = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(requested) && requested > 0 ? Math.min(requested * 1000, 5000) : 250 * 2 ** attempt + Math.random() * 250;
        await response.body?.cancel();
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      await response.body?.cancel();
      // Never include headers, request URL or provider error body in logs.
      throw new ApiError(`apify_http_${response.status}${method === "POST" ? "_start_not_retried" : ""}`);
    }
    throw new ApiError("read_retry_limit");
  }

  private async parseRun(response: Response, job: Job): Promise<Run> {
    const parsed = z.object({ data: Run }).parse(await response.json()).data;
    if (parsed.actId !== sources[job.provider].actorId) throw new ApiError("actor_identity_mismatch");
    if (parsed.buildNumber !== sources[job.provider].build || parsed.buildId !== sources[job.provider].buildId) throw new ApiError("actor_build_mismatch");
    const cap = parsed.options?.maxTotalChargeUsd;
    if (cap == null || cap <= 0 || cap > job.maxChargeUsd) throw new ApiError("run_cost_cap_unverified");
    return parsed;
  }

  async start(job: Job): Promise<Run> {
    const params = new URLSearchParams({
      build: sources[job.provider].build,
      maxTotalChargeUsd: String(job.maxChargeUsd),
      timeout: "180", memory: "256", restartOnError: "false",
    });
    return this.parseRun(await this.request(`acts/${sources[job.provider].actor}/runs?${params}`, { method: "POST", body: JSON.stringify(job.input) }), job);
  }

  async getRun(runId: string, job: Job): Promise<Run> {
    Id.parse(runId);
    const run = await this.parseRun(await this.request(`actor-runs/${runId}`), job);
    if (run.id !== runId) throw new ApiError("run_identity_mismatch");
    return run;
  }

  async getInput(run: Run): Promise<unknown> {
    return (await this.request(`key-value-stores/${Id.parse(run.defaultKeyValueStoreId)}/records/INPUT`)).json();
  }

  async readPage(datasetId: string, offset: number, limit = 50): Promise<unknown[]> {
    Id.parse(datasetId);
    if (!Number.isSafeInteger(offset) || offset < 0 || limit < 1 || limit > 50) throw new ApiError("invalid_pagination");
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit), format: "json", clean: "false" });
    const result = await this.request(`datasets/${datasetId}/items?${params}`);
    const rows = z.array(z.unknown()).parse(await result.json());
    if (rows.length > limit) throw new ApiError("dataset_page_limit_ignored");
    return rows;
  }
}
