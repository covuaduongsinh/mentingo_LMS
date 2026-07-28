import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAssignClassroomStudy } from "~/api/mutations/useAssignClassroomStudy";
import { useChessStudies } from "~/api/queries/useChessStudies";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function ClassroomStudies({ classroomId }: { classroomId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [studyId, setStudyId] = useState("");

  const { data: studies } = useChessStudies({ mine: true }, { enabled: open });
  const { mutateAsync: assignStudy, isPending } = useAssignClassroomStudy(classroomId);

  const handleAssign = async () => {
    if (!studyId) return;
    await assignStudy({ studyId });
    setOpen(false);
    setStudyId("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("classroom.studies.heading", { defaultValue: "Chess studies" })}</CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="classroom-assign-study-trigger">
              {t("classroom.studies.shareButton", { defaultValue: "Share a study with the class" })}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("classroom.studies.dialogTitle", { defaultValue: "Share a study" })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-1 py-2">
              <Label>{t("classroom.studies.studyPickerLabel", { defaultValue: "Study" })}</Label>
              <Select value={studyId} onValueChange={setStudyId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("classroom.studies.studyPickerPlaceholder", {
                      defaultValue: "Select a study",
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(studies?.data ?? []).map((study) => (
                    <SelectItem key={study.id} value={study.id}>
                      {study.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={handleAssign} disabled={!studyId || isPending}>
                {t("classroom.studies.shareButton", {
                  defaultValue: "Share a study with the class",
                })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
