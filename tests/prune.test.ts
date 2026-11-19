import assert from "node:assert/strict";
import test from "node:test";
import { wouldAct, type PruneDocument } from "../src/lib/prune.ts";

function doc(results: PruneDocument["results"], purged: PruneDocument["purged"] = []): PruneDocument {
  return {
    schema: "residue.agents-prune/v1",
    generated_at: "2026-11-19T18:00:00Z",
    plan: "0123456789abcdef0123456789abcdef",
    results,
    purged,
    errors: [],
  };
}

test("a plan confirms only what it would still move", () => {
  const row = { path: "/s/a.jsonl", thread_id: "a", bytes: 1, result: "not_attempted", reason: null };
  assert.equal(wouldAct(doc([row])), true);
  assert.equal(wouldAct(doc([{ ...row, result: "skipped", reason: "in use by codex[1]" }])), false);
  assert.equal(
    wouldAct(doc([], [{ entry: "e", entry_path: "/trash/e", result: "not_attempted", reason: null }])),
    true,
  );
});
