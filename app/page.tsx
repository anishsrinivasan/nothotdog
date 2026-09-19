"use client";

import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { DEFAULT_THRESHOLD, verdictOf, type Verdict } from "@/lib/verdict";

type Mode = "text" | "menu" | "photo";

type Single = {
  answers: {
    is_hotdog: { noul: number };
    category: { choice: string; confidence: number };
    clarity: { score: number; confidence: number };
    is_nsfw: { noul: number };
  };
  usage: { input_tokens: number; output_tokens: number };
  model: string;
  jevMs: number;
};

type Batch = {
  items: { text: string; p: number }[];
  nsfw: number;
  questionCount: number;
  callCount: number;
  usage: { input_tokens: number; output_tokens: number };
  jevMs: number;
};

// The middle three are from the original app's own "hilarious errors" screenshot.
const SAMPLE_MENU = `chili cheese dog
bratwurst in a bun with mustard
an acorn squash
a peeled banana sitting in a hotdog bun
korean corn dog
lobster roll
danish ristet hotdog with remoulade
a black leather shoe
chicago dog dragged through the garden
sausage roll
an empty hotdog bun
bacon-wrapped sonoran dog
katsu sando
konbini frankfurt with karashi
pigs in a blanket`;

// Mostly not hotdogs, because most food is not a hotdog. A few are, and a few are arguable.
const FOODS = [
  "sambar rice",
  "poori with channa masala",
  "masala dosa",
  "pav bhaji",
  "vada pav",
  "pasta arrabbiata",
  "margherita pizza",
  "chicken biryani",
  "pani puri",
  "idli with coconut chutney",
  "ramen with a soft egg",
  "sushi platter",
  "chole bhature",
  "butter chicken with naan",
  "pad thai",
  "a plate of momos",
  "tacos al pastor",
  "medu vada",
  "rajma chawal",
  "paneer tikka",
  "a cheeseburger",
  "falafel wrap",
  "kathi roll",
  "a bowl of curd rice",
  "chili cheese dog",
  "korean corn dog",
  "danish ristet hotdog with remoulade",
  "bacon-wrapped sonoran dog",
  "a frankfurter in a brioche bun",
  "bratwurst in a bun with mustard",
  "a naked sausage on a plate",
  "pigs in a blanket",
  "an empty hotdog bun",
  "a black leather shoe",
  "an acorn squash",
];

// Deliberately lower than the hotdog gate: err toward refusing.
const NSFW_GATE = 0.7;

function Blocked({ what }: { what: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-6 py-10 text-center">
      <div className="text-4xl">🚫</div>
      <div className="mt-3 font-mono text-sm uppercase tracking-widest text-neutral-400">
        not classifying that
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        {what} tripped the safety check. This app only wants to look at food.
      </p>
    </div>
  );
}

const REPO = "https://github.com/anishsrinivasan/nothotdog";

