import { useParams } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useBulkCreateClassroomStudents } from "~/api/mutations/useBulkCreateClassroomStudents";
import { useCreateClassroomStudent } from "~/api/mutations/useCreateClassroomStudent";
import { useInviteClassroomStudent } from "~/api/mutations/useInviteClassroomStudent";
import { useClassroomDetail } from "~/api/queries/useClassroomDetail";
import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) =>
  setPageTitle(matches, "pages.classroomAddStudent");

function InviteExistingCard({ classroomId }: { classroomId: string }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [realName, setRealName] = useState("");
  const { mutateAsync: inviteStudent, isPending } = useInviteClassroomStudent(classroomId);

  const handleInvite = async () => {
    await inviteStudent({ username: username.trim(), realName: realName.trim() });
    setUsername("");
    setRealName("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("classroom.addStudent.inviteTitle", { defaultValue: "Invite an existing account" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="space-y-1">
          <Label htmlFor="invite-username">
            {t("classroom.addStudent.usernameLabel", { defaultValue: "Username" })}
          </Label>
          <Input
            id="invite-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="invite-realname">
            {t("classroom.addStudent.realNameLabel", { defaultValue: "Real name" })}
          </Label>
          <Input
            id="invite-realname"
            value={realName}
            onChange={(event) => setRealName(event.target.value)}
          />
        </div>
        <Button onClick={handleInvite} disabled={!username.trim() || !realName.trim() || isPending}>
          {t("classroom.addStudent.inviteButton", { defaultValue: "Send invite" })}
        </Button>
      </CardContent>
    </Card>
  );
}

type CreatedRow = { userId: string; username: string; temporaryPassword: string; realName: string };

function CreatedCredentialsTable({ rows }: { rows: CreatedRow[] }) {
  const { t } = useTranslation();

  if (!rows.length) return null;

  return (
    <div className="rounded-md border border-warning-300 bg-warning-50 p-4">
      <p className="body-sm mb-2 font-medium text-warning-800">
        {t("classroom.addStudent.showOnceWarning", {
          defaultValue: "Save these credentials now — they won't be shown again.",
        })}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("classroom.students.realName", { defaultValue: "Name" })}</TableHead>
            <TableHead>{t("classroom.students.username", { defaultValue: "Username" })}</TableHead>
            <TableHead>
              {t("classroom.addStudent.password", { defaultValue: "Password" })}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.userId}>
              <TableCell>{row.realName}</TableCell>
              <TableCell className="font-mono">{row.username}</TableCell>
              <TableCell className="font-mono">{row.temporaryPassword}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CreateOneCard({ classroomId }: { classroomId: string }) {
  const { t } = useTranslation();
  const [realName, setRealName] = useState("");
  const [created, setCreated] = useState<CreatedRow[]>([]);
  const { mutateAsync: createStudent, isPending } = useCreateClassroomStudent(classroomId);

  const handleCreate = async () => {
    const student = await createStudent(realName.trim());
    setCreated((prev) => [student, ...prev]);
    setRealName("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("classroom.addStudent.createOneTitle", { defaultValue: "Create a new account" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="space-y-1">
          <Label htmlFor="create-one-realname">
            {t("classroom.addStudent.realNameLabel", { defaultValue: "Real name" })}
          </Label>
          <Input
            id="create-one-realname"
            value={realName}
            onChange={(event) => setRealName(event.target.value)}
          />
        </div>
        <Button onClick={handleCreate} disabled={!realName.trim() || isPending}>
          {t("classroom.addStudent.createButton", { defaultValue: "Create account" })}
        </Button>
        <CreatedCredentialsTable rows={created} />
      </CardContent>
    </Card>
  );
}

function BulkCreateCard({ classroomId }: { classroomId: string }) {
  const { t } = useTranslation();
  const [namesText, setNamesText] = useState("");
  const [created, setCreated] = useState<CreatedRow[]>([]);
  const { mutateAsync: bulkCreate, isPending } = useBulkCreateClassroomStudents(classroomId);

  const handleCreate = async () => {
    const names = namesText
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);
    if (!names.length) return;

    const students = await bulkCreate(names);
    setCreated(students);
    setNamesText("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("classroom.addStudent.bulkTitle", { defaultValue: "Create accounts in bulk" })}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="space-y-1">
          <Label htmlFor="bulk-names">
            {t("classroom.addStudent.bulkPlaceholder", {
              defaultValue: "One student name per line",
            })}
          </Label>
          <Textarea
            id="bulk-names"
            rows={8}
            value={namesText}
            onChange={(event) => setNamesText(event.target.value)}
          />
        </div>
        <Button onClick={handleCreate} disabled={!namesText.trim() || isPending}>
          {t("classroom.addStudent.createButton", { defaultValue: "Create account" })}
        </Button>
        <CreatedCredentialsTable rows={created} />
      </CardContent>
    </Card>
  );
}

export default function ClassroomAddStudentPage() {
  const { t } = useTranslation();
  const { classroomId } = useParams<{ classroomId: string }>();
  const { data: classroom } = useClassroomDetail(classroomId ?? "", { enabled: !!classroomId });

  if (!classroomId) return null;

  const breadcrumbs = [
    { title: t("classroom.nav.title", { defaultValue: "Classrooms" }), href: "/classrooms" },
    { title: classroom?.name ?? "", href: `/classrooms/${classroomId}` },
    {
      title: t("classroom.students.title", { defaultValue: "Students" }),
      href: `/classrooms/${classroomId}/students`,
    },
    {
      title: t("classroom.addStudent.title", { defaultValue: "Add student" }),
      href: `/classrooms/${classroomId}/students/add`,
    },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <h1 className="h4 text-neutral-950">
          {t("classroom.addStudent.title", { defaultValue: "Add student" })}
        </h1>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <InviteExistingCard classroomId={classroomId} />
          <CreateOneCard classroomId={classroomId} />
          <BulkCreateCard classroomId={classroomId} />
        </div>
      </div>
    </PageWrapper>
  );
}
