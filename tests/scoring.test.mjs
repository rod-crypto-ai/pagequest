import assert from "node:assert/strict";
import test from "node:test";
import { calculatePoints } from "../lib/scoring.mjs";

test("awards proportional points for a passing score", () => assert.equal(calculatePoints({ basePoints: 5, scorePercent: 80 }), 4));
test("awards no points below the passing score", () => assert.equal(calculatePoints({ basePoints: 5, scorePercent: 60 }), 0));
test("rejects invalid percentages", () => assert.throws(() => calculatePoints({ basePoints: 5, scorePercent: 120 }), RangeError));
