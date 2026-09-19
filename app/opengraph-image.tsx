import { ImageResponse } from "next/og";

export const alt = "Not Hotdog — a Jev demo that knows when it doesn't know";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The app's own verdict screen, at card size. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
        }}
      >
        <div
          style={{
            background: "#00c400",
            padding: "38px 0",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 104,
              fontWeight: 900,
              color: "#ffe600",
              // ImageResponse has no -webkit-text-stroke, so the outline is a shadow ring.
              textShadow:
                "4px 0 0 #000, -4px 0 0 #000, 0 4px 0 #000, 0 -4px 0 #000, 3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000",
            }}
          >
            Hotdog!
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 70px",
          }}
        >
          <div style={{ fontSize: 150 }}>🌭</div>
          <div style={{ display: "flex", fontSize: 58, fontWeight: 800, color: "#fff" }}>
            NotHotdog
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#a3a3a3",
              marginTop: 14,
              textAlign: "center",
            }}
          >
            The Not Hotdog app, decided by Jev in ~350ms
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#22c55e", marginTop: 26 }}>
            p(hotdog) = 0.98 · confidence 0.97
          </div>
        </div>
      </div>
    ),
    size,
  );
}
