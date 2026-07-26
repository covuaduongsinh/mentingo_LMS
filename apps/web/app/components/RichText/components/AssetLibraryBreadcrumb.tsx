import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

export type AssetLibraryFolderPathEntry = { id: string; name: string };

type AssetLibraryBreadcrumbProps = {
  path: AssetLibraryFolderPathEntry[];
  onNavigate: (depth: number) => void;
};

export const AssetLibraryBreadcrumb = ({ path, onNavigate }: AssetLibraryBreadcrumbProps) => {
  const { t } = useTranslation();

  if (!path.length) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <button type="button" onClick={() => onNavigate(0)}>
              {t("richText.assetLibrary.folder.root")}
            </button>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {path.map((entry, index) => {
          const isLast = index === path.length - 1;

          return (
            <Fragment key={entry.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{entry.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button type="button" onClick={() => onNavigate(index + 1)}>
                      {entry.name}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
