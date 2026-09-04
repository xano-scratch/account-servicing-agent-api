import { query, input, s, ref, inp, auth, c, expr, and, obj, withFilters, fl } from "@xanots/sdk";
import { agentGroup } from "./groups.js";
import { agents } from "../tables/agents.js";
import { servicingAgent } from "../agents/servicing-agent.js";
import { servicingAction } from "../functions/servicing-action.js";

// The Play-4 flourish: a plain-language servicing request, run behind the agent's
// own token. The agent ONLY parses the words into structured fields; the SAME rule
// layer a human hits then enforces the agent's authority limit. The agent cannot
// exceed its limit any more than a person can.
export const agentRun = query({
  name: "run",
  verb: "POST",
  apiGroup: agentGroup,
  auth: agents,
  input: { request: input.text({ required: true }) },
  stack: [
    s.ai.agent.run({ agent: servicingAgent, args: { request: inp("request") }, as: "run" }),

    // Default to a clean refusal so an unparseable request never reaches the rule
    // layer with a null account (which would fail the lookup).
    s.set_var("amount_cents", c.int(0)),
    s.set_var("result", obj({ outcome: c.text("refused"), reason: c.text("could_not_parse_request") })),

    s.conditional({
      when: and(
        expr(ref("run.result.account_id", { safe: true }), "!=", c.null()),
        expr(ref("run.result.amount", { safe: true }), "!=", c.null()),
      ),
      then: [
        // The model returns dollars; the rule layer works in cents.
        s.update_var("amount_cents", withFilters(ref("run.result.amount"), fl.mul(100), fl.round(0))),
        s.function.run({
          fn: servicingAction,
          input: {
            actor_id: auth("id"),
            account_id: ref("run.result.account_id"),
            kind: ref("run.result.action"),
            amount_cents: ref("amount_cents"),
            counterparty: ref("run.result.counterparty"),
          },
          as: "fnres",
        }),
        s.update_var("result", ref("fnres")),
      ],
    }),
  ],
  response: {
    interpreted: obj({
      action: ref("run.result.action"),
      account_id: ref("run.result.account_id"),
      amount_cents: ref("amount_cents"),
      counterparty: ref("run.result.counterparty"),
    }),
    result: ref("result"),
  },
  // The result var is one shape on a parse failure and the rule layer's shape
  // otherwise; declare what a client should expect.
  responseShape: null as unknown as {
    interpreted: { action: string; account_id: number; amount_cents: number; counterparty: string };
    result: { outcome: string; reason: string };
  },
});
