// The Agent data screen's reading of residue.agents/v1 (src/lib/agents.ts).

import assert from "node:assert/strict";
import test from "node:test";
import { noAgentData, storeLines, wholeStore } from "../src/lib/agents.ts";
import type { AgentsDocument, AgentStore } from "../src/lib/types.ts";

function store(over: Partial<AgentStore> & Pick<AgentStore, "store" | "state">): AgentStore {
  return {
    path: `/tmp/${over.store}`,
    verified: true,
    source_url: "https://example.test",
    link_target: null,
    files: null,
    apparent_bytes: null,
    allocated_bytes: null,
    last_change: null,
    activity: "not_observed",
    activity_reason: null,
    activity_detail: null,
    processes: null,
    errors: [],
    ...over,
  };
}

const doc: AgentsDocument = {
  schema: "residue.agents/v1",
  version: "0.0.15",
  generated_at: "2026-11-19T00:00:00Z",
  errors: [],
  warnings: [],
  agents: [
    {
      agent: "codex",
      root: "/tmp/codex",
      root_source: "default",
      link_target: null,
      worktrees: [],
      own_cleanup: [{ what: "codex delete THREAD", doc: "https://example.test" }],
      stores: [
        store({ store: "sessions", state: "ok", allocated_bytes: 100, files: 2 }),
        store({ store: "history", state: "missing" }),
        store({
          store: "logs",
          state: "partial",
          allocated_bytes: 5,
          errors: ["one file was unreadable"],
        }),
      ],
    },
    {
      agent: "claude",
      root: "/tmp/claude",
      root_source: "default",
      link_target: null,
      worktrees: [{ path: "/tmp/wt", owner: "claude" }],
      own_cleanup: [],
      stores: [store({ store: "projects", state: "missing" })],
    },
  ],
};

test("a partial store is listed and is not a whole store", () => {
  const agent = doc.agents[0];
  assert.ok(agent);
  const lines = storeLines(agent);
  assert.deepEqual(
    lines.map((s) => s.store),
    ["sessions", "logs"],
  );
  const whole = lines[0];
  const partial = lines[1];
  assert.ok(whole && partial);
  assert.equal(wholeStore(whole), true);
  assert.equal(wholeStore(partial), false);
  assert.equal(partial.allocated_bytes, 5);
});

test("missing stores on both agents, with no worktree, is no agent data", () => {
  const empty: AgentsDocument = {
    ...doc,
    agents: doc.agents.map((agent) => ({
      ...agent,
      worktrees: [],
      stores: agent.stores.map((s) => ({ ...s, state: "missing" as const })),
    })),
  };
  assert.equal(noAgentData(empty), true);
  assert.equal(noAgentData(doc), false);
});
