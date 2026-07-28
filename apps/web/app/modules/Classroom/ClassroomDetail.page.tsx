import { Link, useParams } from "@remix-run/react";
import {
  CLASSROOM_ANNOUNCEMENT_MAX_LENGTH,
  CLASSROOM_ANNOUNCEMENT_MIN_LENGTH,
  isSupportedLanguage,
} from "@repo/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Markdown from "react-markdown";

import { useAddClassroomTeacher } from "~/api/mutations/useAddClassroomTeacher";
import { useRemoveClassroomTeacher } from "~/api/mutations/useRemoveClassroomTeacher";
import { useSendClassroomAnnouncement } from "~/api/mutations/useSendClassroomAnnouncement";
import { useSetClassroomArchived } from "~/api/mutations/useSetClassroomArchived";
import { useUpdateClassroom } from "~/api/mutations/useUpdateClassroom";
import { useClassroomDetail } from "~/api/queries/useClassroomDetail";
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
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { setPageTitle } from "~/utils/setPageTitle";

import { ClassroomCourses } from "./components/ClassroomCourses";
import { ClassroomStudies } from "./components/ClassroomStudies";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.classroomDetail");

export default function ClassroomDetailPage() {
  const { t, i18n } = useTranslation();
  const { classroomId } = useParams<{ classroomId: string }>();
  const { data: classroom, isLoading } = useClassroomDetail(classroomId ?? "", {
    enabled: !!classroomId,
  });

  const { mutateAsync: updateClassroom, isPending: isSaving } = useUpdateClassroom(
    classroomId ?? "",
  );
  const { mutateAsync: setArchived, isPending: isArchiving } = useSetClassroomArchived(
    classroomId ?? "",
  );
  const { mutateAsync: addTeacher, isPending: isAddingTeacher } = useAddClassroomTeacher(
    classroomId ?? "",
  );
  const { mutateAsync: removeTeacher } = useRemoveClassroomTeacher(classroomId ?? "");
  const { mutateAsync: sendAnnouncement, isPending: isSendingAnnouncement } =
    useSendClassroomAnnouncement(classroomId ?? "");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [canMsg, setCanMsg] = useState(false);
  const [wall, setWall] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);

  useEffect(() => {
    if (!classroom) return;
    setName(classroom.name);
    setDescription(classroom.description ?? "");
    setCanMsg(classroom.canMsg);
    setWall(classroom.wall);
  }, [classroom]);

  if (!classroomId) return null;

  const breadcrumbs = [
    { title: t("classroom.nav.title", { defaultValue: "Classrooms" }), href: "/classrooms" },
    { title: classroom?.name ?? "", href: `/classrooms/${classroomId}` },
  ];

  const handleSave = async () => {
    await updateClassroom({
      name: name.trim(),
      description: description.trim() || undefined,
      canMsg,
      wall,
    });
  };

  const handleAddTeacher = async () => {
    if (!newTeacherId.trim()) return;
    await addTeacher(newTeacherId.trim());
    setNewTeacherId("");
  };

  const announcementLanguage = isSupportedLanguage(i18n.language) ? i18n.language : "en";

  const handleSendAnnouncement = async () => {
    await sendAnnouncement({ message: announcementMessage.trim(), language: announcementLanguage });
    setAnnouncementMessage("");
    setIsAnnouncementDialogOpen(false);
  };

  if (isLoading || !classroom) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p className="body-base text-neutral-600">…</p>
      </PageWrapper>
    );
  }

  const isArchived = !!classroom.archivedAt;

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="h4 text-neutral-950">{classroom.name}</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/classrooms/${classroomId}/students`}>
                {t("classroom.students.title", { defaultValue: "Students" })}
              </Link>
            </Button>
            {classroom.isTeacher && !isArchived && (
              <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="classroom-send-announcement-trigger">
                    {t("classroom.announcement.sendButton", { defaultValue: "Send announcement" })}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {t("classroom.announcement.dialogTitle", {
                        defaultValue: "Send announcement to the classroom",
                      })}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-1">
                    <Textarea
                      value={announcementMessage}
                      onChange={(event) => setAnnouncementMessage(event.target.value)}
                      rows={4}
                      maxLength={CLASSROOM_ANNOUNCEMENT_MAX_LENGTH}
                      placeholder={t("classroom.announcement.placeholder", {
                        defaultValue: "What do you want to tell the class?",
                      })}
                      data-testid="classroom-announcement-message"
                    />
                    <p className="details-sm text-neutral-500">
                      {t("classroom.announcement.lengthHint", {
                        defaultValue: "{{count}}/{{max}} characters",
                        count: announcementMessage.trim().length,
                        max: CLASSROOM_ANNOUNCEMENT_MAX_LENGTH,
                      })}
                    </p>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleSendAnnouncement}
                      disabled={
                        announcementMessage.trim().length < CLASSROOM_ANNOUNCEMENT_MIN_LENGTH ||
                        isSendingAnnouncement
                      }
                      data-testid="classroom-send-announcement-submit"
                    >
                      {t("classroom.announcement.sendButton", {
                        defaultValue: "Send announcement",
                      })}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {classroom.isTeacher && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant={isArchived ? "default" : "destructive"}
                    disabled={isArchiving}
                    data-testid="classroom-archive-toggle"
                  >
                    {isArchived
                      ? t("classroom.detail.reopenButton", { defaultValue: "Reopen classroom" })
                      : t("classroom.detail.archiveButton", { defaultValue: "Archive classroom" })}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {isArchived
                        ? t("classroom.detail.reopenButton", { defaultValue: "Reopen classroom" })
                        : t("classroom.detail.archiveButton", {
                            defaultValue: "Archive classroom",
                          })}
                    </AlertDialogTitle>
                    {!isArchived && (
                      <AlertDialogDescription>
                        {t("classroom.detail.confirmArchive", {
                          defaultValue:
                            "Archive this classroom? Students will no longer see it, but nothing is deleted.",
                        })}
                      </AlertDialogDescription>
                    )}
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {t("classroom.form.cancel", { defaultValue: "Cancel" })}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => setArchived(!isArchived)}>
                      {t("classroom.form.submit", { defaultValue: "Save" })}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {isArchived && (
          <p className="body-sm rounded-md bg-neutral-100 p-3 text-neutral-700">
            {t("classroom.detail.archivedBanner", {
              defaultValue: "This classroom is archived.",
            })}
          </p>
        )}

        {classroom.isTeacher ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {t("classroom.form.editTitle", { defaultValue: "Edit classroom" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-1">
                <Label htmlFor="classroom-edit-name">
                  {t("classroom.form.nameLabel", { defaultValue: "Name" })}
                </Label>
                <Input
                  id="classroom-edit-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="classroom-edit-description">
                  {t("classroom.form.descriptionLabel", { defaultValue: "Description" })}
                </Label>
                <Textarea
                  id="classroom-edit-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="classroom-can-msg" checked={canMsg} onCheckedChange={setCanMsg} />
                <Label htmlFor="classroom-can-msg" className="cursor-pointer">
                  {t("classroom.form.canMsgLabel", {
                    defaultValue: "Allow students to message each other",
                  })}
                </Label>
              </div>
              <p className="details-sm text-neutral-500">
                {t("classroom.form.canMsgHelp", {
                  defaultValue: "Only applies to students using a teacher-managed account.",
                })}
              </p>
              <div className="space-y-1">
                <Label htmlFor="classroom-edit-wall">
                  {t("classroom.wall.editLabel", { defaultValue: "Bulletin board (Markdown)" })}
                </Label>
                <Textarea
                  id="classroom-edit-wall"
                  value={wall}
                  onChange={(event) => setWall(event.target.value)}
                  rows={8}
                  data-testid="classroom-edit-wall"
                />
              </div>
              <div>
                <Button
                  onClick={handleSave}
                  disabled={name.trim().length < 3 || isSaving}
                  data-testid="classroom-save-button"
                >
                  {t("classroom.form.submit", { defaultValue: "Save" })}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          classroom.description && (
            <p className="body-base text-neutral-700">{classroom.description}</p>
          )
        )}

        {!classroom.isTeacher && classroom.wall && (
          <Card>
            <CardHeader>
              <CardTitle>
                {t("classroom.wall.heading", { defaultValue: "Bulletin board" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <Markdown>{classroom.wall}</Markdown>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {t("classroom.detail.teachersHeading", { defaultValue: "Teachers" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {classroom.teachers.map((teacher) => (
                <li
                  key={teacher.userId}
                  className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2"
                >
                  <span className="body-sm text-neutral-800">
                    {teacher.firstName} {teacher.lastName}
                  </span>
                  {classroom.isTeacher && classroom.teachers.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeTeacher(teacher.userId)}
                    >
                      {t("classroom.detail.removeTeacherButton", { defaultValue: "Remove" })}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {classroom.isTeacher && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor="classroom-add-teacher">
                    {t("classroom.detail.addTeacherPlaceholder", {
                      defaultValue: "Add a teacher by user ID",
                    })}
                  </Label>
                  <Input
                    id="classroom-add-teacher"
                    value={newTeacherId}
                    onChange={(event) => setNewTeacherId(event.target.value)}
                    className="w-72"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleAddTeacher}
                  disabled={!newTeacherId.trim() || isAddingTeacher}
                >
                  {t("classroom.detail.addTeacherButton", { defaultValue: "Add teacher" })}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <ClassroomCourses classroomId={classroomId} isTeacher={classroom.isTeacher} />
        {classroom.isTeacher && <ClassroomStudies classroomId={classroomId} />}
      </div>
    </PageWrapper>
  );
}
