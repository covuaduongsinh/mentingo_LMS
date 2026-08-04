import { gradeClearSide, gradeCollectTargets, gradeScripted } from "../mode-grade.utils";

import type { ChessLearnLevel } from "@repo/shared";

describe("mode-grade.utils", () => {
  it("grades collect_targets when all targets are visited", () => {
    const level = {
      id: "t",
      fen: "4k3/8/8/8/8/8/4R3/4K3 w - - 0 1",
      solutionUci: [],
      mode: "collect_targets",
      targets: ["e7", "a7"],
      hint: "",
    } satisfies ChessLearnLevel;

    const ok = gradeCollectTargets(level, ["e2e7", "e7a7"]);
    expect(ok.correct).toBe(true);
    expect(ok.eventPoints).toBe(100);

    const partial = gradeCollectTargets(level, ["e2e7"]);
    expect(partial.correct).toBe(false);
    expect(partial.eventPoints).toBe(50);
  });

  it("grades clear_side when opponent pawns are gone", () => {
    const level = {
      id: "c",
      fen: "4k3/2p2p2/8/8/8/2R5/8/4K3 w - - 0 1",
      solutionUci: [],
      mode: "clear_side",
      clearColor: "b",
      hint: "",
    } satisfies ChessLearnLevel;

    const ok = gradeClearSide(level, ["c3c7", "c7f7"]);
    expect(ok.correct).toBe(true); // non-king black pieces gone
    expect(ok.eventPoints).toBe(100);
  });

  it("grades scripted player-only transcript", () => {
    const level = {
      id: "s",
      fen: "8/N2q4/8/8/8/8/6R1/4K3 w - - 0 1",
      solutionUci: [],
      mode: "scripted",
      scriptSteps: [
        { actor: "player" as const, uci: "g2a2" },
        { actor: "opponent" as const, uci: "d7a7" },
      ],
      hint: "",
    } satisfies ChessLearnLevel;

    expect(gradeScripted(level, ["g2a2"]).correct).toBe(true);
    expect(gradeScripted(level, ["g2g3"]).correct).toBe(false);
  });
});
