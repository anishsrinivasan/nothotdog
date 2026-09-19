import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { MAX_IMAGE_BYTES, guard } from "@/lib/ratelimit";

export const runtime = "nodejs";

// The eye. The only reason it exists is that Jev cannot see.
// Chosen for latency, not intelligence — the caption only has to say "sausage in a bun".
const VLM = process.env.VLM_MODEL ?? "google/gemini-2.5-flash";

export async function POST(req: Request) {
  const limited = await guard(req, "caption");
  if (limited) return limited;

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "photo mode needs OPENROUTER_API_KEY — text and menu modes work without it" },
      { status: 501 },
    );
  }
  const { image } = (await req.json()) as { image?: string }; // data: URL
  const base64 = image?.split(",")[1];
  if (!base64) return NextResponse.json({ error: "no image" }, { status: 400 });
  if (base64.length * 0.75 > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "photo too big — keep it under 4MB" }, { status: 413 });
  }

  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const started = performance.now();
  try {
    const { text, usage } = await generateText({
      model: openrouter(VLM),
      instructions:
        "You describe food in one short sentence. Name what it is plainly, including the bread it is in. Never say whether it is a hotdog.",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What food is in this picture? One sentence." },
            {
              type: "file",
              mediaType: image!.slice(5).split(";")[0],
              data: { type: "data", data: base64 },
            },
          ],
        },
      ],
    });
    return NextResponse.json({
      caption: text.trim(),
      model: VLM,
      captionMs: Math.round(performance.now() - started),
      usage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "caption failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
