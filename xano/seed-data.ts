// Demo seed data — the ONE source of truth for the starter fixtures.
//
// Two places read it: each table's `seed` (shipped by `xanots deploy`, so a fresh
// ephemeral is browsable with no request) and the admin/seed reset endpoint (which
// truncates and re-adds these same rows for the "reset demo data" button). Keeping
// one copy means the two paths can never drift.
//
// Money is held as an integer count of cents (never a float — see the SDK note on
// f.decimal losing precision). Authority limits are chosen so one transfer amount
// tells three different stories: 2000.00 (200000 cents) is over the teller's and the
// agent's limit but within the supervisor's, so the same request is refused for a
// person and the agent yet allowed for a higher role.
//
// The demo password is shared and is NOT a secret; it ships in the frontend too.
export const DEMO_PASSWORD = "servicing-demo";

export type SeedCustomer = { name: string; email: string };
export type SeedAgent = {
  name: string;
  role: "teller" | "supervisor" | "ai_agent";
  actor_kind: "human" | "agent";
  authority_limit_cents: number;
  password: string;
};
export type SeedAccount = {
  customer_id: number;
  label: string;
  type: "checking" | "savings";
  balance_cents: number;
  hold_cents: number;
  status: "active" | "frozen";
};
export type SeedAudit = {
  actor_id: number;
  actor_kind: "human" | "agent";
  account_id: number;
  action: string;
  requested_amount_cents: number;
  outcome: "allowed" | "refused";
  reason: string;
  rule_version: string;
};

export const RULE_VERSION = "authority-v1";

// Rows auto-number 1..N in array order (per table), and the reset endpoint restarts
// the id sequence before re-adding, so these ids line up in both seed paths.
export const SEED_CUSTOMERS: SeedCustomer[] = [
  { name: "Ada Chen", email: "ada@example.com" }, // id 1
  { name: "Ben Okoro", email: "ben@example.com" }, // id 2
];

export const SEED_AGENTS: SeedAgent[] = [
  // A teller with a modest limit, a supervisor with a high one, and an AI agent
  // whose limit sits between a small and a large sample transfer.
  { name: "Tess Ferrero", role: "teller", actor_kind: "human", authority_limit_cents: 100000, password: DEMO_PASSWORD }, // id 1  ($1,000)
  { name: "Sam Rivera", role: "supervisor", actor_kind: "human", authority_limit_cents: 1000000, password: DEMO_PASSWORD }, // id 2  ($10,000)
  { name: "Nova (AI agent)", role: "ai_agent", actor_kind: "agent", authority_limit_cents: 150000, password: DEMO_PASSWORD }, // id 3  ($1,500)
];

export const SEED_ACCOUNTS: SeedAccount[] = [
  { customer_id: 1, label: "Everyday Checking", type: "checking", balance_cents: 500000, hold_cents: 0, status: "active" }, // id 1
  { customer_id: 1, label: "Rainy Day Savings", type: "savings", balance_cents: 250000, hold_cents: 0, status: "active" }, // id 2
  { customer_id: 2, label: "Business Checking", type: "checking", balance_cents: 300000, hold_cents: 50000, status: "frozen" }, // id 3
];

// A starter trail so the audit screen shows all four outcomes the moment the app loads.
export const SEED_AUDIT: SeedAudit[] = [
  { actor_id: 1, actor_kind: "human", account_id: 1, action: "initiate_transfer", requested_amount_cents: 50000, outcome: "allowed", reason: "within_authority_and_balance", rule_version: RULE_VERSION },
  { actor_id: 3, actor_kind: "agent", account_id: 1, action: "initiate_transfer", requested_amount_cents: 200000, outcome: "refused", reason: "over_authority_limit", rule_version: RULE_VERSION },
  { actor_id: 2, actor_kind: "human", account_id: 2, action: "initiate_transfer", requested_amount_cents: 300000, outcome: "refused", reason: "insufficient_available_balance", rule_version: RULE_VERSION },
  { actor_id: 1, actor_kind: "human", account_id: 3, action: "initiate_transfer", requested_amount_cents: 10000, outcome: "refused", reason: "account_frozen", rule_version: RULE_VERSION },
];
