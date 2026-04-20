import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_ROOT = path.resolve(process.cwd(), "worlds_data");

function safeSegment(s: string): string {
  return s.replace(/[^a-z0-9-_]/gi, "").slice(0, 64) || "unknown";
}

export function agentOutputsDir(worldId: string, agentId: string): string {
  return path.join(DATA_ROOT, safeSegment(worldId), "agents", safeSegment(agentId), "outputs");
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeArtifact(
  worldId: string,
  agentId: string,
  filename: string,
  content: string,
): Promise<{ path: string; relPath: string; size: number }> {
  const dir = agentOutputsDir(worldId, agentId);
  await ensureDir(dir);
  const safeName = filename.replace(/[^a-z0-9-_.]/gi, "_").slice(0, 120);
  const full = path.join(dir, safeName);
  await fs.writeFile(full, content, "utf8");
  const stat = await fs.stat(full);
  return {
    path: full,
    relPath: path.join(safeSegment(worldId), "agents", safeSegment(agentId), "outputs", safeName),
    size: stat.size,
  };
}

export interface ArtifactMeta {
  name: string;
  path: string;
  size: number;
  mtime: number;
}

export async function listArtifacts(worldId: string, agentId: string): Promise<ArtifactMeta[]> {
  const dir = agentOutputsDir(worldId, agentId);
  try {
    const names = await fs.readdir(dir);
    const metas = await Promise.all(
      names.map(async (name) => {
        const full = path.join(dir, name);
        const s = await fs.stat(full);
        return {
          name,
          path: path.join(safeSegment(worldId), "agents", safeSegment(agentId), "outputs", name),
          size: s.size,
          mtime: s.mtimeMs,
        } satisfies ArtifactMeta;
      }),
    );
    return metas.sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

export async function readArtifact(worldId: string, agentId: string, name: string): Promise<string> {
  const dir = agentOutputsDir(worldId, agentId);
  const safeName = path.basename(name);
  const full = path.join(dir, safeName);
  const resolved = path.resolve(full);
  if (!resolved.startsWith(path.resolve(dir))) {
    throw new Error("invalid path");
  }
  return await fs.readFile(resolved, "utf8");
}
