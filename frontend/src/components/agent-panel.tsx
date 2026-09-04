import * as React from "react";
import { Bot, ShieldCheck, ShieldX, Sparkles } from "lucide-react";

import { useApp } from "@/lib/app-context";
import { runAgent, type AgentRunResult } from "@/lib/api";
import { formatCents, reasonLabel, titleCase } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const EXAMPLES = [
  "Move 500 dollars from account 1 to Acme Supplies",
  "Transfer 2000 dollars from account 1 to Global Freight",
  "Place a hold of 300 dollars on account 1",
];

type ResultView = {
  action: string;
  accountId: number | null;
  amountCents: number;
  counterparty: string;
  outcome: string;
  reason: string;
};

function toView(r: AgentRunResult): ResultView {
  const root = r as { interpreted?: unknown; result?: unknown };
  const i = (root.interpreted ?? {}) as {
    action?: unknown;
    account_id?: unknown;
    amount_cents?: unknown;
    counterparty?: unknown;
  };
  const res = (root.result ?? {}) as { outcome?: unknown; reason?: unknown };
  return {
    action: typeof i.action === "string" ? i.action : "",
    accountId: typeof i.account_id === "number" ? i.account_id : null,
    amountCents: typeof i.amount_cents === "number" ? i.amount_cents : 0,
    counterparty: typeof i.counterparty === "string" ? i.counterparty : "",
    outcome: typeof res.outcome === "string" ? res.outcome : "",
    reason: typeof res.reason === "string" ? res.reason : "",
  };
}

export function AgentPanel() {
  const { token, actor, actors, selectActor, refresh } = useApp();
  const [prompt, setPrompt] = React.useState(EXAMPLES[0]);
  const [result, setResult] = React.useState<ResultView | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const aiActor = actors.find((a) => a.actor_kind === "agent");
  const runningAsAgent = actor?.actor_kind === "agent";

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await runAgent(token, prompt);
      setResult(toView(res));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4" /> Agent panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Running as</span>
              <span className="flex items-center gap-2 font-medium">
                <Badge variant={runningAsAgent ? "default" : "secondary"}>
                  {titleCase(actor?.actor_kind)}
                </Badge>
                {actor?.name}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Authority limit</span>
              <span className="font-semibold">{formatCents(actor?.authority_limit_cents ?? 0)}</span>
            </div>
            {!runningAsAgent && aiActor && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Run as the AI agent to see it bound by the agent limit.
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => void selectActor(aiActor.name)}
                >
                  Act as {aiActor.name}
                </Button>
              </div>
            )}
          </div>

          <form className="space-y-3" onSubmit={run}>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe a servicing request in plain language"
            />
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <Button
                  key={ex}
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => setPrompt(ex)}
                >
                  {ex}
                </Button>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy || !token}>
              <Sparkles /> {busy ? "Running..." : "Run request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What the agent did</CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Parsed request</div>
                <div className="mt-1 rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <span className="font-medium">{titleCase(result.action) || "Action"}</span> of{" "}
                  {formatCents(result.amountCents)} on account {result.accountId ?? "?"}
                  {result.counterparty ? ` to ${result.counterparty}` : ""}.
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Governed outcome</div>
                <div
                  className={
                    "mt-1 flex items-center justify-between gap-2 rounded-md border p-3 " +
                    (result.outcome === "allowed"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-destructive/30 bg-destructive/5")
                  }
                >
                  <span className="flex items-center gap-2 font-medium">
                    {result.outcome === "allowed" ? (
                      <ShieldCheck className="size-4 text-emerald-400" />
                    ) : (
                      <ShieldX className="size-4 text-destructive" />
                    )}
                    {result.outcome === "allowed" ? "Allowed" : "Refused"}
                  </span>
                  <Badge variant={result.outcome === "allowed" ? "success" : "destructive"}>
                    {reasonLabel(result.reason)}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The agent only parsed the words. The same rule layer that a human hits enforced the
                authority limit, so the agent could not exceed {formatCents(actor?.authority_limit_cents ?? 0)}.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Send a request to see the agent parse it and the rule layer decide.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
