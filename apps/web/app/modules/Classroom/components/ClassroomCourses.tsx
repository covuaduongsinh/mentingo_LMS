import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAssignClassroomCourse } from "~/api/mutations/useAssignClassroomCourse";
import { useUnassignClassroomCourse } from "~/api/mutations/useUnassignClassroomCourse";
import { useClassroomCourses } from "~/api/queries/useClassroomCourses";
import { useCourses } from "~/api/queries/useCourses";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { useLanguageStore } from "~/modules/Dashboard/Settings/Language/LanguageStore";

import type { ListClassroomCoursesResponse } from "~/api/generated-api";

type ClassroomCourseItem = ListClassroomCoursesResponse["data"][number];

const getLocalizedTitle = (title: unknown, language: string): string => {
  const record = title as Record<string, string>;
  return record[language] ?? record.en ?? Object.values(record)[0] ?? "";
};

function AssignCourseDialog({ classroomId }: { classroomId: string }) {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [dueDate, setDueDate] = useState("");

  const { data: courses } = useCourses({ language }, { enabled: open });
  const { mutateAsync: assignCourse, isPending } = useAssignClassroomCourse(classroomId);

  const handleAssign = async () => {
    if (!courseId) return;
    await assignCourse({
      courseId,
      isMandatory,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    });
    setOpen(false);
    setCourseId("");
    setIsMandatory(false);
    setDueDate("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="classroom-assign-course-trigger">
          {t("classroom.courses.assignButton", { defaultValue: "Assign a course" })}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("classroom.courses.dialogTitle", { defaultValue: "Assign a course to the class" })}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label>{t("classroom.courses.coursePickerLabel", { defaultValue: "Course" })}</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("classroom.courses.coursePickerPlaceholder", {
                    defaultValue: "Select a course",
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {(courses ?? []).map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isMandatory} onCheckedChange={setIsMandatory} />
            <span className="body-sm">
              {t("classroom.courses.mandatoryLabel", { defaultValue: "Mandatory" })}
            </span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="classroom-course-due-date">
              {t("classroom.courses.dueDateLabel", { defaultValue: "Due date (optional)" })}
            </Label>
            <Input
              id="classroom-course-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAssign} disabled={!courseId || isPending}>
            {t("classroom.courses.assignButton", { defaultValue: "Assign a course" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClassroomCourses({
  classroomId,
  isTeacher,
}: {
  classroomId: string;
  isTeacher: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const { data: assignedCourses } = useClassroomCourses(classroomId);
  const { mutate: unassignCourse } = useUnassignClassroomCourse(classroomId);

  if (!isTeacher && !assignedCourses?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>{t("classroom.courses.heading", { defaultValue: "Courses" })}</span>
          {isTeacher && <AssignCourseDialog classroomId={classroomId} />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {assignedCourses?.length ? (
          <ul className="flex flex-col gap-2">
            {assignedCourses.map((course: ClassroomCourseItem) => (
              <li
                key={course.courseId}
                className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2"
              >
                <span className="body-sm text-neutral-800">
                  {getLocalizedTitle(course.title, language)}
                  {course.isMandatory && (
                    <span className="details-sm ml-2 text-neutral-500">
                      {t("classroom.courses.mandatoryBadge", { defaultValue: "Mandatory" })}
                    </span>
                  )}
                </span>
                {isTeacher && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unassignCourse(course.courseId)}
                  >
                    {t("classroom.courses.unassignButton", { defaultValue: "Remove" })}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="body-sm text-neutral-500">
            {t("classroom.courses.empty", { defaultValue: "No courses assigned yet." })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
