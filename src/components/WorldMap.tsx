"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useWorld, type Agent, type Lab } from "@/lib/store";
import { AGENT_PROFILES, LAB_BLUEPRINTS } from "@/lib/agents";
import { WORLD_TIERS, type WorldSize } from "@/lib/worlds";
import { buildGrid, findPath } from "@/lib/pathfinding";

const ACCENT = "#5ee3d7";
const ACCENT_SOFT = "#2a6b66";
const SIGNAL = "#c4a6ff";
const WARM = "#f0d098";
const AMBER = "#f0a35a";

const TILE = 1;

interface TerrainTile {
  x: number;
  z: number;
  h: number;
  kind: "plate" | "accent" | "void" | "edge";
}

function useTerrain(size: WorldSize): { tiles: TerrainTile[]; radius: number; voidTiles: Array<[number, number]> } {
  return useMemo(() => {
    const tier = WORLD_TIERS[size];
    const radius = Math.max(4, Math.ceil(Math.sqrt(tier.mapTiles / Math.PI)));
    const out: TerrainTile[] = [];
    const voidTiles: Array<[number, number]> = [];

    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const d = Math.sqrt(x * x + z * z);
        if (d > radius) continue;
        const n =
          Math.sin(x * 0.55) * 0.3 +
          Math.cos(z * 0.65) * 0.3 +
          Math.sin((x + z) * 0.4) * 0.2;
        const edge = d > radius * 0.92;
        const voidSpot = !edge && n < -0.35;
        const accent = !edge && !voidSpot && Math.abs(x) % 4 === 0 && Math.abs(z) % 4 === 0;
        const kind = edge ? "edge" : voidSpot ? "void" : accent ? "accent" : "plate";
        const h = kind === "void" ? 0.05 : kind === "edge" ? 0.08 : 0.14;
        out.push({ x, z, h, kind });
        if (voidSpot) voidTiles.push([x, z]);
      }
    }
    return { tiles: out, radius, voidTiles };
  }, [size]);
}

