import { table, f } from "@xanots/sdk";
import { SEED_CUSTOMERS } from "../seed-data.js";

// The people who own accounts. Kept small on purpose — the domain of interest is
// the governed action layer, not customer management.
export const customers = table({
  name: "customers",
  schema: {
    name: f.text({ required: true }),
    email: f.email({ required: true }),
  },
  seed: SEED_CUSTOMERS,
});
