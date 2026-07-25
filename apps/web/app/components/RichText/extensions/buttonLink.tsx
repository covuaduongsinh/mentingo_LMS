import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

import type { NodeConfig } from "@tiptap/core";
import type { NodeViewProps } from "@tiptap/react";

export const BUTTON_LINK_NODE_TYPE = "buttonLink";

type ButtonLinkAttrs = { label: string; href: string; openInNewTab: boolean };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    buttonLink: {
      setButtonLink: (attrs?: Partial<ButtonLinkAttrs>) => ReturnType;
    };
  }
}

export const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const normalizeButtonLinkAttrs = (attrs: {
  label?: unknown;
  href?: unknown;
  openInNewTab?: unknown;
}): ButtonLinkAttrs => ({
  label: typeof attrs.label === "string" ? attrs.label : "",
  href: typeof attrs.href === "string" && isValidHttpUrl(attrs.href) ? attrs.href : "",
  openInNewTab: attrs.openInNewTab !== false,
});

const getButtonLinkDataAttributes = (attrs: ButtonLinkAttrs) => ({
  "data-node-type": BUTTON_LINK_NODE_TYPE,
  "data-label": attrs.label,
  "data-href": attrs.href,
  "data-open-in-new-tab": String(attrs.openInNewTab),
});

const ButtonLinkEditorView = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const { t } = useTranslation();
  const attrs = normalizeButtonLinkAttrs(node.attrs);
  const [draftLabel, setDraftLabel] = useState(attrs.label);
  const [draftHref, setDraftHref] = useState(attrs.href);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    updateAttributes({ label: draftLabel, href: draftHref });
    setOpen(false);
  };

  return (
    <NodeViewWrapper className="button-link-node my-2 inline-block" contentEditable={false}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="inline-flex items-center gap-1" data-drag-handle>
            <Button type="button" variant="default">
              {attrs.label || t("richTextEditor.buttonLink.placeholder.label")}
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3">
          <div>
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              {t("richTextEditor.buttonLink.fieldLabel")}
            </span>
            <Input value={draftLabel} onChange={(event) => setDraftLabel(event.target.value)} />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              {t("richTextEditor.buttonLink.fieldUrl")}
            </span>
            <Input
              value={draftHref}
              onChange={(event) => setDraftHref(event.target.value)}
              placeholder="https://"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={attrs.openInNewTab}
              onCheckedChange={(checked) => updateAttributes({ openInNewTab: Boolean(checked) })}
            />
            {t("richTextEditor.buttonLink.openInNewTab")}
          </label>
          <div className="flex justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={deleteNode}>
              <Trash2 className="mr-1 size-3.5" aria-hidden />
              {t("richTextEditor.buttonLink.remove")}
            </Button>
            <Button type="button" size="sm" onClick={handleSave}>
              {t("richTextEditor.buttonLink.save")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
};

const ButtonLinkViewerView = ({ node }: NodeViewProps) => {
  const attrs = normalizeButtonLinkAttrs(node.attrs);

  return (
    <NodeViewWrapper className="button-link-node my-2 inline-block">
      <Button asChild variant="default" disabled={!attrs.href}>
        <a
          href={attrs.href || undefined}
          target={attrs.openInNewTab ? "_blank" : undefined}
          rel={attrs.openInNewTab ? "noopener noreferrer" : undefined}
        >
          {attrs.label}
          <ExternalLink className="ml-1.5 size-3.5" aria-hidden />
        </a>
      </Button>
    </NodeViewWrapper>
  );
};

const baseButtonLinkNodeConfig: NodeConfig = {
  name: BUTTON_LINK_NODE_TYPE,
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      label: { default: "" },
      href: { default: "" },
      openInNewTab: { default: true },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-node-type="${BUTTON_LINK_NODE_TYPE}"]`,
        getAttrs: (el) => {
          const element = el as HTMLElement;
          return normalizeButtonLinkAttrs({
            label: element.getAttribute("data-label"),
            href: element.getAttribute("data-href"),
            openInNewTab: element.getAttribute("data-open-in-new-tab") !== "false",
          });
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const normalized = normalizeButtonLinkAttrs(HTMLAttributes as Record<string, unknown>);

    return [
      "div",
      mergeAttributes(getButtonLinkDataAttributes(normalized), { class: "button-link-node" }),
    ];
  },

  addCommands() {
    return {
      setButtonLink:
        (attrs) =>
        ({ commands }) => {
          const normalized = normalizeButtonLinkAttrs(attrs ?? {});

          return commands.insertContent({
            type: this.name,
            attrs: normalized,
          });
        },
    };
  },
};

export const ButtonLinkEditor = Node.create({
  ...baseButtonLinkNodeConfig,
  addNodeView() {
    return ReactNodeViewRenderer(ButtonLinkEditorView);
  },
});

export const ButtonLinkViewer = Node.create({
  ...baseButtonLinkNodeConfig,
  addNodeView() {
    return ReactNodeViewRenderer(ButtonLinkViewerView);
  },
});
