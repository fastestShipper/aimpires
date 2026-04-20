import WorldHUD from "@/components/WorldHUD";
import WorldMap from "@/components/WorldMapClient";
import { TIER_ORDER, type WorldSize } from "@/lib/worlds";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ size?: string; name?: string }>;
}

export default async function WorldPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const sizeCandidate = (sp.size ?? "medium") as WorldSize;
  const size: WorldSize = TIER_ORDER.includes(sizeCandidate) ? sizeCandidate : "medium";
  const name = sp.name?.trim() || "new.world";

  return (
    <main className="fixed inset-0 overflow-hidden">
      <WorldMap size={size} />
      <WorldHUD worldId={id} worldName={name} size={size} />
    </main>
  );
}
