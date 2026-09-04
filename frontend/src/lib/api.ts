// The one contract: paths and request/response *types* are derived from the
// XanoTS query defs, never hand-typed. Change a def and everything here follows.
//
// Bundle discipline (the split-route-metadata rule):
//   • `import type` for shapes — InferInput/InferResponse/InferRow erase to nothing.
//   • Import the lean query def VALUE for getPath()/verb.
//   • The agent endpoint's def builds an LLM graph at module load, so it is NOT
//     imported as a value — its route lives in ROUTES and its types come in
//     type-only. Keep ROUTES in sync with `npx xanots routes xano/index.ts`.

import type { InferInput, InferResponse, InferRow } from "@xanots/sdk";

import { login as loginDef, actors as actorsDef } from "../../../xano/api/auth.js";
import {
  listAccounts as listAccountsDef,
  getAccount as getAccountDef,
  transfer as transferDef,
  hold as holdDef,
  releaseHold as releaseHoldDef,
} from "../../../xano/api/servicing.js";
import { auditList as auditListDef } from "../../../xano/api/audit.js";
import { seed as seedDef } from "../../../xano/api/admin.js";

// Stack-heavy def (an agent graph): type-only, so it never enters the bundle.
import type { agentRun as agentRunDef } from "../../../xano/api/agent.js";

// Table row shapes — type-only imports, no table def in the bundle.
import type { accounts as accountsTable } from "../../../xano/tables/accounts.js";
import type { auditActions as auditActionsTable } from "../../../xano/tables/audit-actions.js";

export type Actor = InferResponse<typeof actorsDef>[number];
export type LoginResponse = InferResponse<typeof loginDef>;
export type Account = InferRow<typeof accountsTable>;
export type AccountDetail = InferResponse<typeof getAccountDef>;
export type ServicingResult = InferResponse<typeof transferDef>;
export type ReleaseResult = InferResponse<typeof releaseHoldDef>;
export type AuditRow = InferRow<typeof auditActionsTable>;
export type AgentRunResult = InferResponse<typeof agentRunDef>;
export type SeedResult = InferResponse<typeof seedDef>;

/**
 * The deployed Xano backend's base URL. Injected as `window.XANO_HOST` by
 * `xanots deploy <entry> --static <dir>`, or read from `VITE_XANO_HOST` in dev.
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

/** Plain route metadata for the stack-heavy agent endpoint (no def import). */
export const ROUTES = {
  agentRun: { path: "/api:asa_agent/run", verb: "POST" },
} as const;

async function request<T>(
  path: string,
  opts: { method?: string; token?: string | null; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.token) headers["authorization"] = `Bearer ${opts.token}`;

  const res = await fetch(XANO_HOST + path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed?.message) message = parsed.message;
    } catch {
      // fall back to the raw body text
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  return (text ? JSON.parse(text) : null) as T;
}

export function listActors(): Promise<Actor[]> {
  return request<Actor[]>(actorsDef.getPath(), { method: actorsDef.verb });
}

export function login(body: InferInput<typeof loginDef>): Promise<LoginResponse> {
  return request<LoginResponse>(loginDef.getPath(), { method: loginDef.verb, body });
}

export function seedDemo(): Promise<SeedResult> {
  return request<SeedResult>(seedDef.getPath(), { method: seedDef.verb });
}

export function listAccounts(token: string): Promise<Account[]> {
  return request<Account[]>(listAccountsDef.getPath(), { method: listAccountsDef.verb, token });
}

export function getAccount(token: string, accountId: number): Promise<AccountDetail> {
  return request<AccountDetail>(getAccountDef.getPath({ params: { account_id: accountId } }), {
    method: getAccountDef.verb,
    token,
  });
}

export function transfer(token: string, body: InferInput<typeof transferDef>): Promise<ServicingResult> {
  return request<ServicingResult>(transferDef.getPath(), { method: transferDef.verb, token, body });
}

export function placeHold(token: string, body: InferInput<typeof holdDef>): Promise<ServicingResult> {
  return request<ServicingResult>(holdDef.getPath(), { method: holdDef.verb, token, body });
}

export function releaseHold(token: string, body: InferInput<typeof releaseHoldDef>): Promise<ReleaseResult> {
  return request<ReleaseResult>(releaseHoldDef.getPath(), { method: releaseHoldDef.verb, token, body });
}

export function listAudit(
  token: string,
  filters: { account_id?: number; actor_kind?: "human" | "agent" } = {},
): Promise<AuditRow[]> {
  const qs = new URLSearchParams();
  if (filters.account_id != null) qs.set("account_id", String(filters.account_id));
  if (filters.actor_kind) qs.set("actor_kind", filters.actor_kind);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<AuditRow[]>(auditListDef.getPath() + suffix, { method: auditListDef.verb, token });
}

export function runAgent(token: string, prompt: string): Promise<AgentRunResult> {
  return request<AgentRunResult>(ROUTES.agentRun.path, {
    method: ROUTES.agentRun.verb,
    token,
    body: { request: prompt },
  });
}
