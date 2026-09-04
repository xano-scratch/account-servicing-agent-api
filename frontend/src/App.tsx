import * as React from "react";
import { Landmark, RefreshCw } from "lucide-react";

import { AppProvider, useApp } from "@/lib/app-context";
import { formatCents, titleCase } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AccountsScreen } from "@/components/accounts-screen";
import { ServicingConsole } from "@/components/servicing-console";
import { AgentPanel } from "@/components/agent-panel";
import { AuditTrail } from "@/components/audit-trail";

const TABS = [
  { key: "servicing", label: "Servicing console" },
  { key: "agent", label: "Agent panel" },
  { key: "audit", label: "Audit trail" },
  { key: "accounts", label: "Accounts" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function useHashTab(): [TabKey, (t: TabKey) => void] {
  const read = (): TabKey => {
    const h = (typeof window !== "undefined" ? window.location.hash.replace("#", "") : "") as TabKey;
    return TABS.some((t) => t.key === h) ? h : "servicing";
  };
  const [tab, setTab] = React.useState<TabKey>(read);
  React.useEffect(() => {
    const onHash = () => setTab(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const select = (t: TabKey) => {
    window.location.hash = t;
    setTab(t);
  };
  return [tab, select];
}

function Shell() {
  const { ready, error, actors, actor, selectActor, reseed, busy } = useApp();
  const [tab, setTab] = useHashTab();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Landmark className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Account Servicing Agent API</h1>
              <p className="text-sm text-muted-foreground">
                One rule layer for a human ops user and an AI agent.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="min-w-56">
              <Select
                aria-label="Acting actor"
                value={actor?.name ?? ""}
                disabled={!actors.length || busy}
                onChange={(e) => void selectActor(e.target.value)}
              >
                {actors.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name} - {titleCase(a.role)} ({formatCents(a.authority_limit_cents)})
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" size="icon" disabled={busy} onClick={() => void reseed()} title="Reset demo data">
              <RefreshCw className={busy ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 md:px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors " +
                (tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl p-4 md:p-6">
        {!ready && <p className="text-sm text-muted-foreground">Loading the servicing environment...</p>}
        {ready && error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
        {ready && !error && (
          <>
            {tab === "servicing" && <ServicingConsole />}
            {tab === "agent" && <AgentPanel />}
            {tab === "audit" && <AuditTrail />}
            {tab === "accounts" && <AccountsScreen />}
          </>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted-foreground md:px-6">
        Authority limits are enforced at the API layer for every actor. Demo data resets on request.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
