"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo, Suspense } from "react";
import * as THREE from "three";

const ACCENT = "#5ee3d7";
const ACCENT_SOFT = "#2a6b66";
const SIGNAL = "#c4a6ff";
const SURFACE = "#141824";

/** Core obelisk: a tall, stepped data spire with emissive rings. */
function DataCore({ position, height = 2.2 }: { position: [number, number, number]; height?: number }) {
  const ref = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (haloRef.current) haloRef.current.rotation.z = clock.elapsedTime * 0.6;
  });
  return (
    <group position={position} ref={ref}>
      {/* base plate */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.16, 1.8]} />
        <meshStandardMaterial color="#1c2232" roughness={0.8} metalness={0.3} />
      </mesh>
      {/* lower block */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.7, 1.3]} />
        <meshStandardMaterial color={SURFACE} roughness={0.6} metalness={0.35} />
      </mesh>
      {/* mid block */}
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 0.4, 1.05]} />
        <meshStandardMaterial color="#1a2030" roughness={0.55} metalness={0.4} />
      </mesh>
      {/* tall spire */}
      <mesh position={[0, 1.05 + height / 2, 0]} castShadow>
        <boxGeometry args={[0.55, height, 0.55]} />
        <meshStandardMaterial color="#0e1220" roughness={0.45} metalness={0.55} emissive={ACCENT} emissiveIntensity={0.35} />
      </mesh>
      {/* Accent edge glow on spire */}
      <mesh position={[0, 1.05 + height / 2, 0]}>
        <boxGeometry args={[0.6, height + 0.02, 0.08]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.05 + height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.6, height + 0.02, 0.08]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      {/* Halo ring that rotates */}
      <mesh ref={haloRef} position={[0, 1.05 + height + 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.025, 8, 48]} />
        <meshBasicMaterial color={ACCENT} toneMapped={false} />
      </mesh>
      {/* tip pulse */}
      <mesh position={[0, 1.05 + height + 0.1, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Low server block used as crowd of smaller buildings. */
function ServerBlock({ x, z, h = 0.6, accent = false }: { x: number; z: number; h?: number; accent?: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2 + 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, h, 0.7]} />
        <meshStandardMaterial
          color={accent ? "#0e1826" : "#131826"}
          roughness={0.7}
          metalness={0.3}
          emissive={accent ? SIGNAL : ACCENT}
          emissiveIntensity={accent ? 0.12 : 0.05}
        />
      </mesh>
      {/* stripe */}
      <mesh position={[0, h / 2 + 0.08, 0.36]}>
        <boxGeometry args={[0.55, h * 0.2, 0.02]} />
        <meshBasicMaterial color={accent ? SIGNAL : ACCENT} transparent opacity={0.7} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Geometric ground pad (no medieval grass). */
function GroundPad() {
  const tiles = useMemo(() => {
    const out: Array<{ x: number; z: number; h: number; accent: boolean }> = [];
    const R = 5;
    for (let x = -R; x <= R; x++) {
      for (let z = -R; z <= R; z++) {
        const d = Math.sqrt(x * x + z * z);
        if (d > R) continue;
        const edge = d > R - 1.2;
        const h = edge ? 0.06 : 0.14 + (Math.sin(x * 0.8) + Math.cos(z * 0.7)) * 0.04;
        const accent = Math.abs(x) % 3 === 0 && Math.abs(z) % 3 === 0 && d < R - 1;
        out.push({ x, z, h, accent });
      }
    }
    return out;
  }, []);

  return (
    <group position={[0, -0.08, 0]}>
      {tiles.map((t, i) => (
        <group key={i} position={[t.x * 0.85, 0, t.z * 0.85]}>
          <mesh position={[0, t.h / 2, 0]} receiveShadow>
            <boxGeometry args={[0.82, t.h, 0.82]} />
            <meshStandardMaterial color={t.accent ? "#1a2230" : "#10141e"} roughness={0.9} />
          </mesh>
          {t.accent && (
            <mesh position={[0, t.h + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.75, 0.75]} />
              <meshBasicMaterial color={ACCENT_SOFT} transparent opacity={0.35} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** Agent orbs (simulated specialists circling the core). */
function AgentOrbs() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <AgentOrb key={i} index={i} />
      ))}
    </>
  );
}

function AgentOrb({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const radius = 2.8 + (index % 3) * 0.7;
  const speed = 0.35 + index * 0.06;
  const offset = (index / 5) * Math.PI * 2;
  const color = index % 2 === 0 ? ACCENT : SIGNAL;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + offset;
    if (ref.current) {
      ref.current.position.x = Math.cos(t) * radius;
      ref.current.position.z = Math.sin(t) * radius;
      ref.current.position.y = 1.0 + Math.sin(t * 2) * 0.15;
    }
    if (trailRef.current) {
      trailRef.current.position.x = Math.cos(t - 0.15) * radius;
      trailRef.current.position.z = Math.sin(t - 0.15) * radius;
      trailRef.current.position.y = 1.0 + Math.sin((t - 0.15) * 2) * 0.15;
    }
  });

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh ref={trailRef}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} toneMapped={false} />
      </mesh>
    </>
  );
}

function Scene() {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (root.current) root.current.rotation.y = clock.elapsedTime * 0.06;
  });
  return (
    <group ref={root} position={[0, -0.5, 0]}>
      <GroundPad />
      <DataCore position={[0, 0, 0]} height={2.4} />
      <ServerBlock x={-1.6} z={1.6} h={0.8} />
      <ServerBlock x={1.6} z={-1.6} h={0.7} accent />
      <ServerBlock x={-2.2} z={-1.2} h={0.55} />
      <ServerBlock x={2.3} z={1.3} h={0.9} />
      <ServerBlock x={0.1} z={2.8} h={0.6} accent />
      <ServerBlock x={-2.9} z={0.4} h={0.45} />
      <AgentOrbs />
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas camera={{ position: [7, 6.5, 7], fov: 34 }} shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <Suspense fallback={null}>
        <fog attach="fog" args={["#08090e", 8, 24]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[8, 14, 5]} intensity={1.1} color="#b8d4ff" castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-6, 5, -6]} intensity={0.5} color={ACCENT} />
        <pointLight position={[0, 4, 0]} intensity={1.2} color={ACCENT} distance={8} />
        <Scene />
      </Suspense>
    </Canvas>
  );
}
