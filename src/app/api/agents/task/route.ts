import { NextResponse } from "next/server";
import { z } from "zod";
import { AGENT_PROFILES } from "@/lib/agents";
import type { AgentKind } from "@/lib/store";
import { runAgent } from "@/lib/llm";
import { writeArtifact } from "@/lib/storage";

const bodySchema = z.object({
  worldId: z.string().min(1),
  worldName: z.string().min(1),
  agentId: z.string().min(1),
  agentName: z.string().min(1),
  agentKind: z.enum([
    "builder",
    "coder",
    "designer",
    "researcher",
    "trader",
    "scribe",
  ]),
  task: z.string().min(3).max(500),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "invalid input" },
      { status: 400 },
    );
  }

  const { worldId, worldName, agentId, agentName, agentKind, task } = parsed.data;
  const profile = AGENT_PROFILES[agentKind as AgentKind];

  let llm;
  try {
    llm = await runAgent(profile, task, { worldName, agentName });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "LLM call failed";
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const slug = task
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const filename = `${stamp}_${slug || "task"}.${profile.artifactExt}`;

  let saved;
  try {
    saved = await writeArtifact(worldId, agentId, filename, llm.content);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "disk write failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      filename,
      relPath: saved.relPath,
      size: saved.size,
      model: llm.model,
      simulated: llm.simulated,
      tokens: llm.tokensIn && llm.tokensOut ? { in: llm.tokensIn, out: llm.tokensOut } : null,
      preview: llm.content.slice(0, 800),
    },
  });
}
