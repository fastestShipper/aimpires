import OpenAI from "@anthropic-ai/sdk";
import type { AgentProfile } from "@/lib/agents";

// Prefer Ollama Cloud (OpenAI-compatible) — same provider Vladmir uses.
// Falls back to Anthropic SDK if ANTHROPIC_API_KEY is set.
// Falls back to a simulated template if neither is configured.
const OLLAMA_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "https://ollama.com/v1";
const OLLAMA_MODEL = process.env.AIMPIRES_MODEL ?? "qwen3.5:397b-cloud";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.AIMPIRES_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

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
  const userMsg = `World: ${context.worldName}. Citizen: ${context.agentName} (${profile.role}).\n\nTask: ${taskPrompt}`;

  if (OLLAMA_KEY) {
    try {
      const resp = await fetch(`${OLLAMA_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${OLLAMA_KEY}`,
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            { role: "system", content: profile.systemPrompt },
            { role: "user", content: userMsg },
          ],
          max_tokens: 2048,
          stream: false,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`ollama http ${resp.status}: ${text.slice(0, 400)}`);
      }
      const data = (await resp.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number };
        model?: string;
      };
      const content = data.choices[0]?.message?.content ?? "";
      return {
        content,
        model: data.model ?? OLLAMA_MODEL,
        simulated: false,
        tokensIn: data.usage?.prompt_tokens,
        tokensOut: data.usage?.completion_tokens,
      };
    } catch (err) {
      // Fall through to anthropic or simulated
      console.error("ollama_error", err instanceof Error ? err.message : err);
    }
  }

  if (ANTHROPIC_KEY) {
    type AnthropicCtor = new (o: { apiKey: string }) => {
      messages: {
        create: (args: {
          model: string;
          max_tokens: number;
          system: string;
          messages: Array<{ role: string; content: string }>;
        }) => Promise<{
          content: Array<{ type: string; text?: string }>;
          model: string;
          usage: { input_tokens: number; output_tokens: number };
        }>;
      };
    };
    const Anthropic = OpenAI as unknown as AnthropicCtor;
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const resp = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: profile.systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = resp.content
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text!)
      .join("\n\n");
    return {
      content: text,
      model: resp.model,
      simulated: false,
      tokensIn: resp.usage.input_tokens,
      tokensOut: resp.usage.output_tokens,
    };
  }

  return {
    content: simulateOutput(profile, taskPrompt, context),
    model: "simulated",
    simulated: true,
  };
}

function simulateOutput(
  profile: AgentProfile,
  task: string,
  ctx: { worldName: string; agentName: string },
): string {
  const header = `# ${profile.artifactLabel} · ${profile.title}\n\n*Produced by ${ctx.agentName} in world ${ctx.worldName}.*\n\n---\n\n## Task\n\n> ${task}\n\n---\n\n`;
  if (profile.kind === "coder") {
    return `// ${task}\n// Simulated — configure OLLAMA_API_KEY or ANTHROPIC_API_KEY in .env.local.\n\nfunction run() {\n  console.log("stub for: ${task.replace(/"/g, "'")}");\n}\nrun();\n`;
  }
  return (
    header +
    `_Simulated artifact. Configure OLLAMA_API_KEY (Ollama Cloud) or ANTHROPIC_API_KEY in .env.local to activate real agents._\n\n- placeholder finding\n- placeholder observation\n- placeholder recommendation\n`
  );
}
