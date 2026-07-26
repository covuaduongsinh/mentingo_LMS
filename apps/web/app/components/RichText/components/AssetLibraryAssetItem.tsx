import { formatDate } from "date-fns";
import { FolderInput, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { RICH_TEXT_HANDLES } from "../../../../e2e/data/common/handles";

import { AssetTypeIcon, formatAssetSize, getAssetDisplayName } from "./assetLibrary.utils";

import type { ResourceLibraryAsset } from "~/api/queries/useResourceLibraryAssets";

export type AssetLibraryMoveTarget = { id: string | null; name: string };

type AssetLibraryAssetItemProps = {
  asset: ResourceLibraryAsset;
  canInsert: boolean;
  canDelete: boolean;
  isMutating: boolean;
  moveTargets?: AssetLibraryMoveTarget[];
  onInsert: (asset: ResourceLibraryAsset) => void;
  onDelete: (asset: ResourceLibraryAsset) => void;
  onMove?: (asset: ResourceLibraryAsset, folderId: string | null) => void;
};

export const AssetLibraryAssetItem = ({
  asset,
  canInsert,
  canDelete,
  isMutating,
  moveTargets,
  onInsert,
  onDelete,
  onMove,
}: AssetLibraryAssetItemProps) => {
  const { t } = useTranslation();

  const fileSize = formatAssetSize(asset.size);
  const displayName = getAssetDisplayName(asset);

  return (
    <div
      data-testid={RICH_TEXT_HANDLES.assetLibraryRow(asset.id)}
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-neutral-100 px-3 py-3 last:border-b-0"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-neutral-100">
          <AssetTypeIcon type={asset.type} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-950">{displayName}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600">
            <span>{t(`richText.assetLibrary.types.${asset.type}`)}</span>
            <span>{formatDate(new Date(asset.createdAt), "dd.MM.yyyy")}</span>
            {fileSize && <span>{fileSize}</span>}
            <span>{t("richText.assetLibrary.usageCount", { count: asset.usageCount })}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          data-testid={RICH_TEXT_HANDLES.assetLibraryInsertButton(asset.id)}
          type="button"
          size="sm"
          variant="outline"
          disabled={!canInsert || isMutating}
          onClick={() => onInsert(asset)}
        >
          {t("richText.assetLibrary.insert")}
        </Button>
        {onMove && moveTargets && moveTargets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={!canDelete || isMutating}
                aria-label={t("richText.assetLibrary.folder.moveTo")}
              >
                <FolderInput className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {moveTargets.map((target) => (
                <DropdownMenuItem
                  key={target.id ?? "root"}
                  onClick={() => onMove(asset, target.id)}
                >
                  {target.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          data-testid={RICH_TEXT_HANDLES.assetLibraryDeleteButton(asset.id)}
          type="button"
          size="icon"
          variant="ghost"
          disabled={!canDelete || isMutating}
          aria-label={t("richText.assetLibrary.delete")}
          onClick={() => onDelete(asset)}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
};
