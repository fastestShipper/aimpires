"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIER_ORDER, WORLD_TIERS, type WorldSize } from "@/lib/worlds";

export default function WorldSelector() {
  const [selected, setSelected] = useState<WorldSize>("city");
  const [worldName, setWorldName] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const tier = WORLD_TIERS[selected];

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  async function forge() {
    if (busy) return;
    setBusy(true);
    const slug =
      worldName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") ||
      `realm-${Math.random().toString(36).slice(2, 7)}`;
    router.push(`/world/${slug}?size=${selected}&name=${encodeURIComponent(worldName.trim() || "New Realm")}`);
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {TIER_ORDER.map((size, idx) => {
          const t = WORLD_TIERS[size];
          const isSelected = selected === size;
          return (
            <div
              key={size}
              className={`world-card reveal reveal-delay-${idx + 1}`}
              data-selected={isSelected}
              onMouseMove={handleMove}
              onClick={() => setSelected(size)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(size);
                }
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <span className="chip">
                  <span className="chip-dot" />
                  {t.priceHint}
                </span>
                <span className="text-[10px] tracking-[0.2em] text-[var(--fg-dim)] uppercase">
                  tier {idx + 1}
                </span>
              </div>

              <h3 className="font-display text-4xl mb-1">{t.name}</h3>
              <p className="text-[var(--fg-muted)] text-sm mb-6 italic">{t.subtitle}</p>

              <p className="text-[var(--fg)] text-[0.95rem] leading-relaxed mb-6 min-h-[3.2em]">
                {t.tagline}
              </p>

              <div className="space-y-0">
                <div className="stat-row">
                  <span className="stat-label">citizens</span>
                  <span className="stat-value">up to {t.maxAgents}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">labs</span>
                  <span className="stat-value">up to {t.maxLabs}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">map</span>
                  <span className="stat-value">{t.mapTiles} tiles</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">cpu</span>
                  <span className="stat-value">{t.vps.cpu}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">memory</span>
                  <span className="stat-value">{t.vps.ram}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">storage</span>
                  <span className="stat-value">{t.vps.storage}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="reveal reveal-delay-4 border border-[var(--border)] bg-[var(--bg-elev)] p-8 md:p-10 flex flex-col md:flex-row gap-6 items-start md:items-end justify-between">
        <div className="flex-1 max-w-xl">
          <label className="block text-[10px] tracking-[0.25em] uppercase text-[var(--fg-dim)] mb-3">
            Name your realm
          </label>
          <input
            type="text"
            value={worldName}
            onChange={(e) => setWorldName(e.target.value)}
            placeholder="e.g. Aurelion, Thornhold, the Gilded Reach"
            className="w-full bg-transparent border-b border-[var(--border-strong)] focus:border-[var(--accent)] outline-none py-3 font-display text-2xl text-[var(--fg)] placeholder:text-[var(--fg-dim)] transition-colors"
            maxLength={40}
          />
          <p className="mt-3 text-xs text-[var(--fg-muted)]">
            Forging <span className="text-[var(--accent)]">{tier.name}</span> · {tier.maxAgents} citizen slots · {tier.maxLabs} lab sites · simulated VPS for now
          </p>
        </div>

        <button
          onClick={forge}
          disabled={busy}
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? "Forging…" : "Forge the realm"}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
