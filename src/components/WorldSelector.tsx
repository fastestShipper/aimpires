"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIER_ORDER, WORLD_TIERS, type WorldSize } from "@/lib/worlds";

export default function WorldSelector() {
  const [selected, setSelected] = useState<WorldSize>("medium");
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

  async function deploy() {
    if (busy) return;
    setBusy(true);
    const slug =
      worldName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") || `w-${Math.random().toString(36).slice(2, 7)}`;
    router.push(
      `/world/${slug}?size=${selected}&name=${encodeURIComponent(worldName.trim() || "new.world")}`,
    );
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
                <span className="badge badge-accent">{t.code}</span>
                <span className="chip">
                  <span className="chip-dot" />
                  {t.priceHint}
                </span>
              </div>

              <h3 className="font-display text-4xl mb-1 text-[var(--fg)]">{t.name}</h3>
              <p className="text-[var(--fg-muted)] text-xs tracking-[0.2em] uppercase mb-5 font-mono">
                {t.subtitle}
              </p>

              <p className="text-[var(--fg)] text-[0.95rem] leading-relaxed mb-6 min-h-[3.2em]">
                {t.tagline}
              </p>

              <div className="space-y-0">
                <div className="stat-row">
                  <span className="stat-label">capacity</span>
                  <span className="stat-value">
                    <span className="text-[var(--accent)]">{t.capacityTotal}</span>
                    <span className="text-[var(--fg-dim)]"> units</span>
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">concurrent jobs</span>
                  <span className="stat-value">{t.concurrentJobLimit}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">labs · suggested</span>
                  <span className="stat-value">{t.maxLabsSuggested}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">map tiles</span>
                  <span className="stat-value">{t.mapTiles}</span>
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

      <div className="reveal reveal-delay-4 border border-[var(--border)] bg-[var(--bg-elev)] p-7 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-end justify-between relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="flex-1 max-w-xl relative z-10">
          <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--fg-dim)] mb-2 font-mono">
            world identifier
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)] font-mono text-xl">$</span>
            <input
              type="text"
              value={worldName}
              onChange={(e) => setWorldName(e.target.value)}
              placeholder="deploy.atlas-01"
              className="flex-1 bg-transparent border-b border-[var(--border-strong)] focus:border-[var(--accent)] outline-none py-2 font-display text-2xl text-[var(--fg)] placeholder:text-[var(--fg-dim)] transition-colors"
              maxLength={40}
            />
          </div>
          <p className="mt-3 text-xs text-[var(--fg-muted)] font-mono">
            tier <span className="text-[var(--accent)]">{tier.code}</span>{" "}
            <span className="text-[var(--fg-dim)]">·</span> {tier.capacityTotal} capacity units{" "}
            <span className="text-[var(--fg-dim)]">·</span> {tier.concurrentJobLimit} concurrent jobs{" "}
            <span className="text-[var(--fg-dim)]">·</span> attaching to principal VPS
          </p>
        </div>

        <button
          onClick={deploy}
          disabled={busy}
          className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed relative z-10"
        >
          {busy ? "deploying…" : "deploy world"}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 7h12M8 2l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
