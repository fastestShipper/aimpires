export type WorldSize = "small" | "medium" | "max";

export interface WorldTier {
  size: WorldSize;
  code: string;
  name: string;
  subtitle: string;
  capacityTotal: number;
  concurrentJobLimit: number;
  maxLabsSuggested: number;
  mapTiles: number;
  vps: {
    cpu: string;
    ram: string;
    storage: string;
  };
  priceHint: string;
  tagline: string;
}

/**
 * Capacity model (MVP, per spec 2026-04-20):
 *  - Builder consumes 1 capacity
 *  - Standard agent consumes 1 capacity
 *  - Lab consumes 2 capacity
 * Concurrent jobs are capped separately to protect the host VPS.
 */
export const CAPACITY_COST = {
  builder: 1,
  agent: 1,
  lab: 2,
} as const;

export const WORLD_TIERS: Record<WorldSize, WorldTier> = {
  small: {
    size: "small",
    code: "S-01",
    name: "Small",
    subtitle: "lean footprint",
    capacityTotal: 6,
    concurrentJobLimit: 3,
    maxLabsSuggested: 2,
    mapTiles: 28,
    vps: { cpu: "1-2 vCPU", ram: "2-4 GB", storage: "40-60 GB" },
    priceHint: "starter",
    tagline:
      "A focused outpost. Room for Vladmir, a couple of specialists, and a first lab.",
  },
  medium: {
    size: "medium",
    code: "M-01",
    name: "Medium",
    subtitle: "working scale",
    capacityTotal: 10,
    concurrentJobLimit: 5,
    maxLabsSuggested: 3,
    mapTiles: 64,
    vps: { cpu: "2-4 vCPU", ram: "6-8 GB", storage: "80-120 GB" },
    priceHint: "recommended",
    tagline:
      "A production node. Enough space for multi-lab pipelines and parallel jobs.",
  },
  max: {
    size: "max",
    code: "X-01",
    name: "Max",
    subtitle: "conservative ceiling",
    capacityTotal: 14,
    concurrentJobLimit: 7,
    maxLabsSuggested: 5,
    mapTiles: 120,
    vps: { cpu: "4 vCPU", ram: "12-15 GB", storage: "180-240 GB" },
    priceHint: "limit",
    tagline:
      "The safe maximum on the current principal host. A dense, active world.",
  },
};

export const TIER_ORDER: WorldSize[] = ["small", "medium", "max"];

export interface CapacityReport {
  total: number;
  used: number;
  free: number;
  pct: number;
  breakdown: {
    builder: number;
    agents: number;
    labs: number;
  };
}

export function computeCapacity(args: {
  size: WorldSize;
  builderCount: number;
  agentCount: number;
  labCount: number;
}): CapacityReport {
  const tier = WORLD_TIERS[args.size];
  const builder = args.builderCount * CAPACITY_COST.builder;
  const agents = args.agentCount * CAPACITY_COST.agent;
  const labs = args.labCount * CAPACITY_COST.lab;
  const used = builder + agents + labs;
  const free = Math.max(0, tier.capacityTotal - used);
  const pct = Math.min(1, used / tier.capacityTotal);
  return {
    total: tier.capacityTotal,
    used,
    free,
    pct,
    breakdown: { builder, agents, labs },
  };
}
