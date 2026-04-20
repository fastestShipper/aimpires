"use client";

import { create } from "zustand";
import type { WorldSize } from "@/lib/worlds";

/**
 * Unit kinds. `vladmir` is the realm's native Builder — the real-world
 * backing agent for the first world (maps to Hermes on the principal VPS).
 * Other kinds are specialized worker agents placed inside labs.
 */
export type AgentKind =
  | "vladmir"
  | "coder"
  | "researcher"
  | "designer";

export type AgentStatus = "idle" | "walking" | "working" | "returning";
export type AgentMode = "manual" | "auto";

export interface Agent {
  id: string;
  kind: AgentKind;
  name: string;
  level: number;
  xp: number;
  status: AgentStatus;
  mode: AgentMode;
  position: [number, number];
  target: [number, number] | null;
  /** A* computed path; consumed waypoint-by-waypoint. */
  path: Array<[number, number]>;
  homeLabId: string | null;
  currentTask: string | null;
  artifacts: number;
}

export type LabKind =
  | "core"
  | "coding-lab"
  | "research-lab"
  | "design-lab";

export interface Lab {
  id: string;
  kind: LabKind;
  name: string;
  position: [number, number];
  level: number;
  underConstruction: boolean;
  constructionProgress: number;
  assignedAgentIds: string[];
}

export interface WorldEvent {
  t: number;
  msg: string;
  kind: "info" | "good" | "warn";
  sourceId?: string;
}

export interface WorldState {
  id: string;
  name: string;
  size: WorldSize;
  targetVps: string;
  workspaceRoot: string;
  age: number;
  agents: Agent[];
  labs: Lab[];
  selectedAgentId: string | null;
  selectedLabId: string | null;
  events: WorldEvent[];
  setSelectedAgent: (id: string | null) => void;
  setSelectedLab: (id: string | null) => void;
  moveAgent: (id: string, target: [number, number]) => void;
  setAgentPath: (id: string, path: Array<[number, number]>) => void;
  deployLab: (kind: LabKind, position: [number, number]) => string | null;
  spawnAgent: (kind: AgentKind, labId?: string) => string | null;
  tick: () => void;
  init: (args: {
    id: string;
    name: string;
    size: WorldSize;
    targetVps?: string;
  }) => void;
  log: (msg: string, kind?: "info" | "good" | "warn", sourceId?: string) => void;
}

const AGENT_ROLES: Record<AgentKind, { title: string; namePrefix: string }> = {
  vladmir: { title: "Builder", namePrefix: "Vladmir" },
  coder: { title: "Coder", namePrefix: "coder" },
  researcher: { title: "Researcher", namePrefix: "research" },
  designer: { title: "Designer", namePrefix: "designer" },
};

function labNameFor(kind: LabKind, existingCount: number): string {
  const base: Record<LabKind, string> = {
    core: "core",
    "coding-lab": "coding.city",
    "research-lab": "research.city",
    "design-lab": "design.city",
  };
  const suffix = existingCount > 0 ? `.${(existingCount + 1).toString().padStart(2, "0")}` : "";
  return `${base[kind]}${suffix}`;
}

