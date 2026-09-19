# Deploy

The app spends money with two keys that anyone who loads the page can trigger. Order matters:
set the spend caps *before* the site is public.

## 1. Spend caps — the only limit that truly holds

Rate limits shape traffic; a credit cap is what stops a bill. Do both.

- **OpenRouter** → Keys → set a **credit limit** on the key used here (e.g. $5). This is the
  backstop for photo mode and race mode. Without it, nothing below is a guarantee.
- **TypeSafe** → set a spend cap if the console offers one. Jev is cheap ($0.042/MTok in, output
  free), so it is the smaller risk, but cap it anyway.

## 2. Vercel env vars

Project → Settings → Environment Variables, for Production and Preview:

```
TYPESAFE_API_KEY        required
OPENROUTER_API_KEY      optional — photo + race degrade with a message without it
VLM_MODEL               optional, default google/gemini-2.5-flash
RACE_MODEL              optional, default google/gemini-2.5-flash
```

## 3. Firewall rate-limit rule (required for the code gate to work)

`lib/ratelimit.ts` calls `checkRateLimit("nothotdog-expensive", …)`. That call does nothing until a
matching rule exists. Hobby allows **one** rate-limit rule, which is why both paid routes share it
and separate their buckets with `rateLimitKey` (`caption:<ip>` / `race:<ip>`).

Project → **Firewall** → Configure → **+ New Rule**:

- Name: `nothotdog-expensive`
- If → `@vercel/firewall`, **Rate limit ID**: `nothotdog-expensive`
- Rate limit: **6 requests / 60s**, action **Deny**
- Save Rule → **Review Changes** → **Publish**

Counters are per region, so a distributed client can exceed the limit by roughly the number of
regions it reaches. The spend cap in step 1 is what bounds that.

## 4. Two more switches worth flipping

- **Attack Challenge Mode** (Firewall overview) — turn it on if the site gets attention. It
  challenges suspicious traffic without you writing rules.
- **Deployment protection** on Preview, so preview URLs don't burn the same keys.

## 5. Ship

```sh
vercel link
vercel --prod
```

## What is NOT protected

- `/api/classify` (Jev) has only the in-memory limiter, which does not survive across serverless
  instances. Jev is cheap and output tokens are free, so it is capped by the TypeSafe spend limit
  rather than by a rule. If that turns out to be wrong, it needs the second WAF rule — which means
  Pro.
- There is no auth. Anyone can classify anything. That is the point of a demo, and the reason the
  caps above are not optional.
