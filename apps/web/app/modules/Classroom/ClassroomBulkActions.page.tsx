import { useParams } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useRunClassroomBulkAction } from "~/api/mutations/useRunClassroomBulkAction";
import { useClassroomDetail } from "~/api/queries/useClassroomDetail";
import { useClassroomStudents } from "~/api/queries/useClassroomStudents";
import { useTeachingClassrooms } from "~/api/queries/useTeachingClassrooms";
import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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

export const meta: MetaFunction = ({ matches }) =>
  setPageTitle(matches, "pages.classroomBulkActions");

export default function ClassroomBulkActionsPage() {
  const { t } = useTranslation();
  const { classroomId } = useParams<{ classroomId: string }>();
  const { data: classroom } = useClassroomDetail(classroomId ?? "", { enabled: !!classroomId });
  const { data: students } = useClassroomStudents(classroomId ?? "", true, {
    enabled: !!classroomId,
  });
  const { data: teachingClassrooms } = useTeachingClassrooms();
  const { mutateAsync: runBulkAction, isPending } = useRunClassroomBulkAction(classroomId ?? "");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetClassroomId, setTargetClassroomId] = useState("");

  if (!classroomId) return null;

  const breadcrumbs = [
    { title: t("classroom.nav.title", { defaultValue: "Classrooms" }), href: "/classrooms" },
    { title: classroom?.name ?? "", href: `/classrooms/${classroomId}` },
    {
      title: t("classroom.students.bulkActionsButton", { defaultValue: "Bulk actions" }),
      href: `/classrooms/${classroomId}/bulk-actions`,
    },
  ];

  const toggleSelected = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const runAction = async (action: "archive" | "restore" | "remove" | "move") => {
    if (!selectedIds.size) return;
    await runBulkAction({
      action,
      userIds: Array.from(selectedIds),
      targetClassroomId: action === "move" ? targetClassroomId : undefined,
    });
    setSelectedIds(new Set());
  };

  const otherClassrooms = (teachingClassrooms ?? []).filter((room) => room.id !== classroomId);

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <h1 className="h4 text-neutral-950">
          {t("classroom.bulkActions.title", { defaultValue: "Bulk actions" })}
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("classroom.bulkActions.selectStudents", {
                defaultValue: "Select students to act on",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>
                    {t("classroom.students.realName", { defaultValue: "Name" })}
                  </TableHead>
                  <TableHead>
                    {t("classroom.students.status", { defaultValue: "Status" })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(students ?? []).map((student) => (
                  <TableRow key={student.userId}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(student.userId)}
                        onCheckedChange={() => toggleSelected(student.userId)}
                      />
                    </TableCell>
                    <TableCell>
                      {student.realName ?? t("classroom.students.you", { defaultValue: "You" })}
                    </TableCell>
                    <TableCell>
                      {student.archivedAt
                        ? t("classroom.students.archivedBadge", { defaultValue: "Archived" })
                        : t("classroom.bulkActions.active", { defaultValue: "Active" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("classroom.bulkActions.applyAction", {
                defaultValue: "Apply an action to {{count}} selected",
                count: selectedIds.size,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <Button
              variant="outline"
              disabled={!selectedIds.size || isPending}
              onClick={() => runAction("archive")}
            >
              {t("classroom.bulkActions.archive", { defaultValue: "Archive" })}
            </Button>
            <Button
              variant="outline"
              disabled={!selectedIds.size || isPending}
              onClick={() => runAction("restore")}
            >
              {t("classroom.bulkActions.restore", { defaultValue: "Restore" })}
            </Button>
            <Button
              variant="destructive"
              disabled={!selectedIds.size || isPending}
              onClick={() => runAction("remove")}
            >
              {t("classroom.bulkActions.remove", { defaultValue: "Remove" })}
            </Button>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Select value={targetClassroomId} onValueChange={setTargetClassroomId}>
                  <SelectTrigger className="w-56">
                    <SelectValue
                      placeholder={t("classroom.bulkActions.moveTarget", {
                        defaultValue: "Move to…",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {otherClassrooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                disabled={!selectedIds.size || !targetClassroomId || isPending}
                onClick={() => runAction("move")}
              >
                {t("classroom.bulkActions.move", { defaultValue: "Move" })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
