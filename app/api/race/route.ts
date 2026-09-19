import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { MAX_ITEMS, MAX_STATE_CHARS, guard } from "@/lib/ratelimit";

export const runtime = "nodejs";

// The opponent: same input, same question, asked of a model that has to type its answer.
const RACER = process.env.RACE_MODEL ?? "google/gemini-2.5-flash";

export async function POST(req: Request) {
  const limited = await guard(req, "race");
  if (limited) return limited;

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "race mode needs OPENROUTER_API_KEY" }, { status: 501 });
  }
  const { state, items } = (await req.json()) as { state?: string; items?: string[] };
  const list = (items?.length ? items : state ? [state] : [])
    .slice(0, MAX_ITEMS)
    .map((s) => s.slice(0, MAX_STATE_CHARS));
  if (!list.length) return NextResponse.json({ error: "no input" }, { status: 400 });

  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const started = performance.now();
  try {
    const { text } = await generateText({
      model: openrouter(RACER),
      instructions:
        "For each numbered food item, answer HOTDOG or NOT. One answer per line, numbered, nothing else.",
      prompt: list.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    });
    const verdicts = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (/\bHOTDOG\b/i.test(line) ? "HOTDOG" : "NOT_HOTDOG"));
    return NextResponse.json({
      model: RACER,
      verdicts,
      llmMs: Math.round(performance.now() - started),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "race failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
