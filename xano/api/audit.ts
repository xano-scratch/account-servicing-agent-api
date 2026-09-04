import { query, input, s, ref, inp, cmp, col } from "@xanots/sdk";
import { auditGroup } from "./groups.js";
import { agents } from "../tables/agents.js";
import { auditActions } from "../tables/audit-actions.js";

// The governance trail, newest first, optionally narrowed by account or actor kind.
// Each filter uses ignoreEmpty, so an absent parameter drops its predicate instead
// of matching nothing — the endpoint returns the whole trail when no filter is set.
export const auditList = query({
  name: "actions",
  verb: "GET",
  apiGroup: auditGroup,
  auth: agents,
  input: {
    account_id: input.int(),
    actor_kind: input.text(),
  },
  stack: [
    s.db.query({
      table: auditActions,
      where: [
        cmp(col("account_id"), "=", inp("account_id"), { ignoreEmpty: true }),
        cmp(col("actor_kind"), "=", inp("actor_kind"), { ignoreEmpty: true }),
      ],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
