"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorld } from "@/lib/store";
import { WORLD_TIERS, type WorldSize } from "@/lib/worlds";
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
  const cities = useWorld((s) => s.cities);
  const gold = useWorld((s) => s.gold);
  const reputation = useWorld((s) => s.reputation);
  const age = useWorld((s) => s.age);
  const selectedAgentId = useWorld((s) => s.selectedAgentId);
  const selectedCityId = useWorld((s) => s.selectedCityId);
  const setSelectedAgent = useWorld((s) => s.setSelectedAgent);
  const setSelectedCity = useWorld((s) => s.setSelectedCity);
  const logs = useWorld((s) => s.logs);

  useEffect(() => {
    if (name !== worldName) {
      init({ id: worldId, name: worldName, size });
    }
  }, [worldId, worldName, size, name, init]);

  const tier = WORLD_TIERS[size];
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const selectedCity = cities.find((c) => c.id === selectedCityId);

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#08090c]/95 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("/")}
            className="text-xs tracking-[0.2em] uppercase text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
          >
            ← Leave realm
          </button>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-[var(--accent)] rotate-45 flex items-center justify-center">
              <span className="rotate-[-45deg] font-display text-[var(--accent)] text-xs">Æ</span>
            </div>
            <div>
              <div className="font-display text-xl leading-none">{worldName}</div>
              <div className="text-[9px] tracking-[0.25em] uppercase text-[var(--fg-dim)] mt-0.5">
                {tier.name} · turn {age}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5 text-xs">
          <Resource label="gold" value={gold} />
          <Resource label="rep" value={reputation} />
          <Resource label="citizens" value={`${agents.length}/${tier.maxAgents}`} />
          <Resource label="labs" value={`${cities.length}/${tier.maxLabs}`} />
        </div>
      </div>

      {/* Left panel — citizens */}
      <div className="absolute top-20 left-4 z-10 w-64 bg-[var(--bg-elev)]/95 backdrop-blur border border-[var(--border)] p-4 max-h-[60vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)]">Citizens</div>
          <span className="text-[10px] text-[var(--fg-muted)]">{agents.length}</span>
        </div>
        <div className="space-y-1.5">
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAgent(a.id)}
              className={`w-full text-left p-2.5 border transition-colors ${
                selectedAgentId === a.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--border)] hover:border-[var(--border-strong)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-base leading-tight">{a.name}</span>
                <span className="text-[9px] tracking-[0.2em] uppercase text-[var(--fg-dim)]">
                  Lv {a.level}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)]">
                  {a.kind}
                </span>
                <span className="text-[10px] text-[var(--fg-muted)]">· {a.status}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — labs */}
      <div className="absolute top-20 right-4 z-10 w-64 bg-[var(--bg-elev)]/95 backdrop-blur border border-[var(--border)] p-4 max-h-[60vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)]">Labs</div>
          <span className="text-[10px] text-[var(--fg-muted)]">{cities.length}/{tier.maxLabs}</span>
        </div>
        <div className="space-y-1.5">
          {cities.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCity(c.id)}
              className={`w-full text-left p-2.5 border transition-colors ${
                selectedCityId === c.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--border)] hover:border-[var(--border-strong)]"
              }`}
            >
              <div className="font-display text-base leading-tight">{c.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)]">
                  {c.kind.replace("-", " ")}
                </span>
                <span className="text-[10px] text-[var(--fg-muted)]">· Lv {c.level}</span>
              </div>
            </button>
          ))}
          {cities.length < tier.maxLabs && (
            <div className="mt-3 p-3 border border-dashed border-[var(--border-strong)] text-xs text-[var(--fg-muted)] leading-relaxed">
              Send the Builder to an empty tile to raise a new lab. (Coming next.)
            </div>
          )}
        </div>
      </div>

      {/* Bottom panel — selected details + log */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-3">
        <div className="flex-1 bg-[var(--bg-elev)]/95 backdrop-blur border border-[var(--border)] p-5 min-h-[140px]">
          {selectedAgent ? (
            <TaskPanel worldId={worldId} worldName={worldName} agent={selectedAgent} />
          ) : selectedCity ? (
            <CityDetail city={selectedCity} />
          ) : (
            <div className="text-[var(--fg-muted)] text-sm">
              <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] mb-2">
                your realm
              </div>
              <p className="font-display text-2xl text-[var(--fg)] mb-2">{worldName}</p>
              <p className="leading-relaxed">
                Click a citizen to select them, then click the ground to move. Click a lab to inspect. Your Builder is ready — more actions arriving next.
              </p>
            </div>
          )}
        </div>

        <div className="w-80 bg-[var(--bg-elev)]/95 backdrop-blur border border-[var(--border)] p-4 min-h-[140px] max-h-[240px] overflow-y-auto">
          <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] mb-3">
            Chronicle
          </div>
          <div className="space-y-2 text-xs">
            {logs.slice(0, 6).map((l, i) => (
              <div key={i} className="leading-relaxed">
                <span
                  className={`${
                    l.kind === "good"
                      ? "text-[var(--success)]"
                      : l.kind === "warn"
                        ? "text-[var(--danger)]"
                        : "text-[var(--fg-muted)]"
                  }`}
                >
                  ◆
                </span>{" "}
                <span className="text-[var(--fg)]">{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Resource({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[9px] tracking-[0.25em] uppercase text-[var(--fg-dim)]">{label}</span>
      <span className="font-mono text-sm text-[var(--fg)] tabular-nums">{value}</span>
    </div>
  );
}

function AgentDetail({ agent }: { agent: ReturnType<typeof useWorld.getState>["agents"][number] }) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] mb-1">citizen</div>
          <div className="font-display text-3xl">{agent.name}</div>
        </div>
        <span className="chip">
          <span className="chip-dot" />
          {agent.status}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-4 text-sm">
        <Mini label="role" value={agent.kind} />
        <Mini label="level" value={String(agent.level)} />
        <Mini label="xp" value={String(agent.xp)} />
        <Mini label="artifacts" value={String(agent.artifacts)} />
      </div>
      <p className="mt-4 text-xs text-[var(--fg-muted)] leading-relaxed">
        Click any tile on the map to send this citizen there. Task assignment arrives with the first lab.
      </p>
    </>
  );
}

function CityDetail({ city }: { city: ReturnType<typeof useWorld.getState>["cities"][number] }) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] mb-1">lab</div>
          <div className="font-display text-3xl">{city.name}</div>
        </div>
        <span className="chip">{city.kind.replace("-", " ")}</span>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <Mini label="level" value={String(city.level)} />
        <Mini label="status" value={city.underConstruction ? "building" : "ready"} />
        <Mini label="position" value={`${city.position[0]}, ${city.position[1]}`} />
      </div>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.25em] uppercase text-[var(--fg-dim)] mb-0.5">{label}</div>
      <div className="text-[var(--fg)] capitalize">{value}</div>
    </div>
  );
}
