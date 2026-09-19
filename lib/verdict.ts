export type Verdict = "HOTDOG" | "NOT_HOTDOG" | "UNSURE";

export const DEFAULT_THRESHOLD = 0.9; // the original app shipped at 0.90, not 0.50
export const DEFAULT_MARGIN = 0.08;

/**
 * Jev hands back a calibrated probability; this turns it into what the app says.
 * Everything defaults to NOT HOTDOG — a false HOTDOG is the worse (and less funny) error.
 * Only genuinely borderline cases land in UNSURE and get escalated to a slow LLM.
 */
export function verdictOf(
  p: number,
  threshold = DEFAULT_THRESHOLD,
  margin = DEFAULT_MARGIN,
): Verdict {
  if (p >= threshold) return "HOTDOG";
  // The band sits below the gate, not across it: a 0.97 is not a close call.
  if (p >= threshold - margin) return "UNSURE";
  return "NOT_HOTDOG";
}
