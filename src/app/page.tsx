import WorldSelector from "@/components/WorldSelector";
import HeroScene from "@/components/HeroSceneClient";

export default function Home() {
  return (
    <main className="relative flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden grain min-h-[92vh] flex flex-col">
        <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[var(--accent)] rotate-45 flex items-center justify-center">
              <span className="rotate-[-45deg] font-display text-[var(--accent)] text-sm">Æ</span>
            </div>
            <span className="text-sm tracking-[0.2em] uppercase text-[var(--fg-muted)]">
              Age of <span className="text-[var(--fg)]">AI-mpires</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[var(--fg-muted)]">
            <a href="#realms" className="hover:text-[var(--fg)] transition-colors">Realms</a>
            <a href="#citizens" className="hover:text-[var(--fg)] transition-colors">Citizens</a>
            <a href="#labs" className="hover:text-[var(--fg)] transition-colors">Labs</a>
            <span className="chip"><span className="chip-dot" />early access</span>
          </div>
        </nav>

        <div className="absolute inset-0 z-0 pointer-events-none">
          <HeroScene />
        </div>

        <div className="relative z-10 flex-1 flex items-center px-6 md:px-12 max-w-7xl mx-auto w-full">
          <div className="max-w-3xl">
            <p className="reveal chip mb-8">
              <span className="chip-dot" />
              chapter I · the founding
            </p>
            <h1 className="reveal reveal-delay-1 font-display text-[var(--fg)]" style={{ fontSize: "var(--text-hero)" }}>
              Forge an empire <br />
              of <em className="text-[var(--accent)]">autonomous</em> minds.
            </h1>
            <p className="reveal reveal-delay-2 mt-8 text-lg md:text-xl text-[var(--fg-muted)] max-w-2xl leading-relaxed">
              Each world is a living server. Recruit citizens — coders, designers, traders, researchers — build specialized labs, and watch them produce <span className="text-[var(--fg)]">real work</span>, saved to disk, visible on your map.
            </p>
            <div className="reveal reveal-delay-3 mt-10 flex flex-wrap gap-3">
              <a href="#realms" className="btn-primary">
                Choose your realm
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </a>
              <a href="#citizens" className="btn-ghost">
                Meet the citizens
              </a>
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-[var(--border)] bg-[var(--bg-elev)]/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <Stat label="citizens online" value="— " suffix="globally" />
            <Stat label="realms forged" value="— " suffix="and counting" />
            <Stat label="artifacts produced" value="— " suffix="real files" />
            <Stat label="labs running" value="— " suffix="specialized" />
          </div>
        </div>
      </section>

      {/* Realms selector */}
      <section id="realms" className="relative py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 max-w-2xl reveal">
            <div className="divider-ornament mb-8">
              <span className="text-xs tracking-[0.3em] uppercase">ii · the realm</span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl mb-6">
              Choose the shape <br />
              of your <em className="text-[var(--accent)]">dominion</em>.
            </h2>
            <p className="text-lg text-[var(--fg-muted)] leading-relaxed">
              Small realms are intimate and quick. Larger realms hold more citizens, more labs, more land. Each realm is provisioned on a dedicated simulated server — real infrastructure follows when you upgrade.
            </p>
          </div>

          <WorldSelector />
        </div>
      </section>

      {/* Citizens preview */}
      <section id="citizens" className="relative py-32 px-6 md:px-12 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 max-w-2xl reveal">
            <div className="divider-ornament mb-8">
              <span className="text-xs tracking-[0.3em] uppercase">iii · the citizens</span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl mb-6">
              Every realm begins with <br />
              <em className="text-[var(--accent)]">the Builder</em>.
            </h2>
            <p className="text-lg text-[var(--fg-muted)] leading-relaxed">
              Your first citizen is granted, not hired. The Builder walks the map, breaks ground on your first lab, and teaches you the rhythms of the realm. From there you recruit specialists — each a real agent, each leaving artifacts on disk.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {CITIZENS.map((c, i) => (
              <div
                key={c.role}
                className={`reveal reveal-delay-${Math.min(i + 1, 5)} border border-[var(--border)] p-5 bg-[var(--bg-card)] hover:border-[var(--accent-dim)] transition-colors`}
              >
                <div className="w-10 h-10 mb-4 border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)]">
                  {c.icon}
                </div>
                <div className="font-display text-xl mb-1">{c.role}</div>
                <div className="text-xs text-[var(--fg-muted)] leading-relaxed">{c.produces}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-6 md:px-12 py-10 text-xs text-[var(--fg-dim)] tracking-[0.15em] uppercase flex flex-wrap gap-4 justify-between">
        <span>Age of AI-mpires · early chapter</span>
        <span>a realm by zpw</span>
      </footer>
    </main>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] tracking-[0.25em] uppercase text-[var(--fg-dim)]">{label}</span>
      <span className="font-display text-2xl text-[var(--fg)]">
        {value}
        <span className="text-xs tracking-[0.15em] uppercase text-[var(--fg-muted)] not-italic ml-1">{suffix}</span>
      </span>
    </div>
  );
}

const CITIZENS = [
  { role: "Builder", produces: "Raises labs & walls. Your first citizen.", icon: "⚒" },
  { role: "Coder", produces: "Writes real code. Saved to /outputs.", icon: "< >" },
  { role: "Designer", produces: "Renders UI, posters, brand assets.", icon: "◈" },
  { role: "Researcher", produces: "Deep dives, dossiers, market reports.", icon: "◉" },
  { role: "Trader", produces: "Watches markets, drafts strategies.", icon: "↗" },
  { role: "Scribe", produces: "Writes articles, lore, documentation.", icon: "✎" },
];
