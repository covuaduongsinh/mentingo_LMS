import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useRestoreLessonContentVersion } from "~/api/mutations/admin/useRestoreLessonContentVersion";
import { useLessonContentVersionDetail } from "~/api/queries/admin/useLessonContentVersionDetail";
import { useLessonContentVersions } from "~/api/queries/admin/useLessonContentVersions";
import Viewer from "~/components/RichText/Viever";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from "~/components/ui/dialog";

import type { SupportedLanguages } from "@repo/shared";

type LessonContentVersionHistoryProps = {
  lessonId: string | undefined;
  language: SupportedLanguages;
  open: boolean;
  onClose: () => void;
};

export function LessonContentVersionHistory({
  lessonId,
  language,
  open,
  onClose,
}: LessonContentVersionHistoryProps) {
  const { t } = useTranslation();
  const [previewVersionId, setPreviewVersionId] = useState<string | undefined>(undefined);

  const { data: versions, isLoading } = useLessonContentVersions(lessonId, language, open);
  const { data: previewVersion } = useLessonContentVersionDetail(previewVersionId);
  const { mutate: restoreVersion, isPending: isRestoring } = useRestoreLessonContentVersion();

  const handleRestore = (versionId: string) => {
    if (!window.confirm(t("adminCourseView.curriculum.lesson.confirm.restoreVersion"))) return;

    restoreVersion(
      { versionId },
      {
        onSuccess: () => {
          setPreviewVersionId(undefined);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogOverlay className="bg-primary-400 opacity-65" />
      <DialogContent className="max-w-3xl p-8">
        <DialogTitle className="text-xl font-semibold text-neutral-900">
          {t("adminCourseView.curriculum.lesson.versionHistory.title")}
        </DialogTitle>

        {previewVersionId ? (
          <div className="flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => setPreviewVersionId(undefined)}
            >
              {t("common.button.back")}
            </Button>
            {previewVersion && (
              <>
                <div className="max-h-[50vh] overflow-y-auto rounded border border-neutral-200 p-4">
                  <Viewer content={previewVersion.description ?? ""} />
                </div>
                <Button
                  type="button"
                  disabled={isRestoring}
                  onClick={() => handleRestore(previewVersionId)}
                >
                  {t("adminCourseView.curriculum.lesson.versionHistory.restore")}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {isLoading && <p className="text-sm text-neutral-500">{t("common.other.loading")}</p>}
            {!isLoading && versions?.length === 0 && (
              <p className="text-sm text-neutral-500">
                {t("adminCourseView.curriculum.lesson.versionHistory.empty")}
              </p>
            )}
            {versions?.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between gap-4 rounded border border-neutral-200 p-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-neutral-900">
                    {t("adminCourseView.curriculum.lesson.versionHistory.versionLabel", {
                      number: version.versionNumber,
                    })}{" "}
                    — {new Date(version.createdAt).toLocaleString()}
                  </span>
                  {version.createdByName && (
                    <span className="text-xs text-neutral-500">{version.createdByName}</span>
                  )}
                  <span className="line-clamp-1 text-xs text-neutral-500">{version.excerpt}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewVersionId(version.id)}
                >
                  {t("adminCourseView.curriculum.lesson.versionHistory.view")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
