import { NextResponse } from "next/server";
import { readArtifact } from "@/lib/storage";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ agentId: string; name: string }> },
) {
  const { agentId, name } = await ctx.params;
  const url = new URL(req.url);
  const worldId = url.searchParams.get("worldId");
  if (!worldId) {
    return NextResponse.json({ success: false, error: "worldId required" }, { status: 400 });
  }
  try {
    const content = await readArtifact(worldId, agentId, decodeURIComponent(name));
    return new NextResponse(content, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ success: false, error: "not found" }, { status: 404 });
  }
}
