import { table, f } from "@xanots/sdk";
import { SEED_AGENTS } from "../seed-data.js";

// The actors — human and AI alike. This is an AUTH table: a login mints a token
// scoped to one row, and every protected endpoint reads the caller from it. The
// caller's role and authority_limit_cents are what the rule layer enforces, so a
// person and an agent are governed by the exact same fields.
export const agents = table({
  name: "agents",
  auth: true,
  schema: {
    name: f.text({ required: true }),
    role: f.enum(["teller", "supervisor", "ai_agent"], { required: true }),
    actor_kind: f.enum(["human", "agent"], { required: true }),
    // The most a single transfer or hold this actor may authorize (in cents).
    authority_limit_cents: f.int({ required: true }),
    // Hashes on write; read it back only through an explicit `output` on login.
    password: f.password({ required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "name" }] }],
  seed: SEED_AGENTS,
});
