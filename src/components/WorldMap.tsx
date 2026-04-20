"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { useWorld, type Agent, type City } from "@/lib/store";
import { WORLD_TIERS, type WorldSize } from "@/lib/worlds";

const TILE_SIZE = 1;

function Terrain({ size }: { size: WorldSize }) {
  const tier = WORLD_TIERS[size];
  const radius = Math.ceil(Math.sqrt(tier.mapTiles / Math.PI));

  const tiles = useMemo(() => {
    const out: Array<{ x: number; z: number; h: number; kind: string }> = [];
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const d = Math.sqrt(x * x + z * z);
        if (d > radius) continue;
        const n =
          Math.sin(x * 0.6) * 0.25 +
          Math.cos(z * 0.7) * 0.25 +
          Math.sin((x + z) * 0.35) * 0.15;
        const h = Math.max(0.12, 0.2 + n * 0.35);
        const kind =
          d > radius * 0.92
            ? "water"
            : d > radius * 0.82
              ? "sand"
              : n < -0.25
                ? "water"
                : n > 0.25
                  ? "forest"
                  : "grass";
        out.push({ x, z, h, kind });
      }
    }
    return out;
  }, [radius]);

  return (
    <group>
      {tiles.map((t, i) => {
        const color =
          t.kind === "water"
            ? "#1a2a3a"
            : t.kind === "sand"
              ? "#8a7a4f"
              : t.kind === "forest"
                ? "#2d4a22"
                : "#486a35";
        const height = t.kind === "water" ? 0.1 : t.h;
        return (
          <group key={i} position={[t.x * TILE_SIZE, 0, t.z * TILE_SIZE]}>
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[TILE_SIZE * 0.98, height, TILE_SIZE * 0.98]} />
              <meshStandardMaterial color={color} roughness={0.95} flatShading />
            </mesh>
            {t.kind === "forest" && (
              <Tree x={0} z={0} y={height} />
            )}
          </group>
        );
      })}
    </group>
  );
}

function Tree({ x, z, y }: { x: number; z: number; y: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.35, 6]} />
        <meshStandardMaterial color="#4a3020" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <coneGeometry args={[0.3, 0.7, 6]} />
        <meshStandardMaterial color="#2d4a22" roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}

function CityMesh({ city, onSelect, selected }: { city: City; onSelect: () => void; selected: boolean }) {
  const progress = city.constructionProgress;
  const built = !city.underConstruction;
  const palettes: Record<string, { wall: string; roof: string; accent: string }> = {
    "town-hall": { wall: "#c9b28a", roof: "#7a2418", accent: "#d4a857" },
    "code-forge": { wall: "#2a3440", roof: "#1a2028", accent: "#5aa9e6" },
    "design-atelier": { wall: "#d9c4e3", roof: "#7a3e8a", accent: "#e8b76a" },
    "research-library": { wall: "#b8a68a", roof: "#3a4a2a", accent: "#c8a24a" },
    "trading-post": { wall: "#c89a5a", roof: "#4a2a18", accent: "#e8c26a" },
    "scriptorium": { wall: "#e0d4b8", roof: "#5a4028", accent: "#d4a857" },
  };
  const palette = palettes[city.kind];

  return (
    <group position={[city.position[0], 0, city.position[1]]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Foundation */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.1, 2.4]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.95} />
      </mesh>

      {/* Main building (scales with progress) */}
      <group scale={[1, Math.max(0.05, progress), 1]}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 1.0, 1.6]} />
          <meshStandardMaterial color={palette.wall} roughness={0.85} flatShading />
        </mesh>
        {/* Roof */}
        {built && (
          <mesh position={[0, 1.15, 0]} castShadow>
            <coneGeometry args={[1.25, 0.6, 4]} />
            <meshStandardMaterial color={palette.roof} roughness={0.85} flatShading />
          </mesh>
        )}
        {/* Banner pole */}
        {built && (
          <>
            <mesh position={[0, 1.8, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
              <meshStandardMaterial color="#8a6a3a" />
            </mesh>
            <mesh position={[0.2, 1.85, 0]} castShadow>
              <boxGeometry args={[0.25, 0.2, 0.02]} />
              <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.3} />
            </mesh>
          </>
        )}
      </group>

      {/* Selection ring */}
      {selected && (
        <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.4, 1.55, 32]} />
          <meshBasicMaterial color="#d4a857" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, 2.4, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div className="text-[10px] tracking-[0.25em] uppercase text-[#d4a857] font-light whitespace-nowrap bg-[#08090c]/80 px-2 py-1 border border-[#d4a857]/30">
          {city.name}
        </div>
      </Html>
    </group>
  );
}

