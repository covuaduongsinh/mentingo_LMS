import type { GlyphSymbol } from "./glyphs";

/**
 * A branching move tree: at any node, playing a move that differs from what was recorded
 * before creates a new sibling variation instead of overwriting it. `children[0]` is always
 * the mainline continuation; any other entries are variations. A "path" is the list of node
 * ids from the (virtual, move-less) root down to a specific node — an empty path means the
 * starting position itself. All functions here are pure; see useMoveTree.ts for the React
 * state wrapper. Not persisted anywhere in this pass — see
 * docs/specs/interactive-chess-board-business-spec.md.
 */

export type MoveNode = {
  id: string;
  uci: string;
  san: string;
  fenAfter: string;
  comment?: string;
  glyph?: GlyphSymbol;
  children: MoveNode[];
};

export type MoveTree = {
  rootFen: string;
  children: MoveNode[];
};

export type MoveInput = { uci: string; san: string; fenAfter: string };

export function createMoveTree(rootFen: string): MoveTree {
  return { rootFen, children: [] };
}

export function getNodeAtPath(tree: MoveTree, path: string[]): MoveNode | null {
  let nodes = tree.children;
  let found: MoveNode | undefined;
  for (const id of path) {
    found = nodes.find((node) => node.id === id);
    if (!found) return null;
    nodes = found.children;
  }
  return found ?? null;
}

export function getFenAtPath(tree: MoveTree, path: string[]): string {
  const node = getNodeAtPath(tree, path);
  return node ? node.fenAfter : tree.rootFen;
}

/** All nodes from the root down to `path`, in order — the "current line" for display. */
export function nodesOnPath(tree: MoveTree, path: string[]): MoveNode[] {
  const result: MoveNode[] = [];
  let nodes = tree.children;
  for (const id of path) {
    const found = nodes.find((node) => node.id === id);
    if (!found) break;
    result.push(found);
    nodes = found.children;
  }
  return result;
}

function defaultMakeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `node-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

/**
 * Rebuilds every ancestor level of `path` (immutable update) and hands the children array
 * that live at `path` to `updater`, which returns the new children array for that level
 * plus an optional result value threaded back out to the caller.
 */
function updateChildrenAtPath<T>(
  children: MoveNode[],
  path: string[],
  updater: (childrenAtPath: MoveNode[]) => { children: MoveNode[]; result: T },
  fallbackResult: T,
): { children: MoveNode[]; result: T } {
  if (path.length === 0) {
    return updater(children);
  }
  const [headId, ...rest] = path;
  const index = children.findIndex((node) => node.id === headId);
  if (index === -1) {
    return { children, result: fallbackResult };
  }
  const target = children[index];
  const nested = updateChildrenAtPath(target.children, rest, updater, fallbackResult);
  const newChildren = [...children];
  newChildren[index] = { ...target, children: nested.children };
  return { children: newChildren, result: nested.result };
}

/**
 * Plays a move at `path`. If a child with the same UCI already exists there, navigates to it
 * instead of creating a duplicate sibling — matches the "re-entering the same move" case.
 */
export function addMove(
  tree: MoveTree,
  path: string[],
  move: MoveInput,
  makeId: () => string = defaultMakeId,
): { tree: MoveTree; path: string[] } {
  const { children, result } = updateChildrenAtPath<string>(
    tree.children,
    path,
    (siblings) => {
      const existing = siblings.find((node) => node.uci === move.uci);
      if (existing) {
        return { children: siblings, result: existing.id };
      }
      const newNode: MoveNode = {
        id: makeId(),
        uci: move.uci,
        san: move.san,
        fenAfter: move.fenAfter,
        children: [],
      };
      return { children: [...siblings, newNode], result: newNode.id };
    },
    "",
  );
  return { tree: { ...tree, children }, path: [...path, result] };
}

export function setComment(tree: MoveTree, path: string[], comment: string): MoveTree {
  return updateNodeAtPath(tree, path, (node) => ({ ...node, comment }));
}

export function setGlyph(tree: MoveTree, path: string[], glyph: GlyphSymbol | undefined): MoveTree {
  return updateNodeAtPath(tree, path, (node) => ({ ...node, glyph }));
}

function updateNodeAtPath(
  tree: MoveTree,
  path: string[],
  updater: (node: MoveNode) => MoveNode,
): MoveTree {
  if (path.length === 0) return tree;
  function recurse(children: MoveNode[], remaining: string[]): MoveNode[] {
    const [headId, ...rest] = remaining;
    const index = children.findIndex((node) => node.id === headId);
    if (index === -1) return children;
    const target = children[index];
    const newChildren = [...children];
    newChildren[index] =
      rest.length === 0 ? updater(target) : { ...target, children: recurse(target.children, rest) };
    return newChildren;
  }
  return { ...tree, children: recurse(tree.children, path) };
}

/**
 * Moves the node at `path` — and every one of its ancestors — to index 0 among its siblings,
 * making it (and the line leading to it) the new mainline. Everything it displaced becomes
 * a variation instead, without losing any data.
 */
export function promoteToMainline(tree: MoveTree, path: string[]): MoveTree {
  function reorder(children: MoveNode[], remaining: string[]): MoveNode[] {
    if (remaining.length === 0) return children;
    const [headId, ...rest] = remaining;
    const index = children.findIndex((node) => node.id === headId);
    if (index === -1) return children;
    const target = { ...children[index], children: reorder(children[index].children, rest) };
    const withoutTarget = children.filter((_, i) => i !== index);
    return [target, ...withoutTarget];
  }
  return { ...tree, children: reorder(tree.children, path) };
}

/** Removes the node at `path` and its entire subtree. A no-op at the empty (root) path. */
export function deleteNode(tree: MoveTree, path: string[]): MoveTree {
  if (path.length === 0) return tree;
  const parentPath = path.slice(0, -1);
  const targetId = path[path.length - 1];
  function removeAt(children: MoveNode[], remaining: string[]): MoveNode[] {
    if (remaining.length === 0) {
      return children.filter((node) => node.id !== targetId);
    }
    const [headId, ...rest] = remaining;
    const index = children.findIndex((node) => node.id === headId);
    if (index === -1) return children;
    const newChildren = [...children];
    newChildren[index] = { ...children[index], children: removeAt(children[index].children, rest) };
    return newChildren;
  }
  return { ...tree, children: removeAt(tree.children, parentPath) };
}

export function moveNumberPrefix(zeroBasedPly: number): string {
  const moveNumber = Math.floor(zeroBasedPly / 2) + 1;
  return zeroBasedPly % 2 === 0 ? `${moveNumber}.` : `${moveNumber}...`;
}

function siblingsToMovetext(
  siblings: MoveNode[],
  ply: number,
  forceNumberOnFirst: boolean,
): string {
  if (siblings.length === 0) return "";
  const [main, ...variations] = siblings;
  const prefix = forceNumberOnFirst || ply % 2 === 0 ? moveNumberPrefix(ply) : "";
  let out = `${prefix}${main.san}${main.glyph ?? ""}`;

  for (const variation of variations) {
    const variationHead = `${moveNumberPrefix(ply)}${variation.san}${variation.glyph ?? ""}`;
    const variationRest = siblingsToMovetext(variation.children, ply + 1, false);
    out += ` (${variationRest ? `${variationHead} ${variationRest}` : variationHead})`;
  }

  const continuation = siblingsToMovetext(main.children, ply + 1, false);
  if (continuation) out += ` ${continuation}`;
  return out;
}

/** Standard PGN movetext, with variations nested in parentheses per the PGN spec. */
export function movetextFromTree(tree: MoveTree): string {
  return siblingsToMovetext(tree.children, 0, true);
}
