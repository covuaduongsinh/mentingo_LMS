import { Folder, MoreVertical, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { RESOURCE_FOLDER_COLOR_CLASSES } from "./assetLibraryFolder.utils";

import type { ResourceLibraryFolder } from "~/api/queries/useResourceLibraryFolders";

type AssetLibraryFolderGridProps = {
  folders: ResourceLibraryFolder[];
  isMutating: boolean;
  onOpenFolder: (folder: ResourceLibraryFolder) => void;
  onDeleteFolder: (folder: ResourceLibraryFolder) => void;
};

export const AssetLibraryFolderGrid = ({
  folders,
  isMutating,
  onOpenFolder,
  onDeleteFolder,
}: AssetLibraryFolderGridProps) => {
  const { t } = useTranslation();

  if (!folders.length) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="group flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-2 text-left hover:border-neutral-300"
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2"
            onClick={() => onOpenFolder(folder)}
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-md ${RESOURCE_FOLDER_COLOR_CLASSES[folder.color]}`}
            >
              <Folder className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-neutral-950">
                {folder.name}
              </span>
              <span className="block text-xs text-neutral-500">
                {t("richText.assetLibrary.folder.itemCount", {
                  count: folder.childFolderCount + folder.assetCount,
                })}
              </span>
            </span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={isMutating}
                className="size-7 shrink-0 opacity-0 group-hover:opacity-100"
                aria-label={t("richText.assetLibrary.folder.actions")}
              >
                <MoreVertical className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => onDeleteFolder(folder)}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                {t("richText.assetLibrary.folder.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
};
