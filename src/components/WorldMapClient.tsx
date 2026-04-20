"use client";

import dynamic from "next/dynamic";
import type { WorldSize } from "@/lib/worlds";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-[var(--fg-muted)] text-sm tracking-[0.2em] uppercase">
      forging terrain…
    </div>
  ),
});

export default function WorldMapClient({ size }: { size: WorldSize }) {
  return <WorldMap size={size} />;
}
