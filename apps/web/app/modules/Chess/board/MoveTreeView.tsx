import { useTranslation } from "react-i18next";

import { cn } from "~/lib/utils";

import { GLYPH_LABEL_KEYS, GLYPH_SYMBOLS } from "./glyphs";
import { moveNumberPrefix } from "./moveTree";

import type { GlyphSymbol } from "./glyphs";
import type { MoveNode, MoveTree } from "./moveTree";
import type { ReactNode } from "react";

type MoveTreeViewProps = {
  tree: MoveTree;
  currentPath: string[];
  onNavigate: (path: string[]) => void;
  onPromote: (path: string[]) => void;
  onDelete: (path: string[]) => void;
  onSetGlyph: (path: string[], glyph: GlyphSymbol | undefined) => void;
  className?: string;
};

type RenderContext = Pick<
  MoveTreeViewProps,
  "currentPath" | "onNavigate" | "onPromote" | "onDelete" | "onSetGlyph"
> & { t: (key: string, options?: Record<string, unknown>) => string };

function pathsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

type MoveBadgeProps = {
  node: MoveNode;
  path: string[];
  ply: number;
  isMainline: boolean;
  showNumber: boolean;
  ctx: RenderContext;
};

function MoveBadge({ node, path, ply, isMainline, showNumber, ctx }: MoveBadgeProps) {
  const isCurrent = pathsEqual(path, ctx.currentPath);
  const numberPrefix = showNumber ? moveNumberPrefix(ply) : "";

  return (
    <span className="inline-flex items-center gap-0.5">
      {numberPrefix ? <span className="text-xs text-neutral-400">{numberPrefix}</span> : null}
      <button
        type="button"
        onClick={() => ctx.onNavigate(path)}
        data-testid={`chess-move-node-${path.join(".")}`}
        className={cn(
          "rounded px-1.5 py-0.5 font-mono text-sm hover:bg-neutral-100",
          isCurrent && "bg-sky-100 font-semibold text-sky-800 hover:bg-sky-100",
        )}
      >
        {node.san}
        {node.glyph ? <span className="ml-0.5">{node.glyph}</span> : null}
      </button>
      <select
        aria-label={ctx.t("chess.tree.setGlyph", { defaultValue: "Annotate move" })}
        value={node.glyph ?? ""}
        onChange={(event) =>
          ctx.onSetGlyph(path, (event.target.value || undefined) as GlyphSymbol | undefined)
        }
        className="rounded border border-transparent bg-transparent text-xs text-neutral-400 hover:border-neutral-200"
      >
        <option value="">{ctx.t("chess.glyphs.none", { defaultValue: "—" })}</option>
        {GLYPH_SYMBOLS.map((glyph) => (
          <option key={glyph} value={glyph}>
            {glyph} {ctx.t(GLYPH_LABEL_KEYS[glyph], { defaultValue: glyph })}
          </option>
        ))}
      </select>
      {!isMainline ? (
        <span className="inline-flex gap-0.5">
          <button
            type="button"
            onClick={() => ctx.onPromote(path)}
            title={ctx.t("chess.tree.promote", { defaultValue: "Promote to mainline" })}
            className="text-xs text-neutral-400 hover:text-neutral-700"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => ctx.onDelete(path)}
            title={ctx.t("chess.tree.delete", { defaultValue: "Delete variation" })}
            className="text-xs text-neutral-400 hover:text-red-600"
          >
            ✕
          </button>
        </span>
      ) : null}
    </span>
  );
}

/**
 * Flattens the mainline into one inline-flowing sequence of move badges; whenever a node has
 * variations (siblings after index 0), each variation is rendered as its own indented block
 * (forced onto a new line via `basis-full`) and recurses the same way — so a deep chain of
 * variations-within-variations still renders without runaway staircase indentation on the
 * mainline itself.
 */
function renderLine(
  nodes: MoveNode[],
  parentPath: string[],
  ply: number,
  ctx: RenderContext,
  isMainline: boolean,
): ReactNode[] {
  const out: ReactNode[] = [];
  let currentNodes = nodes;
  let currentParentPath = parentPath;
  let currentPly = ply;
  let forceNumberOnNext = true;

  while (currentNodes.length > 0) {
    const [main, ...variations] = currentNodes;
    const mainPath = [...currentParentPath, main.id];
    const showNumber = forceNumberOnNext || currentPly % 2 === 0;

    out.push(
      <MoveBadge
        key={mainPath.join(".")}
        node={main}
        path={mainPath}
        ply={currentPly}
        isMainline={isMainline}
        showNumber={showNumber}
        ctx={ctx}
      />,
    );
    forceNumberOnNext = false;

    for (const variation of variations) {
      out.push(
        <div
          key={`variation-${[...currentParentPath, variation.id].join(".")}`}
          className="my-1 basis-full border-l-2 border-neutral-200 pl-3"
        >
          {renderLine([variation], currentParentPath, currentPly, ctx, false)}
        </div>,
      );
    }

    currentNodes = main.children;
    currentParentPath = mainPath;
    currentPly += 1;
  }

  return out;
}

export function MoveTreeView({
  tree,
  currentPath,
  onNavigate,
  onPromote,
  onDelete,
  onSetGlyph,
  className,
}: MoveTreeViewProps) {
  const { t } = useTranslation();
  const ctx: RenderContext = { currentPath, onNavigate, onPromote, onDelete, onSetGlyph, t };

  if (tree.children.length === 0) {
    return (
      <p className={cn("text-sm text-neutral-400", className)}>
        {t("chess.tree.empty", { defaultValue: "Play a move to start the tree." })}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-1", className)}>
      {renderLine(tree.children, [], 0, ctx, true)}
    </div>
  );
}
