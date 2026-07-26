import { useCallback, useMemo, useState } from "react";

import {
  addMove,
  createMoveTree,
  deleteNode,
  getFenAtPath,
  getNodeAtPath,
  nodesOnPath,
  promoteToMainline,
  setComment,
  setGlyph,
} from "./moveTree";

import type { GlyphSymbol } from "./glyphs";
import type { MoveInput, MoveTree } from "./moveTree";

/**
 * React state wrapper around the pure moveTree.ts functions. `path` is the id chain from
 * the root to the node currently being viewed — see moveTree.ts for the model.
 */
export function useMoveTree(rootFen: string) {
  const [tree, setTree] = useState<MoveTree>(() => createMoveTree(rootFen));
  const [path, setPath] = useState<string[]>([]);

  const fen = useMemo(() => getFenAtPath(tree, path), [tree, path]);
  const currentNode = useMemo(() => getNodeAtPath(tree, path), [tree, path]);
  const line = useMemo(() => nodesOnPath(tree, path), [tree, path]);

  const playMove = useCallback(
    (move: MoveInput) => {
      const result = addMove(tree, path, move);
      setTree(result.tree);
      setPath(result.path);
    },
    [tree, path],
  );

  const goToPath = useCallback((nextPath: string[]) => {
    setPath(nextPath);
  }, []);

  const goToStart = useCallback(() => setPath([]), []);

  const goToPrevious = useCallback(() => {
    setPath((prev) => prev.slice(0, -1));
  }, []);

  const goToNext = useCallback(() => {
    setPath((prev) => {
      const node = getNodeAtPath(tree, prev);
      const children = node ? node.children : tree.children;
      return children.length === 0 ? prev : [...prev, children[0].id];
    });
  }, [tree]);

  const goToEnd = useCallback(() => {
    setPath(() => {
      const result: string[] = [];
      let nodes = tree.children;
      while (nodes.length > 0) {
        result.push(nodes[0].id);
        nodes = nodes[0].children;
      }
      return result;
    });
  }, [tree]);

  const promote = useCallback((targetPath: string[]) => {
    setTree((prev) => promoteToMainline(prev, targetPath));
  }, []);

  const remove = useCallback((targetPath: string[]) => {
    setTree((prev) => deleteNode(prev, targetPath));
    setPath((prev) => {
      const targetIsAncestorOrSelf = targetPath.every((id, index) => prev[index] === id);
      return targetIsAncestorOrSelf ? targetPath.slice(0, -1) : prev;
    });
  }, []);

  const annotateGlyph = useCallback((targetPath: string[], glyph: GlyphSymbol | undefined) => {
    setTree((prev) => setGlyph(prev, targetPath, glyph));
  }, []);

  const annotateComment = useCallback((targetPath: string[], comment: string) => {
    setTree((prev) => setComment(prev, targetPath, comment));
  }, []);

  const reset = useCallback((nextRootFen: string) => {
    setTree(createMoveTree(nextRootFen));
    setPath([]);
  }, []);

  return {
    tree,
    path,
    fen,
    currentNode,
    line,
    playMove,
    goToPath,
    goToStart,
    goToPrevious,
    goToNext,
    goToEnd,
    promote,
    remove,
    annotateGlyph,
    annotateComment,
    reset,
  };
}
