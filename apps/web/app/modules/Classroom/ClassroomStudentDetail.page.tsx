import { Link, useParams } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useCloseClassroomStudent } from "~/api/mutations/useCloseClassroomStudent";
import { useMoveClassroomStudent } from "~/api/mutations/useMoveClassroomStudent";
import { useReleaseClassroomStudent } from "~/api/mutations/useReleaseClassroomStudent";
import { useResetClassroomStudentPassword } from "~/api/mutations/useResetClassroomStudentPassword";
import { useSetClassroomStudentArchived } from "~/api/mutations/useSetClassroomStudentArchived";
import { useClassroomDetail } from "~/api/queries/useClassroomDetail";
import { useClassroomStudentDetail } from "~/api/queries/useClassroomStudentDetail";
import { useTeachingClassrooms } from "~/api/queries/useTeachingClassrooms";
import { PageWrapper } from "~/components/PageWrapper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
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
import { useToast } from "~/components/ui/use-toast";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) =>
  setPageTitle(matches, "pages.classroomStudentDetail");

function ResetPasswordButton({ classroomId, userId }: { classroomId: string; userId: string }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState<string | null>(null);
  const { mutateAsync: resetPassword, isPending } = useResetClassroomStudentPassword(classroomId);

  const handleReset = async () => {
    const result = await resetPassword(userId);
    setPassword(result.temporaryPassword);
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" onClick={handleReset} disabled={isPending}>
        {t("classroom.studentDetail.resetPassword", { defaultValue: "Reset password" })}
      </Button>
      {password && (
        <p className="body-sm rounded-md bg-warning-50 p-2 font-mono text-warning-800">
          {t("classroom.studentDetail.newPassword", {
            defaultValue: "New password: {{password}}",
            password,
          })}
        </p>
      )}
    </div>
  );
}

function ReleaseDialog({ classroomId, userId }: { classroomId: string; userId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const { mutateAsync: releaseStudent, isPending } = useReleaseClassroomStudent(
    classroomId,
    userId,
  );

  const handleRelease = async () => {
    const result = await releaseStudent(email.trim());
    setOpen(false);
    setEmail("");
    toast({
      description: t("classroom.studentDetail.releaseToken", {
        defaultValue: "Create-password token: {{token}}",
        token: result.createToken,
      }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {t("classroom.studentDetail.release", { defaultValue: "Graduate (release)" })}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("classroom.studentDetail.releaseTitle", {
              defaultValue: "Release to a self-managed account",
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="release-email">
            {t("classroom.studentDetail.releaseEmailLabel", {
              defaultValue: "Student's real email",
            })}
          </Label>
          <Input
            id="release-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleRelease} disabled={!email.trim() || isPending}>
            {t("classroom.form.submit", { defaultValue: "Save" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({ classroomId, userId }: { classroomId: string; userId: string }) {
  const { t } = useTranslation();
  const [targetClassroomId, setTargetClassroomId] = useState("");
  const [open, setOpen] = useState(false);
  const { data: teachingClassrooms } = useTeachingClassrooms();
  const { mutateAsync: moveStudent, isPending } = useMoveClassroomStudent(classroomId);

  const otherClassrooms = (teachingClassrooms ?? []).filter((room) => room.id !== classroomId);

  const handleMove = async () => {
    await moveStudent({ userId, targetClassroomId });
    setOpen(false);
    setTargetClassroomId("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {t("classroom.studentDetail.move", { defaultValue: "Move to another class" })}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("classroom.studentDetail.moveTitle", { defaultValue: "Move to another class" })}
          </DialogTitle>
        </DialogHeader>
        <Select value={targetClassroomId} onValueChange={setTargetClassroomId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {otherClassrooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button onClick={handleMove} disabled={!targetClassroomId || isPending}>
            {t("classroom.form.submit", { defaultValue: "Save" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseAccountDialog({ classroomId, userId }: { classroomId: string; userId: string }) {
  const { t } = useTranslation();
  const { mutateAsync: closeStudent, isPending } = useCloseClassroomStudent(classroomId);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isPending}>
          {t("classroom.studentDetail.close", { defaultValue: "Close account permanently" })}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("classroom.studentDetail.close", { defaultValue: "Close account permanently" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("classroom.studentDetail.closeConfirm", {
              defaultValue:
                "This cannot be undone. The student will never be able to use this account again.",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t("classroom.form.cancel", { defaultValue: "Cancel" })}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => closeStudent(userId)}>
            {t("classroom.studentDetail.close", { defaultValue: "Close account permanently" })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ClassroomStudentDetailPage() {
  const { t } = useTranslation();
  const { classroomId, userId } = useParams<{ classroomId: string; userId: string }>();
  const { data: classroom } = useClassroomDetail(classroomId ?? "", { enabled: !!classroomId });
  const { data: student, isLoading } = useClassroomStudentDetail(classroomId ?? "", userId ?? "", {
    enabled: !!classroomId && !!userId,
  });
  const { mutateAsync: setArchived, isPending: isArchiving } = useSetClassroomStudentArchived(
    classroomId ?? "",
    userId ?? "",
  );

  if (!classroomId || !userId) return null;

  const breadcrumbs = [
    { title: t("classroom.nav.title", { defaultValue: "Classrooms" }), href: "/classrooms" },
    { title: classroom?.name ?? "", href: `/classrooms/${classroomId}` },
    {
      title: t("classroom.students.title", { defaultValue: "Students" }),
      href: `/classrooms/${classroomId}/students`,
    },
    { title: student?.realName ?? "", href: `/classrooms/${classroomId}/students/${userId}` },
  ];

  if (isLoading || !student) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p className="body-base text-neutral-600">…</p>
      </PageWrapper>
    );
  }

  const isArchived = !!student.archivedAt;

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="h4 text-neutral-950">{student.realName}</h1>
            {student.isManaged && (
              <Badge variant="outline">
                {t("classroom.students.managedBadge", { defaultValue: "Managed" })}
              </Badge>
            )}
            {isArchived && (
              <Badge variant="secondary">
                {t("classroom.students.archivedBadge", { defaultValue: "Archived" })}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to={`/classrooms/${classroomId}/students/${userId}/edit`}>
                {t("classroom.studentDetail.edit", { defaultValue: "Edit" })}
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={isArchiving}
              onClick={() => setArchived(!isArchived)}
            >
              {isArchived
                ? t("classroom.studentDetail.restore", { defaultValue: "Restore" })
                : t("classroom.studentDetail.archive", { defaultValue: "Archive" })}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("classroom.studentDetail.profile", { defaultValue: "Profile" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="body-sm text-neutral-600">
              {t("classroom.students.username", { defaultValue: "Username" })}:{" "}
              <span className="font-mono">{student.username}</span>
            </p>
            {student.notes && <p className="body-sm text-neutral-700">{student.notes}</p>}
          </CardContent>
        </Card>

        {student.isManaged && (
          <Card>
            <CardHeader>
              <CardTitle>
                {t("classroom.studentDetail.managedActions", {
                  defaultValue: "Managed account actions",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <ResetPasswordButton classroomId={classroomId} userId={userId} />
              <ReleaseDialog classroomId={classroomId} userId={userId} />
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <MoveDialog classroomId={classroomId} userId={userId} />
          <CloseAccountDialog classroomId={classroomId} userId={userId} />
        </div>
      </div>
    </PageWrapper>
  );
}
