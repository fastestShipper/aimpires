"use client";

import EasyStar from "easystarjs";

export type Grid = number[][]; // 0 walkable, 1 blocked
export type Path = Array<{ x: number; y: number }>;

/**
 * Build a square grid centered at the origin for a world of given radius
 * in tiles. Non-walkable tiles are blocked.
 */
export function buildGrid(
  radius: number,
  blockers: Array<[number, number]>,
): { grid: Grid; offset: number; size: number } {
  const size = radius * 2 + 1;
  const offset = radius;
  const grid: Grid = Array.from({ length: size }, () => Array(size).fill(0));
  for (const [x, z] of blockers) {
    const gx = Math.round(x) + offset;
    const gz = Math.round(z) + offset;
    if (gx >= 0 && gx < size && gz >= 0 && gz < size) {
      grid[gz][gx] = 1;
    }
  }
  return { grid, offset, size };
}

export function findPath(opts: {
  grid: Grid;
  offset: number;
  from: [number, number];
  to: [number, number];
  allowDiagonal?: boolean;
}): Promise<Path | null> {
  return new Promise((resolve) => {
    const es = new EasyStar.js();
    es.setGrid(opts.grid);
    es.setAcceptableTiles([0]);
    if (opts.allowDiagonal !== false) {
      es.enableDiagonals();
      es.disableCornerCutting();
    }

    const sx = Math.round(opts.from[0]) + opts.offset;
    const sz = Math.round(opts.from[1]) + opts.offset;
    const tx = Math.round(opts.to[0]) + opts.offset;
    const tz = Math.round(opts.to[1]) + opts.offset;

    es.findPath(sx, sz, tx, tz, (path) => {
      if (!path) return resolve(null);
      const transformed: Path = path.map((p) => ({
        x: p.x - opts.offset,
        y: p.y - opts.offset,
      }));
      resolve(transformed);
    });
    es.calculate();
  });
}
