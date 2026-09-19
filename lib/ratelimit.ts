import { checkRateLimit } from "@vercel/firewall";
import { NextResponse } from "next/server";

// ponytail: in-memory fixed window — per instance, resets on deploy, useless across
// serverless lambdas. It is the local-dev gate and a cheap inner guard only. The gate
// that actually holds in production is the Vercel Firewall rule below.
const hits = new Map<string, { n: number; resetAt: number }>();

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (
    fwd?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Both keys are burnable by anyone who can reach this app, so every route that spends
 * money gets a gate. Returns a 429 to hand straight back, or null to continue.
 */
export function rateLimit(req: Request, route: string, limit: number, windowMs = 60_000) {
  const key = `${route}:${clientIp(req)}`;
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { n: 1, resetAt: now + windowMs });
    if (hits.size > 10_000) for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    return null;
  }

  entry.n += 1;
  if (entry.n > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: `Slow down — ${limit} ${route} calls a minute. Try again in ${retryAfter}s.` },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }
  return null;
}

/** Jev is cheap; the vision and race models are not. */
export const LIMITS = { classify: 30, caption: 6, race: 6 } as const;

/** Nothing here needs a big payload, and an unbounded data URL is a free bill. */
export const MAX_IMAGE_BYTES = 4_000_000;
export const MAX_ITEMS = 50;
export const MAX_STATE_CHARS = 600;


/**
 * The durable gate. The in-memory limiter above is per-instance and resets on every cold
 * start, so on Vercel it is only an inner guard — this is what actually holds.
 *
 * Pro allows 40 rate-limit rules per project, so each route gets its own rule and its own
 * limit, bucketed by IP by default. Each `RULES` id must exist as a Firewall rate-limit
 * rule in the dashboard or the call does nothing; see DEPLOY.md.
 */
export const RULES = {
  classify: "nothotdog-classify",
  caption: "nothotdog-caption",
  race: "nothotdog-race",
} as const;

export async function guard(req: Request, route: keyof typeof RULES) {
  const local = rateLimit(req, route, LIMITS[route]);
  if (local) return local;
  if (!process.env.VERCEL) return null;

  try {
    const { rateLimited } = await checkRateLimit(RULES[route], { request: req });
    if (rateLimited) {
      return NextResponse.json(
        { error: `Slow down — ${LIMITS[route]} ${route} calls a minute.` },
        { status: 429, headers: { "retry-after": "60" } },
      );
    }
  } catch {
    // Rule missing or firewall unreachable; the in-memory gate already ran.
  }
  return null;
}
