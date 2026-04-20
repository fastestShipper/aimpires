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
import KenneyBuilding, { BUILDINGS } from "@/components/KenneyBuilding";
import {
  Tree as KTree,
  Rock as KRock,
  Character as KChar,
  TREES,
  ROCKS,
  CHARACTERS,
  type TreeKey,
  type RockKey,
  type CharKey,
} from "@/components/KenneyAssets";

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
  return (
    <group>
      {positions.map((p, i) => {
        const jx = ((i * 9301 + 49297) % 233280) / 233280 - 0.5;
        const jz = ((i * 7919 + 311) % 233280) / 233280 - 0.5;
        const scale = 0.38 + (((i * 131) % 100) / 100) * 0.24;
        const variant: TreeKey = TREES[i % TREES.length];
        const rot = ((i * 47) % 360) * (Math.PI / 180);
        return (
          <KTree
            key={i}
            variant={variant}
            position={[p[0] + jx * 0.4, p[1], p[2] + jz * 0.4]}
            rotation={rot}
            scale={scale}
          />
        );
      })}
    </group>
  );
}

function Hills({ positions }: { positions: Array<[number, number, number]> }) {
  return (
    <group>
      {positions.map((p, i) => {
        const variant: RockKey = ROCKS[i % ROCKS.length];
        const rot = ((i * 59) % 360) * (Math.PI / 180);
        const scale = 0.55 + (((i * 173) % 100) / 100) * 0.45;
        return (
          <KRock
            key={i}
            variant={variant}
            position={[p[0], 0.1, p[2]]}
            rotation={rot}
            scale={scale}
          />
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

// Per-kind curated building selections from Kenney's city-kit-industrial.
// The main structure + a varied supporting cast per lab type.
const LAB_BUILDING_PRESETS: Record<
  "core" | "coding-lab" | "research-lab" | "design-lab",
  { main: (typeof BUILDINGS)[number]; ring: Array<(typeof BUILDINGS)[number]> }
> = {
  core: {
    main: "building-l",
    ring: ["building-a", "building-c", "building-f", "building-h", "building-n", "building-p"],
  },
  "coding-lab": {
    main: "building-m",
    ring: ["building-b", "building-d", "building-g", "building-i", "building-k"],
  },
  "research-lab": {
    main: "building-o",
    ring: ["building-e", "building-j", "building-q", "building-r", "building-s"],
  },
  "design-lab": {
    main: "building-t",
    ring: ["building-a", "building-f", "building-h", "building-n", "building-p"],
  },
};

function LabCluster({ lab, selected, onSelect }: LabMeshProps) {
  const bp = LAB_BLUEPRINTS[lab.kind];
  const palette = PALETTES[bp.accent];
  const progress = lab.constructionProgress;
  const built = !lab.underConstruction;

  const preset = LAB_BUILDING_PRESETS[lab.kind];

  // Deterministic layout seeded by lab id
  const layout = useMemo(() => {
    const seed = lab.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const ring = preset.ring;
    const count = ring.length;
    return ring.map((buildingKey, i) => {
      const a = (i / count) * Math.PI * 2 + (seed % 17) * 0.1;
      const r = 1.55 + ((seed + i) % 5) * 0.08;
      const dx = Math.cos(a) * r;
      const dz = Math.sin(a) * r;
      const rot = ((seed + i * 7) % 4) * (Math.PI / 2);
      const scl = 0.5 + (((seed + i * 13) % 5) / 10);
      return { buildingKey, dx, dz, rot, scl };
    });
  }, [lab.id, preset]);

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
        <boxGeometry args={[4.2, 0.08, 4.2]} />
        <meshStandardMaterial color="#141a28" roughness={0.9} />
      </mesh>
      {/* Plaza edge glow */}
      <mesh position={[0, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.95, 2.1, 4]} />
        <meshBasicMaterial
          color={palette.accent}
          transparent
          opacity={selected ? 0.95 : 0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Kenney-powered building cluster (scales with construction progress) */}
      <group scale={[1, Math.max(0.05, progress), 1]} position={[0, 0.18, 0]}>
        {/* Central main structure */}
        <KenneyBuilding
          model={preset.main}
          position={[0, 0, 0]}
          scale={0.75}
          tint={palette.accent}
        />
        {/* Supporting ring */}
        {layout.map((b, i) => (
          <KenneyBuilding
            key={i}
            model={b.buildingKey}
            position={[b.dx, 0, b.dz]}
            rotation={b.rot}
            scale={b.scl}
            tint={i % 3 === 0 ? palette.accent : undefined}
          />
        ))}
        {/* Accent pylon visible regardless of lab type */}
        {built && (
          <>
            <mesh position={[0, 2.2, 0]} castShadow>
              <boxGeometry args={[0.22, 1.2, 0.22]} />
              <meshStandardMaterial
                color="#0b0f1c"
                roughness={0.45}
                metalness={0.6}
                emissive={palette.accent}
                emissiveIntensity={0.55}
              />
            </mesh>
            <mesh position={[0, 2.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.28, 0.025, 6, 32]} />
              <meshBasicMaterial color={palette.accent} toneMapped={false} />
            </mesh>
            <mesh position={[0, 2.9, 0]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshStandardMaterial
                color={palette.accent}
                emissive={palette.accent}
                emissiveIntensity={2.8}
                toneMapped={false}
              />
            </mesh>
          </>
        )}
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

// Char assignment per agent kind — varied models from the Kenney blocky pack.
const AGENT_CHAR: Record<string, CharKey> = {
  vladmir: "character-a",
  coder: "character-f",
  researcher: "character-j",
  designer: "character-n",
};

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
  const facingRef = useRef(0);

  useFrame((_, dt) => {
    bobRef.current += dt;
    if (!ref.current) return;
    const walking = agent.status === "walking";
    ref.current.position.y = walking
      ? 0.0 + Math.abs(Math.sin(bobRef.current * 10)) * 0.05
      : 0.0;
    // Face the target
    if (agent.target) {
      const dx = agent.target[0] - agent.position[0];
      const dz = agent.target[1] - agent.position[1];
      if (Math.hypot(dx, dz) > 0.05) {
        facingRef.current = Math.atan2(dx, dz);
      }
    }
    ref.current.rotation.y = facingRef.current;
  });

  const profile = AGENT_PROFILES[agent.kind];
  const palette = PALETTES[profile.accent];
  const charVariant = AGENT_CHAR[agent.kind] ?? "character-a";

  return (
    <group
      ref={ref}
      position={[agent.position[0], 0, agent.position[1]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <KChar variant={charVariant} position={[0, 0.1, 0]} scale={0.42} tint={palette.accent} />
      {/* Signal dot above head */}
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial
          color={palette.accent}
          emissive={palette.accent}
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>
      {selected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.48, 32]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
      <Html position={[0, 1.55, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
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
      <color attach="background" args={["#1a1830"]} />
      <Suspense fallback={null}>
        <fog attach="fog" args={["#201840", 28, 100]} />
        <Environment preset="sunset" background={false} />
        <ambientLight intensity={0.55} color="#d4b8a0" />
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
            intensity={0.55}
            luminanceThreshold={0.85}
            luminanceSmoothing={0.45}
            mipmapBlur
            radius={0.75}
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette eskil={false} offset={0.25} darkness={0.55} blendFunction={BlendFunction.NORMAL} />
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
