import { table, f } from "@xanots/sdk";
import { agents } from "./agents.js";
import { accounts } from "./accounts.js";
import { SEED_AUDIT } from "../seed-data.js";

// The governance trail. Every attempt — allowed or refused, by a person or the
// agent — lands here with the deciding reason and the rule version. This is the
// record a Director of AI reads to confirm the agent obeyed the same limits a
// human does.
export const auditActions = table({
  name: "audit_actions",
  schema: {
    actor_id: f.tableRef(agents, { required: true }),
    actor_kind: f.enum(["human", "agent"], { required: true }),
    // Always set by the rule layer; the 0 sentinel keeps the FK queryable.
    account_id: f.tableRef(accounts, { required: true, default: 0 }),
    action: f.text({ required: true }),
    requested_amount_cents: f.int({ required: true }),
    outcome: f.enum(["allowed", "refused"], { required: true }),
    // The rule that fired, e.g. over_authority_limit, account_frozen.
    reason: f.text({ required: true }),
    rule_version: f.text({ required: true }),
  },
  seed: SEED_AUDIT,
});
