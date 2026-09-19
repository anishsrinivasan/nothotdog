# NotHotdog — a Jev (TypeSafe System One) demo

## 0. The one fact that shapes everything

**Jev is text-only.** Both `~typesafe/jev-latest` and `typesafe/jev-1.13` accept text input only
(32K ctx, $0.042/MTok in, output free, 70–500ms e2e). The Silicon Valley app is a *camera*.
So a pure-Jev photo classifier is not buildable. Two honest ways out:

| | A. Two-stage (recommended) | B. Text-only |
|---|---|---|
| Input | Photo from camera/upload | You type/say what you're eating |
| Pipeline | VLM captions image → Jev decides | Jev decides |
| Meme fidelity | High (it's the app) | Low |
| Demonstrates Jev's speed | Yes, *and* shows the caption step is the slow part (800ms vs 90ms) | Yes, purely |
| Extra cost | one small VLM call | none |

Recommendation: **A**, because the split timings are the demo. The slow, token-by-token part is
visibly the LLM; the decision is Jev and it's already done before the spinner finishes. That's the
real-world architecture TypeSafe is selling — Jev as the decision layer over messy state.

## 1. Goal

A one-page Next.js app that makes Jev's latency and calibration *felt*, not read about.
Success = a stranger watches for 20 seconds and says "wait, that was instant?"

## 2. Non-goals

- Accounts, history, DB, deploy pipeline, mobile app, tests beyond one route check.
- Being a good hotdog classifier. It's a meme.

## 3. Core UX

Single screen, Jian-Yang green/red full-bleed result.

1. Drop/snap a photo (or pick one of 6 bundled samples — instant, no upload, good for demos on bad wifi).
2. Stage 1 chip: `seeing… 812ms` (VLM caption, streams in as text).
3. Stage 2 chip: `deciding… 94ms` (Jev).
4. Verdict fills the screen: **HOTDOG** ✅ / **NOT HOTDOG** ❌, with `p=0.973 · confidence 0.88`.

### The money shot: race mode
Toggle "Race a real LLM". Same caption goes to Jev *and* to a frontier chat model asked for the
same JSON verdict. Two bars fill in real time. Jev's finishes; the other is still streaming.
Show both wall-clock ms and cost.

### Confidence gate (the grown-up part)
A slider sets the auto-act threshold, **defaulting to 0.90, not 0.50** — the original app shipped at
0.90 because a false HOTDOG is much worse (and less funny) than a false NOT HOTDOG. Below the
threshold the verdict shows **NOT SURE — escalating** and the app routes that one case to the slow
LLM. This is the actual production pattern (confidence-gated routing) and it takes ~10 lines.
The slider is also the demo: drag it and watch the same photo flip verdicts, which is what a
calibrated probability buys you and a text-generating LLM does not.

### Editable caption
The caption is shown and is an input. Edit it, Jev re-runs on keystroke-idle in ~90ms, verdict
updates live. This does two jobs: it makes the latency visceral (no spinner, it's just *there*),
and when the app is wrong it shows *which stage* was wrong — the slow eye or the fast decision.
In this architecture it's almost always the eye.

## 4. Jev call

Official SDK over `POST https://api.typesafe.ai/v1/systemone`. One call, all questions evaluated
in parallel (shown here as the wire body the SDK sends):

```jsonc
{
  "model": "jev-latest",
  "state": "<caption from the VLM>",
  "questions": {
    "is_hotdog":  { "type": "noul",   "instructions": "The food shown is a hotdog" },
    "category":   { "type": "choice", "instructions": "What food is this",
                    "criteria": { "hotdog": "A sausage in a bun, any regional style: American, split-top, Danish ristet, Korean corn dog, Japanese konbini dog",
                                  "sausage_no_bun": "Sausage, no bun",
                                  "sandwich": "Other filled bread",
                                  "not_food": "Not food at all",
                                  "other_food": "Any other food" } },
    "jian_yang_confidence": { "type": "score", "instructions": "How clearly this is a hotdog",
                    "criteria": ["No hotdog anywhere", "Hotdog-adjacent", "Unmistakably a hotdog"] }
  }
}
```

Verdict = `is_hotdog >= threshold`. `category` gives the snarky subtitle ("that's a sandwich, Erlich").
Fan-out is free here — extra questions cost ~no extra latency, which is itself worth showing.

## 5. Lessons taken from the original build

Tim Anglade's write-up of the real app (SqueezeNet → MobileNets, on-device, 2017) has six things
that apply even though our pipeline shares no machinery with his:

1. **Ship at 0.90, not 0.50.** See above. His dataset was 49:1 not-hotdog to hotdog on purpose.
2. **Default to NOT HOTDOG.** Anything ambiguous, unreadable, or non-food resolves to not-hotdog.
3. **Bias is in the criteria, not the model.** His app couldn't recognize French or Asian hotdogs
   because nobody on the team ate them. Ours has the same hole one layer up: the `choice` criteria
   and the caption prompt. So the criteria name variants explicitly (bun-less, split-top, Danish
   ristet hotdog, Korean corn dog, Japanese konbini dog) and the sample set includes them.
4. **Measure end-to-end, not model-level.** The number that matters is what the app finally says
   after threshold and escalation — not `is_hotdog` raw. Log both.
5. **Give users somewhere to put the frustration.** A 👎 on a wrong verdict, storing
   `{caption, answers, thumb}` to a local JSONL. Costs nothing, and the collected captions are the
   eval set if this ever gets serious.
6. **Adversarial inputs are photos of screens.** Moiré, soft focus, a person in a red outfit. Ours
   fail at the caption step, and the editable caption box is how the demo survives that gracefully.

One honest caveat to carry: his app's whole thesis was *no cloud round trip* — on-device, offline,
private, $0 at scale. Ours is a network call, so we've given that up. All the more reason section 7
shows network time separately instead of quietly folding it into the model number.

## 6. Stack

- Next.js (App Router) + Tailwind. One page, two route handlers.
- `POST /api/classify` — VLM caption then Jev, returns both timings. Keys stay server-side.
- `POST /api/race` — same caption to a frontier model for the race bar.
- **AI SDK 7** for the VLM + race model (`generateText` with `output`; note `system` → `instructions`
  in v7, and `generateObject` is deprecated).
- Jev via the **official TypeSafe JS SDK** (`@typesafe-ai/sdk`, Node 20+, `TYPESAFE_API_KEY`) —
  `client.systemOne({ state, questions: { is_hotdog: noul(...), category: choice(...) } })`.
  It is not a chat-completions API, so AI SDK cannot wrap it. No OpenRouter path: official API only,
  server-side only, key never reaches the browser.

## 7. Timing honesty

Measure server-side around each call and return `{captionMs, jevMs}` separately; show network
round-trip as a third, greyed number. A demo that quietly counts network time as model time is the
thing this app exists to argue against.

## 8. Build order

1. Page + sample images + fake verdict (UI done, no keys needed).
2. `/api/classify` with Jev on a hardcoded caption — proves the Jev call and prints real latency.
3. Wire the VLM caption.
4. Race mode.
5. Confidence slider.

Stops being worth building after 4 if the numbers aren't impressive.

## 9. Open questions

- Which VLM for captioning — needs to be the *fastest* available, not the best.
