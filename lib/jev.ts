import { TypeSafeClient, choice, noul, score } from "@typesafe-ai/sdk";

// Constructed lazily: the client throws without TYPESAFE_API_KEY, and that must not
// happen at import time or `next build` fails on a machine with no key.
let cached: TypeSafeClient | undefined;
const client = () => (cached ??= new TypeSafeClient());

/** Named regional variants on purpose: the original app couldn't see a hotdog it hadn't eaten. */
const HOTDOG =
  "A sausage in a bun, any regional style: American, split-top New England, Chicago, Danish ristet hotdog, Korean corn dog, Japanese konbini dog, bacon-wrapped Sonoran.";

export const questions = {
  is_hotdog: noul("The food described is a hotdog", {
    true: HOTDOG,
    false: "Any other food, or something that is not food at all.",
  }),
  category: choice("What is this food", {
    hotdog: HOTDOG,
    sausage_no_bun: "A sausage, frankfurter or bratwurst served without a bun",
    sandwich: "Other filled bread: burger, sub, banh mi, lobster roll, wrap",
    other_food: "Any other food or drink",
    not_food: "Not food at all",
  }),
  clarity: score("How clearly this is a hotdog", [
    "No hotdog anywhere in sight",
    "Hotdog-adjacent, arguable",
    "Unmistakably a hotdog",
  ]),
} as const;

/** One item, three questions, one call — the extra questions are ~free. */
export async function classifyOne(state: string) {
  const started = performance.now();
  const { answers, usage, model } = await client().systemOne({ state, questions });
  return { answers, usage, model, jevMs: Math.round(performance.now() - started) };
}

// ponytail: 25 questions per call is a guess at a safe fan-out, tune if the API takes more
const CHUNK = 25;

/**
 * A whole menu in one shot: one noul per item, all evaluated in parallel against the
 * same state. N questions cost about what one costs — that is the property worth demoing.
 *
 * The item text goes *inside* each question. Asking "item 4 in the list" instead made Jev
 * answer about the wrong rows (a shoe scored 0.97, a Chicago dog 0.01) — it does not count
 * list positions reliably. Self-contained questions have nothing to miscount.
 */
export async function classifyMany(items: string[]) {
  const started = performance.now();
  const chunks: string[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) chunks.push(items.slice(i, i + CHUNK));

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const qs = Object.fromEntries(
        chunk.map((text, i) => [
          `i${i}`,
          noul(`The menu item "${text}" is a hotdog`, {
            true: HOTDOG,
            false: "Any other food, or something that is not food at all.",
          }),
        ]),
      );
      const { answers, usage } = await client().systemOne({
        state: { menu: chunk },
        questions: qs,
      });
      return chunk.map((text, i) => ({
        text,
        p: (answers[`i${i}`] as { noul: number }).noul,
        usage,
      }));
    }),
  );

  const flat = results.flat();
  return {
    items: flat.map(({ text, p }) => ({ text, p })),
    questionCount: flat.length,
    callCount: chunks.length,
    usage: results.reduce(
      (acc, r) => ({
        input_tokens: acc.input_tokens + (r[0]?.usage.input_tokens ?? 0),
        output_tokens: acc.output_tokens + (r[0]?.usage.output_tokens ?? 0),
      }),
      { input_tokens: 0, output_tokens: 0 },
    ),
    jevMs: Math.round(performance.now() - started),
  };
}
