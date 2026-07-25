import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { AlertTriangle, CheckCircle2, Info, Lightbulb, OctagonAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
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

export const CALLOUT_NODE_TYPE = "callout";

export const CALLOUT_VARIANTS = ["info", "warning", "tip", "success", "danger"] as const;

export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

export const DEFAULT_CALLOUT_VARIANT: CalloutVariant = "info";

type CalloutAttrs = { variant: CalloutVariant };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { variant?: CalloutVariant }) => ReturnType;
    };
  }
}

const isCalloutVariant = (value: unknown): value is CalloutVariant =>
  typeof value === "string" && (CALLOUT_VARIANTS as readonly string[]).includes(value);

export const normalizeCalloutAttrs = (attrs: { variant?: unknown }): CalloutAttrs => ({
  variant: isCalloutVariant(attrs.variant) ? attrs.variant : DEFAULT_CALLOUT_VARIANT,
});

const CALLOUT_STYLES: Record<CalloutVariant, { container: string; icon: typeof Info }> = {
  info: { container: "border-blue-200 bg-blue-50 text-blue-900", icon: Info },
  warning: { container: "border-amber-200 bg-amber-50 text-amber-900", icon: AlertTriangle },
  tip: { container: "border-purple-200 bg-purple-50 text-purple-900", icon: Lightbulb },
  success: { container: "border-green-200 bg-green-50 text-green-900", icon: CheckCircle2 },
  danger: { container: "border-red-200 bg-red-50 text-red-900", icon: OctagonAlert },
};

const getCalloutDataAttributes = (attrs: CalloutAttrs) => ({
  "data-node-type": CALLOUT_NODE_TYPE,
  "data-variant": attrs.variant,
});

const CalloutEditorView = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const { t } = useTranslation();
  const attrs = normalizeCalloutAttrs(node.attrs);
  const { container, icon: Icon } = CALLOUT_STYLES[attrs.variant];

  return (
    <NodeViewWrapper className="callout-node my-2">
      <div className={cn("rounded-lg border p-3", container)} data-drag-handle>
        <div className="mb-2 flex items-center justify-between gap-2" contentEditable={false}>
          <div className="flex items-center gap-2">
            <Icon className="size-4 shrink-0" aria-hidden />
            <Select
              value={attrs.variant}
              onValueChange={(value) =>
                isCalloutVariant(value) && updateAttributes({ variant: value })
              }
            >
              <SelectTrigger className="h-7 w-36 border-none bg-transparent text-xs shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALLOUT_VARIANTS.map((variant) => (
                  <SelectItem key={variant} value={variant}>
                    {t(`richTextEditor.callout.variant.${variant}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={deleteNode}
            aria-label={t("richTextEditor.callout.ariaLabel.remove")}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        </div>
        <NodeViewContent className="callout-content [&>*:last-child]:mb-0" />
      </div>
    </NodeViewWrapper>
  );
};

const CalloutViewerView = ({ node }: NodeViewProps) => {
  const attrs = normalizeCalloutAttrs(node.attrs);
  const { container, icon: Icon } = CALLOUT_STYLES[attrs.variant];

  return (
    <NodeViewWrapper className="callout-node my-2">
      <div className={cn("flex gap-2 rounded-lg border p-3", container)}>
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <NodeViewContent className="min-w-0 flex-1 [&>*:last-child]:mb-0" />
      </div>
    </NodeViewWrapper>
  );
};

const baseCalloutNodeConfig: NodeConfig = {
  name: CALLOUT_NODE_TYPE,
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      variant: {
        default: DEFAULT_CALLOUT_VARIANT,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-node-type="${CALLOUT_NODE_TYPE}"]`,
        getAttrs: (el) =>
          normalizeCalloutAttrs({ variant: (el as HTMLElement).getAttribute("data-variant") }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const normalized = normalizeCalloutAttrs(HTMLAttributes as { variant?: unknown });

    return [
      "div",
      mergeAttributes(getCalloutDataAttributes(normalized), { class: "callout-node" }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) => {
          const normalized = normalizeCalloutAttrs(attrs ?? {});

          return commands.insertContent({
            type: this.name,
            attrs: normalized,
            content: [{ type: "paragraph" }],
          });
        },
    };
  },
};

export const CalloutEditor = Node.create({
  ...baseCalloutNodeConfig,
  addNodeView() {
    return ReactNodeViewRenderer(CalloutEditorView);
  },
});

export const CalloutViewer = Node.create({
  ...baseCalloutNodeConfig,
  addNodeView() {
    return ReactNodeViewRenderer(CalloutViewerView);
  },
});