export const useWorld = create<WorldState>((set, get) => ({
  id: "",
  name: "",
  size: "medium",
  targetVps: "187.77.229.244:2222",
  workspaceRoot: "",
  age: 0,
  agents: [],
  labs: [],
  selectedAgentId: null,
  selectedLabId: null,
  events: [],

  setSelectedAgent: (id) => set({ selectedAgentId: id, selectedLabId: null }),
  setSelectedLab: (id) => set({ selectedLabId: id, selectedAgentId: null }),

  moveAgent: (id, target) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id ? { ...a, target, status: "walking" } : a,
      ),
    })),

  setAgentPath: (id, path) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id
          ? {
              ...a,
              path,
              target: path.length > 0 ? path[0] : null,
              status: path.length > 0 ? "walking" : "idle",
            }
          : a,
      ),
    })),

  deployLab: (kind, position) => {
    const labName = labNameFor(kind, get().labs.length);
    const id = `${kind}-${Date.now().toString(36)}`;
    const lab: Lab = {
      id,
      kind,
      name: labName,
      position,
      level: 1,
      underConstruction: true,
      constructionProgress: 0,
      assignedAgentIds: [],
    };
    set((s) => ({
      labs: [...s.labs, lab],
      events: [
        {
          t: Date.now(),
          msg: `Vladmir broke ground on ${labName} at (${Math.round(position[0])}, ${Math.round(position[1])}).`,
          kind: "good" as const,
        } satisfies WorldEvent,
        ...s.events,
      ].slice(0, 60),
    }));
    return id;
  },

  spawnAgent: (kind, labId) => {
    const state = get();
    const profile = AGENT_ROLES[kind];
    const count = state.agents.filter((a) => a.kind === kind).length + 1;
    const id = `${kind}-${Date.now().toString(36)}`;
    const name = `${profile.namePrefix}-${count.toString().padStart(2, "0")}`;
    // Spawn near the lab if one is assigned, else near Vladmir / origin.
    let spawnPos: [number, number] = [2, 2];
    if (labId) {
      const lab = state.labs.find((l) => l.id === labId);
      if (lab) spawnPos = [lab.position[0] + 1, lab.position[1] + 1];
    } else {
      const vlad = state.agents.find((a) => a.kind === "vladmir");
      if (vlad) spawnPos = [vlad.position[0] + 1, vlad.position[1] + 1];
    }
    const agent: Agent = {
      id,
      kind,
      name,
      level: 1,
      xp: 0,
      status: "idle",
      mode: "manual",
      position: spawnPos,
      target: null,
      path: [],
      homeLabId: labId ?? null,
      currentTask: null,
      artifacts: 0,
    };
    set((s) => ({
      agents: [...s.agents, agent],
      labs: labId
        ? s.labs.map((l) =>
            l.id === labId ? { ...l, assignedAgentIds: [...l.assignedAgentIds, id] } : l,
          )
        : s.labs,
      events: [
        {
          t: Date.now(),
          msg: `${name} came online as ${profile.title}${labId ? ` at ${state.labs.find((l) => l.id === labId)?.name ?? labId}` : ""}.`,
          kind: "good" as const,
        } satisfies WorldEvent,
        ...s.events,
      ].slice(0, 60),
    }));
    return id;
  },

  log: (msg, kind = "info", sourceId) =>
    set((s) => ({
      events: [{ t: Date.now(), msg, kind, sourceId }, ...s.events].slice(0, 60),
    })),

  init: ({ id, name, size, targetVps = "187.77.229.244:2222" }) => {
    const workspaceRoot = `/root/worlds/${id}`;
    const core: Lab = {
      id: "core",
      kind: "core",
      name: `${name}.core`,
      position: [0, 0],
      level: 1,
      underConstruction: false,
      constructionProgress: 1,
      assignedAgentIds: ["vladmir-0"],
    };
    const vladmir: Agent = {
      id: "vladmir-0",
      kind: "vladmir",
      name: "Vladmir",
      level: 1,
      xp: 0,
      status: "idle",
      mode: "manual",
      position: [2, 2],
      target: null,
      path: [],
      homeLabId: "core",
      currentTask: null,
      artifacts: 0,
    };
    set({
      id,
      name,
      size,
      targetVps,
      workspaceRoot,
      age: 0,
      agents: [vladmir],
      labs: [core],
      selectedAgentId: null,
      selectedLabId: null,
      events: [
        {
          t: Date.now(),
          msg: `World ${name} initialized. Target: ${targetVps}. Workspace: ${workspaceRoot}.`,
          kind: "good",
        },
        {
          t: Date.now(),
          msg: `Vladmir is online. Select him to deploy labs or spawn specialized agents.`,
          kind: "info",
        },
      ],
    });
  },

  tick: () =>
    set((s) => {
      const agents = s.agents.map((a) => {
        if (a.status !== "walking" || !a.target) return a;
        const [tx, tz] = a.target;
        const [x, z] = a.position;
        const dx = tx - x;
        const dz = tz - z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Reached current waypoint: advance along the A* path.
        if (dist < 0.12) {
          const remaining = a.path.slice(1);
          if (remaining.length === 0) {
            return {
              ...a,
              position: a.target,
              target: null,
              path: [],
              status: "idle" as AgentStatus,
            };
          }
          return {
            ...a,
            position: a.target,
            path: remaining,
            target: remaining[0],
          };
        }

        const step = 0.14;
        return {
          ...a,
          position: [x + (dx / dist) * step, z + (dz / dist) * step] as [
            number,
            number,
          ],
        };
      });

      const labs = s.labs.map((l) => {
        if (l.underConstruction) {
          const p = Math.min(1, l.constructionProgress + 0.01);
          return { ...l, constructionProgress: p, underConstruction: p < 1 };
        }
        return l;
      });

      return { agents, labs, age: s.age + 1 };
    }),
}));
