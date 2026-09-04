import { query, s, c } from "@xanots/sdk";
import { adminGroup } from "./groups.js";
import { customers } from "../tables/customers.js";
import { agents } from "../tables/agents.js";
import { accounts } from "../tables/accounts.js";
import { transactions } from "../tables/transactions.js";
import { auditActions } from "../tables/audit-actions.js";
import { SEED_CUSTOMERS, SEED_AGENTS, SEED_ACCOUNTS, SEED_AUDIT } from "../seed-data.js";

// Reset the demo to its starting state — the "reset demo data" button. A fresh
// ephemeral is already seeded on deploy (table({ seed })); this endpoint just
// rebuilds the same rows on demand from the one shared seed source. Public so the
// demo can reset itself without a token. `reset: true` restarts each id sequence,
// so the re-added rows line up with the foreign keys in the seed data.
export const seed = query({
  name: "seed",
  verb: "POST",
  apiGroup: adminGroup,
  stack: [
    s.db.truncate({ table: auditActions, reset: true }),
    s.db.truncate({ table: transactions, reset: true }),
    s.db.truncate({ table: accounts, reset: true }),
    s.db.truncate({ table: agents, reset: true }),
    s.db.truncate({ table: customers, reset: true }),

    // Order matters: customers and agents exist before the rows that reference them.
    ...SEED_CUSTOMERS.map((row) => s.db.add({ table: customers, row })),
    ...SEED_AGENTS.map((row) => s.db.add({ table: agents, row })),
    ...SEED_ACCOUNTS.map((row) => s.db.add({ table: accounts, row })),
    ...SEED_AUDIT.map((row) => s.db.add({ table: auditActions, row })),
  ],
  response: { ok: c.bool(true) },
});
