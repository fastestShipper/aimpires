import WorldSelector from "@/components/WorldSelector";
import HeroScene from "@/components/HeroSceneClient";

export default function Home() {
  return (
    <main className="relative flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[92vh] flex flex-col">
        <div className="absolute inset-0 grid-bg opacity-[0.35] pointer-events-none" />

        <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-[var(--accent)] flex items-center justify-center relative">
              <div className="w-1 h-1 bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
            </div>
            <span className="text-[11px] tracking-[0.25em] uppercase text-[var(--fg-muted)] font-mono">
              age of <span className="text-[var(--fg)]">ai-mpires</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-[11px] text-[var(--fg-muted)] font-mono tracking-[0.15em] uppercase">
            <a href="#worlds" className="hover:text-[var(--fg)] transition-colors">worlds</a>
            <a href="#agents" className="hover:text-[var(--fg)] transition-colors">agents</a>
            <a href="#labs" className="hover:text-[var(--fg)] transition-colors">labs</a>
            <span className="chip"><span className="chip-dot" />mvp</span>
          </div>
        </nav>

        <div className="absolute inset-0 z-0 pointer-events-none">
          <HeroScene />
        </div>

        <div className="relative z-10 flex-1 flex items-center px-6 md:px-12 max-w-7xl mx-auto w-full">
          <div className="max-w-3xl">
            <p className="reveal chip mb-8">
              <span className="chip-dot" />
              phase 01 · world boot
            </p>
            <h1
              className="reveal reveal-delay-1 font-display text-[var(--fg)]"
              style={{ fontSize: "var(--text-hero)" }}
            >
              Your VPS, <br />
              rendered as a <span className="glow-accent">world</span>.
            </h1>
            <p className="reveal reveal-delay-2 mt-8 text-lg md:text-xl text-[var(--fg-muted)] max-w-2xl leading-relaxed">
              Deploy Vladmir. Place specialized labs on the map. Spawn autonomous AI agents that produce <span className="text-[var(--fg)]">actual files</span> to disk. Scale capacity. Level a world.
            </p>
            <div className="reveal reveal-delay-3 mt-10 flex flex-wrap gap-3">
              <a href="#worlds" className="btn-primary">
                deploy a world
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1v12M1 7h12"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </a>
              <a href="#agents" className="btn-ghost">meet the agents</a>
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-[var(--border)] bg-[var(--bg-elev)]/70 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <Stat label="worlds online" value="00" />
            <Stat label="agents deployed" value="00" />
            <Stat label="artifacts produced" value="00" />
            <Stat label="jobs in flight" value="00" />
          </div>
        </div>
      </section>

      {/* Worlds selector */}
      <section id="worlds" className="relative py-28 px-6 md:px-12 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14 max-w-2xl reveal">
            <div className="divider-label mb-6">02 · pick a size</div>
            <h2 className="font-display text-5xl md:text-6xl mb-5 leading-[0.98]">
              Conservative tiers, <br />
              tuned to the principal <span className="text-[var(--accent)]">host</span>.
            </h2>
            <p className="text-base md:text-lg text-[var(--fg-muted)] leading-relaxed">
              Sizes are measured in capacity units, not marketing adjectives. Every world attaches to a real VPS, starts with one Builder (Vladmir), and scales up to its ceiling. The current host caps at <span className="text-[var(--fg)]">14 capacity units</span>.
            </p>
          </div>

          <WorldSelector />
        </div>
      </section>

      {/* Agents preview */}
      <section id="agents" className="relative py-28 px-6 md:px-12 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14 max-w-2xl reveal">
            <div className="divider-label mb-6">03 · the roster</div>
            <h2 className="font-display text-5xl md:text-6xl mb-5 leading-[0.98]">
              Vladmir boots first. <br />
              He decides the <span className="text-[var(--accent)]">rest</span>.
            </h2>
            <p className="text-base md:text-lg text-[var(--fg-muted)] leading-relaxed">
              Every world spawns Vladmir as its first agent. He deploys labs, hires specialists, and designs new classes on demand. The default roster below is the seed. Your world's roster evolves from there.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ROSTER.map((c, i) => (
              <div
                key={c.role}
                className={`reveal reveal-delay-${Math.min(i + 1, 5)} border border-[var(--border)] p-5 bg-[var(--bg-card)] hover:border-[var(--accent-dim)] transition-colors relative overflow-hidden`}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-dim)] to-transparent opacity-50" />
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 border border-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] font-mono">
                    {c.glyph}
                  </div>
                  <span className="badge">{c.id}</span>
                </div>
                <div className="font-display text-2xl mb-1">{c.role}</div>
                <div className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
                  {c.produces}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Labs preview */}
      <section id="labs" className="relative py-28 px-6 md:px-12 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14 max-w-2xl reveal">
            <div className="divider-label mb-6">04 · lab blueprints</div>
            <h2 className="font-display text-5xl md:text-6xl mb-5 leading-[0.98]">
              Labs are <span className="text-[var(--accent)]">mini-cities</span>. <br />
              Each houses 2+ agents.
            </h2>
            <p className="text-base md:text-lg text-[var(--fg-muted)] leading-relaxed">
              A lab is a structure on the map and a folder on disk. Every lab costs 2 capacity, demands a team, and routes its outputs to a dedicated workspace path.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {LABS.map((l, i) => (
              <div
                key={l.name}
                className={`reveal reveal-delay-${i + 1} border border-[var(--border)] p-5 bg-[var(--bg-card)] relative overflow-hidden`}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-dim)] to-transparent opacity-50" />
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-display text-2xl">{l.name}</div>
                    <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg-muted)] font-mono mt-1">
                      staff: {l.staff}
                    </div>
                  </div>
                  <span className="badge badge-accent">cap 2</span>
                </div>
                <p className="text-[12px] text-[var(--fg-muted)] leading-relaxed">
                  {l.purpose}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-6 md:px-12 py-8 text-[10px] text-[var(--fg-dim)] tracking-[0.25em] uppercase flex flex-wrap gap-4 justify-between font-mono">
        <span>age of ai-mpires · phase 01</span>
        <span>deployed by zpw</span>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] tracking-[0.28em] uppercase text-[var(--fg-dim)] font-mono">
        {label}
      </span>
      <span className="font-display text-2xl text-[var(--fg)]">{value}</span>
    </div>
  );
}

const ROSTER = [
  { role: "Vladmir", id: "B-00", glyph: "◈", produces: "The founding builder. Deploys labs, spawns agents, designs new classes. Backed by Hermes." },
  { role: "Coder", id: "C-01", glyph: "<>", produces: "Writes real runnable code. Saves files to the coding-lab workspace." },
  { role: "Researcher", id: "R-01", glyph: "◉", produces: "Runs dossiers and briefings. Pairs with designers and coders to ground decisions." },
  { role: "Designer", id: "D-01", glyph: "◇", produces: "Delivers design briefs: palette, typography, layout, variants." },
];

const LABS = [
  {
    name: "Coding Lab",
    staff: "Coder + Researcher",
    purpose:
      "The factory floor. Writes, reviews, and ships code. Every job ends as a runnable file on disk.",
  },
  {
    name: "Research Lab",
    staff: "Researcher + Researcher",
    purpose:
      "Market scans, dossiers, competitive briefings. A pair of analysts keeps each other honest.",
  },
  {
    name: "Design Lab",
    staff: "Designer + Researcher",
    purpose:
      "Brand, UI, creative direction. Grounded in trend research, executed as tight design briefs.",
  },
];
