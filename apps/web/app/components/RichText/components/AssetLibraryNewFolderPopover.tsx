import { FolderPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateResourceLibraryFolder } from "~/api/mutations/useCreateResourceLibraryFolder";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { RESOURCE_FOLDER_COLOR_CLASSES, RESOURCE_FOLDER_COLORS } from "./assetLibraryFolder.utils";

import type { ResourceLibraryFolder } from "~/api/queries/useResourceLibraryFolders";

type AssetLibraryNewFolderPopoverProps = {
  parentFolderId: string | null;
  disabled: boolean;
};

export const AssetLibraryNewFolderPopover = ({
  parentFolderId,
  disabled,
}: AssetLibraryNewFolderPopoverProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<ResourceLibraryFolder["color"]>("neutral");
  const { mutateAsync: createFolder, isPending } = useCreateResourceLibraryFolder();

  const resetForm = () => {
    setName("");
    setColor("neutral");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) return;

    await createFolder({
      name: trimmedName,
      parentFolderId,
      color,
    });

    resetForm();
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <FolderPlus className="mr-2 size-4" aria-hidden />
          {t("richText.assetLibrary.folder.new")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form className="flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-900" htmlFor="new-folder-name">
              {t("richText.assetLibrary.folder.nameLabel")}
            </label>
            <Input
              id="new-folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("richText.assetLibrary.folder.namePlaceholder")}
              maxLength={255}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-900" htmlFor="new-folder-color">
              {t("richText.assetLibrary.folder.colorLabel")}
            </label>
            <Select value={color} onValueChange={(value) => setColor(value as typeof color)}>
              <SelectTrigger id="new-folder-color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_FOLDER_COLORS.map((colorOption) => (
                  <SelectItem key={colorOption} value={colorOption}>
                    <span className="flex items-center gap-2">
                      <span
                        className={`size-3 rounded-full ${RESOURCE_FOLDER_COLOR_CLASSES[colorOption]}`}
                      />
                      {t(`richText.assetLibrary.folder.colors.${colorOption}`)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={!name.trim() || isPending} className="self-end">
            {t("richText.assetLibrary.folder.create")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
};
