import { describe, expect, it } from "vitest";

import {
  addMove,
  createMoveTree,
  deleteNode,
  flattenMoveTree,
  getFenAtPath,
  movetextFromTree,
  nodesOnPath,
  promoteToMainline,
  setComment,
  setGamebookFields,
  setGlyph,
  setShapes,
  unflattenMoveTree,
} from "../moveTree";

const ROOT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

let counter = 0;
function makeId(): string {
  counter += 1;
  return `n${counter}`;
}

function e4() {
  return { uci: "e2e4", san: "e4", fenAfter: "fen-after-e4" };
}
function e5() {
  return { uci: "e7e5", san: "e5", fenAfter: "fen-after-e4-e5" };
}
function c5() {
  return { uci: "c7c5", san: "c5", fenAfter: "fen-after-e4-c5" };
}
function nf3() {
  return { uci: "g1f3", san: "Nf3", fenAfter: "fen-after-e4-e5-nf3" };
}

describe("moveTree", () => {
  it("starts empty at the root FEN", () => {
    const tree = createMoveTree(ROOT_FEN);
    expect(tree.children).toEqual([]);
    expect(getFenAtPath(tree, [])).toBe(ROOT_FEN);
  });

  it("adding a move creates a new mainline node and advances the path", () => {
    const tree = createMoveTree(ROOT_FEN);
    const step1 = addMove(tree, [], e4(), makeId);
    expect(step1.tree.children).toHaveLength(1);
    expect(step1.tree.children[0].san).toBe("e4");
    expect(step1.path).toEqual([step1.tree.children[0].id]);
    expect(getFenAtPath(step1.tree, step1.path)).toBe("fen-after-e4");
  });

  it("replaying the exact same move navigates to the existing node instead of duplicating it", () => {
    const tree1 = addMove(createMoveTree(ROOT_FEN), [], e4(), makeId);
    const tree2 = addMove(tree1.tree, [], e4(), makeId);
    expect(tree2.tree.children).toHaveLength(1);
    expect(tree2.path).toEqual(tree1.path);
  });

  it("a different move at the same point creates a sibling variation, not a replacement", () => {
    const afterE4 = addMove(createMoveTree(ROOT_FEN), [], e4(), makeId);
    const afterE5 = addMove(afterE4.tree, afterE4.path, e5(), makeId);
    const afterC5 = addMove(afterE5.tree, afterE4.path, c5(), makeId);

    const e4Node = afterC5.tree.children[0];
    expect(e4Node.children).toHaveLength(2);
    expect(e4Node.children[0].san).toBe("e5");
    expect(e4Node.children[1].san).toBe("c5");
    // e5 is still the mainline (index 0) — adding c5 didn't disturb it.
    expect(afterC5.path).toEqual([e4Node.id, e4Node.children[1].id]);
  });

  it("nodesOnPath returns the full line from root to the given path", () => {
    const afterE4 = addMove(createMoveTree(ROOT_FEN), [], e4(), makeId);
    const afterE5 = addMove(afterE4.tree, afterE4.path, e5(), makeId);
    const line = nodesOnPath(afterE5.tree, afterE5.path);
    expect(line.map((n) => n.san)).toEqual(["e4", "e5"]);
  });

  it("promoteToMainline moves a variation (and its ancestors) to index 0 at every level", () => {
    const afterE4 = addMove(createMoveTree(ROOT_FEN), [], e4(), makeId);
    const afterE5 = addMove(afterE4.tree, afterE4.path, e5(), makeId);
    const afterC5 = addMove(afterE5.tree, afterE4.path, c5(), makeId);

    const promoted = promoteToMainline(afterC5.tree, afterC5.path);
    expect(promoted.children[0].san).toBe("e4");
    expect(promoted.children[0].children[0].san).toBe("c5");
    expect(promoted.children[0].children[1].san).toBe("e5");
  });

  it("deleteNode removes a variation and its entire subtree, leaving the rest intact", () => {
    const afterE4 = addMove(createMoveTree(ROOT_FEN), [], e4(), makeId);
    const afterE5 = addMove(afterE4.tree, afterE4.path, e5(), makeId);
    const afterNf3 = addMove(afterE5.tree, afterE5.path, nf3(), makeId);
    const afterC5 = addMove(afterNf3.tree, afterE4.path, c5(), makeId);

    const pruned = deleteNode(afterC5.tree, afterC5.path);
    const e4Node = pruned.children[0];
    expect(e4Node.children).toHaveLength(1);
    expect(e4Node.children[0].san).toBe("e5");
    expect(e4Node.children[0].children[0].san).toBe("Nf3");
  });

  it("deleteNode is a no-op at the root path", () => {
    const afterE4 = addMove(createMoveTree(ROOT_FEN), [], e4(), makeId);
    expect(deleteNode(afterE4.tree, [])).toEqual(afterE4.tree);
  });

  it("setComment and setGlyph attach metadata to a specific node without touching siblings", () => {
    const afterE4 = addMove(createMoveTree(ROOT_FEN), [], e4(), makeId);
    const afterE5 = addMove(afterE4.tree, afterE4.path, e5(), makeId);
    const afterC5 = addMove(afterE5.tree, afterE4.path, c5(), makeId);

    const annotated = setGlyph(
      setComment(afterC5.tree, afterE4.path, "Open game"),
      afterC5.path,
      "!?",
    );
    const e4Node = annotated.children[0];
    expect(e4Node.comment).toBe("Open game");
    expect(e4Node.children[0].glyph).toBeUndefined(); // e5, untouched
    expect(e4Node.children[1].glyph).toBe("!?"); // c5
  });

  it("round-trips shapes and gamebook fields through flatten/unflatten (S2)", () => {
    const shapes = [{ kind: "circle" as const, square: "e4" as const, color: "green" as const }];
    const afterE4 = addMove(createMoveTree(ROOT_FEN), [], e4(), makeId);
    let tree = setShapes(afterE4.tree, afterE4.path, shapes);
    tree = setGamebookFields(tree, afterE4.path, {
      hint: "Look at the center",
      onWrong: "Not that move",
      onCorrect: "Yes — occupy the center",
    });
    const flat = flattenMoveTree(tree);
    expect(flat[0].shapes).toEqual(shapes);
    expect(flat[0].hint).toBe("Look at the center");
    const restored = unflattenMoveTree(ROOT_FEN, flat);
    expect(restored.children[0].shapes).toEqual(shapes);
    expect(restored.children[0].onCorrect).toBe("Yes — occupy the center");
  });

  it("movetextFromTree renders standard PGN movetext with variations in parentheses", () => {
    const afterE4 = addMove(createMoveTree(ROOT_FEN), [], e4(), makeId);
    const afterE5 = addMove(afterE4.tree, afterE4.path, e5(), makeId);
    const afterC5 = addMove(afterE5.tree, afterE4.path, c5(), makeId);
    const afterNf3 = addMove(afterC5.tree, afterE5.path, nf3(), makeId);

    expect(movetextFromTree(afterNf3.tree)).toBe("1.e4 e5 (1...c5) 2.Nf3");
  });
});
