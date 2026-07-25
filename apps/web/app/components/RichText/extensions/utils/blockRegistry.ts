import {
  CheckSquare,
  Code,
  CreditCard,
  FilePlus,
  Globe,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Info,
  List,
  ListOrdered,
  MousePointerClick,
  Table as TableIcon,
  Tag,
  Video,
} from "lucide-react";

import type { Editor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";

export type BlockRegistryGroup = "text" | "media" | "interactive" | "table";

export type BlockRegistryActionContext = {
  editor: Editor;
  /** Opens the existing Asset Library dialog owned by the toolbar, used by media entries instead of duplicating the upload flow. */
  openAssetLibrary?: () => void;
};

export type BlockRegistryItem = {
  id: string;
  group: BlockRegistryGroup;
  /** i18n key for the display label. */
  labelKey: string;
  icon: LucideIcon;
  /** Extra i18n keys (space-separated words) used only for slash-command filtering. */
  keywords: string[];
  /** Media entries need the asset library dialog; not runnable from a context without one. */
  requiresAssetLibrary?: boolean;
  run: (ctx: BlockRegistryActionContext) => void;
};

export const BLOCK_REGISTRY: BlockRegistryItem[] = [
  // Text
  {
    id: "heading1",
    group: "text",
    labelKey: "richTextEditor.blockRegistry.heading1",
    icon: Heading1,
    keywords: ["heading", "title", "h1"],
    run: ({ editor }) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "heading2",
    group: "text",
    labelKey: "richTextEditor.blockRegistry.heading2",
    icon: Heading2,
    keywords: ["heading", "title", "h2"],
    run: ({ editor }) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "heading3",
    group: "text",
    labelKey: "richTextEditor.blockRegistry.heading3",
    icon: Heading3,
    keywords: ["heading", "title", "h3"],
    run: ({ editor }) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bulletList",
    group: "text",
    labelKey: "richTextEditor.blockRegistry.bulletList",
    icon: List,
    keywords: ["list", "bullet", "unordered"],
    run: ({ editor }) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    group: "text",
    labelKey: "richTextEditor.blockRegistry.orderedList",
    icon: ListOrdered,
    keywords: ["list", "number", "ordered"],
    run: ({ editor }) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "taskList",
    group: "text",
    labelKey: "richTextEditor.blockRegistry.taskList",
    icon: CheckSquare,
    keywords: ["todo", "checklist", "task"],
    run: ({ editor }) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "codeBlock",
    group: "text",
    labelKey: "richTextEditor.blockRegistry.codeBlock",
    icon: Code,
    keywords: ["code", "snippet", "pre"],
    run: ({ editor }) => editor.chain().focus().toggleCodeBlock().run(),
  },
  // Media — all funnel into the existing Asset Library upload/embed flow.
  {
    id: "image",
    group: "media",
    labelKey: "richTextEditor.blockRegistry.image",
    icon: ImageIcon,
    keywords: ["picture", "photo", "upload"],
    requiresAssetLibrary: true,
    run: ({ openAssetLibrary }) => openAssetLibrary?.(),
  },
  {
    id: "video",
    group: "media",
    labelKey: "richTextEditor.blockRegistry.video",
    icon: Video,
    keywords: ["youtube", "vimeo", "upload"],
    requiresAssetLibrary: true,
    run: ({ openAssetLibrary }) => openAssetLibrary?.(),
  },
  {
    id: "file",
    group: "media",
    labelKey: "richTextEditor.blockRegistry.file",
    icon: FilePlus,
    keywords: ["pdf", "presentation", "download", "attachment"],
    requiresAssetLibrary: true,
    run: ({ openAssetLibrary }) => openAssetLibrary?.(),
  },
  // Interactive / decorative
  {
    id: "callout",
    group: "interactive",
    labelKey: "richTextEditor.blockRegistry.callout",
    icon: Info,
    keywords: ["note", "warning", "tip", "alert"],
    run: ({ editor }) => editor.chain().focus().setCallout().run(),
  },
  {
    id: "flipcard",
    group: "interactive",
    labelKey: "richTextEditor.blockRegistry.flipcard",
    icon: CreditCard,
    keywords: ["flashcard", "memorize"],
    run: ({ editor }) => editor.chain().focus().setFlipcard().run(),
  },
  {
    id: "badge",
    group: "interactive",
    labelKey: "richTextEditor.blockRegistry.badge",
    icon: Tag,
    keywords: ["label", "tag"],
    run: ({ editor }) => editor.chain().focus().setBadge({ text: "" }).run(),
  },
  {
    id: "buttonLink",
    group: "interactive",
    labelKey: "richTextEditor.blockRegistry.buttonLink",
    icon: MousePointerClick,
    keywords: ["cta", "link", "action"],
    run: ({ editor }) => editor.chain().focus().setButtonLink().run(),
  },
  {
    id: "webPreview",
    group: "interactive",
    labelKey: "richTextEditor.blockRegistry.webPreview",
    icon: Globe,
    keywords: ["link", "preview", "url", "card"],
    run: ({ editor }) => editor.chain().focus().setWebPreview().run(),
  },
  // Table
  {
    id: "table",
    group: "table",
    labelKey: "richTextEditor.blockRegistry.table",
    icon: TableIcon,
    keywords: ["grid", "rows", "columns"],
    run: ({ editor }) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
];

export const BLOCK_REGISTRY_GROUP_ORDER: BlockRegistryGroup[] = [
  "text",
  "media",
  "interactive",
  "table",
];
