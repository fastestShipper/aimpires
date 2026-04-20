"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorld } from "@/lib/store";
import { WORLD_TIERS, computeCapacity, type WorldSize } from "@/lib/worlds";
import { AGENT_PROFILES, LAB_BLUEPRINTS } from "@/lib/agents";
import TaskPanel from "@/components/TaskPanel";

interface HUDProps {
  worldId: string;
  worldName: string;
  size: WorldSize;
}

export default function WorldHUD({ worldId, worldName, size }: HUDProps) {
  const router = useRouter();
  const init = useWorld((s) => s.init);
  const name = useWorld((s) => s.name);
  const agents = useWorld((s) => s.agents);
  const labs = useWorld((s) => s.labs);
  const age = useWorld((s) => s.age);
  const targetVps = useWorld((s) => s.targetVps);
  const workspaceRoot = useWorld((s) => s.workspaceRoot);
  const selectedAgentId = useWorld((s) => s.selectedAgentId);
  const selectedLabId = useWorld((s) => s.selectedLabId);
  const setSelectedAgent = useWorld((s) => s.setSelectedAgent);
  const setSelectedLab = useWorld((s) => s.setSelectedLab);
  const events = useWorld((s) => s.events);

  useEffect(() => {
    if (name !== worldName) {
      init({ id: worldId, name: worldName, size });
    }
  }, [worldId, worldName, size, name, init]);

  const tier = WORLD_TIERS[size];
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const selectedLab = labs.find((l) => l.id === selectedLabId);

  const builderCount = agents.filter((a) => a.kind === "vladmir").length;
  const workerCount = agents.length - builderCount;
  const labCount = labs.length;
  const capacity = computeCapacity({
    size,
    builderCount,
    agentCount: workerCount,
    labCount,
  });

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-3.5 bg-gradient-to-b from-[var(--bg)]/95 via-[var(--bg)]/60 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/")}
            className="text-[10px] tracking-[0.25em] uppercase text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors font-mono"
          >
            ← exit world
          </button>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-[var(--accent)] flex items-center justify-center relative">
              <div className="w-1 h-1 bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
            </div>
            <div>
              <div className="font-display text-xl leading-none">{worldName}</div>
              <div className="text-[9px] tracking-[0.25em] uppercase text-[var(--fg-dim)] mt-1 font-mono">
                {tier.code} · tick {age.toString().padStart(4, "0")} · {targetVps}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 text-xs">
          <CapacityWidget capacity={capacity} />
          <Resource label="agents" value={`${agents.length}/${tier.capacityTotal}`} />
          <Resource label="labs" value={`${labCount}`} />
          <Resource label="jobs" value={`0/${tier.concurrentJobLimit}`} />
        </div>
      </div>

      {/* Left panel — agents */}
      <div className="absolute top-20 left-4 z-10 w-64 bg-[var(--bg-elev)]/95 backdrop-blur border border-[var(--border)] p-4 max-h-[62vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] font-mono">
            agents
          </div>
          <span className="badge">{agents.length}</span>
        </div>
        <div className="space-y-1.5">
          {agents.map((a) => {
            const profile = AGENT_PROFILES[a.kind];
            return (
              <button
                key={a.id}
                onClick={() => setSelectedAgent(a.id)}
                className={`w-full text-left p-2.5 border transition-colors ${
                  selectedAgentId === a.id
                    ? "border-[var(--accent)] bg-[rgba(94,227,215,0.06)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 border border-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] font-mono text-[10px]"
                      aria-hidden
                    >
                      {profile.glyph}
                    </span>
                    <span className="font-display text-base leading-tight">{a.name}</span>
                  </div>
                  <span className="text-[9px] tracking-[0.2em] uppercase text-[var(--fg-dim)] font-mono">
                    L{a.level}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-7">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] font-mono">
                    {a.kind}
                  </span>
                  <span className="text-[10px] text-[var(--fg-muted)]">· {a.status}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel — labs */}
      <div className="absolute top-20 right-4 z-10 w-64 bg-[var(--bg-elev)]/95 backdrop-blur border border-[var(--border)] p-4 max-h-[62vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] font-mono">
            labs
          </div>
          <span className="badge">{labs.length}</span>
        </div>
        <div className="space-y-1.5">
          {labs.map((l) => {
            const bp = LAB_BLUEPRINTS[l.kind];
            return (
              <button
                key={l.id}
                onClick={() => setSelectedLab(l.id)}
                className={`w-full text-left p-2.5 border transition-colors ${
                  selectedLabId === l.id
                    ? "border-[var(--accent)] bg-[rgba(94,227,215,0.06)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 border border-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] font-mono text-[10px]"
                      aria-hidden
                    >
                      {bp.glyph}
                    </span>
                    <span className="font-display text-base leading-tight">{l.name}</span>
                  </div>
                  <span className="text-[9px] text-[var(--fg-dim)] font-mono">L{l.level}</span>
                </div>
                <div className="ml-7 mt-1 text-[10px] text-[var(--fg-muted)] tracking-[0.1em] font-mono">
                  {l.kind} · {l.assignedAgentIds.length} staff
                </div>
              </button>
            );
          })}
          {capacity.free >= 2 && (
            <div className="mt-3 p-3 border border-dashed border-[var(--border-strong)] text-[11px] text-[var(--fg-muted)] leading-relaxed font-mono">
              Ask Vladmir to deploy a new lab. Each lab costs{" "}
              <span className="text-[var(--accent)]">2</span> capacity and houses 2+ specialized agents.
            </div>
          )}
        </div>
      </div>

      {/* Bottom panel — selected details + log */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-3">
        <div className="flex-1 bg-[var(--bg-elev)]/95 backdrop-blur border border-[var(--border)] p-5 min-h-[150px] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-dim)] to-transparent opacity-60" />
          {selectedAgent ? (
            <TaskPanel worldId={worldId} worldName={worldName} agent={selectedAgent} />
          ) : selectedLab ? (
            <LabDetail lab={selectedLab} />
          ) : (
            <EmptyDetail worldName={worldName} workspaceRoot={workspaceRoot} targetVps={targetVps} />
          )}
        </div>

        <div className="w-80 bg-[var(--bg-elev)]/95 backdrop-blur border border-[var(--border)] p-4 min-h-[150px] max-h-[240px] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] font-mono">
              event log
            </div>
            <span className="chip">
              <span className="chip-dot" />
              live
            </span>
          </div>
          <div className="space-y-2 text-[11px] font-mono leading-relaxed">
            {events.slice(0, 8).map((l, i) => (
              <div key={i} className="flex gap-2">
                <span
                  className={`flex-shrink-0 ${
                    l.kind === "good"
                      ? "text-[var(--accent)]"
                      : l.kind === "warn"
                        ? "text-[var(--danger)]"
                        : "text-[var(--fg-dim)]"
                  }`}
                >
                  ›
                </span>
                <span className="text-[var(--fg)] break-words">{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function CapacityWidget({
  capacity,
}: {
  capacity: ReturnType<typeof computeCapacity>;
}) {
  return (
    <div className="flex flex-col items-end min-w-[140px]">
      <div className="flex items-center gap-2">
        <span className="text-[9px] tracking-[0.25em] uppercase text-[var(--fg-dim)] font-mono">
          capacity
        </span>
        <span className="font-mono text-sm text-[var(--fg)] tabular-nums">
          <span className="text-[var(--accent)]">{capacity.used}</span>
          <span className="text-[var(--fg-dim)]">/{capacity.total}</span>
        </span>
      </div>
      <div className="w-32 mt-1 capacity-bar">
        <div
          className="capacity-bar-fill"
          style={{ width: `${capacity.pct * 100}%` }}
        />
      </div>
    </div>
  );
}

function Resource({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[9px] tracking-[0.25em] uppercase text-[var(--fg-dim)] font-mono">
        {label}
      </span>
      <span className="font-mono text-sm text-[var(--fg)] tabular-nums">{value}</span>
    </div>
  );
}

function EmptyDetail({
  worldName,
  workspaceRoot,
  targetVps,
}: {
  worldName: string;
  workspaceRoot: string;
  targetVps: string;
}) {
  return (
    <div className="text-sm">
      <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] font-mono mb-2">
        world context
      </div>
      <p className="font-display text-3xl text-[var(--fg)] mb-3">{worldName}</p>
      <div className="grid grid-cols-3 gap-6 text-[11px] font-mono">
        <div>
          <div className="text-[var(--fg-dim)] tracking-[0.15em] uppercase mb-1">target</div>
          <div className="text-[var(--fg)]">{targetVps}</div>
        </div>
        <div>
          <div className="text-[var(--fg-dim)] tracking-[0.15em] uppercase mb-1">workspace</div>
          <div className="text-[var(--fg)] break-all">{workspaceRoot}</div>
        </div>
        <div>
          <div className="text-[var(--fg-dim)] tracking-[0.15em] uppercase mb-1">state</div>
          <div className="text-[var(--accent)]">operational</div>
        </div>
      </div>
      <p className="mt-4 text-[12px] text-[var(--fg-muted)] leading-relaxed max-w-xl">
        Select Vladmir to deploy labs or spawn specialized agents. Click an empty tile to move him. Right-click any lab to inspect its pipeline.
      </p>
    </div>
  );
}

function LabDetail({ lab }: { lab: ReturnType<typeof useWorld.getState>["labs"][number] }) {
  const bp = LAB_BLUEPRINTS[lab.kind];
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] font-mono mb-1">
            lab · {lab.kind}
          </div>
          <div className="font-display text-3xl">{lab.name}</div>
        </div>
        <span className="badge badge-accent">L{lab.level}</span>
      </div>
      <p className="text-[13px] text-[var(--fg-muted)] leading-relaxed max-w-2xl mb-4">
        {bp.purpose}
      </p>
      <div className="grid grid-cols-4 gap-6 text-[11px] font-mono">
        <Mini label="status" value={lab.underConstruction ? "building" : "ready"} />
        <Mini label="capacity" value={`${bp.capacityCost}`} />
        <Mini label="staff" value={`${lab.assignedAgentIds.length}`} />
        <Mini label="position" value={`${lab.position[0]}, ${lab.position[1]}`} />
      </div>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[var(--fg-dim)] tracking-[0.15em] uppercase mb-1">{label}</div>
      <div className="text-[var(--fg)]">{value}</div>
    </div>
  );
}
