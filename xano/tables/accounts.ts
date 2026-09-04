import { table, f } from "@xanots/sdk";
import { customers } from "./customers.js";
import { SEED_ACCOUNTS } from "../seed-data.js";

// A customer account. The available balance the rules check is balance minus the
// funds currently held, computed server-side so a client can never disagree with it.
export const accounts = table({
  name: "accounts",
  schema: {
    customer_id: f.tableRef(customers, { required: true }),
    label: f.text({ required: true }),
    type: f.enum(["checking", "savings"], { required: true }),
    balance_cents: f.int({ required: true }),
    hold_cents: f.int({ required: true, default: 0 }),
    status: f.enum(["active", "frozen"], { required: true }),
  },
  seed: SEED_ACCOUNTS,
});