function Terrain({ tiles }: { tiles: TerrainTile[] }) {
  return (
    <group>
      {tiles.map((t, i) => {
        const color =
          t.kind === "void"
            ? "#070a10"
            : t.kind === "edge"
              ? "#0d1119"
              : t.kind === "accent"
                ? "#1a2230"
                : "#11141f";
        return (
          <group key={i} position={[t.x * TILE, 0, t.z * TILE]}>
            <mesh position={[0, t.h / 2, 0]} receiveShadow>
              <boxGeometry args={[TILE * 0.96, t.h, TILE * 0.96]} />
              <meshStandardMaterial color={color} roughness={0.92} flatShading />
            </mesh>
            {t.kind === "accent" && (
              <mesh position={[0, t.h + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.2, 0.28, 4]} />
                <meshBasicMaterial color={ACCENT} transparent opacity={0.55} side={THREE.DoubleSide} />
              </mesh>
            )}
            {t.kind === "void" && (
              <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.88, 0.88]} />
                <meshBasicMaterial color={SIGNAL} transparent opacity={0.08} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

interface LabMeshProps {
  lab: Lab;
  selected: boolean;
  onSelect: () => void;
}

function LabMesh({ lab, selected, onSelect }: LabMeshProps) {
  const bp = LAB_BLUEPRINTS[lab.kind];
  const progress = lab.constructionProgress;
  const built = !lab.underConstruction;

  const palette = PALETTES[bp.accent];

  return (
    <group
      position={[lab.position[0], 0, lab.position[1]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Base pad */}
      <mesh position={[0, 0.18, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.3, 0.15, 2.3]} />
        <meshStandardMaterial color="#131827" roughness={0.85} metalness={0.3} />
      </mesh>
      {/* Pad accent outline */}
      <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.12, 4]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={selected ? 0.95 : 0.55} side={THREE.DoubleSide} />
      </mesh>

      {/* Core structure (scales with progress) */}
      <group scale={[1, Math.max(0.06, progress), 1]}>
        {/* Primary block */}
        <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.9, 1.5]} />
          <meshStandardMaterial
            color={palette.body}
            roughness={0.55}
            metalness={0.45}
            emissive={palette.accent}
            emissiveIntensity={built ? 0.14 : 0.4}
          />
        </mesh>
        {/* Secondary stepped block */}
        {built && (
          <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 0.5, 1.1]} />
            <meshStandardMaterial color={palette.bodyMid} roughness={0.5} metalness={0.5} />
          </mesh>
        )}
        {/* Top spire for core/town hall */}
        {built && lab.kind === "core" && (
          <>
            <mesh position={[0, 1.95, 0]} castShadow>
              <boxGeometry args={[0.4, 1.0, 0.4]} />
              <meshStandardMaterial
                color="#0f1320"
                roughness={0.45}
                metalness={0.55}
                emissive={palette.accent}
                emissiveIntensity={0.4}
              />
            </mesh>
            <mesh position={[0, 2.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.32, 0.02, 6, 32]} />
              <meshBasicMaterial color={palette.accent} toneMapped={false} />
            </mesh>
            <mesh position={[0, 2.6, 0]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={2.5} toneMapped={false} />
            </mesh>
          </>
        )}
        {/* Edge stripe lights on primary */}
        {built && (
          <>
            <mesh position={[0, 0.7, 0.76]}>
              <boxGeometry args={[1.2, 0.08, 0.02]} />
              <meshBasicMaterial color={palette.accent} transparent opacity={0.9} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.7, -0.76]}>
              <boxGeometry args={[1.2, 0.08, 0.02]} />
              <meshBasicMaterial color={palette.accent} transparent opacity={0.9} toneMapped={false} />
            </mesh>
          </>
        )}
      </group>

      {/* Selection ring on ground */}
      {selected && (
        <mesh position={[0, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.25, 1.42, 40]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, 2.9, 0]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
        <div className="flex items-center gap-1.5 whitespace-nowrap bg-[#08090e]/85 border border-[rgba(94,227,215,0.4)] px-2 py-[3px] font-mono">
          <span className="text-[var(--accent)] text-[10px]">{bp.glyph}</span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--fg)]">{lab.name}</span>
        </div>
      </Html>
    </group>
  );
}

interface AgentMeshProps {
  agent: Agent;
  selected: boolean;
  onSelect: () => void;
}

function AgentMesh({ agent, selected, onSelect }: AgentMeshProps) {
  const ref = useRef<THREE.Group>(null);
  const bobRef = useRef(0);

  useFrame((_, dt) => {
    bobRef.current += dt;
    if (ref.current) {
      const walking = agent.status === "walking";
      ref.current.position.y = walking
        ? 0.45 + Math.abs(Math.sin(bobRef.current * 9)) * 0.08
        : 0.45;
    }
  });

  const profile = AGENT_PROFILES[agent.kind];
  const palette = PALETTES[profile.accent];

  return (
    <group
      ref={ref}
      position={[agent.position[0], 0.45, agent.position[1]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Lower "mech" block */}
      <mesh castShadow>
        <boxGeometry args={[0.24, 0.32, 0.24]} />
        <meshStandardMaterial color={palette.body} roughness={0.55} metalness={0.5} />
      </mesh>
      {/* Upper core (slightly smaller) */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.18, 0.18, 0.18]} />
        <meshStandardMaterial
          color="#0f1320"
          roughness={0.45}
          metalness={0.55}
          emissive={palette.accent}
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* Signal dot on top */}
      <mesh position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      {/* Side stripe */}
      <mesh position={[0, 0, 0.13]}>
        <boxGeometry args={[0.18, 0.05, 0.01]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.9} toneMapped={false} />
      </mesh>

      {selected && (
        <mesh position={[0, -0.43, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.33, 28]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}

      <Html position={[0, 0.85, 0]} center distanceFactor={7} style={{ pointerEvents: "none" }}>
        <div className="flex items-center gap-1 whitespace-nowrap bg-[#08090e]/80 border border-[rgba(94,227,215,0.3)] px-1.5 py-[2px] font-mono">
          <span className="text-[var(--accent)] text-[9px]">{profile.glyph}</span>
          <span className="text-[9px] tracking-[0.2em] uppercase text-[var(--fg)]">{agent.name}</span>
        </div>
      </Html>
    </group>
  );
}

/** Visualizes the current A* path of the selected agent. */
function PathTrail({ agent }: { agent: Agent }) {
  if (agent.path.length < 1) return null;
  const points = [
    new THREE.Vector3(agent.position[0], 0.3, agent.position[1]),
    ...agent.path.map((p) => new THREE.Vector3(p[0], 0.3, p[1])),
  ];
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <>
      {/* Waypoint dots */}
      {agent.path.map((p, i) => (
        <mesh key={i} position={[p[0], 0.22, p[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.08, 0.13, 16]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Line */}
      <line>
        <primitive object={geom} attach="geometry" />
        <lineBasicMaterial color={ACCENT} transparent opacity={0.7} toneMapped={false} />
      </line>
    </>
  );
}

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(12, 13, 12);
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
        if (Math.sqrt(tx * tx + tz * tz) > gridRadius) {
          log(`Target outside world bounds.`, "warn");
          return;
        }
        const { grid, offset } = buildGrid(gridRadius, blockers);
        const path = await findPath({
          grid,
          offset,
          from: [agent.position[0], agent.position[1]],
          to: [tx, tz],
        });
        if (!path || path.length === 0) {
          log(`No path to (${tx}, ${tz}).`, "warn");
          return;
        }
        const tuples = path.map((p) => [p.x, p.y] as [number, number]);
        setAgentPath(agent.id, tuples);
        log(
          `${agent.name} routed to (${tx}, ${tz}) · ${tuples.length} waypoints.`,
          "info",
        );
      }}
    >
      <planeGeometry args={[200, 200]} />
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

  const { tiles, radius, voidTiles } = useTerrain(size);
  const labBlockers: Array<[number, number]> = labs.map((l) => [
    Math.round(l.position[0]),
    Math.round(l.position[1]),
  ]);
  const blockers = [...voidTiles, ...labBlockers];

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <Canvas
      camera={{ position: [12, 13, 12], fov: 35 }}
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#08090e"]} />
      <Suspense fallback={null}>
        <fog attach="fog" args={["#08090e", 18, 55]} />
        <ambientLight intensity={0.42} />
        <directionalLight
          position={[12, 18, 8]}
          intensity={1.4}
          color="#c0d4ff"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-24}
          shadow-camera-right={24}
          shadow-camera-top={24}
          shadow-camera-bottom={-24}
        />
        <directionalLight position={[-10, 6, -10]} intensity={0.35} color={ACCENT} />
        <pointLight position={[0, 5, 0]} intensity={0.8} color={ACCENT} distance={16} />

        <CameraRig />
        <Terrain tiles={tiles} />

        {labs.map((l) => (
          <LabMesh
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

        <GroundClickPlane gridRadius={radius} blockers={blockers} />
        <Ticker />

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={6}
          maxDistance={32}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
        />
      </Suspense>
    </Canvas>
  );
}

const PALETTES: Record<
  "cyan" | "violet" | "warm" | "amber",
  { body: string; bodyMid: string; accent: string }
> = {
  cyan: { body: "#1a2235", bodyMid: "#141a2a", accent: ACCENT },
  violet: { body: "#211a36", bodyMid: "#1a1428", accent: SIGNAL },
  warm: { body: "#302415", bodyMid: "#241c10", accent: WARM },
  amber: { body: "#301c10", bodyMid: "#221408", accent: AMBER },
};
