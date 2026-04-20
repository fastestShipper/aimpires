"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useWorld, type Agent, type Lab } from "@/lib/store";
import { AGENT_PROFILES, LAB_BLUEPRINTS } from "@/lib/agents";
import { WORLD_TIERS, type WorldSize } from "@/lib/worlds";
import { buildGrid, findPath } from "@/lib/pathfinding";

const ACCENT = "#5ee3d7";
const SIGNAL = "#c4a6ff";
const WARM = "#f0d098";
const AMBER = "#f0a35a";
const TILE = 1;

// Richer biome colors (light, saturated, readable in dark scene)
const BIOME_COLORS = {
  water: "#2d5b8c",
  waterDeep: "#1a3a5a",
  edge: "#0c0f17",
  forest: "#2a5a3e",
  forestDark: "#1a3a28",
  hill: "#5a4a3a",
  hillLight: "#7a6450",
  accent: "#2c3850",
  plate: "#1a2030",
  plateLit: "#242c42",
  sand: "#7a6a4a",
};

interface TerrainTile {
  x: number;
  z: number;
  h: number;
  biome: "plate" | "accent" | "water" | "forest" | "hill" | "edge";
}

// Hash-based 2D value noise for deterministic terrain.
function noise2(x: number, z: number, seed: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233 + seed * 3.7) * 43758.5453;
  return s - Math.floor(s);
}
function smoothNoise(x: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fz = z - zi;
  const a = noise2(xi, zi, seed);
  const b = noise2(xi + 1, zi, seed);
  const c = noise2(xi, zi + 1, seed);
  const d = noise2(xi + 1, zi + 1, seed);
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function useTerrain(size: WorldSize): {
  tiles: TerrainTile[];
  radius: number;
  blockers: Array<[number, number]>;
  forestPositions: Array<[number, number, number]>;
  hillPositions: Array<[number, number, number]>;
} {
  return useMemo(() => {
    const tier = WORLD_TIERS[size];
    const radius = Math.max(12, Math.ceil(Math.sqrt(tier.mapTiles / Math.PI)));
    const tiles: TerrainTile[] = [];
    const blockers: Array<[number, number]> = [];
    const forestPositions: Array<[number, number, number]> = [];
    const hillPositions: Array<[number, number, number]> = [];

    const seed = 7;

    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const d = Math.sqrt(x * x + z * z);
        if (d > radius) continue;

        // Base continental noise (low frequency)
        const continent = smoothNoise(x * 0.08, z * 0.08, seed) * 1.4 - 0.3;
        // Medium detail — biome placement
        const biomeNoise = smoothNoise(x * 0.22, z * 0.22, seed + 1);
        // High frequency variation
        const hf = smoothNoise(x * 0.6, z * 0.6, seed + 2) * 0.3;

        const h0 = continent + hf;
        const edge = d > radius * 0.93;

        let biome: TerrainTile["biome"] = "plate";
        let h = 0.1;

        if (edge) {
          biome = "edge";
          h = 0.08;
        } else if (h0 < 0.05) {
          biome = "water";
          h = 0.06;
          blockers.push([x, z]);
        } else if (h0 > 0.8) {
          biome = "hill";
          h = 0.35 + h0 * 0.25;
          hillPositions.push([x, h, z]);
          blockers.push([x, z]);
        } else if (biomeNoise > 0.72) {
          biome = "forest";
          h = 0.14 + h0 * 0.05;
          forestPositions.push([x, h, z]);
          // Forests are walkable (just visually dense)
        } else {
          // occasional accent data-pad
          const accentPick =
            Math.abs(x) % 5 === 0 && Math.abs(z) % 5 === 0 && biomeNoise > 0.5;
          biome = accentPick ? "accent" : "plate";
          h = 0.12 + h0 * 0.04;
        }

        tiles.push({ x, z, h, biome });
      }
    }
    return { tiles, radius, blockers, forestPositions, hillPositions };
  }, [size]);
}

