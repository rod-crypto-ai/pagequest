/** @typedef {{basePoints:number, scorePercent:number, passingScore?:number}} ScoreInput */
/** @param {ScoreInput} input */
export function calculatePoints({ basePoints, scorePercent, passingScore = 70 }) {
  if (!Number.isFinite(basePoints) || basePoints < 0) throw new RangeError("basePoints must be a non-negative number");
  if (!Number.isFinite(scorePercent) || scorePercent < 0 || scorePercent > 100) throw new RangeError("scorePercent must be between 0 and 100");
  if (scorePercent < passingScore) return 0;
  return Math.round(basePoints * (scorePercent / 100) * 10) / 10;
}
