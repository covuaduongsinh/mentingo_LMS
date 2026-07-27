import { useNavigate, useParams } from "@remix-run/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateClassroomStudent } from "~/api/mutations/useUpdateClassroomStudent";
import { useClassroomDetail } from "~/api/queries/useClassroomDetail";
import { useClassroomStudentDetail } from "~/api/queries/useClassroomStudentDetail";
import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) =>
  setPageTitle(matches, "pages.classroomEditStudent");

export default function ClassroomEditStudentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { classroomId, userId } = useParams<{ classroomId: string; userId: string }>();
  const { data: classroom } = useClassroomDetail(classroomId ?? "", { enabled: !!classroomId });
  const { data: student, isLoading } = useClassroomStudentDetail(classroomId ?? "", userId ?? "", {
    enabled: !!classroomId && !!userId,
  });
  const { mutateAsync: updateStudent, isPending } = useUpdateClassroomStudent(
    classroomId ?? "",
    userId ?? "",
  );

  const [realName, setRealName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!student) return;
    setRealName(student.realName);
    setNotes(student.notes);
  }, [student]);

  if (!classroomId || !userId) return null;

  const breadcrumbs = [
    { title: t("classroom.nav.title", { defaultValue: "Classrooms" }), href: "/classrooms" },
    { title: classroom?.name ?? "", href: `/classrooms/${classroomId}` },
    {
      title: t("classroom.students.title", { defaultValue: "Students" }),
      href: `/classrooms/${classroomId}/students`,
    },
    {
      title: student?.realName ?? "",
      href: `/classrooms/${classroomId}/students/${userId}`,
    },
  ];

  const handleSave = async () => {
    await updateStudent({ realName: realName.trim(), notes });
    navigate(`/classrooms/${classroomId}/students/${userId}`);
  };

  if (isLoading || !student) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p className="body-base text-neutral-600">…</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <h1 className="h4 text-neutral-950">
          {t("classroom.editStudent.title", { defaultValue: "Edit student" })}
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>{student.username}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-realname">
                {t("classroom.addStudent.realNameLabel", { defaultValue: "Real name" })}
              </Label>
              <Input
                id="edit-realname"
                value={realName}
                onChange={(event) => setRealName(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-notes">
                {t("classroom.editStudent.notesLabel", { defaultValue: "Notes" })}
              </Label>
              <Textarea
                id="edit-notes"
                rows={8}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <p className="details-sm text-neutral-500">
                {t("classroom.editStudent.notesHelp", {
                  defaultValue: "Only visible to the classroom's teachers.",
                })}
              </p>
            </div>
            <div>
              <Button onClick={handleSave} disabled={!realName.trim() || isPending}>
                {t("classroom.form.submit", { defaultValue: "Save" })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
