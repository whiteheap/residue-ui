import { Button, Dialog } from "@cloudflare/kumo";
import { Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { ErrorPanel, Loading, SolidButton } from "../components/ui";
import { api, asCliError } from "../lib/api";
import { baseName } from "../lib/format";
import { PRUNE_DAYS, type PruneDays, type PruneDocument, pruneLines, wouldAct } from "../lib/prune";
import type { CliError } from "../lib/types";

type Phase =
  | { step: "choose" }
  | { step: "planning"; days: PruneDays }
  | { step: "plan"; days: PruneDays; plan: PruneDocument; notice: string | null }
  | { step: "running"; days: PruneDays; plan: PruneDocument }
  | { step: "done"; plan: PruneDocument }
  | { step: "error"; error: CliError };

/**
 * Move old Codex session logs to the trash. The age is chosen here; nothing
 * is selected for the user. The plan is `residue agents prune` without
 * `--yes`, which moves nothing. Confirm sends that plan's time and
 * fingerprint. Exit 4 shows the plan residue made and asks again.
 */
export function PruneDialog({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>({ step: "choose" });

  const plan = (days: PruneDays) => {
    setPhase({ step: "planning", days });
    api
      .planAgentPrune(days)
      .then((doc) => setPhase({ step: "plan", days, plan: doc, notice: null }))
      .catch((e) => setPhase({ step: "error", error: asCliError(e) }));
  };

  const confirm = (days: PruneDays, doc: PruneDocument) => {
    setPhase({ step: "running", days, plan: doc });
    api
      .confirmAgentPrune({ days, as_of: doc.generated_at, plan: doc.plan })
      .then((answer) => {
        if (answer.outcome === "stale") {
          setPhase({
            step: "plan",
            days,
            plan: answer.document,
            notice: "Confirm this plan to move what it shows now.",
          });
          return;
        }
        setPhase({ step: "done", plan: answer.document });
      })
      .catch((e) => setPhase({ step: "error", error: asCliError(e) }));
  };

  const busy = phase.step === "planning" || phase.step === "running";
  const doc = phase.step === "plan" || phase.step === "running" || phase.step === "done" ? phase.plan : null;
  const lines = doc ? pruneLines(doc) : [];

  return (
    <Dialog.Root
      role="alertdialog"
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog size="xl" className="dialog">
        <Dialog.Title className="dialog-title">
          {phase.step === "done" ? "Done" : "Move old Codex session logs"}
        </Dialog.Title>
        {phase.step === "choose" ? (
          <>
            <Dialog.Description className="dialog-text">
              Choose how old a Codex session log has to be. residue then shows what it would move. Nothing moves until you confirm that list.
            </Dialog.Description>
            <div className="dialog-buttons">
              {PRUNE_DAYS.map((days) => (
                <Button key={days} variant="secondary" onClick={() => plan(days)}>
                  {days} days
                </Button>
              ))}
            </div>
          </>
        ) : null}
        {phase.step === "planning" ? <Loading title="Reading the plan" /> : null}
        {phase.step === "error" ? (
          <>
            <ErrorPanel title="residue could not plan the move" error={phase.error} />
            <div className="dialog-buttons">
              <SolidButton onClick={onClose}>Close</SolidButton>
            </div>
          </>
        ) : null}
        {doc ? (
          <>
            {phase.step === "plan" && phase.notice ? (
              <Dialog.Description className="dialog-text">{phase.notice}</Dialog.Description>
            ) : null}
            {lines.length === 0 ? <p className="dialog-text">Nothing to move.</p> : null}
            <ul className="plan-list">
              {lines.map((line) => (
                <li key={`${line.result}:${line.path}`}>
                  <strong>{baseName(line.path)}</strong> {line.result}
                  {line.reason ? `: ${line.reason}` : ""}
                </li>
              ))}
            </ul>
            {phase.step === "running" ? <Loading title="Moving" /> : null}
            <div className="dialog-buttons">
              <Button variant="secondary" disabled={busy} onClick={onClose}>
                Close
              </Button>
              {phase.step === "plan" && wouldAct(phase.plan) ? (
                <SolidButton icon={<Trash />} onClick={() => confirm(phase.days, phase.plan)}>
                  Move to the trash
                </SolidButton>
              ) : null}
            </div>
          </>
        ) : null}
      </Dialog>
    </Dialog.Root>
  );
}
