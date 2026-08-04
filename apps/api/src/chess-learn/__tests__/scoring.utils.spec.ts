import {
  efficiencyBonus,
  exactLineMaxScore,
  scoreExactLine,
  starsFromScore,
} from "../scoring.utils";

describe("chess-learn scoring.utils", () => {
  describe("efficiencyBonus", () => {
    it("awards best bonus when moves are at or under optimal", () => {
      expect(efficiencyBonus(1, 1)).toBe(500);
      expect(efficiencyBonus(2, 3)).toBe(500);
    });

    it("awards good bonus within grace window", () => {
      // optimal 8 → grace floor(8/8)=1 → moves 9 still good
      expect(efficiencyBonus(9, 8)).toBe(300);
    });

    it("awards ok bonus when late", () => {
      expect(efficiencyBonus(20, 1)).toBe(100);
    });
  });

  describe("starsFromScore", () => {
    it("returns 0 when score is zero", () => {
      expect(starsFromScore(0, 500)).toBe(0);
    });

    it("returns 3 at max score", () => {
      expect(starsFromScore(500, 500)).toBe(3);
    });

    it("returns 2 when within near-max delta", () => {
      expect(starsFromScore(300, 500)).toBe(2);
    });

    it("returns 1 when complete but further from max", () => {
      expect(starsFromScore(100, 500)).toBe(1);
    });
  });

  describe("exact_line scoring", () => {
    it("matches efficiency bonus for a perfect single-move solve", () => {
      expect(scoreExactLine(1, 1)).toBe(exactLineMaxScore(1));
      expect(starsFromScore(scoreExactLine(1, 1), exactLineMaxScore(1))).toBe(3);
    });
  });
});
