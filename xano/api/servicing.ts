import { query, input, s, ref, inp, auth, c, expr, withFilters, fl } from "@xanots/sdk";
import { servicingGroup } from "./groups.js";
import { agents } from "../tables/agents.js";
import { accounts } from "../tables/accounts.js";
import { servicingAction } from "../functions/servicing-action.js";

// List every account (any authenticated actor may read).
export const listAccounts = query({
  name: "accounts",
  verb: "GET",
  apiGroup: servicingGroup,
  auth: agents,
  stack: [s.db.query({ table: accounts, sort: [{ sortBy: "id", dir: "asc" }], as: "rows" })],
  response: ref("rows"),
});

// One account, with the available balance computed by the API (balance minus held).
export const getAccount = query({
  name: "account/{account_id}",
  verb: "GET",
  apiGroup: servicingGroup,
  auth: agents,
  input: { account_id: input.int({ required: true }) },
  stack: [
    s.db.get_by_id({ table: accounts, id: inp("account_id"), as: "account" }),
    s.precondition({
      expr: expr(ref("account", { safe: true }), "!=", c.null()),
      error: c.text("Account not found."),
      error_type: "notfound",
    }),
  ],
  response: {
    id: ref("account.id"),
    label: ref("account.label"),
    type: ref("account.type"),
    status: ref("account.status"),
    balance_cents: ref("account.balance_cents"),
    hold_cents: ref("account.hold_cents"),
    available_cents: withFilters(ref("account.balance_cents"), fl.sub(ref("account.hold_cents"))),
  },
});

// Initiate a transfer. All the deciding logic lives in the shared rule layer, so
// this endpoint just names the caller and the amount.
export const transfer = query({
  name: "transfer",
  verb: "POST",
  apiGroup: servicingGroup,
  auth: agents,
  input: {
    account_id: input.int({ required: true }),
    amount_cents: input.int({ required: true }),
    counterparty: input.text(),
  },
  stack: [
    s.function.run({
      fn: servicingAction,
      input: {
        actor_id: auth("id"),
        account_id: inp("account_id"),
        kind: c.text("transfer"),
        amount_cents: inp("amount_cents"),
        counterparty: inp("counterparty"),
      },
      as: "res",
    }),
  ],
  response: ref("res"),
});

// Place a hold. Same rule layer, same limits.
export const hold = query({
  name: "hold",
  verb: "POST",
  apiGroup: servicingGroup,
  auth: agents,
  input: {
    account_id: input.int({ required: true }),
    amount_cents: input.int({ required: true }),
  },
  stack: [
    s.function.run({
      fn: servicingAction,
      input: {
        actor_id: auth("id"),
        account_id: inp("account_id"),
        kind: c.text("hold"),
        amount_cents: inp("amount_cents"),
      },
      as: "res",
    }),
  ],
  response: ref("res"),
});

// Release a hold. A higher-authority action: only a supervisor may do it, enforced
// at the API layer (never row-level). The release itself still runs through the same
// rule layer so it is audited like everything else.
export const releaseHold = query({
  name: "release-hold",
  verb: "POST",
  apiGroup: servicingGroup,
  auth: agents,
  input: {
    account_id: input.int({ required: true }),
    amount_cents: input.int({ required: true }),
  },
  stack: [
    s.db.get({ table: agents, fieldValue: auth("id"), output: ["id", "role"], as: "me" }),
    s.precondition({
      expr: expr(ref("me.role"), "=", c.text("supervisor")),
      error: c.text("Only a supervisor can release a hold."),
      error_type: "accessdenied",
    }),
    s.function.run({
      fn: servicingAction,
      input: {
        actor_id: auth("id"),
        account_id: inp("account_id"),
        kind: c.text("release_hold"),
        amount_cents: inp("amount_cents"),
      },
      as: "res",
    }),
  ],
  response: ref("res"),
});
