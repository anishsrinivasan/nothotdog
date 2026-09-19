# nothotdog

> Jian-Yang's Shazam for food, which knows two foods: hotdog, and not hotdog.

Not Hotdog (Silicon Valley S4E4) rebuilt on **Jev**, TypeSafe's System One model.

Jev doesn't generate text. You give it state plus typed questions and it returns calibrated
probabilities in one forward pass — 70–500ms, output tokens free. **It also can't see.** So this app
is honest about where the time goes:

- **text** — type what you're eating. Jev decides. Its latency is the whole latency.
- **menu** — paste a 200-line menu. One noul per item, ~25 per call, all evaluated in parallel
  against the same state. Then race a text-generating LLM through the same list.
- **photo** — the meme version. A VLM captions the picture, Jev decides on the caption. Two bars,
  and the slow one is never Jev. The caption is editable, so you can see which stage was wrong.

## Run

```sh
cp .env.example .env.local   # TYPESAFE_API_KEY is the only required one
npm run dev
```

Photo mode and race mode additionally need `GOOGLE_GENERATIVE_AI_API_KEY`; without it those two
degrade with a message and the rest still works.

```sh
node --experimental-strip-types lib/verdict.test.ts   # the one check worth having
```

## Deploying

See [DEPLOY.md](./DEPLOY.md). Short version: set a credit cap on the OpenRouter key first, add the
`nothotdog-expensive` Firewall rate-limit rule, then `vercel --prod`.

## Notes

- Threshold defaults to **0.90, not 0.50** — the original app shipped at 0.90 because a false
  HOTDOG is the worse error. Everything ambiguous falls back to NOT HOTDOG.
- Borderline probabilities go amber instead of guessing; in a real app that's the escalation path
  to a slower model or a human. Drag the slider and verdicts flip with no new API call.
- The `choice` criteria name regional variants (Danish ristet, Korean corn dog, konbini dog,
  Sonoran) on purpose. The original couldn't recognize hotdogs nobody on the team had eaten;
  in this architecture that bias lives in the criteria text, so it's fixable in one line.

## Measured, not claimed

On a laptop against the live APIs, round trip included:

| | Jev | the LLM |
|---|---|---|
| 1 item, 3 questions | ~350ms | — |
| 15 items | 809ms | 967ms |
| 40 items | 845ms | 1696ms |
| photo → caption | — | 2278ms before Jev even starts |

Jev going 15 → 40 questions cost 36ms. That flatness is the actual product; the single-call
latency is just the headline.

Also: `bratwurst in a bun with mustard` scores **0.88** — one notch under the 0.90 gate, so it
shows *Not sure* instead of the confident *Not hotdog!* the original app gave that exact photo.

## What's skipped

Feedback capture (👎 → JSONL of caption + answers, the eventual eval set), sample images bundled
for offline demos, and any persistence. Add the first one when you start caring about accuracy.