function AgentMesh({ agent, onSelect, selected }: { agent: Agent; onSelect: () => void; selected: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const bobRef = useRef(0);

  useFrame((_, dt) => {
    bobRef.current += dt;
    if (ref.current) {
      ref.current.position.y = agent.status === "walking" ? 0.35 + Math.abs(Math.sin(bobRef.current * 8)) * 0.06 : 0.35;
    }
  });

  const colors: Record<string, { body: string; hat: string }> = {
    builder: { body: "#8a6a3a", hat: "#c89a5a" },
    coder: { body: "#2a3440", hat: "#5aa9e6" },
    designer: { body: "#7a3e8a", hat: "#d9c4e3" },
    researcher: { body: "#3a4a2a", hat: "#c8a24a" },
    trader: { body: "#4a2a18", hat: "#e8c26a" },
    scribe: { body: "#5a4028", hat: "#e0d4b8" },
  };
  const c = colors[agent.kind];

  return (
    <group
      ref={ref}
      position={[agent.position[0], 0.35, agent.position[1]]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* body */}
      <mesh castShadow>
        <capsuleGeometry args={[0.12, 0.25, 4, 8]} />
        <meshStandardMaterial color={c.body} roughness={0.8} />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshStandardMaterial color="#e8c8a0" roughness={0.7} />
      </mesh>
      {/* hat */}
      <mesh position={[0, 0.44, 0]} castShadow>
        <coneGeometry args={[0.12, 0.18, 6]} />
        <meshStandardMaterial color={c.hat} roughness={0.75} />
      </mesh>
      {selected && (
        <mesh position={[0, -0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.28, 24]} />
          <meshBasicMaterial color="#d4a857" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
      <Html position={[0, 0.75, 0]} center distanceFactor={6} style={{ pointerEvents: "none" }}>
        <div className="text-[9px] tracking-[0.2em] uppercase text-[#f0ecdf] whitespace-nowrap bg-[#08090c]/70 px-1.5 py-0.5 border border-[#d4a857]/20">
          {agent.name.split(" ")[0]}
        </div>
      </Html>
    </group>
  );
}

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(10, 11, 10);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

function Ticker() {
  const tick = useWorld((s) => s.tick);
  useFrame((_, dt) => {
    // ~20 ticks/sec
    if (dt > 0) tick();
  });
  return null;
}

function GroundClickPlane() {
  const moveAgent = useWorld((s) => s.moveAgent);
  const selectedAgentId = useWorld((s) => s.selectedAgentId);
  const log = useWorld((s) => s.log);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.001, 0]}
      onClick={(e) => {
        if (!selectedAgentId) return;
        const p = e.point;
        moveAgent(selectedAgentId, [Math.round(p.x), Math.round(p.z)]);
        log(`Agent ordered to move to (${Math.round(p.x)}, ${Math.round(p.z)}).`);
      }}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

export default function WorldMap({ size }: { size: WorldSize }) {
  const agents = useWorld((s) => s.agents);
  const cities = useWorld((s) => s.cities);
  const selectedAgentId = useWorld((s) => s.selectedAgentId);
  const selectedCityId = useWorld((s) => s.selectedCityId);
  const setSelectedAgent = useWorld((s) => s.setSelectedAgent);
  const setSelectedCity = useWorld((s) => s.setSelectedCity);

  return (
    <Canvas
      camera={{ position: [10, 11, 10], fov: 35 }}
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#08090c"]} />
      <Suspense fallback={null}>
        <fog attach="fog" args={["#08090c", 15, 45]} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 15, 6]}
          intensity={1.8}
          color="#fff0d0"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <directionalLight position={[-8, 5, -8]} intensity={0.4} color="#6a8abf" />

        <CameraRig />
        <Terrain size={size} />

        {cities.map((c) => (
          <CityMesh
            key={c.id}
            city={c}
            selected={c.id === selectedCityId}
            onSelect={() => setSelectedCity(c.id)}
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

        <GroundClickPlane />
        <Ticker />

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={6}
          maxDistance={28}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
        />
      </Suspense>
    </Canvas>
  );
}
