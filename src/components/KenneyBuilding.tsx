"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

// Preload the most common building models so the first selection feels instant.
const BUILDINGS = [
  "building-a", "building-b", "building-c", "building-d", "building-e",
  "building-f", "building-g", "building-h", "building-i", "building-j",
  "building-k", "building-l", "building-m", "building-n", "building-o",
  "building-p", "building-q", "building-r", "building-s", "building-t",
] as const;

const DETAILS = ["chimney-basic", "chimney-medium", "chimney-large", "detail-tank"] as const;

export type BuildingKey = typeof BUILDINGS[number];
export type DetailKey = typeof DETAILS[number];

function modelUrl(name: string): string {
  if (typeof window !== "undefined") {
    // origin omits userinfo (unlike href), so Fetch/Request won't reject it
    return new URL(`/models/buildings/${name}.glb`, window.location.origin).toString();
  }
  return `/models/buildings/${name}.glb`;
}

if (typeof window !== "undefined") {
  BUILDINGS.forEach((b) => useGLTF.preload(modelUrl(b)));
}

interface Props {
  model: BuildingKey | DetailKey;
  position?: [number, number, number];
  rotation?: number; // radians around Y
  scale?: number;
  tint?: string; // optional emissive tint applied to any emissive-capable materials
}

export default function KenneyBuilding({
  model,
  position = [0, 0, 0],
  rotation = 0,
  scale = 1,
  tint,
}: Props) {
  const { scene } = useGLTF(modelUrl(model)) as { scene: THREE.Group };

  // Clone + optionally tint. Cloning avoids state-sharing across multiple instances.
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (!mat) return;
      // Subtle emissive tint only — avoid bloom blowout
      if (tint && "emissive" in mat) {
        mat.emissive = new THREE.Color(tint);
        mat.emissiveIntensity = 0.04;
      }
      mat.roughness = Math.min(0.9, (mat.roughness ?? 0.75) + 0.1);
      mat.metalness = Math.min(0.3, (mat.metalness ?? 0.2) * 0.7);
    });
    return c;
  }, [scene, tint]);

  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={scale} />;
}

export { BUILDINGS, DETAILS };
