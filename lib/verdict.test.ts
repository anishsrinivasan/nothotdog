import assert from "node:assert/strict";
import { verdictOf } from "./verdict.ts";

// default threshold 0.90, margin 0.08 -> unsure band is [0.82, 0.90)
assert.equal(verdictOf(0.99), "HOTDOG");
assert.equal(verdictOf(0.97), "HOTDOG"); // a confident yes is not a close call
assert.equal(verdictOf(0.9), "HOTDOG"); // the gate itself passes
assert.equal(verdictOf(0.89), "UNSURE");
assert.equal(verdictOf(0.85), "UNSURE");
assert.equal(verdictOf(0.81), "NOT_HOTDOG");
assert.equal(verdictOf(0.02), "NOT_HOTDOG");

// a confident 0.7 is NOT_HOTDOG at the strict default, HOTDOG once you relax the gate
assert.equal(verdictOf(0.7), "NOT_HOTDOG");
assert.equal(verdictOf(0.7, 0.5), "HOTDOG");

// margin 0 removes the escalation band entirely
assert.equal(verdictOf(0.9, 0.9, 0), "HOTDOG");
assert.equal(verdictOf(0.89, 0.9, 0), "NOT_HOTDOG");
// nothing escalates when the gate is wide open
assert.equal(verdictOf(0.55, 0.5), "HOTDOG");

console.log("verdict ok");
