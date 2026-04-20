export type WorldSize = "hamlet" | "city" | "kingdom";

export interface WorldTier {
  size: WorldSize;
  name: string;
  subtitle: string;
  maxAgents: number;
  maxLabs: number;
  mapTiles: number;
  vps: {
    cpu: string;
    ram: string;
    storage: string;
  };
  priceHint: string;
  tagline: string;
}

export const WORLD_TIERS: Record<WorldSize, WorldTier> = {
  hamlet: {
    size: "hamlet",
    name: "Hamlet",
    subtitle: "A quiet frontier",
    maxAgents: 4,
    maxLabs: 2,
    mapTiles: 24,
    vps: { cpu: "2 vCPU", ram: "4 GB", storage: "50 GB" },
    priceHint: "starter",
    tagline:
      "Four citizens, two labs, and enough land to prove your dominion.",
  },
  city: {
    size: "city",
    name: "City",
    subtitle: "The working heart",
    maxAgents: 10,
    maxLabs: 5,
    mapTiles: 64,
    vps: { cpu: "4 vCPU", ram: "8 GB", storage: "120 GB" },
    priceHint: "most chosen",
    tagline:
      "Ten citizens, five specialized labs, and rivers of production.",
  },
  kingdom: {
    size: "kingdom",
    name: "Kingdom",
    subtitle: "Full sovereignty",
    maxAgents: 24,
    maxLabs: 12,
    mapTiles: 144,
    vps: { cpu: "8 vCPU", ram: "16 GB", storage: "240 GB" },
    priceHint: "power",
    tagline:
      "An empire of agents, a constellation of labs, a map that stretches.",
  },
};

export const TIER_ORDER: WorldSize[] = ["hamlet", "city", "kingdom"];
