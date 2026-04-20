import Anthropic from "@anthropic-ai/sdk";
import type { AgentProfile } from "@/lib/agents";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.AIMPIRES_MODEL ?? "claude-sonnet-4-6";

export interface LLMResult {
  content: string;
  model: string;
  simulated: boolean;
  tokensIn?: number;
  tokensOut?: number;
}

export async function runAgent(
  profile: AgentProfile,
  taskPrompt: string,
  context: { worldName: string; agentName: string },
): Promise<LLMResult> {
  if (!API_KEY) {
    return {
      content: simulateOutput(profile, taskPrompt, context),
      model: "simulated",
      simulated: true,
    };
  }

  const client = new Anthropic({ apiKey: API_KEY });
  const userMsg = `Realm: ${context.worldName}. Citizen: ${context.agentName} (${profile.role}).\n\nTask: ${taskPrompt}`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: profile.systemPrompt,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n\n");

  return {
    content: text,
    model: resp.model,
    simulated: false,
    tokensIn: resp.usage.input_tokens,
    tokensOut: resp.usage.output_tokens,
  };
}

function simulateOutput(
  profile: AgentProfile,
  task: string,
  ctx: { worldName: string; agentName: string },
): string {
  const header = `# ${profile.artifactLabel} · ${profile.title}\n\n*Produced by ${ctx.agentName} in the realm of ${ctx.worldName}.*\n\n---\n\n## Task\n\n> ${task}\n\n---\n\n`;

  if (profile.kind === "coder") {
    return `// ${task}\n// Simulated output. Set ANTHROPIC_API_KEY in .env.local for real code.\n\nfunction run() {\n  console.log("Hello from a simulated Coder citizen. Task: ${task.replace(/"/g, "'")}");\n}\n\nrun();\n`;
  }

  if (profile.kind === "builder") {
    return (
      header +
      `## Blueprint — ${task}\n\n**Materials:** oak timber, quarried stone, forge-iron fittings.\n**Crew:** 3 masons, 2 carpenters, 1 smith.\n**Duration:** 6 days.\n\nRises in three courses. A banner of gold cloth crowns the roof. Inside: a main hall floored in flagstone, a workshop to the north, and shelved alcoves to the east. When the last beam is pegged, a hot iron is pressed into the lintel — the realm's mark, passing from this Builder to the next.\n\n_Simulated output. Set ANTHROPIC_API_KEY in .env.local for a real Builder._\n`
    );
  }

  return (
    header +
    `_This is a simulated ${profile.title} output. Add ANTHROPIC_API_KEY to .env.local and this citizen will produce real work._\n\n## Draft\n\nThe ${profile.title.toLowerCase()} of ${ctx.worldName} set to the task. The simulated result reads:\n\n${task}\n\n- A placeholder finding.\n- A placeholder observation.\n- A placeholder recommendation.\n\n_End of simulated artifact._\n`
  );
}
