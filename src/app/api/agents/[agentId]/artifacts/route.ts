import { NextResponse } from "next/server";
import { listArtifacts } from "@/lib/storage";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await ctx.params;
  const url = new URL(req.url);
  const worldId = url.searchParams.get("worldId");
  if (!worldId) {
    return NextResponse.json({ success: false, error: "worldId required" }, { status: 400 });
  }
  const items = await listArtifacts(worldId, agentId);
  return NextResponse.json({ success: true, data: items });
}
