"use client";

import dynamic from "next/dynamic";

const HeroScene = dynamic(() => import("@/components/HeroScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[var(--bg)]" />,
});

export default function HeroSceneClient() {
  return <HeroScene />;
}
