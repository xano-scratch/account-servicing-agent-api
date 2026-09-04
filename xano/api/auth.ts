import { query, input, s, ref, inp, c, expr } from "@xanots/sdk";
import { authGroup } from "./groups.js";
import { agents } from "../tables/agents.js";

// Authenticate an actor and mint a token. The SAME path serves a human ops user and
// an AI agent — the token simply carries whichever row logged in, and that row's
// role and authority limit are what every protected endpoint enforces.
export const login = query({
  name: "login",
  verb: "POST",
  apiGroup: authGroup,
  // Take the password as text, not input.password: the column already hashes on
  // write, and hashing the submission too would compare two different hashes.
  input: {
    name: input.text({ required: true }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: agents,
      fieldName: "name",
      fieldValue: inp("name"),
      // `password` is an internal column; naming it in output is the only way to read it.
      output: ["id", "name", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error: c.text("No actor with that name."),
      error_type: "notfound",
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("u.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error: c.text("That password is not right."),
      error_type: "unauthorized",
    }),
    s.security.create_auth_token({ table: agents, id: ref("u.id"), as: "token" }),
  ],
  response: { token: ref("token") },
});

// List the actors for the picker. Public (the frontend needs it before login) and
// the password column is never returned.
export const actors = query({
  name: "actors",
  verb: "GET",
  apiGroup: authGroup,
  stack: [
    s.db.query({
      table: agents,
      sort: [{ sortBy: "id", dir: "asc" }],
      output: ["id", "name", "role", "actor_kind", "authority_limit_cents"],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
