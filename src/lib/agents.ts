// How the Agent data screen reads `residue.agents/v1`. Only type imports, so
// `node --test` runs the tests that import it.

import type { AgentReport, AgentStore, AgentsDocument } from "./types";

/** A store residue measured completely. A partial store is not this. */
export function wholeStore(store: AgentStore): boolean {
  return store.state === "ok";
}

/** Neither agent has a store or a worktree residue could see. */
export function noAgentData(doc: AgentsDocument): boolean {
  return doc.agents.every(
    (agent) => agent.stores.every((store) => store.state === "missing") && agent.worktrees.length === 0,
  );
}

/** The lines under one agent, in residue's order, skipping stores it did not find. */
export function storeLines(agent: AgentReport): AgentStore[] {
  return agent.stores.filter((store) => store.state !== "missing");
}
