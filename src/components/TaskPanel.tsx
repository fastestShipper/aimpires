"use client";

import { useEffect, useState } from "react";
import { AGENT_PROFILES } from "@/lib/agents";
import type { Agent } from "@/lib/store";
import { useWorld } from "@/lib/store";

interface ArtifactMeta {
  name: string;
  size: number;
  mtime: number;
}

interface Props {
  worldId: string;
  worldName: string;
  agent: Agent;
}

export default function TaskPanel({ worldId, worldName, agent }: Props) {
  const profile = AGENT_PROFILES[agent.kind];
  const log = useWorld((s) => s.log);

  const [task, setTask] = useState(profile.defaultTasks[0] ?? "");
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactMeta[]>([]);
  const [openArtifact, setOpenArtifact] = useState<string | null>(null);
  const [openContent, setOpenContent] = useState<string>("");

  async function loadArtifacts() {
    try {
      const r = await fetch(
        `/api/agents/${encodeURIComponent(agent.id)}/artifacts?worldId=${encodeURIComponent(worldId)}`,
      );
      const json = await r.json();
      if (json.success) setArtifacts(json.data);
    } catch {
      // swallow; UI remains usable
    }
  }

  useEffect(() => {
    setTask(profile.defaultTasks[0] ?? "");
    setOpenArtifact(null);
    setOpenContent("");
    loadArtifacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

  async function assignTask() {
    if (running || !task.trim()) return;
    setRunning(true);
    setErr(null);
    log(`${agent.name} begins: ${task.slice(0, 60)}${task.length > 60 ? "…" : ""}`);

    try {
      const r = await fetch("/api/agents/task", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          worldId,
          worldName,
          agentId: agent.id,
          agentName: agent.name,
          agentKind: agent.kind,
          task: task.trim(),
        }),
      });
      const json = await r.json();
      if (!json.success) {
        setErr(json.error ?? "failed");
        log(`${agent.name} stumbled: ${json.error ?? "failed"}`, "warn");
        return;
      }
      log(
        `${agent.name} produced ${json.data.filename}${json.data.simulated ? " (simulated)" : ""}.`,
        "good",
      );
      await loadArtifacts();
      setOpenArtifact(json.data.filename);
      setOpenContent(json.data.preview ?? "");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "request failed";
      setErr(msg);
      log(`${agent.name} could not be reached: ${msg}`, "warn");
    } finally {
      setRunning(false);
    }
  }

  async function openFile(name: string) {
    setOpenArtifact(name);
    setOpenContent("loading…");
    try {
      const r = await fetch(
        `/api/agents/${encodeURIComponent(agent.id)}/artifacts/${encodeURIComponent(name)}?worldId=${encodeURIComponent(worldId)}`,
      );
      const text = await r.text();
      setOpenContent(text);
    } catch {
      setOpenContent("(failed to load)");
    }
  }

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] mb-1">
              {profile.role}
            </div>
            <div className="font-display text-2xl">{agent.name}</div>
          </div>
          <span className="chip">
            <span className="chip-dot" />
            {agent.status}
          </span>
        </div>

        <div className="mb-3">
          <label className="block text-[9px] tracking-[0.25em] uppercase text-[var(--fg-dim)] mb-1.5">
            task
          </label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={2}
            disabled={running}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] focus:border-[var(--accent)] outline-none p-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg-dim)] resize-none transition-colors"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.defaultTasks.map((t) => (
              <button
                key={t}
                onClick={() => setTask(t)}
                disabled={running}
                className="text-[10px] px-2 py-1 border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent-dim)] hover:text-[var(--fg)] transition-colors disabled:opacity-50"
              >
                {t.length > 40 ? t.slice(0, 40) + "…" : t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={assignTask}
            disabled={running || !task.trim()}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running ? "Working…" : "Assign task"}
            {!running && (
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          {err && <span className="text-xs text-[var(--danger)]">{err}</span>}
        </div>
      </div>

      {/* Artifacts */}
      <div className="w-64 border-l border-[var(--border)] pl-4 flex-shrink-0">
        <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] mb-2 flex items-center justify-between">
          <span>artifacts</span>
          <span className="text-[var(--fg-muted)]">{artifacts.length}</span>
        </div>
        <div className="space-y-1 max-h-[120px] overflow-y-auto">
          {artifacts.length === 0 && (
            <div className="text-[11px] text-[var(--fg-muted)] italic">
              None yet. Assign a task.
            </div>
          )}
          {artifacts.map((a) => (
            <button
              key={a.name}
              onClick={() => openFile(a.name)}
              className={`w-full text-left px-2 py-1 text-[11px] font-mono truncate border transition-colors ${
                openArtifact === a.name
                  ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--border)]"
              }`}
              title={a.name}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {openArtifact && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={() => setOpenArtifact(null)}
        >
          <div
            className="bg-[var(--bg-elev)] border border-[var(--border-strong)] max-w-3xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] mb-1">
                  artifact · {profile.artifactLabel}
                </div>
                <div className="font-mono text-sm text-[var(--fg)]">{openArtifact}</div>
              </div>
              <button
                onClick={() => setOpenArtifact(null)}
                className="text-[var(--fg-muted)] hover:text-[var(--fg)] text-sm"
              >
                close ✕
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-6 text-xs leading-relaxed font-mono text-[var(--fg)] whitespace-pre-wrap">
              {openContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
