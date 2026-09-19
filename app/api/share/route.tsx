import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const SKIN = {
  HOTDOG: { bg: "#00c400", label: "Hotdog!" },
  NOT_HOTDOG: { bg: "#e0112b", label: "Not hotdog!" },
  UNSURE: { bg: "#e5a000", label: "Not sure!" },
} as const;

// No model call here, so the gate only needs to stop someone rendering PNGs in a loop.
export async function GET(req: Request) {
  const limited = rateLimit(req, "share", 60);
  if (limited) return limited;

  const q = new URL(req.url).searchParams;
  const skin = SKIN[(q.get("v") as keyof typeof SKIN) ?? "NOT_HOTDOG"] ?? SKIN.NOT_HOTDOG;
  const p = Math.min(1, Math.max(0, Number(q.get("p")) || 0));
  const ms = Math.min(99_999, Math.max(0, Math.round(Number(q.get("ms")) || 0)));
  const text = (q.get("text") ?? "").slice(0, 80);

  if (!SKIN[q.get("v") as keyof typeof SKIN]) {
    return NextResponse.json({ error: "bad verdict" }, { status: 400 });
  }

  // Satori collapses a multi-direction text-shadow to one offset, so ask for the
  // single hard shadow directly instead of a stroke that will not survive.
  const outline = "5px 5px 0 #000";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            background: skin.bg,
            padding: "34px 0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{ fontSize: 96, fontWeight: 900, color: "#ffe600", textShadow: outline }}
          >
            {skin.label}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 60px",
          }}
        >
          {text && (
            <div
              style={{
                display: "flex",
                fontSize: 36,
                color: "#d4d4d4",
                marginBottom: 34,
                textAlign: "center",
              }}
            >
              “{text}”
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 64 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", fontSize: 20, color: "#737373", letterSpacing: 3 }}>
                P(HOTDOG)
              </div>
              <div
                style={{ fontSize: 88, fontWeight: 900, color: "#ffe600", textShadow: outline }}
              >
                {p.toFixed(3)}
              </div>
            </div>

            <div style={{ display: "flex", width: 2, height: 96, background: "#262626" }} />

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", fontSize: 20, color: "#737373", letterSpacing: 3 }}>
                DECIDED IN
              </div>
              <div
                style={{ fontSize: 88, fontWeight: 900, color: "#ffe600", textShadow: outline }}
              >
                {`${ms}ms`}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "0 0 34px",
            fontSize: 24,
            color: "#737373",
          }}
        >
          nothotdog-ivory.vercel.app · decided by Jev, not generated
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
