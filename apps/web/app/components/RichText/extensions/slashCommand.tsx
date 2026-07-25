import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import SuggestionPlugin from "@tiptap/suggestion";

import { SlashCommandMenu } from "../components/SlashCommandMenu";

import { BLOCK_REGISTRY, type BlockRegistryItem } from "./utils/blockRegistry";

import type { SlashCommandMenuRef } from "../components/SlashCommandMenu";
import type { Editor } from "@tiptap/core";
import type { SuggestionOptions } from "@tiptap/suggestion";

const filterBlockRegistry = (query: string): BlockRegistryItem[] => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return BLOCK_REGISTRY;

  return BLOCK_REGISTRY.filter((item) => {
    const haystack = [item.id, ...item.keywords].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  });
};

type SlashCommandStorage = {
  openAssetLibrary?: () => void;
};

const CommandItemsSuggestion: Omit<SuggestionOptions<BlockRegistryItem>, "editor"> = {
  char: "/",
  startOfLine: false,
  items: ({ query, editor }) => {
    const storage = editor.storage.slashCommand as SlashCommandStorage | undefined;
    const hasAssetLibrary = Boolean(storage?.openAssetLibrary);

    return filterBlockRegistry(query).filter(
      (item) => !item.requiresAssetLibrary || hasAssetLibrary,
    );
  },
  command: ({ editor, range, props }) => {
    editor.chain().focus().deleteRange(range).run();
    const storage = editor.storage.slashCommand as SlashCommandStorage | undefined;
    props.run({ editor, openAssetLibrary: storage?.openAssetLibrary });
  },
  render: () => {
    let component: ReactRenderer<SlashCommandMenuRef>;
    let popupEl: HTMLDivElement;

    const updatePosition = (clientRect: (() => DOMRect | null) | null | undefined) => {
      const rect = clientRect?.();
      if (!rect || !popupEl) return;

      popupEl.style.left = `${rect.left + window.scrollX}px`;
      popupEl.style.top = `${rect.bottom + window.scrollY + 4}px`;
    };

    return {
      onStart: (props) => {
        component = new ReactRenderer(SlashCommandMenu, {
          props: { items: props.items, command: (item: BlockRegistryItem) => props.command(item) },
          editor: props.editor,
        });

        popupEl = document.createElement("div");
        popupEl.style.position = "absolute";
        popupEl.style.zIndex = "60";
        document.body.appendChild(popupEl);
        popupEl.appendChild(component.element);

        updatePosition(props.clientRect);
      },
      onUpdate(props) {
        component.updateProps({
          items: props.items,
          command: (item: BlockRegistryItem) => props.command(item),
        });
        updatePosition(props.clientRect);
      },
      onKeyDown(props) {
        if (props.event.key === "Escape") {
          popupEl.remove();
          return true;
        }
        return component.ref?.onKeyDown({ event: props.event }) ?? false;
      },
      onExit() {
        popupEl.remove();
        component.destroy();
      },
    };
  },
};

/**
 * Typing `/` opens a menu (grouped: text/media/interactive/table) reading
 * from the shared BLOCK_REGISTRY — the same registry the toolbar's quick
 * insert button uses. `openAssetLibrary` is injected at editor-creation time
 * because media entries reuse the existing Asset Library dialog rather than
 * a separate upload flow.
 */
export const SlashCommand = Extension.create<Record<string, never>, SlashCommandStorage>({
  name: "slashCommand",

  addStorage() {
    return { openAssetLibrary: undefined };
  },

  addProseMirrorPlugins() {
    return [
      SuggestionPlugin<BlockRegistryItem>({
        editor: this.editor,
        ...CommandItemsSuggestion,
      }),
    ];
  },
});

export const setSlashCommandAssetLibraryHandler = (editor: Editor, handler?: () => void) => {
  editor.storage.slashCommand.openAssetLibrary = handler;
};

// Re-exported for the toolbar's "+" quick-insert button, which reuses the
// exact same registry + filtering instead of maintaining a second list.
export { filterBlockRegistry };
