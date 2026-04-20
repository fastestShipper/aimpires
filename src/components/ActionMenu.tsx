"use client";

import { useEffect, useState } from "react";
import { useWorld, type AgentKind, type LabKind } from "@/lib/store";
import { AGENT_PROFILES, LAB_BLUEPRINTS } from "@/lib/agents";
import { computeCapacity, CAPACITY_COST } from "@/lib/worlds";

type Tab = "build" | "spawn" | "assign" | "world";

const TABS: Array<{ id: Tab; label: string; glyph: string }> = [
  { id: "build", label: "Build lab", glyph: "▣" },
  { id: "spawn", label: "Spawn agent", glyph: "◈" },
  { id: "assign", label: "Assign task", glyph: "»" },
  { id: "world", label: "World ops", glyph: "◎" },
];

const PLACEABLE_LABS: LabKind[] = ["coding-lab", "research-lab", "design-lab"];
const SPAWNABLE_AGENTS: AgentKind[] = ["coder", "researcher", "designer"];

export default function ActionMenu({
  worldId,
  worldName,
  size,
}: {
  worldId: string;
  worldName: string;
  size: "small" | "medium" | "max";
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("build");
  const agents = useWorld((s) => s.agents);
  const labs = useWorld((s) => s.labs);
  const log = useWorld((s) => s.log);

  const builderCount = agents.filter((a) => a.kind === "vladmir").length;
  const workerCount = agents.length - builderCount;
  const capacity = computeCapacity({
    size,
    builderCount,
    agentCount: workerCount,
    labCount: labs.length,
  });

  const canBuildLab = capacity.free >= CAPACITY_COST.lab;
  const canSpawnAgent = capacity.free >= CAPACITY_COST.agent;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Trigger button — floating, always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-[12.5rem] right-4 z-30 flex items-center gap-3 px-5 py-3 border transition-all ${
          open
            ? "bg-[var(--accent)] text-[#03161a] border-[var(--accent)]"
            : "bg-[var(--bg-elev)] text-[var(--accent)] border-[var(--accent-dim)] hover:border-[var(--accent)]"
        }`}
        aria-expanded={open}
      >
        <span className="font-mono text-sm">{open ? "✕" : "⌘"}</span>
        <span className="font-mono text-[11px] tracking-[0.2em] uppercase">
          {open ? "close" : "actions"}
        </span>
        <span className="text-[10px] tracking-[0.15em] text-[var(--accent-dim)] font-mono hidden md:inline">
          {open ? "esc" : "ctrl+k"}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl max-h-[82vh] bg-[var(--bg-elev)] border border-[var(--border-strong)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top banner */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
            <div className="absolute inset-0 grid-bg opacity-[0.15] pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-center justify-between px-8 py-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border border-[var(--accent)] flex items-center justify-center">
                  <div className="w-1 h-1 bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] font-mono">
                    command console
                  </div>
                  <div className="font-display text-2xl leading-none mt-1">{worldName}</div>
                </div>
              </div>
              <div className="flex items-center gap-5 text-xs font-mono">
                <div className="text-right">
                  <div className="text-[9px] tracking-[0.25em] uppercase text-[var(--fg-dim)]">
                    capacity
                  </div>
                  <div className="text-[var(--fg)] tabular-nums">
                    <span className="text-[var(--accent)]">{capacity.used}</span>
                    <span className="text-[var(--fg-dim)]">/{capacity.total}</span>
                  </div>
                </div>
                <div className="w-28 capacity-bar">
                  <div className="capacity-bar-fill" style={{ width: `${capacity.pct * 100}%` }} />
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="ml-2 text-[var(--fg-muted)] hover:text-[var(--fg)] font-mono text-xs"
                >
                  close ✕
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="relative flex border-b border-[var(--border)]">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] tracking-[0.2em] uppercase font-mono transition-colors relative ${
                    tab === t.id
                      ? "text-[var(--accent)]"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  <span>{t.glyph}</span>
                  <span>{t.label}</span>
                  {tab === t.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />
                  )}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="relative flex-1 overflow-auto p-7">
              {tab === "build" && (
                <BuildLabPanel
                  worldId={worldId}
                  worldName={worldName}
                  canBuild={canBuildLab}
                  free={capacity.free}
                  onDone={() => setOpen(false)}
                />
              )}
              {tab === "spawn" && (
                <SpawnAgentPanel
                  worldId={worldId}
                  worldName={worldName}
                  canSpawn={canSpawnAgent}
                  free={capacity.free}
                  onDone={() => setOpen(false)}
                />
              )}
              {tab === "assign" && (
                <AssignTaskPanel worldId={worldId} worldName={worldName} />
              )}
              {tab === "world" && <WorldOpsPanel worldName={worldName} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- BUILD LAB ---------- */
function BuildLabPanel({
  worldId,
  worldName,
  canBuild,
  free,
  onDone,
}: {
  worldId: string;
  worldName: string;
  canBuild: boolean;
  free: number;
  onDone: () => void;
}) {
  const log = useWorld((s) => s.log);
  const labs = useWorld((s) => s.labs);
  const agents = useWorld((s) => s.agents);
  const deployLab = useWorld((s) => s.deployLab);
  const spawnAgent = useWorld((s) => s.spawnAgent);
  const [busy, setBusy] = useState<LabKind | null>(null);

  async function buildLab(kind: LabKind) {
    if (!canBuild || busy) return;
    setBusy(kind);
    const bp = LAB_BLUEPRINTS[kind];

    // Pick an empty tile away from existing labs.
    const taken = new Set(labs.map((l) => `${Math.round(l.position[0])}|${Math.round(l.position[1])}`));
    let placed: [number, number] = [4, 4];
    for (let r = 4; r < 18 && !placed; r++) {
      for (let a = 0; a < 360; a += 30) {
        const x = Math.round(Math.cos((a * Math.PI) / 180) * r);
        const z = Math.round(Math.sin((a * Math.PI) / 180) * r);
        if (!taken.has(`${x}|${z}`)) {
          placed = [x, z];
          break;
        }
      }
    }
    // Randomize among ring for variety
    const angle = (labs.length * 47) % 360;
    const ring = 5 + labs.length * 2;
    placed = [
      Math.round(Math.cos((angle * Math.PI) / 180) * ring),
      Math.round(Math.sin((angle * Math.PI) / 180) * ring),
    ];

    const labId = deployLab(kind, placed);

    // Auto-spawn the suggested agent composition inside the new lab.
    if (labId) {
      for (const agentKind of bp.suggestedAgents) {
        if (agentKind === "vladmir") continue;
        spawnAgent(agentKind, labId);
      }
    }

    // Ask Vladmir for a directive in the background.
    try {
      const vlad = agents.find((a) => a.kind === "vladmir");
      fetch("/api/agents/task", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          worldId,
          worldName,
          agentId: vlad?.id ?? "vladmir-0",
          agentName: vlad?.name ?? "Vladmir",
          agentKind: "vladmir",
          task: `Produce a deployment directive for the new ${bp.name} at position (${placed[0]}, ${placed[1]}). Composition: ${bp.suggestedAgents.join(", ")}. First job: spin up and write a README.md.`,
        }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json?.success) {
            log(`Vladmir filed ${bp.name} directive: ${json.data.filename}`, "info");
          }
        })
        .catch(() => {});
    } catch {}

    setBusy(null);
    onDone();
  }

  return (
    <div>
      <PanelHeader
        eyebrow="deploy a new lab"
        title="Pick a blueprint."
        body={`Each lab costs ${CAPACITY_COST.lab} capacity units and houses 2+ specialized agents. Vladmir drafts the directive and hands off to construction.`}
      />
      {!canBuild && (
        <div className="mb-6 border border-[var(--danger)]/40 bg-[var(--danger)]/5 px-4 py-3 text-[12px] text-[var(--danger)] font-mono">
          insufficient capacity · need {CAPACITY_COST.lab} · free {free}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PLACEABLE_LABS.map((kind) => {
          const bp = LAB_BLUEPRINTS[kind];
          const isBusy = busy === kind;
          return (
            <button
              key={kind}
              onClick={() => buildLab(kind)}
              disabled={!canBuild || !!busy}
              className="group text-left border border-[var(--border)] hover:border-[var(--accent-dim)] bg-[var(--bg-card)] p-5 transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-dim)] to-transparent opacity-50" />
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 border border-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] font-mono text-sm group-hover:border-[var(--accent)] transition-colors">
                  {bp.glyph}
                </div>
                <span className="badge badge-accent">cost {CAPACITY_COST.lab}</span>
              </div>
              <div className="font-display text-2xl mb-2">{bp.name}</div>
              <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed mb-3 min-h-[3em]">
                {bp.purpose}
              </p>
              <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-dim)] font-mono border-t border-dashed border-[var(--border)] pt-3">
                staff: {bp.suggestedAgents.join(" + ")}
              </div>
              {isBusy && (
                <div className="mt-3 text-[10px] text-[var(--accent)] font-mono">
                  drafting directive…
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- SPAWN AGENT ---------- */
function SpawnAgentPanel({
  worldId,
  worldName,
  canSpawn,
  free,
  onDone,
}: {
  worldId: string;
  worldName: string;
  canSpawn: boolean;
  free: number;
  onDone: () => void;
}) {
  const log = useWorld((s) => s.log);
  const agents = useWorld((s) => s.agents);
  const labs = useWorld((s) => s.labs);
  const spawnAgent = useWorld((s) => s.spawnAgent);
  const [busy, setBusy] = useState<AgentKind | null>(null);

  async function spawn(kind: AgentKind) {
    if (!canSpawn || busy) return;
    setBusy(kind);
    const profile = AGENT_PROFILES[kind];

    // Pick a lab matching role affinity, else any non-core lab, else core.
    const preferred: Record<AgentKind, string | undefined> = {
      vladmir: "core",
      coder: "coding-lab",
      researcher: "research-lab",
      designer: "design-lab",
    };
    const target =
      labs.find((l) => l.kind === preferred[kind]) ??
      labs.find((l) => l.kind !== "core") ??
      labs[0];
    const id = spawnAgent(kind, target?.id);

    // Background: Vladmir writes dossier
    try {
      const vlad = agents.find((a) => a.kind === "vladmir");
      fetch("/api/agents/task", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          worldId,
          worldName,
          agentId: vlad?.id ?? "vladmir-0",
          agentName: vlad?.name ?? "Vladmir",
          agentKind: "vladmir",
          task: `Produce the onboarding dossier for a new ${profile.title} citizen (${id}), assigned to ${target?.name ?? "core"}. Include role, 3 default tasks, and a short welcome note.`,
        }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json?.success) {
            log(`Dossier filed: ${json.data.filename}`, "info");
          }
        })
        .catch(() => {});
    } catch {}

    setBusy(null);
    onDone();
  }

  return (
    <div>
      <PanelHeader
        eyebrow="spawn a specialized agent"
        title="Pick a class."
        body={`Each standard agent costs ${CAPACITY_COST.agent} capacity unit. Vladmir writes the onboarding dossier and hands the new citizen their first job.`}
      />
      {!canSpawn && (
        <div className="mb-6 border border-[var(--danger)]/40 bg-[var(--danger)]/5 px-4 py-3 text-[12px] text-[var(--danger)] font-mono">
          insufficient capacity · need {CAPACITY_COST.agent} · free {free}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SPAWNABLE_AGENTS.map((kind) => {
          const p = AGENT_PROFILES[kind];
          const isBusy = busy === kind;
          return (
            <button
              key={kind}
              onClick={() => spawn(kind)}
              disabled={!canSpawn || !!busy}
              className="text-left border border-[var(--border)] hover:border-[var(--accent-dim)] bg-[var(--bg-card)] p-5 transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-dim)] to-transparent opacity-50" />
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 border border-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] font-mono text-sm group-hover:border-[var(--accent)] transition-colors">
                  {p.glyph}
                </div>
                <span className="badge badge-accent">cost {CAPACITY_COST.agent}</span>
              </div>
              <div className="font-display text-2xl mb-1">{p.title}</div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] mb-3 font-mono">
                {p.role}
              </div>
              <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed border-t border-dashed border-[var(--border)] pt-3">
                {p.description}
              </p>
              {isBusy && (
                <div className="mt-3 text-[10px] text-[var(--accent)] font-mono">
                  writing dossier…
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- ASSIGN TASK ---------- */
function AssignTaskPanel({
  worldId,
  worldName,
}: {
  worldId: string;
  worldName: string;
}) {
  const agents = useWorld((s) => s.agents);
  const log = useWorld((s) => s.log);
  const [selectedId, setSelectedId] = useState<string>(agents[0]?.id ?? "");
  const selected = agents.find((a) => a.id === selectedId);
  const profile = selected ? AGENT_PROFILES[selected.kind] : null;
  const [task, setTask] = useState<string>(profile?.defaultTasks[0] ?? "");
  const [busy, setBusy] = useState(false);

  function selectAgent(id: string) {
    setSelectedId(id);
    const a = agents.find((x) => x.id === id);
    if (a) setTask(AGENT_PROFILES[a.kind].defaultTasks[0] ?? "");
  }

  async function assign() {
    if (!selected || busy || !task.trim()) return;
    setBusy(true);
    log(`${selected.name} received order: ${task.slice(0, 60)}`, "info");
    try {
      const r = await fetch("/api/agents/task", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          worldId,
          worldName,
          agentId: selected.id,
          agentName: selected.name,
          agentKind: selected.kind,
          task: task.trim(),
        }),
      });
      const json = await r.json();
      if (json.success) {
        log(
          `${selected.name} produced ${json.data.filename}${json.data.simulated ? " (simulated)" : ""}.`,
          "good",
        );
      } else {
        log(`${selected.name} failed: ${json.error ?? "unknown"}`, "warn");
      }
    } catch (e) {
      log(`Request failed: ${e instanceof Error ? e.message : "?"}`, "warn");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PanelHeader
        eyebrow="give an order"
        title="Assign a task to any citizen."
        body="Pick the agent, write the task, confirm. Result saved to the world workspace under the agent's outputs folder."
      />
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5">
        <div className="border border-[var(--border)] p-3 bg-[var(--bg-card)] max-h-[320px] overflow-y-auto">
          <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] mb-2 font-mono px-1">
            roster ({agents.length})
          </div>
          <div className="space-y-1">
            {agents.map((a) => {
              const p = AGENT_PROFILES[a.kind];
              return (
                <button
                  key={a.id}
                  onClick={() => selectAgent(a.id)}
                  className={`w-full text-left p-2 border transition-colors ${
                    selectedId === a.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--border)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 border border-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] font-mono text-[10px]">
                      {p.glyph}
                    </span>
                    <span className="font-display text-base leading-tight">{a.name}</span>
                  </div>
                  <div className="ml-7 text-[10px] text-[var(--fg-muted)] tracking-[0.1em] uppercase font-mono mt-0.5">
                    {a.kind} · L{a.level}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {selected && profile ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] font-mono mb-1">
                    {profile.role}
                  </div>
                  <div className="font-display text-2xl">{selected.name}</div>
                </div>
                <span className="chip">
                  <span className="chip-dot" />
                  {selected.status}
                </span>
              </div>
              <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] mb-2 font-mono">
                order
              </label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                rows={4}
                disabled={busy}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] focus:border-[var(--accent)] outline-none p-3 text-sm text-[var(--fg)] placeholder:text-[var(--fg-dim)] resize-none transition-colors"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.defaultTasks.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTask(t)}
                    disabled={busy}
                    className="text-[10px] px-2 py-1 border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent-dim)] hover:text-[var(--fg)] transition-colors font-mono"
                  >
                    {t.length > 60 ? t.slice(0, 60) + "…" : t}
                  </button>
                ))}
              </div>
              <button
                onClick={assign}
                disabled={busy || !task.trim()}
                className="mt-5 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "executing…" : "execute order"}
                {!busy && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M1 7h12M8 2l5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </>
          ) : (
            <div className="text-[var(--fg-muted)] text-sm">No agent selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- WORLD OPS ---------- */
function WorldOpsPanel({ worldName }: { worldName: string }) {
  const labs = useWorld((s) => s.labs);
  const agents = useWorld((s) => s.agents);

  const ops = [
    {
      label: "Inspect world health",
      hint: "Current CPU, memory, disk, queue pressure — in both technical and world language.",
      disabled: false,
    },
    {
      label: "Review all artifacts",
      hint: "Open the per-world outputs explorer. Browse, preview, download.",
      disabled: false,
    },
    {
      label: "Save world snapshot",
      hint: "Serialize state to /state/snapshot-{timestamp}.json.",
      disabled: false,
    },
    {
      label: "Destructive: demolish a lab",
      hint: "Reclaim capacity. Asks confirmation.",
      disabled: labs.length <= 1,
      danger: true,
    },
    {
      label: "Destructive: remove an agent",
      hint: "Reclaim capacity. Asks confirmation.",
      disabled: agents.length <= 1,
      danger: true,
    },
  ];

  return (
    <div>
      <PanelHeader
        eyebrow="world operations"
        title="The sovereign panel."
        body="Actions that touch the whole realm. Destructive actions are legitimate and always ask for confirmation."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ops.map((o, i) => (
          <button
            key={i}
            disabled={o.disabled}
            className={`text-left p-4 border transition-all bg-[var(--bg-card)] disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden ${
              o.danger
                ? "border-[var(--danger)]/30 hover:border-[var(--danger)]"
                : "border-[var(--border)] hover:border-[var(--accent-dim)]"
            }`}
          >
            <div className="font-display text-lg mb-1">{o.label}</div>
            <div className="text-[11px] text-[var(--fg-muted)] leading-relaxed font-mono">
              {o.hint}
            </div>
            {o.disabled && (
              <div className="mt-2 text-[10px] tracking-[0.2em] uppercase text-[var(--fg-dim)] font-mono">
                unavailable
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="mt-5 text-[11px] text-[var(--fg-muted)] font-mono max-w-2xl">
        World: <span className="text-[var(--accent)]">{worldName}</span> · agents:{" "}
        {agents.length} · labs: {labs.length}
      </p>
    </div>
  );
}

/* ---------- shared ---------- */
function PanelHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mb-6 max-w-2xl">
      <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] font-mono mb-2">
        {eyebrow}
      </div>
      <h3 className="font-display text-3xl mb-2">{title}</h3>
      <p className="text-[13px] text-[var(--fg-muted)] leading-relaxed">{body}</p>
    </div>
  );
}