function Terrain({ tiles }: { tiles: TerrainTile[] }) {
  return (
    <group>
      {tiles.map((t, i) => {
        // Vary per-tile luminance deterministically for painterly feel
        const lumNoise = ((Math.sin(t.x * 1.7 + t.z * 2.3) + 1) / 2) * 0.15;
        const base =
          t.biome === "water"
            ? BIOME_COLORS.waterDeep
            : t.biome === "edge"
              ? BIOME_COLORS.edge
              : t.biome === "forest"
                ? BIOME_COLORS.forestDark
                : t.biome === "hill"
                  ? BIOME_COLORS.hill
                  : t.biome === "accent"
                    ? BIOME_COLORS.accent
                    : BIOME_COLORS.plate;
        const col = new THREE.Color(base);
        col.offsetHSL(0, 0, lumNoise - 0.05);
        return (
          <mesh key={i} position={[t.x * TILE, t.h / 2, t.z * TILE]} receiveShadow castShadow>
            <boxGeometry args={[TILE * 0.98, t.h, TILE * 0.98]} />
            <meshStandardMaterial
              color={col}
              roughness={t.biome === "water" ? 0.35 : 0.88}
              metalness={t.biome === "water" ? 0.4 : 0.1}
              flatShading
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Water({ tiles }: { tiles: TerrainTile[] }) {
  const waters = tiles.filter((t) => t.biome === "water");
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.elapsedTime;
      ref.current.children.forEach((c, i) => {
        c.position.y = 0.08 + Math.sin(t * 1.8 + i * 0.3) * 0.02;
      });
    }
  });
  return (
    <group ref={ref}>
      {waters.map((t, i) => (
        <mesh
          key={i}
          position={[t.x * TILE, 0.08, t.z * TILE]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[TILE * 0.96, TILE * 0.96]} />
          <meshStandardMaterial
            color={BIOME_COLORS.water}
            emissive={ACCENT}
            emissiveIntensity={0.18}
            metalness={0.6}
            roughness={0.25}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}

function AccentTiles({ tiles }: { tiles: TerrainTile[] }) {
  const accents = tiles.filter((t) => t.biome === "accent");
  return (
    <group>
      {accents.map((t, i) => (
        <mesh
          key={i}
          position={[t.x * TILE, t.h + 0.006, t.z * TILE]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.28, 0.34, 4]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Trees({ positions }: { positions: Array<[number, number, number]> }) {
  // Low-poly crystal trees with subtle emission + varied hues
  return (
    <group>
      {positions.map((p, i) => {
        const jx = ((i * 9301 + 49297) % 233280) / 233280 - 0.5;
        const jz = ((i * 7919 + 311) % 233280) / 233280 - 0.5;
        const scale = 0.65 + (((i * 131) % 100) / 100) * 0.5;
        const hueShift = ((i * 17) % 100) / 100;
        const canopy = new THREE.Color("#3a6a4a").offsetHSL(hueShift * 0.08 - 0.02, 0.08, hueShift * 0.1);
        const emit = new THREE.Color(ACCENT).offsetHSL(hueShift * 0.15, 0, 0);
        return (
          <group key={i} position={[p[0] + jx * 0.35, p[1], p[2] + jz * 0.35]}>
            <mesh position={[0, 0.5 * scale, 0]} castShadow>
              <coneGeometry args={[0.32 * scale, 1.0 * scale, 4]} />
              <meshStandardMaterial
                color={canopy}
                emissive={emit}
                emissiveIntensity={0.28}
                flatShading
                roughness={0.75}
                metalness={0.1}
              />
            </mesh>
            <mesh position={[0, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.09, 0.2, 5]} />
              <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Hills({ positions }: { positions: Array<[number, number, number]> }) {
  // Warm rocky outcrops with lit crystal tops
  return (
    <group>
      {positions.map((p, i) => {
        const s = 0.85 + (((i * 173) % 100) / 100) * 0.6;
        const tint = new THREE.Color(BIOME_COLORS.hillLight).offsetHSL(((i * 13) % 100) / 2000, 0.1, 0);
        return (
          <group key={i} position={[p[0], 0, p[2]]}>
            <mesh position={[0, (p[1] + 0.25) / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.95, p[1] + 0.25, 0.95]} />
              <meshStandardMaterial color={BIOME_COLORS.hill} roughness={0.92} flatShading />
            </mesh>
            <mesh
              position={[0.02, p[1] + 0.4, 0.02]}
              rotation={[0, Math.PI / 4, 0]}
              castShadow
            >
              <coneGeometry args={[0.48 * s, 0.6 * s, 4]} />
              <meshStandardMaterial color={tint} flatShading roughness={0.75} />
            </mesh>
            {/* Occasional crystal on top */}
            {i % 3 === 0 && (
              <mesh position={[0, p[1] + 0.85, 0]} rotation={[0, Math.PI / 4, 0]}>
                <octahedronGeometry args={[0.15 * s, 0]} />
                <meshStandardMaterial
                  color={WARM}
                  emissive={WARM}
                  emissiveIntensity={0.8}
                  toneMapped={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/** A lab is now a CLUSTER of geometric buildings (a city), not a single obelisk. */
interface LabMeshProps {
  lab: Lab;
  selected: boolean;
  onSelect: () => void;
}

function LabCluster({ lab, selected, onSelect }: LabMeshProps) {
  const bp = LAB_BLUEPRINTS[lab.kind];
  const palette = PALETTES[bp.accent];
  const progress = lab.constructionProgress;
  const built = !lab.underConstruction;

  // Deterministic building layout seeded by lab id length + kind
  const buildings = useMemo(() => {
    const seed = lab.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const items: Array<{
      dx: number;
      dz: number;
      w: number;
      d: number;
      h: number;
      accent: boolean;
      roof: "flat" | "step" | "spire";
    }> = [];
    // Central big structure
    items.push({ dx: 0, dz: 0, w: 1.3, d: 1.3, h: 1.3, accent: true, roof: "spire" });
    // Surrounding structures
    const ring = lab.kind === "core" ? 7 : 5;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + (seed % 17) * 0.1;
      const r = 1.45 + ((seed + i) % 5) * 0.1;
      const dx = Math.cos(a) * r;
      const dz = Math.sin(a) * r;
      const w = 0.55 + ((seed + i * 7) % 7) * 0.06;
      const d = 0.55 + ((seed + i * 11) % 7) * 0.06;
      const h = 0.45 + ((seed + i * 13) % 9) * 0.09;
      items.push({ dx, dz, w, d, h, accent: i % 3 === 0, roof: i % 4 === 0 ? "step" : "flat" });
    }
    return items;
  }, [lab.id, lab.kind]);

  return (
    <group
      position={[lab.position[0], 0, lab.position[1]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Base plaza */}
      <mesh position={[0, 0.14, 0]} receiveShadow>
        <boxGeometry args={[3.8, 0.08, 3.8]} />
        <meshStandardMaterial color="#0f1522" roughness={0.9} />
      </mesh>
      {/* Plaza edge glow */}
      <mesh position={[0, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.78, 1.92, 4]} />
        <meshBasicMaterial
          color={palette.accent}
          transparent
          opacity={selected ? 0.9 : 0.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Buildings (scale with construction progress) */}
      <group scale={[1, Math.max(0.05, progress), 1]}>
        {buildings.map((b, i) => (
          <group key={i} position={[b.dx, 0, b.dz]}>
            <mesh position={[0, b.h / 2 + 0.18, 0]} castShadow receiveShadow>
              <boxGeometry args={[b.w, b.h, b.d]} />
              <meshStandardMaterial
                color={b.accent ? palette.bodyMid : palette.body}
                roughness={0.55}
                metalness={0.42}
                emissive={palette.accent}
                emissiveIntensity={b.accent ? 0.22 : 0.08}
                flatShading
              />
            </mesh>
            {/* Roof variants */}
            {built && b.roof === "step" && (
              <mesh position={[0, b.h + 0.28, 0]} castShadow>
                <boxGeometry args={[b.w * 0.7, 0.18, b.d * 0.7]} />
                <meshStandardMaterial color={palette.bodyMid} />
              </mesh>
            )}
            {built && b.roof === "spire" && (
              <>
                <mesh position={[0, b.h + 0.55, 0]} castShadow>
                  <boxGeometry args={[b.w * 0.35, 0.7, b.d * 0.35]} />
                  <meshStandardMaterial
                    color="#0b0f1c"
                    roughness={0.45}
                    metalness={0.55}
                    emissive={palette.accent}
                    emissiveIntensity={0.6}
                  />
                </mesh>
                <mesh position={[0, b.h + 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.35, 0.025, 6, 32]} />
                  <meshBasicMaterial color={palette.accent} toneMapped={false} />
                </mesh>
                <mesh position={[0, b.h + 1.0, 0]}>
                  <sphereGeometry args={[0.06, 12, 12]} />
                  <meshStandardMaterial
                    color={palette.accent}
                    emissive={palette.accent}
                    emissiveIntensity={2.5}
                    toneMapped={false}
                  />
                </mesh>
              </>
            )}
            {/* Edge light stripe */}
            {built && (
              <mesh position={[0, b.h / 2 + 0.18, b.d / 2 + 0.005]}>
                <boxGeometry args={[b.w * 0.72, 0.06, 0.02]} />
                <meshBasicMaterial
                  color={palette.accent}
                  transparent
                  opacity={0.88}
                  toneMapped={false}
                />
              </mesh>
            )}
          </group>
        ))}
      </group>

      {/* Construction scaffolding while building */}
      {!built && (
        <>
          <mesh position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.5, 1.55, 24]} />
            <meshBasicMaterial color={palette.accent} transparent opacity={0.6} />
          </mesh>
          <Html position={[0, 2.5, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
            <div className="bg-[#08090e]/90 border border-[rgba(94,227,215,0.5)] px-2.5 py-1 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--accent)]">
              building · {Math.round(progress * 100)}%
            </div>
          </Html>
        </>
      )}

      {selected && (
        <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.15, 40]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.95} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, 3.2, 0]} center distanceFactor={11} style={{ pointerEvents: "none" }}>
        <div className="flex items-center gap-1.5 whitespace-nowrap bg-[#08090e]/90 border border-[rgba(94,227,215,0.4)] px-2.5 py-[3px] font-mono">
          <span className="text-[var(--accent)] text-[10px]">{bp.glyph}</span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg)]">{lab.name}</span>
        </div>
      </Html>
    </group>
  );
}

function AgentMesh({
  agent,
  selected,
  onSelect,
}: {
  agent: Agent;
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const bobRef = useRef(0);

  useFrame((_, dt) => {
    bobRef.current += dt;
    if (ref.current) {
      const walking = agent.status === "walking";
      ref.current.position.y = walking
        ? 0.4 + Math.abs(Math.sin(bobRef.current * 9)) * 0.08
        : 0.4;
    }
  });

  const profile = AGENT_PROFILES[agent.kind];
  const palette = PALETTES[profile.accent];

  return (
    <group
      ref={ref}
      position={[agent.position[0], 0.4, agent.position[1]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh castShadow>
        <boxGeometry args={[0.28, 0.36, 0.28]} />
        <meshStandardMaterial color={palette.body} roughness={0.55} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshStandardMaterial
          color="#0f1320"
          roughness={0.45}
          metalness={0.55}
          emissive={palette.accent}
          emissiveIntensity={0.7}
        />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial
          color={palette.accent}
          emissive={palette.accent}
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.02, 0.15]}>
        <boxGeometry args={[0.2, 0.06, 0.01]} />
        <meshBasicMaterial color={palette.accent} toneMapped={false} />
      </mesh>
      {selected && (
        <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.38, 28]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
      <Html position={[0, 0.95, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div className="flex items-center gap-1 whitespace-nowrap bg-[#08090e]/80 border border-[rgba(94,227,215,0.3)] px-1.5 py-[2px] font-mono">
          <span className="text-[var(--accent)] text-[9px]">{profile.glyph}</span>
          <span className="text-[9px] tracking-[0.2em] uppercase text-[var(--fg)]">{agent.name}</span>
        </div>
      </Html>
    </group>
  );
}

function PathTrail({ agent }: { agent: Agent }) {
  if (agent.path.length < 1) return null;
  const points = [
    new THREE.Vector3(agent.position[0], 0.3, agent.position[1]),
    ...agent.path.map((p) => new THREE.Vector3(p[0], 0.3, p[1])),
  ];
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <>
      {agent.path.map((p, i) => (
        <mesh key={i} position={[p[0], 0.22, p[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.08, 0.13, 16]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <line>
        <primitive object={geom} attach="geometry" />
        <lineBasicMaterial color={ACCENT} transparent opacity={0.7} toneMapped={false} />
      </line>
    </>
  );
}

/** Road network connecting all labs to the core. */
function Roads({ labs }: { labs: Lab[] }) {
  if (labs.length < 2) return null;
  const core = labs.find((l) => l.kind === "core") ?? labs[0];
  return (
    <group>
      {labs
        .filter((l) => l.id !== core.id)
        .map((l) => {
          const p0 = new THREE.Vector3(core.position[0], 0.2, core.position[1]);
          const p1 = new THREE.Vector3(l.position[0], 0.2, l.position[1]);
          const geom = new THREE.BufferGeometry().setFromPoints([p0, p1]);
          return (
            <line key={l.id}>
              <primitive object={geom} attach="geometry" />
              <lineBasicMaterial color={ACCENT} transparent opacity={0.25} toneMapped={false} />
            </line>
          );
        })}
    </group>
  );
}

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(18, 22, 18);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

function Ticker() {
  const tick = useWorld((s) => s.tick);
  useFrame((_, dt) => {
    if (dt > 0) tick();
  });
  return null;
}

function GroundClickPlane({
  gridRadius,
  blockers,
}: {
  gridRadius: number;
  blockers: Array<[number, number]>;
}) {
  const setAgentPath = useWorld((s) => s.setAgentPath);
  const selectedAgentId = useWorld((s) => s.selectedAgentId);
  const agents = useWorld((s) => s.agents);
  const log = useWorld((s) => s.log);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.001, 0]}
      onClick={async (e) => {
        if (!selectedAgentId) return;
        const agent = agents.find((a) => a.id === selectedAgentId);
        if (!agent) return;
        const p = e.point;
        const tx = Math.round(p.x);
        const tz = Math.round(p.z);
        if (Math.sqrt(tx * tx + tz * tz) > gridRadius) return;
        const { grid, offset } = buildGrid(gridRadius, blockers);
        const path = await findPath({
          grid,
          offset,
          from: [agent.position[0], agent.position[1]],
          to: [tx, tz],
        });
        if (!path || path.length === 0) {
          log(`no route to (${tx}, ${tz}).`, "warn");
          return;
        }
        const tuples = path.map((p) => [p.x, p.y] as [number, number]);
        setAgentPath(agent.id, tuples);
        log(`${agent.name} → (${tx}, ${tz}) · ${tuples.length} steps.`, "info");
      }}
    >
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

export default function WorldMap({ size }: { size: WorldSize }) {
  const agents = useWorld((s) => s.agents);
  const labs = useWorld((s) => s.labs);
  const selectedAgentId = useWorld((s) => s.selectedAgentId);
  const selectedLabId = useWorld((s) => s.selectedLabId);
  const setSelectedAgent = useWorld((s) => s.setSelectedAgent);
  const setSelectedLab = useWorld((s) => s.setSelectedLab);

  const { tiles, radius, blockers, forestPositions, hillPositions } = useTerrain(size);
  const labBlockers: Array<[number, number]> = labs.map((l) => [
    Math.round(l.position[0]),
    Math.round(l.position[1]),
  ]);
  const allBlockers = [...blockers, ...labBlockers];

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <Canvas
      camera={{ position: [18, 22, 18], fov: 38 }}
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#0a0e18"]} />
      <Suspense fallback={null}>
        <fog attach="fog" args={["#0a1220", 30, 95]} />
        <Environment preset="night" />
        <ambientLight intensity={0.25} color="#9aafd0" />
        {/* Key light: warm amber "sunset" from one side */}
        <directionalLight
          position={[22, 28, 14]}
          intensity={1.6}
          color="#ffd4a0"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-36}
          shadow-camera-right={36}
          shadow-camera-top={36}
          shadow-camera-bottom={-36}
        />
        {/* Fill: cool cyan bounce from opposite side */}
        <directionalLight position={[-16, 10, -14]} intensity={0.55} color={ACCENT} />
        {/* Rim / signal from sky */}
        <directionalLight position={[0, 20, -20]} intensity={0.4} color={SIGNAL} />
        <pointLight position={[0, 8, 0]} intensity={1.4} color={ACCENT} distance={32} />

        <CameraRig />
        <Terrain tiles={tiles} />
        <Water tiles={tiles} />
        <AccentTiles tiles={tiles} />
        <Trees positions={forestPositions} />
        <Hills positions={hillPositions} />
        <Roads labs={labs} />

        {labs.map((l) => (
          <LabCluster
            key={l.id}
            lab={l}
            selected={l.id === selectedLabId}
            onSelect={() => setSelectedLab(l.id)}
          />
        ))}

        {agents.map((a) => (
          <AgentMesh
            key={a.id}
            agent={a}
            selected={a.id === selectedAgentId}
            onSelect={() => setSelectedAgent(a.id)}
          />
        ))}

        {selectedAgent && <PathTrail agent={selectedAgent} />}

        <GroundClickPlane gridRadius={radius} blockers={allBlockers} />
        <Ticker />

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={8}
          maxDistance={55}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
        />

        <EffectComposer multisampling={4}>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.55}
            mipmapBlur
            radius={0.85}
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette eskil={false} offset={0.2} darkness={0.65} blendFunction={BlendFunction.NORMAL} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}

const PALETTES: Record<
  "cyan" | "violet" | "warm" | "amber",
  { body: string; bodyMid: string; accent: string }
> = {
  // Brighter, more saturated bodies for visibility
  cyan: { body: "#2e4862", bodyMid: "#1c3048", accent: ACCENT },
  violet: { body: "#48365e", bodyMid: "#2e2446", accent: SIGNAL },
  warm: { body: "#6a4a28", bodyMid: "#4a3418", accent: WARM },
  amber: { body: "#6a3a1a", bodyMid: "#4a2410", accent: AMBER },
};
