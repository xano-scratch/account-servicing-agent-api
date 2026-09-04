import { defineFunction, input, s, ref, inp, c, expr, withFilters, fl } from "@xanots/sdk";
import { agents } from "../tables/agents.js";
import { accounts } from "../tables/accounts.js";
import { transactions } from "../tables/transactions.js";
import { auditActions } from "../tables/audit-actions.js";
import { RULE_VERSION } from "../seed-data.js";

// The ONE rule layer. Every money movement — a human transfer, a human hold, a
// supervisor release, and the AI agent's parsed request — runs through this single
// function, so a person and the agent are held to the exact same code. The caller's
// identity (and thus their authority limit) is passed in as actor_id, so the
// function does not care whether a query or the agent invoked it.
//
// Order of checks for a transfer or a hold:
//   1. the account must be active            -> account_frozen
//   2. the amount must be within the actor's authority limit -> over_authority_limit
//   3. the available balance must cover it   -> insufficient_available_balance
// A release only reduces a hold, so it skips these (the role gate lives on its
// endpoint). Either way the attempt is written to the ledger and the audit trail.
export const servicingAction = defineFunction({
  name: "servicing_action",
  description: "The shared, audited rule layer for every account money movement.",
  input: {
    actor_id: input.int({ required: true }),
    account_id: input.int({ required: true }),
    kind: input.enum(["transfer", "hold", "release_hold"], { required: true }),
    amount_cents: input.int({ required: true }),
    counterparty: input.text(),
  },
  stack: [
    // Load the actor (never their password) and the account, and fail cleanly if
    // either is missing rather than 500ing on a null drill.
    s.db.get({
      table: agents,
      fieldValue: inp("actor_id"),
      output: ["id", "name", "role", "actor_kind", "authority_limit_cents"],
      as: "actor",
    }),
    s.precondition({
      expr: expr(ref("actor", { safe: true }), "!=", c.null()),
      error: c.text("Unknown actor."),
      error_type: "notfound",
    }),
    s.db.get({ table: accounts, fieldValue: inp("account_id"), as: "account" }),
    s.precondition({
      expr: expr(ref("account", { safe: true }), "!=", c.null()),
      error: c.text("Account not found."),
      error_type: "notfound",
    }),

    // Available balance is balance minus the funds already held.
    s.set_var("available", withFilters(ref("account.balance_cents"), fl.sub(ref("account.hold_cents")))),

    // Decide the outcome. Default to allowed, then let a failing rule override it.
    s.set_var("outcome", c.text("allowed")),
    s.set_var("reason", c.text("within_authority_and_balance")),
    s.conditional({
      when: expr(inp("kind"), "=", c.text("release_hold")),
      then: [s.update_var("reason", c.text("hold_released"))],
      else: [
        s.conditional({
          when: expr(ref("account.status"), "!=", c.text("active")),
          then: [
            s.update_var("outcome", c.text("refused")),
            s.update_var("reason", c.text("account_frozen")),
          ],
          elif: [
            {
              when: expr(inp("amount_cents"), ">", ref("actor.authority_limit_cents")),
              then: [
                s.update_var("outcome", c.text("refused")),
                s.update_var("reason", c.text("over_authority_limit")),
              ],
            },
            {
              when: expr(ref("available"), "<", inp("amount_cents")),
              then: [
                s.update_var("outcome", c.text("refused")),
                s.update_var("reason", c.text("insufficient_available_balance")),
              ],
            },
          ],
        }),
      ],
    }),

    // Apply the balance/hold change only when the action was allowed.
    s.conditional({
      when: expr(ref("outcome"), "=", c.text("allowed")),
      then: [
        s.conditional({
          when: expr(inp("kind"), "=", c.text("transfer")),
          then: [
            s.db.edit({
              table: accounts,
              fieldValue: inp("account_id"),
              row: { balance_cents: withFilters(ref("account.balance_cents"), fl.sub(inp("amount_cents"))) },
            }),
          ],
          elif: [
            {
              when: expr(inp("kind"), "=", c.text("hold")),
              then: [
                s.db.edit({
                  table: accounts,
                  fieldValue: inp("account_id"),
                  row: { hold_cents: withFilters(ref("account.hold_cents"), fl.add(inp("amount_cents"))) },
                }),
              ],
            },
            {
              when: expr(inp("kind"), "=", c.text("release_hold")),
              then: [
                s.db.edit({
                  table: accounts,
                  fieldValue: inp("account_id"),
                  // Never drop a hold below zero.
                  row: { hold_cents: withFilters(ref("account.hold_cents"), fl.sub(inp("amount_cents")), fl.num_max(0)) },
                }),
              ],
            },
          ],
        }),
      ],
    }),

    // Write the ledger row (posted when allowed, refused otherwise).
    s.set_var("txn_status", c.text("posted")),
    s.conditional({
      when: expr(ref("outcome"), "=", c.text("refused")),
      then: [s.update_var("txn_status", c.text("refused"))],
    }),
    s.db.add({
      table: transactions,
      row: {
        account_id: inp("account_id"),
        actor_id: inp("actor_id"),
        kind: inp("kind"),
        amount_cents: inp("amount_cents"),
        counterparty: inp("counterparty"),
        status: ref("txn_status"),
      },
    }),

    // A readable action label for the trail.
    s.set_var("action_label", c.text("initiate_transfer")),
    s.conditional({
      when: expr(inp("kind"), "=", c.text("hold")),
      then: [s.update_var("action_label", c.text("place_hold"))],
    }),
    s.conditional({
      when: expr(inp("kind"), "=", c.text("release_hold")),
      then: [s.update_var("action_label", c.text("release_hold"))],
    }),

    // The governance record — always written, whatever the outcome.
    s.db.add({
      table: auditActions,
      row: {
        actor_id: inp("actor_id"),
        actor_kind: ref("actor.actor_kind"),
        account_id: inp("account_id"),
        action: ref("action_label"),
        requested_amount_cents: inp("amount_cents"),
        outcome: ref("outcome"),
        reason: ref("reason"),
        rule_version: c.text(RULE_VERSION),
      },
    }),
  ],
  response: {
    outcome: ref("outcome"),
    reason: ref("reason"),
    amount_cents: inp("amount_cents"),
    account_id: inp("account_id"),
    actor_kind: ref("actor.actor_kind"),
    available_cents: ref("available"),
  },
});
