import { workspace } from "@xanots/sdk";

// Tables
import { customers } from "./tables/customers.js";
import { agents } from "./tables/agents.js";
import { accounts } from "./tables/accounts.js";
import { transactions } from "./tables/transactions.js";
import { auditActions } from "./tables/audit-actions.js";

// API groups
import { authGroup, servicingGroup, auditGroup, agentGroup, adminGroup } from "./api/groups.js";

// The shared rule layer + the AI agent
import { servicingAction } from "./functions/servicing-action.js";
import { servicingAgent } from "./agents/servicing-agent.js";

// Endpoints
import { login, actors } from "./api/auth.js";
import { listAccounts, getAccount, transfer, hold, releaseHold } from "./api/servicing.js";
import { auditList } from "./api/audit.js";
import { agentRun } from "./api/agent.js";
import { seed } from "./api/admin.js";

// One governed access layer: a human ops user and an AI agent call the same
// permissioned, audited endpoints, held to the same per-actor authority limit.
export default workspace("account-servicing-agent-api")
  .registerTables([customers, agents, accounts, transactions, auditActions])
  .registerApiGroups([authGroup, servicingGroup, auditGroup, agentGroup, adminGroup])
  .registerFunctions([servicingAction])
  .registerAgents([servicingAgent])
  .registerQueries([login, actors, listAccounts, getAccount, transfer, hold, releaseHold, auditList, agentRun, seed]);
