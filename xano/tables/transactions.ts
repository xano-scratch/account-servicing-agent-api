import { table, f } from "@xanots/sdk";
import { accounts } from "./accounts.js";
import { agents } from "./agents.js";

// The money-movement ledger. A refused attempt is written here too (status
// "refused"), so the ledger and the audit trail agree on what was tried.
export const transactions = table({
  name: "transactions",
  schema: {
    account_id: f.tableRef(accounts, { required: true }),
    actor_id: f.tableRef(agents, { required: true }),
    kind: f.enum(["transfer", "hold", "release_hold"], { required: true }),
    amount_cents: f.int({ required: true }),
    // The destination for a transfer; blank for a hold or a release.
    counterparty: f.text({ nullable: true }),
    status: f.enum(["posted", "refused"], { required: true }),
  },
});
