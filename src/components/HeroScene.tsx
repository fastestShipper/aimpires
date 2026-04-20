"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo, Suspense } from "react";
import * as THREE from "three";

function IsoCity() {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = clock.elapsedTime * 0.08;
    }
  });

  const tiles = useMemo(() => {
    const out: Array<{ x: number; z: number; h: number; kind: string }> = [];
    const R = 5;
    for (let x = -R; x <= R; x++) {
      for (let z = -R; z <= R; z++) {
        const d = Math.sqrt(x * x + z * z);
        if (d > R) continue;
        const n = (Math.sin(x * 1.3) + Math.cos(z * 1.1)) * 0.5;
        const h = Math.max(0.15, 0.25 + (R - d) * 0.08 + n * 0.1);
        const kind = d < 1.2 ? "tower" : d < 2.8 ? "house" : d < 4 ? "grass" : "water";
        out.push({ x, z, h, kind });
      }
    }
    return out;
  }, []);

  return (
    <group ref={group} position={[0, -0.4, 0]}>
      {tiles.map((t, i) => {
        const color =
          t.kind === "water"
            ? "#1a2a3a"
            : t.kind === "grass"
              ? "#3a5a2d"
              : t.kind === "house"
                ? "#8a6a3a"
                : "#d4a857";
        const height = t.kind === "tower" ? t.h * 3.2 : t.kind === "house" ? t.h * 1.4 : t.h * 0.5;
        return (
          <group key={i} position={[t.x * 0.85, 0, t.z * 0.85]}>
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.78, height, 0.78]} />
              <meshStandardMaterial
                color={color}
                roughness={0.85}
                metalness={t.kind === "tower" ? 0.25 : 0.05}
                emissive={t.kind === "tower" ? "#d4a857" : "#000000"}
                emissiveIntensity={t.kind === "tower" ? 0.2 : 0}
              />
            </mesh>
            {t.kind === "tower" && (
              <mesh position={[0, height + 0.25, 0]} castShadow>
                <coneGeometry args={[0.45, 0.6, 4]} />
                <meshStandardMaterial color="#8b4513" roughness={0.8} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Floating agent orbs */}
      {[0, 1, 2, 3, 4].map((i) => (
        <AgentOrb key={i} index={i} />
      ))}
    </group>
  );
}

function AgentOrb({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const radius = 3 + (index % 3) * 0.6;
  const speed = 0.4 + index * 0.07;
  const offset = (index / 5) * Math.PI * 2;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speed + offset;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.z = Math.sin(t) * radius;
    ref.current.position.y = 0.8 + Math.sin(t * 2) * 0.15;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial
        color="#e8b76a"
        emissive="#d4a857"
        emissiveIntensity={1.4}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [7, 6, 7], fov: 35 }}
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <fog attach="fog" args={["#08090c", 8, 22]} />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[8, 12, 4]}
          intensity={1.6}
          color="#fff0d0"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-6, 4, -6]} intensity={0.5} color="#6a8abf" />
        <IsoCity />
      </Suspense>
    </Canvas>
  );
}
