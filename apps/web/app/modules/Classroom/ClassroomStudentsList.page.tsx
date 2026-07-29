import { Link, useParams } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useRevokeClassroomInvite } from "~/api/mutations/useRevokeClassroomInvite";
import { useClassroomDetail } from "~/api/queries/useClassroomDetail";
import { useClassroomInvites } from "~/api/queries/useClassroomInvites";
import { useClassroomStudents } from "~/api/queries/useClassroomStudents";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.classroomStudents");

export default function ClassroomStudentsListPage() {
  const { t } = useTranslation();
  const { classroomId } = useParams<{ classroomId: string }>();
  const [showArchived, setShowArchived] = useState(false);

  const { data: classroom } = useClassroomDetail(classroomId ?? "", { enabled: !!classroomId });
  const { data: students, isLoading } = useClassroomStudents(classroomId ?? "", showArchived, {
    enabled: !!classroomId,
  });
  const { data: invites } = useClassroomInvites(classroomId ?? "", { enabled: !!classroomId });
  const { mutateAsync: revokeInvite } = useRevokeClassroomInvite(classroomId ?? "");

  if (!classroomId) return null;

  const breadcrumbs = [
    { title: t("classroom.nav.title", { defaultValue: "Classrooms" }), href: "/classrooms" },
    { title: classroom?.name ?? "", href: `/classrooms/${classroomId}` },
    {
      title: t("classroom.students.title", { defaultValue: "Students" }),
      href: `/classrooms/${classroomId}/students`,
    },
  ];

  const pendingInvites = (invites ?? []).filter((invite) => invite.status === "pending");

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="h4 text-neutral-950">
            {t("classroom.students.title", { defaultValue: "Students" })}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={`/classrooms/${classroomId}/bulk-actions`}>
                {t("classroom.students.bulkActionsButton", { defaultValue: "Bulk actions" })}
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/classrooms/${classroomId}/students/add`}>
                {t("classroom.students.addButton", { defaultValue: "Add student" })}
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <label htmlFor="show-archived" className="body-sm cursor-pointer text-neutral-700">
            {t("classroom.students.showArchived", { defaultValue: "Show archived students" })}
          </label>
        </div>

        {isLoading ? (
          <p className="body-base text-neutral-600">
            {t("common.loading", { defaultValue: "Loading…" })}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("classroom.students.realName", { defaultValue: "Name" })}</TableHead>
                <TableHead>
                  {t("classroom.students.username", { defaultValue: "Username" })}
                </TableHead>
                <TableHead>{t("classroom.students.status", { defaultValue: "Status" })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(students ?? []).map((student) => (
                <TableRow key={student.userId}>
                  <TableCell>
                    <Link
                      className="text-primary-700 hover:underline"
                      to={`/classrooms/${classroomId}/students/${student.userId}`}
                    >
                      {student.realName ?? t("classroom.students.you", { defaultValue: "You" })}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono">{student.username}</TableCell>
                  <TableCell className="flex gap-1">
                    {student.isManaged && (
                      <Badge variant="outline">
                        {t("classroom.students.managedBadge", { defaultValue: "Managed" })}
                      </Badge>
                    )}
                    {student.archivedAt && (
                      <Badge variant="secondary">
                        {t("classroom.students.archivedBadge", { defaultValue: "Archived" })}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(students ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-neutral-500">
                    {t("classroom.students.empty", { defaultValue: "No students yet." })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {pendingInvites.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="h6 text-neutral-800">
              {t("classroom.students.pendingInvites", { defaultValue: "Pending invitations" })}
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t("classroom.students.realName", { defaultValue: "Name" })}
                  </TableHead>
                  <TableHead>
                    {t("classroom.students.username", { defaultValue: "Username" })}
                  </TableHead>
                  <TableHead>
                    {t("classroom.students.actions", { defaultValue: "Actions" })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.realName}</TableCell>
                    <TableCell className="font-mono">{invite.username}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => revokeInvite(invite.id)}>
                        {t("classroom.students.revokeInvite", { defaultValue: "Revoke" })}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
