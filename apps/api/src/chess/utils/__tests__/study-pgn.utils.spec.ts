import {
  exportChapterPgn,
  parseStudyPgnGame,
  parseStudyPgnImport,
  splitMultiPgn,
  StudyPgnError,
} from "../study-pgn.utils";

const FOOLS_MATE_PGN = `[Event "Fool's Mate"]
[Site "Test"]
[White "White"]
[Black "Black"]
[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1
`;

describe("study-pgn.utils", () => {
  it("splits multi-game PGN on blank line before next tag block", () => {
    const multi = `${FOOLS_MATE_PGN}\n[Event "Second"]\n[Result "*"]\n\n1. e4 e5 *\n`;
    const parts = splitMultiPgn(multi);
    expect(parts.length).toBe(2);
  });

  it("parses mainline into flat nodes with tags and title", () => {
    const draft = parseStudyPgnGame(FOOLS_MATE_PGN, 1);
    expect(draft.title).toBe("Fool's Mate");
    expect(draft.pgnTags.White).toBe("White");
    expect(draft.pgnTags.Result).toBe("0-1");
    expect(draft.moveNodes.length).toBe(4);
    expect(draft.moveNodes[0].parentId).toBeNull();
    expect(draft.moveNodes[0].san).toBe("f3");
    expect(draft.moveNodes[3].san).toContain("Qh4");
    // chain parent links
    expect(draft.moveNodes[1].parentId).toBe(draft.moveNodes[0].id);
  });

  it("round-trips mainline export after import", () => {
    const draft = parseStudyPgnGame(FOOLS_MATE_PGN, 1);
    const exported = exportChapterPgn({
      rootFen: draft.rootFen,
      moveNodes: draft.moveNodes,
      pgnTags: draft.pgnTags,
      orientation: draft.orientation,
    });
    expect(exported).toContain('[Event "Fool\'s Mate"]');
    expect(exported).toContain("f3");
    expect(exported).toContain("Qh4");
    const reimport = parseStudyPgnGame(exported, 1);
    expect(reimport.moveNodes.map((n) => n.san)).toEqual(draft.moveNodes.map((n) => n.san));
  });

  it("rejects empty PGN import", () => {
    expect(() => parseStudyPgnImport("   ")).toThrow(StudyPgnError);
  });

  it("imports two games as two chapter drafts", () => {
    const multi = `${FOOLS_MATE_PGN}\n[Event "Second game"]\n[Result "*"]\n\n1. e4 e5 *\n`;
    const drafts = parseStudyPgnImport(multi);
    expect(drafts).toHaveLength(2);
    expect(drafts[1].title).toBe("Second game");
    expect(drafts[1].moveNodes).toHaveLength(2);
  });
});
