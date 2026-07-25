import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { RotateCw, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

import type { NodeConfig } from "@tiptap/core";
import type { NodeViewProps } from "@tiptap/react";

export const FLIPCARD_NODE_TYPE = "flipcard";

export const FLIPCARD_COLORS = ["neutral", "blue", "green", "purple", "amber"] as const;
export type FlipcardColor = (typeof FLIPCARD_COLORS)[number];

export const FLIPCARD_SIZES = ["sm", "md", "lg"] as const;
export type FlipcardSize = (typeof FLIPCARD_SIZES)[number];

type FlipcardAttrs = {
  front: string;
  back: string;
  color: FlipcardColor;
  size: FlipcardSize;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    flipcard: {
      setFlipcard: (attrs?: Partial<FlipcardAttrs>) => ReturnType;
    };
  }
}

const isFlipcardColor = (value: unknown): value is FlipcardColor =>
  typeof value === "string" && (FLIPCARD_COLORS as readonly string[]).includes(value);

const isFlipcardSize = (value: unknown): value is FlipcardSize =>
  typeof value === "string" && (FLIPCARD_SIZES as readonly string[]).includes(value);

export const normalizeFlipcardAttrs = (attrs: {
  front?: unknown;
  back?: unknown;
  color?: unknown;
  size?: unknown;
}): FlipcardAttrs => ({
  front: typeof attrs.front === "string" ? attrs.front : "",
  back: typeof attrs.back === "string" ? attrs.back : "",
  color: isFlipcardColor(attrs.color) ? attrs.color : "neutral",
  size: isFlipcardSize(attrs.size) ? attrs.size : "md",
});

const FLIPCARD_COLOR_CLASSES: Record<FlipcardColor, string> = {
  neutral: "border-neutral-300 bg-neutral-50",
  blue: "border-blue-200 bg-blue-50",
  green: "border-green-200 bg-green-50",
  purple: "border-purple-200 bg-purple-50",
  amber: "border-amber-200 bg-amber-50",
};

const FLIPCARD_SIZE_CLASSES: Record<FlipcardSize, string> = {
  sm: "min-h-24",
  md: "min-h-36",
  lg: "min-h-48",
};

const getFlipcardDataAttributes = (attrs: FlipcardAttrs) => ({
  "data-node-type": FLIPCARD_NODE_TYPE,
  "data-front": attrs.front,
  "data-back": attrs.back,
  "data-color": attrs.color,
  "data-size": attrs.size,
});

const FlipcardEditorView = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const { t } = useTranslation();
  const attrs = normalizeFlipcardAttrs(node.attrs);

  return (
    <NodeViewWrapper className="flipcard-node my-2">
      <div
        className={cn(
          "rounded-lg border p-3",
          FLIPCARD_COLOR_CLASSES[attrs.color],
          FLIPCARD_SIZE_CLASSES[attrs.size],
        )}
        contentEditable={false}
        data-drag-handle
      >
        <div className="mb-2 flex items-center justify-end">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={deleteNode}
            aria-label={t("richTextEditor.flipcard.ariaLabel.remove")}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              {t("richTextEditor.flipcard.front")}
            </span>
            <Textarea
              value={attrs.front}
              onChange={(event) => updateAttributes({ front: event.target.value })}
              rows={2}
              className="bg-white"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              {t("richTextEditor.flipcard.back")}
            </span>
            <Textarea
              value={attrs.back}
              onChange={(event) => updateAttributes({ back: event.target.value })}
              rows={2}
              className="bg-white"
            />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

const FlipcardViewerView = ({ node }: NodeViewProps) => {
  const attrs = normalizeFlipcardAttrs(node.attrs);
  const [flipped, setFlipped] = useState(false);
  const { t } = useTranslation();

  return (
    <NodeViewWrapper className="flipcard-node my-2" style={{ perspective: "1000px" }}>
      <button
        type="button"
        onClick={() => setFlipped((prev) => !prev)}
        aria-label={t("richTextEditor.flipcard.ariaLabel.flip")}
        className={cn(
          "relative w-full cursor-pointer rounded-lg border p-4 text-left transition-transform duration-500",
          FLIPCARD_COLOR_CLASSES[attrs.color],
          FLIPCARD_SIZE_CLASSES[attrs.size],
        )}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className={cn(
            "flex size-full items-center justify-center whitespace-pre-wrap text-center transition-opacity duration-300",
            flipped ? "opacity-0" : "opacity-100",
          )}
        >
          {attrs.front}
        </div>
        {flipped && (
          <div className="absolute inset-0 flex items-center justify-center whitespace-pre-wrap p-4 text-center">
            {attrs.back}
          </div>
        )}
        <RotateCw className="absolute bottom-2 right-2 size-3.5 text-neutral-400" aria-hidden />
      </button>
    </NodeViewWrapper>
  );
};

const baseFlipcardNodeConfig: NodeConfig = {
  name: FLIPCARD_NODE_TYPE,
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      front: { default: "" },
      back: { default: "" },
      color: { default: "neutral" },
      size: { default: "md" },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-node-type="${FLIPCARD_NODE_TYPE}"]`,
        getAttrs: (el) => {
          const element = el as HTMLElement;
          return normalizeFlipcardAttrs({
            front: element.getAttribute("data-front"),
            back: element.getAttribute("data-back"),
            color: element.getAttribute("data-color"),
            size: element.getAttribute("data-size"),
          });
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const normalized = normalizeFlipcardAttrs(HTMLAttributes as Record<string, unknown>);

    return [
      "div",
      mergeAttributes(getFlipcardDataAttributes(normalized), { class: "flipcard-node" }),
    ];
  },

  addCommands() {
    return {
      setFlipcard:
        (attrs) =>
        ({ commands }) => {
          const normalized = normalizeFlipcardAttrs(attrs ?? {});

          return commands.insertContent({
            type: this.name,
            attrs: normalized,
          });
        },
    };
  },
};

export const FlipcardEditor = Node.create({
  ...baseFlipcardNodeConfig,
  addNodeView() {
    return ReactNodeViewRenderer(FlipcardEditorView);
  },
});

export const FlipcardViewer = Node.create({
  ...baseFlipcardNodeConfig,
  addNodeView() {
    return ReactNodeViewRenderer(FlipcardViewerView);
  },
});
