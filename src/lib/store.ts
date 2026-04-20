"use client";

import { create } from "zustand";
import type { WorldSize } from "@/lib/worlds";

export type AgentKind =
  | "builder"
  | "coder"
  | "designer"
  | "researcher"
  | "trader"
  | "scribe";

export type AgentStatus = "idle" | "walking" | "working" | "returning";

export interface Agent {
  id: string;
  kind: AgentKind;
  name: string;
  level: number;
  xp: number;
  status: AgentStatus;
  position: [number, number]; // tile coords
  target: [number, number] | null;
  homeCity: string | null; // city id
  currentTask: string | null;
  artifacts: number;
}

export type LabKind =
  | "town-hall"
  | "code-forge"
  | "design-atelier"
  | "research-library"
  | "trading-post"
  | "scriptorium";

export interface City {
  id: string;
  kind: LabKind;
  name: string;
  position: [number, number];
  level: number;
  underConstruction: boolean;
  constructionProgress: number; // 0..1
}

export interface WorldState {
  id: string;
  name: string;
  size: WorldSize;
  age: number; // game ticks
  gold: number;
  reputation: number;
  agents: Agent[];
  cities: City[];
  selectedAgentId: string | null;
  selectedCityId: string | null;
  logs: Array<{ t: number; msg: string; kind: "info" | "good" | "warn" }>;
  setSelectedAgent: (id: string | null) => void;
  setSelectedCity: (id: string | null) => void;
  moveAgent: (id: string, target: [number, number]) => void;
  tick: () => void;
  init: (args: { id: string; name: string; size: WorldSize }) => void;
  log: (msg: string, kind?: "info" | "good" | "warn") => void;
}

function randomTile(radius: number): [number, number] {
  while (true) {
    const x = Math.round((Math.random() * 2 - 1) * radius);
    const z = Math.round((Math.random() * 2 - 1) * radius);
    if (Math.sqrt(x * x + z * z) <= radius) return [x, z];
  }
}

export const useWorld = create<WorldState>((set, get) => ({
  id: "",
  name: "",
  size: "city",
  age: 0,
  gold: 100,
  reputation: 0,
  agents: [],
  cities: [],
  selectedAgentId: null,
  selectedCityId: null,
  logs: [],

  setSelectedAgent: (id) => set({ selectedAgentId: id, selectedCityId: null }),
  setSelectedCity: (id) => set({ selectedCityId: id, selectedAgentId: null }),

  moveAgent: (id, target) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, target, status: "walking" } : a)),
    })),

  log: (msg, kind = "info") =>
    set((s) => ({
      logs: [{ t: Date.now(), msg, kind }, ...s.logs].slice(0, 50),
    })),

  init: ({ id, name, size }) => {
    const townHall: City = {
      id: "town-hall",
      kind: "town-hall",
      name: `${name} Hall`,
      position: [0, 0],
      level: 1,
      underConstruction: false,
      constructionProgress: 1,
    };
    const builder: Agent = {
      id: "builder-0",
      kind: "builder",
      name: "Orren the Builder",
      level: 1,
      xp: 0,
      status: "idle",
      position: [1, 1],
      target: null,
      homeCity: "town-hall",
      currentTask: null,
      artifacts: 0,
    };
    set({
      id,
      name,
      size,
      age: 0,
      gold: 100,
      reputation: 0,
      agents: [builder],
      cities: [townHall],
      selectedAgentId: null,
      selectedCityId: null,
      logs: [
        {
          t: Date.now(),
          msg: `Your realm of ${name} has been forged. Orren the Builder stands ready.`,
          kind: "good",
        },
      ],
    });
  },

  tick: () =>
    set((s) => {
      const agents = s.agents.map((a) => {
        if (a.status === "walking" && a.target) {
          const [tx, tz] = a.target;
          const [x, z] = a.position;
          const dx = tx - x;
          const dz = tz - z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 0.15) {
            return { ...a, position: a.target, target: null, status: "idle" as AgentStatus };
          }
          const step = 0.12;
          return {
            ...a,
            position: [x + (dx / dist) * step, z + (dz / dist) * step] as [number, number],
          };
        }
        return a;
      });

      const cities = s.cities.map((c) => {
        if (c.underConstruction) {
          const p = Math.min(1, c.constructionProgress + 0.01);
          return { ...c, constructionProgress: p, underConstruction: p < 1 };
        }
        return c;
      });

      return { agents, cities, age: s.age + 1 };
    }),
}));

void randomTile; // reserved for future spawn logic
