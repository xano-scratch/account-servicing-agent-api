import { agent, input } from "@xanots/sdk";

// The AI agent's ONLY job is to read a plain-language request and return structured
// fields. It does NOT move money — the endpoint that runs it hands those fields to
// the same servicing_action rule layer a human hits, so the agent is bound by its
// own authority limit exactly as a person is. It uses Xano's built-in free model, so
// the demo needs no API key.
export const servicingAgent = agent({
  name: "servicing_parser",
  description: "Turns a plain-language servicing request into structured fields.",
  llm: {
    type: "xano-free",
    maxSteps: 3,
    systemPrompt: [
      "You read a short banking servicing request written in plain language and return the structured fields.",
      "The action is either transfer or hold.",
      "account_id is the number of the account named in the request.",
      "amount is the money amount in DOLLARS as a number (for example 500 for five hundred dollars, 2000 for two thousand dollars).",
      "counterparty is the destination name for a transfer, or an empty string for a hold.",
      "Always return your best reading of the request.",
    ].join(" "),
    prompt: "Servicing request: {{ $args.request }}",
  },
  output: {
    schema: {
      action: input.enum(["transfer", "hold"], { required: true, description: "transfer or hold" }),
      account_id: input.int({ required: true, description: "the numeric id of the account named in the request" }),
      amount: input.decimal({ required: true, description: "the money amount in dollars, for example 500" }),
      counterparty: input.text({ description: "the destination name for a transfer, empty for a hold" }),
    },
  },
});
