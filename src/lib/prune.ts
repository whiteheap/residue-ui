/** Ages the Agent data screen offers. There is no other duration. */
export const PRUNE_DAYS = [30, 60, 90] as const;

export type PruneDays = (typeof PRUNE_DAYS)[number];

export interface PruneResult {
  path: string;
  thread_id: string;
  bytes: number;
  result: string;
  reason: string | null;
}

export interface PrunePurge {
  entry: string;
  entry_path: string;
  result: string;
  reason: string | null;
}

export interface PruneDocument {
  schema: "residue.agents-prune/v1";
  generated_at: string;
  plan: string;
  results: PruneResult[];
  purged: PrunePurge[];
  errors: string[];
}

/** A plan without a terminal lists what it would move as `not_attempted`. */
export function wouldAct(doc: PruneDocument): boolean {
  return (
    doc.results.some((row) => row.result === "not_attempted") ||
    doc.purged.some((row) => row.result === "not_attempted")
  );
}

/** One line per thread the plan would move, plus each file it would not. */
export function pruneLines(doc: PruneDocument): { path: string; result: string; reason: string | null }[] {
  return [
    ...doc.results.map((row) => ({ path: row.path, result: row.result, reason: row.reason })),
    ...doc.purged.map((row) => ({
      path: row.entry_path,
      result: row.result,
      reason: row.reason,
    })),
  ];
}
