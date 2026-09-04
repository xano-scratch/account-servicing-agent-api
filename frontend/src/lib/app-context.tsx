import * as React from "react";

import { listActors, login, seedDemo, type Actor } from "@/lib/api";

/** Every seeded actor shares this demo password; it is not a secret. */
export const DEMO_PASSWORD = "servicing-demo";

type AppState = {
  ready: boolean;
  error: string | null;
  actors: Actor[];
  actor: Actor | null;
  token: string | null;
  refreshKey: number;
  busy: boolean;
  selectActor: (name: string) => Promise<void>;
  refresh: () => void;
  reseed: () => Promise<void>;
  actorName: (id: number | null | undefined) => string;
};

const AppContext = React.createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actors, setActors] = React.useState<Actor[]>([]);
  const [actor, setActor] = React.useState<Actor | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const signIn = React.useCallback(async (a: Actor) => {
    const res = await login({ name: a.name, password: DEMO_PASSWORD });
    setToken(res.token as string);
    setActor(a);
  }, []);

  const selectActor = React.useCallback(
    async (name: string) => {
      const next = actors.find((x) => x.name === name);
      if (!next) return;
      setBusy(true);
      setError(null);
      try {
        await signIn(next);
        setRefreshKey((k) => k + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [actors, signIn],
  );

  const refresh = React.useCallback(() => setRefreshKey((k) => k + 1), []);

  const reseed = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await seedDemo();
      const list = await listActors();
      setActors(list);
      const keep = (actor && list.find((x) => x.name === actor.name)) || list[0] || null;
      if (keep) await signIn(keep);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [actor, signIn]);

  const actorName = React.useCallback(
    (id: number | null | undefined) => {
      if (id == null) return "";
      const found = actors.find((x) => x.id === id);
      return found ? found.name : `Actor #${id}`;
    },
    [actors],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let list = await listActors();
        if (!cancelled && (!list || list.length === 0)) {
          // Fresh ephemeral: seed the demo, then read the actors back.
          await seedDemo();
          list = await listActors();
        }
        if (cancelled) return;
        setActors(list);
        const first = list[0] ?? null;
        if (first) {
          const res = await login({ name: first.name, password: DEMO_PASSWORD });
          if (cancelled) return;
          setToken(res.token as string);
          setActor(first);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value: AppState = {
    ready,
    error,
    actors,
    actor,
    token,
    refreshKey,
    busy,
    selectActor,
    refresh,
    reseed,
    actorName,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
