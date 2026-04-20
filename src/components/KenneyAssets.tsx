"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

/* ---------- Path helpers ---------- */
function absUrl(p: string): string {
  if (typeof window !== "undefined") {
    return new URL(p, window.location.origin).toString();
  }
  return p;
}

/* ---------- Nature kit (trees + rocks) ---------- */
export const TREES = [
  "tree_default",
  "tree_detailed",
  "tree_oak",
  "tree_pineDefaultA",
  "tree_pineRoundB",
  "tree_pineSmallA",
  "tree_pineSmallC",
  "tree_pineTallA",
] as const;

export const ROCKS = [
  "rock_largeA",
  "rock_largeB",
  "rock_largeC",
  "rock_tallA",
  "rock_tallB",
  "rock_smallA",
  "rock_smallB",
  "rock_smallC",
  "stone_largeA",
  "stone_largeB",
] as const;

export type TreeKey = (typeof TREES)[number];
export type RockKey = (typeof ROCKS)[number];

if (typeof window !== "undefined") {
  TREES.forEach((t) => useGLTF.preload(absUrl(`/models/nature/${t}.glb`)));
  ROCKS.forEach((r) => useGLTF.preload(absUrl(`/models/nature/${r}.glb`)));
}

export function Tree({
  variant,
  position,
  rotation = 0,
  scale = 1,
}: {
  variant: TreeKey;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  const { scene } = useGLTF(absUrl(`/models/nature/${variant}.glb`)) as {
    scene: THREE.Group;
  };
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
    });
    return c;
  }, [scene]);
  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={scale} />;
}

export function Rock({
  variant,
  position,
  rotation = 0,
  scale = 1,
}: {
  variant: RockKey;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  const { scene } = useGLTF(absUrl(`/models/nature/${variant}.glb`)) as {
    scene: THREE.Group;
  };
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
    });
    return c;
  }, [scene]);
  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={scale} />;
}

/* ---------- Blocky characters ---------- */
export const CHARACTERS = [
  "character-a",
  "character-b",
  "character-c",
  "character-d",
  "character-e",
  "character-f",
  "character-g",
  "character-h",
  "character-i",
  "character-j",
  "character-k",
  "character-l",
  "character-m",
  "character-n",
  "character-o",
  "character-p",
  "character-q",
  "character-r",
] as const;

export type CharKey = (typeof CHARACTERS)[number];

if (typeof window !== "undefined") {
  CHARACTERS.forEach((c) => useGLTF.preload(absUrl(`/models/chars/${c}.glb`)));
}

export function Character({
  variant,
  position,
  rotation = 0,
  scale = 1,
  tint,
}: {
  variant: CharKey;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  tint?: string;
}) {
  const { scene } = useGLTF(absUrl(`/models/chars/${variant}.glb`)) as {
    scene: THREE.Group;
  };
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (tint && mat && "emissive" in mat) {
        mat.emissive = new THREE.Color(tint);
        mat.emissiveIntensity = 0.25;
      }
    });
    return c;
  }, [scene, tint]);
  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={scale} />;
}
