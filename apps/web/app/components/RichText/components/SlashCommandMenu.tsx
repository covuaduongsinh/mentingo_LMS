import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "~/lib/utils";

import {
  BLOCK_REGISTRY_GROUP_ORDER,
  type BlockRegistryActionContext,
  type BlockRegistryItem,
} from "../extensions/utils/blockRegistry";

export type SlashCommandMenuProps = {
  items: BlockRegistryItem[];
  command: (item: BlockRegistryItem) => void;
};

export type SlashCommandMenuRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

/**
 * Floating menu rendered by the `/` slash-command extension (see
 * extensions/slashCommand.tsx) and by the toolbar's "+" quick-insert button
 * (see toolbar/EditorToolbar.tsx) — both read from the same BLOCK_REGISTRY so
 * the two entry points never drift out of sync.
 */
export const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SlashCommandMenuProps>(
  ({ items, command }, ref) => {
    const { t } = useTranslation();
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const groupedItems = useMemo(() => {
      return BLOCK_REGISTRY_GROUP_ORDER.map((group) => ({
        group,
        items: items.filter((item) => item.group === group),
      })).filter((entry) => entry.items.length > 0);
    }, [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) command(item);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (items.length ? (prev - 1 + items.length) % items.length : 0));
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) {
      return (
        <div className="w-64 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-500 shadow-lg">
          {t("richTextEditor.slashCommand.noResults")}
        </div>
      );
    }

    let runningIndex = -1;

    return (
      <div className="max-h-80 w-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
        {groupedItems.map(({ group, items: groupItems }) => (
          <div key={group} className="mb-1 last:mb-0">
            <p className="px-2 py-1 text-xs font-semibold uppercase text-neutral-400">
              {t(`richTextEditor.blockRegistry.group.${group}`)}
            </p>
            {groupItems.map((item) => {
              runningIndex += 1;
              const index = runningIndex;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => selectItem(index)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                    index === selectedIndex ? "bg-primary-100" : "hover:bg-neutral-100",
                  )}
                >
                  <Icon className="size-4 shrink-0 text-neutral-600" aria-hidden />
                  <span className="truncate">{t(item.labelKey)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  },
);

SlashCommandMenu.displayName = "SlashCommandMenu";

export type { BlockRegistryActionContext };
