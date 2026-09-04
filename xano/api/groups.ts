import { apiGroup } from "@xanots/sdk";

// One API group per concern. Each canonical is pinned (and namespaced with an
// "asa_" prefix so it stays unique on a shared instance) — pinning keeps the public
// path stable and lets getPath() resolve in the browser bundle without a lock file.
export const authGroup = apiGroup({ name: "auth", canonical: "asa_auth" });
export const servicingGroup = apiGroup({ name: "servicing", canonical: "asa_servicing" });
export const auditGroup = apiGroup({ name: "audit", canonical: "asa_audit" });
export const agentGroup = apiGroup({ name: "agent", canonical: "asa_agent" });
export const adminGroup = apiGroup({ name: "admin", canonical: "asa_admin" });
