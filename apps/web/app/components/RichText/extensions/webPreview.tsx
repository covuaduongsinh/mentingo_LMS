import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { ExternalLink, Globe, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useLinkPreview } from "~/api/queries/useLinkPreview";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";

import { isValidHttpUrl } from "./buttonLink";

import type { RichTextResourceNodeOptions } from "./utils/resourceNode";
import type { NodeConfig } from "@tiptap/core";
import type { NodeViewProps } from "@tiptap/react";

export const WEB_PREVIEW_NODE_TYPE = "webPreview";

type WebPreviewAttrs = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  domain: string | null;
  metaFetched: boolean;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    webPreview: {
      setWebPreview: (attrs?: { url?: string }) => ReturnType;
    };
  }
}

export const normalizeWebPreviewAttrs = (attrs: {
  url?: unknown;
  title?: unknown;
  description?: unknown;
  imageUrl?: unknown;
  domain?: unknown;
  metaFetched?: unknown;
}): WebPreviewAttrs => ({
  url: typeof attrs.url === "string" && isValidHttpUrl(attrs.url) ? attrs.url : "",
  title: typeof attrs.title === "string" ? attrs.title : null,
  description: typeof attrs.description === "string" ? attrs.description : null,
  imageUrl: typeof attrs.imageUrl === "string" ? attrs.imageUrl : null,
  domain: typeof attrs.domain === "string" ? attrs.domain : null,
  metaFetched: attrs.metaFetched === true,
});

const getWebPreviewDataAttributes = (attrs: WebPreviewAttrs) => ({
  "data-node-type": WEB_PREVIEW_NODE_TYPE,
  "data-url": attrs.url,
  "data-title": attrs.title ?? "",
  "data-description": attrs.description ?? "",
  "data-image-url": attrs.imageUrl ?? "",
  "data-domain": attrs.domain ?? "",
  "data-meta-fetched": String(attrs.metaFetched),
});

const WebPreviewCard = ({
  attrs,
  interactive,
}: {
  attrs: WebPreviewAttrs;
  interactive: boolean;
}) => {
  const content = (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition hover:border-neutral-300">
      {attrs.imageUrl ? (
        <img
          src={attrs.imageUrl}
          alt=""
          className="size-16 shrink-0 rounded-md object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-neutral-100">
          <Globe className="size-6 text-neutral-400" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-900">
          {attrs.title || attrs.url}
        </p>
        {attrs.description && (
          <p className="line-clamp-2 text-xs text-neutral-600">{attrs.description}</p>
        )}
        <p className="mt-1 truncate text-xs text-neutral-400">{attrs.domain}</p>
      </div>
      <ExternalLink className="size-4 shrink-0 text-neutral-400" aria-hidden />
    </div>
  );

  if (!interactive) return content;

  return (
    <a href={attrs.url} target="_blank" rel="noopener noreferrer" className="block">
      {content}
    </a>
  );
};

const WebPreviewEditorView = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const { t } = useTranslation();
  const attrs = normalizeWebPreviewAttrs(node.attrs);
  const [draftUrl, setDraftUrl] = useState(attrs.url);

  const shouldFetch = Boolean(attrs.url) && !attrs.metaFetched;
  const { data, isError, isFetching } = useLinkPreview(attrs.url, { enabled: shouldFetch });

  useEffect(() => {
    if (!shouldFetch) return;
    if (isFetching) return;

    if (data) {
      updateAttributes({
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        domain: data.domain,
        metaFetched: true,
      });
    } else if (isError) {
      updateAttributes({ metaFetched: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFetch, isFetching, data, isError]);

  const handleRefresh = () => updateAttributes({ metaFetched: false });

  const handleSubmitUrl = () => {
    if (!isValidHttpUrl(draftUrl)) return;
    updateAttributes({
      url: draftUrl,
      title: null,
      description: null,
      imageUrl: null,
      domain: null,
      metaFetched: false,
    });
  };

  if (!attrs.url) {
    return (
      <NodeViewWrapper className="web-preview-node my-2" contentEditable={false}>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-3">
          <Input
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            placeholder="https://"
            aria-label={t("richTextEditor.webPreview.fieldUrl")}
          />
          <Button type="button" size="sm" onClick={handleSubmitUrl}>
            {t("richTextEditor.webPreview.add")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={deleteNode}
            aria-label={t("richTextEditor.webPreview.remove")}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="web-preview-node my-2" contentEditable={false} data-drag-handle>
      {isFetching ? (
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
          <Skeleton className="size-16 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ) : (
        <WebPreviewCard attrs={attrs} interactive={false} />
      )}
      <div className="mt-1 flex items-center gap-2">
        <Button type="button" size="xs" variant="ghost" onClick={() => setDraftUrl("")}>
          {t("richTextEditor.webPreview.changeUrl")}
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={handleRefresh}>
          <RefreshCw className="mr-1 size-3.5" aria-hidden />
          {t("richTextEditor.webPreview.refresh")}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={deleteNode}
          aria-label={t("richTextEditor.webPreview.remove")}
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      </div>
    </NodeViewWrapper>
  );
};

const WebPreviewViewerView = ({ node }: NodeViewProps) => {
  const attrs = normalizeWebPreviewAttrs(node.attrs);

  if (!attrs.url) return null;

  return (
    <NodeViewWrapper className="web-preview-node my-2">
      <WebPreviewCard attrs={attrs} interactive />
    </NodeViewWrapper>
  );
};

const baseWebPreviewNodeConfig: NodeConfig = {
  name: WEB_PREVIEW_NODE_TYPE,
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: "" },
      title: { default: null },
      description: { default: null },
      imageUrl: { default: null },
      domain: { default: null },
      metaFetched: { default: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-node-type="${WEB_PREVIEW_NODE_TYPE}"]`,
        getAttrs: (el) => {
          const element = el as HTMLElement;
          return normalizeWebPreviewAttrs({
            url: element.getAttribute("data-url"),
            title: element.getAttribute("data-title"),
            description: element.getAttribute("data-description"),
            imageUrl: element.getAttribute("data-image-url"),
            domain: element.getAttribute("data-domain"),
            metaFetched: element.getAttribute("data-meta-fetched") === "true",
          });
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const normalized = normalizeWebPreviewAttrs(HTMLAttributes as Record<string, unknown>);

    return [
      "div",
      mergeAttributes(getWebPreviewDataAttributes(normalized), { class: "web-preview-node" }),
    ];
  },

  addCommands() {
    return {
      setWebPreview:
        (attrs) =>
        ({ commands }) => {
          const normalized = normalizeWebPreviewAttrs(attrs ?? {});

          return commands.insertContent({
            type: this.name,
            attrs: normalized,
          });
        },
    };
  },
};

export const WebPreviewEditor = Node.create<RichTextResourceNodeOptions>({
  ...baseWebPreviewNodeConfig,
  addOptions() {
    return {};
  },
  addNodeView() {
    return ReactNodeViewRenderer(WebPreviewEditorView);
  },
});

export const WebPreviewViewer = Node.create({
  ...baseWebPreviewNodeConfig,
  addNodeView() {
    return ReactNodeViewRenderer(WebPreviewViewerView);
  },
});
