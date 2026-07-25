import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

import type { NodeConfig } from "@tiptap/core";
import type { NodeViewProps } from "@tiptap/react";

export const BADGE_NODE_TYPE = "badge";

export const BADGE_COLORS = ["gray", "blue", "green", "yellow", "red", "purple"] as const;
export type BadgeColor = (typeof BADGE_COLORS)[number];

export const BADGE_TEXT_MAX_LENGTH = 30;

type BadgeAttrs = { text: string; color: BadgeColor };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    badge: {
      setBadge: (attrs: { text: string; color?: BadgeColor }) => ReturnType;
    };
  }
}

const isBadgeColor = (value: unknown): value is BadgeColor =>
  typeof value === "string" && (BADGE_COLORS as readonly string[]).includes(value);

export const normalizeBadgeAttrs = (attrs: { text?: unknown; color?: unknown }): BadgeAttrs => ({
  text: typeof attrs.text === "string" ? attrs.text.slice(0, BADGE_TEXT_MAX_LENGTH) : "",
  color: isBadgeColor(attrs.color) ? attrs.color : "gray",
});

const BADGE_COLOR_CLASSES: Record<BadgeColor, string> = {
  gray: "bg-neutral-200 text-neutral-800",
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
  purple: "bg-purple-100 text-purple-800",
};

const getBadgeDataAttributes = (attrs: BadgeAttrs) => ({
  "data-node-type": BADGE_NODE_TYPE,
  "data-text": attrs.text,
  "data-color": attrs.color,
});

const BadgeEditorView = ({ node, updateAttributes }: NodeViewProps) => {
  const { t } = useTranslation();
  const attrs = normalizeBadgeAttrs(node.attrs);

  return (
    <NodeViewWrapper as="span" className="badge-node inline-flex items-center gap-1 align-middle">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          BADGE_COLOR_CLASSES[attrs.color],
        )}
      >
        <input
          value={attrs.text}
          onChange={(event) =>
            updateAttributes({ text: event.target.value.slice(0, BADGE_TEXT_MAX_LENGTH) })
          }
          placeholder={t("richTextEditor.badge.placeholder")}
          aria-label={t("richTextEditor.badge.ariaLabel.text")}
          className="w-20 border-none bg-transparent p-0 text-xs font-medium outline-none"
        />
      </span>
      <Select
        value={attrs.color}
        onValueChange={(value) => isBadgeColor(value) && updateAttributes({ color: value })}
      >
        <SelectTrigger className="h-5 w-5 border-none bg-transparent p-0 shadow-none [&>svg]:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BADGE_COLORS.map((color) => (
            <SelectItem key={color} value={color}>
              <span className={cn("rounded px-1.5 py-0.5 text-xs", BADGE_COLOR_CLASSES[color])}>
                {t(`richTextEditor.badge.color.${color}`)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </NodeViewWrapper>
  );
};

const BadgeViewerView = ({ node }: NodeViewProps) => {
  const attrs = normalizeBadgeAttrs(node.attrs);

  return (
    <NodeViewWrapper as="span" className="badge-node inline-block align-middle">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          BADGE_COLOR_CLASSES[attrs.color],
        )}
      >
        {attrs.text}
      </span>
    </NodeViewWrapper>
  );
};

const baseBadgeNodeConfig: NodeConfig = {
  name: BADGE_NODE_TYPE,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      text: { default: "" },
      color: { default: "gray" },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[data-node-type="${BADGE_NODE_TYPE}"]`,
        getAttrs: (el) => {
          const element = el as HTMLElement;
          return normalizeBadgeAttrs({
            text: element.getAttribute("data-text"),
            color: element.getAttribute("data-color"),
          });
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const normalized = normalizeBadgeAttrs(HTMLAttributes as Record<string, unknown>);

    return ["span", mergeAttributes(getBadgeDataAttributes(normalized), { class: "badge-node" })];
  },

  addCommands() {
    return {
      setBadge:
        (attrs) =>
        ({ commands }) => {
          const normalized = normalizeBadgeAttrs(attrs);

          return commands.insertContent({
            type: this.name,
            attrs: normalized,
          });
        },
    };
  },
};

export const BadgeEditor = Node.create({
  ...baseBadgeNodeConfig,
  addNodeView() {
    return ReactNodeViewRenderer(BadgeEditorView);
  },
});

export const BadgeViewer = Node.create({
  ...baseBadgeNodeConfig,
  addNodeView() {
    return ReactNodeViewRenderer(BadgeViewerView);
  },
});