function GitHubStar({ className = "" }: { className?: string }) {
  return (
    <a
      href={REPO}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-4 py-1.5 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-white ${className}`}
    >
      <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 fill-current">
        <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
      </svg>
      Star on GitHub
    </a>
  );
}

const VIDEO_ID = "tWwCK95X6go";

/**
 * Local stills win when present; frames from the demo video fill in otherwise, so a
 * slide can never render as a broken image. Drop files in public/tribute to override.
 */
const TRIBUTE = [
  { src: "/tribute/1.jpg", fallback: `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`, caption: "The demo. An audience of five, in a kitchen." },
  { src: "/tribute/2.jpg", fallback: `https://img.youtube.com/vi/${VIDEO_ID}/hq1.jpg`, caption: "Jian-Yang, back to camera, presenting SeeFood." },
  { src: "/tribute/3.jpg", fallback: `https://img.youtube.com/vi/${VIDEO_ID}/hq3.jpg`, caption: "The beta testers. Unconvinced." },
];

function TributeImage({ src, fallback, alt }: { src: string; fallback: string; alt: string }) {
  const [current, setCurrent] = useState(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      loading="lazy"
      onError={() => current !== fallback && setCurrent(fallback)}
      className="aspect-video w-full bg-neutral-900 object-cover"
    />
  );
}

function Tribute() {
  const autoplay = useRef(Autoplay({ delay: 2600, stopOnInteraction: false }));
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-center font-mono text-[10px] uppercase tracking-widest text-neutral-600">
        in tribute — Jian-Yang and Silicon Valley
      </h2>

      <div className="mb-4 overflow-hidden rounded-xl border border-neutral-800">
        <iframe
          className="aspect-video w-full"
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`}
          title="Silicon Valley — Jian-Yang's hotdog app"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>

      <Carousel
        opts={{ loop: true, align: "start" }}
        plugins={[autoplay.current]}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {TRIBUTE.map((t) => (
            <CarouselItem key={t.src} className="basis-4/5 pl-3 sm:basis-1/2">
              <figure className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
                <TributeImage src={t.src} fallback={t.fallback} alt={t.caption} />
                <figcaption className="px-3 py-2 text-[11px] leading-snug text-neutral-500">
                  {t.caption}
                </figcaption>
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <p className="mt-3 text-center text-[11px] text-neutral-600">
        No affiliation with HBO. A fan project about a fake app.
      </p>
    </section>
  );
}

const JAB: Record<string, string> = {
  hotdog: "Correct. This is the one food the app knows.",
  sausage_no_bun: "No bun. Jian-Yang does not negotiate.",
  sandwich: "That is a sandwich. Sandwich is not hotdog.",
  other_food: "It is food. It is not hotdog. Try again.",
  not_food: "This is not even food. Very disappointing.",
};

function Badge({ hot }: { hot: boolean }) {
  return (
    <div
      className={`relative grid h-16 w-16 place-items-center rounded-full border-4 border-white text-3xl shadow-lg ${
        hot ? "bg-[#00c400]" : "bg-[#e0112b]"
      }`}
    >
      <span>🌭</span>
      {!hot && (
        <>
          <span className="absolute h-1.5 w-14 rotate-45 rounded bg-white shadow-[0_0_0_2px_rgba(0,0,0,.6)]" />
          <span className="absolute h-1.5 w-14 -rotate-45 rounded bg-white shadow-[0_0_0_2px_rgba(0,0,0,.6)]" />
        </>
      )}
    </div>
  );
}

/** The screen from the app: banner, badge biting into it, Share, No Thanks. */
function AppScreen({
  v,
  p,
  jab,
  image,
  stale,
  jevMs,
  captionMs,
  subject,
  children,
}: {
  v: Verdict;
  p: number;
  jab?: string;
  image?: string | null;
  stale?: boolean;
  jevMs?: number;
  captionMs?: number | null;
  subject?: string;
  children?: React.ReactNode;
}) {
  const hot = v === "HOTDOG";
  const bg = hot ? "bg-[#00c400]" : v === "UNSURE" ? "bg-[#e5a000]" : "bg-[#e0112b]";
  const label = hot ? "Hotdog!" : v === "UNSURE" ? "Not sure!" : "Not hotdog!";

  const [sharing, setSharing] = useState(false);

  /** Renders the card server-side with next/og, then hands over a real PNG. */
  async function share() {
    setSharing(true);
    try {
      const url = `/api/share?v=${v}&p=${p}&ms=${jevMs ?? 0}&text=${encodeURIComponent(subject ?? "")}`;
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "nothotdog.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        // Desktop browsers mostly cannot share files, so save it instead.
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = "nothotdog.png";
        a.click();
        URL.revokeObjectURL(href);
      }
    } catch {
      /* sheet dismissed, or the render failed; nothing to recover */
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      className={`rounded-2xl bg-neutral-900 shadow-2xl transition-opacity duration-150 ${
        stale ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className={`${bg} relative rounded-t-2xl px-4 pb-7 pt-4 text-center`}>
        <div className="shout text-4xl sm:text-5xl">{label}</div>
        {stale && (
          <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-sm bg-black/20">
            <div className="h-full w-1/3 animate-[slide_0.9s_ease-in-out_infinite] bg-black/40" />
          </div>
        )}
        <div className="absolute left-1/2 top-full z-10 -translate-x-1/2 -translate-y-1/2">
          <Badge hot={hot} />
        </div>
      </div>

      <div className="relative bg-neutral-950">
        {image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="h-56 w-full object-cover" />
            <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
              <span className="rounded-full bg-black/80 px-3 py-1 font-mono text-sm font-bold tabular-nums text-green-400">
                {p.toFixed(3)}
              </span>
              {jevMs !== undefined && (
                <span className="rounded-full bg-black/80 px-3 py-1 font-mono text-sm font-bold tabular-nums text-green-400">
                  {jevMs}ms
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-stretch justify-center divide-x divide-neutral-800 px-4 pb-5 pt-8 text-center">
            <div className="flex-1 px-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">
                p(hotdog)
              </div>
              <div className="shout text-5xl leading-tight">{p.toFixed(3)}</div>
            </div>
            {jevMs !== undefined && (
              <div className="flex-1 px-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">
                  decided in
                </div>
                <div className="shout text-5xl leading-tight">
                  {jevMs}
                  <span className="text-2xl">ms</span>
                </div>
              </div>
            )}
          </div>
        )}
        {captionMs != null && (
          <p className="px-4 pb-1 text-center font-mono text-[11px] text-amber-500/80">
            + {captionMs}ms before that, for a normal model to look at the photo
          </p>
        )}
        {jab && (
          <p
            className={`px-4 pb-4 text-center text-sm text-neutral-300 ${
              image ? "bg-black/70 py-2" : ""
            }`}
          >
            {jab}
          </p>
        )}
      </div>

      <div className="space-y-2 rounded-b-2xl bg-neutral-900 px-6 pb-5 pt-4 text-center">
        <button
          onClick={share}
          disabled={sharing}
          className="w-full rounded-lg border-2 border-white bg-[#22b8f0] px-6 py-3 text-xl font-bold text-white shadow-md disabled:opacity-60"
        >
          {sharing ? "Making image…" : "Share"}
        </button>
        <div className="text-sm text-neutral-400">No Thanks</div>
        {children}
      </div>
    </div>
  );
}

function Pipeline({
  captionMs,
  jevMs,
  vlm,
  jevModel,
  stale,
}: {
  captionMs: number | null;
  jevMs: number;
  vlm?: string;
  jevModel?: string;
  stale?: boolean;
}) {
  const max = Math.max(captionMs ?? 0, jevMs, 1);
  const row = (icon: string, label: string, ms: number, tone: string) => (
    <div className="flex items-center gap-3 font-mono text-[11px]">
      <span className="w-4">{icon}</span>
      <span className="w-52 shrink-0 truncate text-neutral-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(2, (ms / max) * 100)}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right tabular-nums text-neutral-300">{ms}ms</span>
    </div>
  );
  return (
    <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">
        {stale ? "deciding…" : "what actually ran"}
      </div>
      {captionMs !== null && row("👁", `${vlm ?? "vlm"} writes a sentence`, captionMs, "bg-amber-500")}
      {row("🧠", `${jevModel ?? "jev"} reads it and decides`, jevMs, "bg-green-500")}
      {captionMs !== null ? (
        <p className="pt-1 text-[11px] leading-relaxed text-neutral-500">
          Jev cannot see. The photo is described by a normal LLM first, and that step is{" "}
          <span className="text-neutral-300">{Math.round(captionMs / Math.max(jevMs, 1))}× slower</span>{" "}
          than the decision. Jev never touches the image — only the sentence above it.
        </p>
      ) : (
        <p className="pt-1 text-[11px] leading-relaxed text-neutral-500">
          No eye needed here: your text goes straight to Jev, so this number is the whole wait.
        </p>
      )}
    </div>
  );
}

export default function Page() {
  const [mode, setMode] = useState<Mode>("text");
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState("chili cheese dog");
  const [single, setSingle] = useState<Single | null>(null);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [captionMs, setCaptionMs] = useState<number | null>(null);
  const [vlm, setVlm] = useState<string | undefined>();

  const [menu, setMenu] = useState(SAMPLE_MENU);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [race, setRace] = useState<{ llmMs: number; verdicts: string[]; model: string } | null>(null);
  const [racing, setRacing] = useState(false);

  function randomFood() {
    // Never the same one twice in a row, or the button feels broken.
    let next = state;
    while (next === state) next = FOODS[Math.floor(Math.random() * FOODS.length)];
    setState(next);
  }

  // Answers are pure functions of their input, so one Map removes every repeat call —
  // switching tabs, retyping a previous value, re-running the same menu. A query
  // library would be a dependency for three endpoints that never invalidate.
  const cache = useRef(new Map<string, Single>());
  const batchCache = useRef(new Map<string, Batch>());
  const raceCache = useRef(new Map<string, { llmMs: number; verdicts: string[]; model: string }>());

  const post = useCallback(async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? res.statusText);
    return json;
  }, []);

  // Jev is fast enough that re-running on keystroke-idle feels live. That is the demo.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const key = state.trim();
    if (mode === "menu" || !key) return;

    const hit = cache.current.get(key);
    if (hit) {
      setSingle(hit);
      setStale(false);
      return;
    }

    setStale(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        const res: Single = await post("/api/classify", { state: key });
        cache.current.set(key, res);
        setSingle(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
        setStale(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, mode, post]);

  async function onPhoto(file: File) {
    setError(null);
    setCaptionMs(null);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    setImage(dataUrl);
    setBusy(true);
    try {
      const cap = await post("/api/caption", { image: dataUrl });
      setCaptionMs(cap.captionMs);
      setVlm(cap.model);
      setState(cap.caption); // the effect above sends this to Jev
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const lines = () => menu.split("\n").map((s) => s.trim()).filter(Boolean);

  async function runMenu() {
    const items = lines();
    const key = items.join("\n");
    setError(null);
    setRace(null);

    const hit = batchCache.current.get(key);
    if (hit) return setBatch(hit);

    setBusy(true);
    setBatch(null);
    try {
      const res: Batch = await post("/api/classify", { items });
      batchCache.current.set(key, res);
      setBatch(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runRace() {
    const items = lines();
    const key = items.join("\n");

    const hit = raceCache.current.get(key);
    if (hit) return setRace(hit);

    setRacing(true);
    setRace(null);
    try {
      const res = await post("/api/race", { items });
      raceCache.current.set(key, res);
      setRace(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRacing(false);
    }
  }

  const p = single?.answers.is_hotdog.noul ?? 0;
  const v = verdictOf(p, threshold);
  const blocked = (single?.answers.is_nsfw.noul ?? 0) >= NSFW_GATE;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="shout text-5xl">NotHotdog</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Jian-Yang&apos;s Shazam for food. It knows two foods:{" "}
          <span className="text-neutral-200">hotdog</span> and{" "}
          <span className="text-neutral-200">not hotdog</span>. Octopus is coming in v2.
        </p>
        <GitHubStar className="mt-3" />
      </header>

      <div className="mb-5 flex gap-1 rounded-xl bg-neutral-900 p-1 text-sm">
        {(["text", "photo", "menu"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg px-3 py-2 capitalize transition ${
              mode === m
                ? "bg-neutral-100 font-semibold text-black"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {m === "photo" ? "📷 photo" : m === "menu" ? "whole menu" : "text"}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {mode !== "menu" ? (
        <div className="space-y-4">
          {mode === "photo" && (
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-neutral-700 px-4 py-6 text-center text-sm text-neutral-400 hover:border-neutral-500">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
              />
              {image ? "take another" : "tap to snap or drop a photo"}
            </label>
          )}

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-neutral-600">
              {mode === "photo"
                ? "what the eye wrote — edit it, Jev re-decides as you type"
                : "what are you eating"}
            </label>
            <div className="flex gap-2">
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 outline-none focus:border-neutral-600"
              />
              {mode === "text" && (
                <button
                  onClick={randomFood}
                  title="feed it something else"
                  className="shrink-0 rounded-xl border border-neutral-800 px-4 text-xl hover:border-neutral-600"
                >
                  🎲
                </button>
              )}
            </div>
          </div>

          {single && blocked && <Blocked what="What you typed" />}

          {single && !blocked && (
            <>
              <AppScreen
                v={v}
                p={p}
                stale={stale}
                jevMs={single.jevMs}
                captionMs={mode === "photo" ? captionMs : null}
                subject={state}
                image={mode === "photo" ? image : null}
                jab={v === "UNSURE" ? "Jian-Yang is not sure. A human should look." : JAB[single.answers.category.choice]}
              />
              <Pipeline
                captionMs={mode === "photo" ? captionMs : null}
                jevMs={single.jevMs}
                stale={stale}
                vlm={vlm}
                jevModel={single.model}
              />
              <p className="text-center font-mono text-[11px] text-neutral-600">
                {single.usage.input_tokens} in / {single.usage.output_tokens} out · category{" "}
                {single.answers.category.choice} ({single.answers.category.confidence.toFixed(2)}) ·
                clarity {single.answers.clarity.score.toFixed(2)}/2
              </p>
            </>
          )}
          {busy && !single && (
            <p className="text-center font-mono text-xs text-neutral-600">deciding…</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-neutral-600">
              one per line — items 2-4 are from the original app’s "hilarious errors" shot
            </label>
            <textarea
              value={menu}
              onChange={(e) => setMenu(e.target.value)}
              rows={10}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 font-mono text-sm outline-none focus:border-neutral-600"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={runMenu}
              disabled={busy}
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {busy ? "…" : `classify all ${lines().length}`}
            </button>
            <button
              onClick={runRace}
              disabled={racing}
              className="rounded-xl border border-neutral-700 px-4 py-2 text-sm disabled:opacity-40"
            >
              {racing ? "the LLM is typing…" : "race an LLM"}
            </button>
          </div>

          {batch && batch.nsfw >= NSFW_GATE && <Blocked what="Something in that list" />}

          {batch && batch.nsfw < NSFW_GATE && (
            <>
              <div className="divide-y divide-neutral-900 overflow-hidden rounded-xl border border-neutral-800">
                {batch.items.map((item, i) => {
                  const iv = verdictOf(item.p, threshold);
                  const llm = race?.verdicts[i];
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="flex-1 truncate">{item.text}</span>
                      {llm && (
                        <span className="font-mono text-[10px] text-neutral-600">
                          llm:{llm === "HOTDOG" ? "yes" : "no"}
                        </span>
                      )}
                      <span className="w-10 text-right font-mono text-xs tabular-nums text-neutral-500">
                        {item.p.toFixed(2)}
                      </span>
                      <span
                        className={`w-24 rounded px-2 py-0.5 text-center font-mono text-[10px] font-bold ${
                          iv === "HOTDOG"
                            ? "bg-[#00c400] text-black"
                            : iv === "UNSURE"
                              ? "bg-[#e5a000] text-black"
                              : "bg-[#e0112b] text-white"
                        }`}
                      >
                        {iv === "HOTDOG" ? "HOTDOG" : iv === "UNSURE" ? "NOT SURE" : "NOT HOTDOG"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4 font-mono text-[11px]">
                <div className="text-[10px] uppercase tracking-widest text-neutral-600">
                  what actually ran
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-40 text-neutral-400">🧠 jev, {batch.questionCount} questions</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${(batch.jevMs / Math.max(race?.llmMs ?? batch.jevMs, batch.jevMs)) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-right tabular-nums">{batch.jevMs}ms</span>
                </div>
                {race && (
                  <div className="flex items-center gap-3">
                    <span className="w-40 truncate text-neutral-400">⌨️ {race.model}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
                      <div className="h-full bg-neutral-600" style={{ width: "100%" }} />
                    </div>
                    <span className="w-16 text-right tabular-nums">{race.llmMs}ms</span>
                  </div>
                )}
                <p className="pt-1 leading-relaxed text-neutral-500">
                  {batch.questionCount} questions in {batch.callCount} call
                  {batch.callCount > 1 ? "s" : ""} · {batch.usage.input_tokens} in /{" "}
                  {batch.usage.output_tokens} out
                  {race && ` · jev was ${(race.llmMs / batch.jevMs).toFixed(1)}× faster`}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-neutral-800 p-4">
        <div className="flex items-baseline justify-between font-mono text-xs text-neutral-400">
          <span>auto-act threshold</span>
          <span className="tabular-nums text-neutral-200">{threshold.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={0.99}
          step={0.01}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="mt-2 w-full accent-green-500"
        />
        <p className="mt-2 text-xs leading-relaxed text-neutral-500">
          Drag it. Verdicts flip with no new API call, because Jev returned a probability rather than
          an opinion. The real app shipped at 0.90, not 0.50 — a false <em>Hotdog!</em> is the worse
          error. Borderline cases go amber instead of guessing, which is where a real app would call
          a slower model or a human.
        </p>
      </div>

      <footer className="mt-8 space-y-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-xs leading-relaxed text-neutral-500">
        <p className="font-semibold text-neutral-300">What this actually is</p>
        <p>
          A joke app around a real question. <strong className="text-neutral-300">Jev</strong> is
          TypeSafe&apos;s System One model: you hand it state plus typed questions, it returns
          calibrated probabilities in one shot instead of generating text. Text and menu modes are
          pure Jev, on the official TypeSafe API.
        </p>
        <p>
          <strong className="text-neutral-300">Photo mode is not.</strong> Jev has no vision, so a
          normal vision model writes one sentence about your picture first and Jev decides on that
          sentence. Two models, and the slow one is never Jev — the bars show you exactly which.
          The caption stays editable so you can tell which stage got it wrong. It is almost always
          the eye.
        </p>
        <p>
          The original app called a bratwurst in a bun <em>Not hotdog!</em> — confidently, with the
          big red banner. Here the same words score 0.88 and land in{" "}
          <span className="text-neutral-300">Not sure</span>, one notch under the gate. That is the
          whole argument for a calibrated probability: not that it is right more often, but that it
          knows when to stop claiming.
        </p>
        <p className="pt-1">
          <GitHubStar />
        </p>
      </footer>

      <Tribute />
    </main>
  );
}
