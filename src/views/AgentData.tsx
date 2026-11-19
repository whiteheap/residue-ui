import { Button } from "@cloudflare/kumo";
import { ArrowClockwise, HardDrives } from "@phosphor-icons/react";
import { noAgentData, storeLines, wholeStore } from "../lib/agents";
import { api } from "../lib/api";
import { bytes, tilde } from "../lib/format";
import type { AgentStore } from "../lib/types";
import { useCli } from "../lib/useCli";
import { ErrorPanel, Loading, PageHeader } from "../components/ui";

/**
 * What Codex and Claude Code keep on disk (`residue agents --json`). The
 * app does not read those folders. A residue without the command says so.
 */
export function AgentData({
  roots,
  home,
  refreshKey,
  onOpenWorktree,
}: {
  roots: string[];
  home: string | undefined;
  refreshKey: number;
  /** Open that worktree's row on the Worktrees screen. */
  onOpenWorktree: (path: string) => void;
}) {
  const key = `${refreshKey}:${JSON.stringify(roots)}`;
  const q = useCli(key, () => api.agentsReport(roots));
  const doc = q.data;
  const error = q.error;
  const unavailable = error?.kind === "invalid";

  return (
    <>
      <PageHeader
        title="Agent data"
        description="What Codex and Claude Code keep on disk, from residue."
        actions={
          <Button
            variant="secondary"
            icon={<ArrowClockwise />}
            loading={q.loading}
            disabled={q.loading}
            onClick={q.reload}
          >
            Read again
          </Button>
        }
      />
      <div className="page-body" aria-busy={q.loading}>
        {unavailable ? (
          <p className="dialog-text">Agent data is not available in this residue.</p>
        ) : error ? (
          <ErrorPanel
            title={error.kind === "timeout" ? "The report timed out" : "residue could not report agent data"}
            error={error}
            action={
              <Button variant="secondary" icon={<ArrowClockwise />} onClick={q.reload}>
                Try again
              </Button>
            }
          />
        ) : null}
        {!doc && q.loading ? <Loading title="Reading agent data" /> : null}
        {doc && noAgentData(doc) ? (
          <p className="dialog-text">
            <HardDrives size={18} aria-hidden /> residue found no agent data.
          </p>
        ) : null}
        {doc && !noAgentData(doc)
          ? doc.agents.map((agent) => (
              <section className="block" key={agent.agent} aria-labelledby={`agent-${agent.agent}`}>
                <h2 id={`agent-${agent.agent}`}>
                  {agent.agent} <span className="hint">{tilde(agent.root, home)}</span>
                </h2>
                {agent.link_target ? (
                  <p className="hint">Symbolic link to {tilde(agent.link_target, home)}. Nothing under it was measured.</p>
                ) : null}
                <ul className="plan-list">
                  {storeLines(agent).map((store) => (
                    <li key={store.store}>
                      <StoreLine store={store} home={home} />
                    </li>
                  ))}
                </ul>
                {agent.worktrees.length > 0 ? (
                  <p>
                    Worktrees:{" "}
                    {agent.worktrees.map((w) => (
                      <button key={w.path} type="button" className="link" onClick={() => onOpenWorktree(w.path)}>
                        {tilde(w.path, home)}
                      </button>
                    ))}
                  </p>
                ) : null}
                {agent.own_cleanup.length > 0 ? (
                  <p className="hint">{agent.own_cleanup.map((item) => item.what).join(" ")}</p>
                ) : null}
              </section>
            ))
          : null}
        {doc && doc.errors.length > 0 ? (
          <p className="hint">Could not inspect: {doc.errors.join(" ")}</p>
        ) : null}
      </div>
    </>
  );
}

function StoreLine({ store, home }: { store: AgentStore; home: string | undefined }) {
  const size = store.allocated_bytes != null ? bytes(store.allocated_bytes) : null;
  const when = store.last_change ? `newest ${store.last_change.what}` : null;
  const activity = store.activity ?? "not reported";
  return (
    <p>
      <strong>{store.store}</strong> {store.state}
      {store.state === "symlink" && store.link_target ? ` to ${tilde(store.link_target, home)}` : ""}
      {store.state === "partial" ? ", not the whole store" : ""}
      {wholeStore(store) && size ? `, ${size}` : ""}
      {store.state === "partial" && size ? `, ${size} read so far` : ""}
      {store.files != null && store.state !== "missing" ? `, ${store.files} files` : ""}
      {when ? `, ${when}` : ""}. {activity}
      {store.activity_detail ? `: ${store.activity_detail}` : ""}
      {store.verified ? "" : " Not verified."}
      {store.errors.length > 0 ? ` ${store.errors[0]}` : ""}
    </p>
  );
}
