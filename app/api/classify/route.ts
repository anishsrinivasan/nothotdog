import { NextResponse } from "next/server";
import { classifyMany, classifyOne } from "@/lib/jev";
import { MAX_ITEMS, MAX_STATE_CHARS, guard } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = await guard(req, "classify");
  if (limited) return limited;

  const body = (await req.json()) as { state?: string; items?: string[] };
  try {
    if (Array.isArray(body.items)) {
      const items = body.items.map((s) => s.trim()).filter(Boolean).slice(0, MAX_ITEMS);
      if (!items.length) return NextResponse.json({ error: "no items" }, { status: 400 });
      return NextResponse.json(await classifyMany(items));
    }
    const state = body.state?.trim().slice(0, MAX_STATE_CHARS);
    if (!state) return NextResponse.json({ error: "no state" }, { status: 400 });
    return NextResponse.json(await classifyOne(state));
  } catch (err) {
    const message = err instanceof Error ? err.message : "jev call failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
