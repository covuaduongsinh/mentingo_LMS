import { Link } from "@remix-run/react";
import { PERMISSIONS } from "@repo/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAcceptClassroomInvite } from "~/api/mutations/useAcceptClassroomInvite";
import { useBecomeClassroomTeacher } from "~/api/mutations/useBecomeClassroomTeacher";
import { useCreateClassroom } from "~/api/mutations/useCreateClassroom";
import { useDeclineClassroomInvite } from "~/api/mutations/useDeclineClassroomInvite";
import { useLearningClassrooms } from "~/api/queries/useLearningClassrooms";
import { useMyClassroomInvites } from "~/api/queries/useMyClassroomInvites";
import { useTeachingClassrooms } from "~/api/queries/useTeachingClassrooms";
import { PageWrapper } from "~/components/PageWrapper";
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
import { usePermissions } from "~/hooks/usePermissions";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";
import type { ListTeachingClassroomsResponse } from "~/api/generated-api";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.classrooms");

type ClassroomListItem = ListTeachingClassroomsResponse["data"][number];

function ClassroomCard({ classroom }: { classroom: ClassroomListItem }) {
  const { t } = useTranslation();

  return (
    <Link to={`/classrooms/${classroom.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>{classroom.name}</span>
            {classroom.archivedAt && (
              <span className="details-sm text-neutral-500">
                {t("classroom.detail.archivedBanner", {
                  defaultValue: "This classroom is archived.",
                })}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        {classroom.description && (
          <CardContent>
            <p className="body-sm text-neutral-600">{classroom.description}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}

function CreateClassroomDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { mutateAsync: createClassroom, isPending } = useCreateClassroom();

  const handleCreate = async () => {
    const classroom = await createClassroom({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setOpen(false);
    setName("");
    setDescription("");
    window.location.assign(`/classrooms/${classroom.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="classroom-create-button">
          <Plus className="mr-2 size-4" />
          {t("classroom.list.createButton", { defaultValue: "New classroom" })}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("classroom.form.createTitle", { defaultValue: "New classroom" })}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="classroom-name">
              {t("classroom.form.nameLabel", { defaultValue: "Name" })}
            </Label>
            <Input
              id="classroom-name"
              data-testid="classroom-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="classroom-description">
              {t("classroom.form.descriptionLabel", { defaultValue: "Description" })}
            </Label>
            <Input
              id="classroom-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            data-testid="classroom-create-submit"
            onClick={handleCreate}
            disabled={name.trim().length < 3 || isPending}
          >
            {t("classroom.form.submit", { defaultValue: "Save" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingInvites() {
  const { t } = useTranslation();
  const { data: invites } = useMyClassroomInvites();
  const { mutateAsync: acceptInvite } = useAcceptClassroomInvite();
  const { mutateAsync: declineInvite } = useDeclineClassroomInvite();

  if (!invites?.length) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="h6 text-neutral-800">
        {t("classroom.list.pendingInvitesHeading", { defaultValue: "Pending invitations" })}
      </h2>
      <div className="flex flex-col gap-2">
        {invites.map((invite) => (
          <Card key={invite.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <span className="body-sm text-neutral-800">{invite.classroomName}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => declineInvite(invite.id)}>
                  {t("classroom.list.declineInvite", { defaultValue: "Decline" })}
                </Button>
                <Button size="sm" onClick={() => acceptInvite(invite.id)}>
                  {t("classroom.list.acceptInvite", { defaultValue: "Accept" })}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function BecomeTeacherBanner() {
  const { t } = useTranslation();
  const { mutateAsync: becomeTeacher, isPending, isSuccess } = useBecomeClassroomTeacher();

  if (isSuccess) return null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <span className="body-sm text-neutral-700">
          {t("classroom.becomeTeacher.prompt", {
            defaultValue: "Want to run your own classroom? Register as a teacher.",
          })}
        </span>
        <Button
          variant="outline"
          onClick={() => becomeTeacher()}
          disabled={isPending}
          data-testid="classroom-become-teacher-button"
        >
          {t("classroom.becomeTeacher.button", { defaultValue: "Become a teacher" })}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ClassroomListPage() {
  const { t } = useTranslation();
  const { hasAccess: canCreate } = usePermissions({ required: PERMISSIONS.CLASSROOM_CREATE });
  const { hasAccess: canManageAllClassrooms } = usePermissions({
    required: PERMISSIONS.CLASSROOM_MANAGE,
  });
  const { data: teaching, isLoading: isLoadingTeaching } = useTeachingClassrooms();
  const { data: learning, isLoading: isLoadingLearning } = useLearningClassrooms();

  const breadcrumbs = [
    { title: t("classroom.nav.title", { defaultValue: "Classrooms" }), href: "/classrooms" },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="h4 text-neutral-950">
            {t("classroom.nav.title", { defaultValue: "Classrooms" })}
          </h1>
          <div className="flex gap-2">
            {canManageAllClassrooms && (
              <Button variant="outline" asChild>
                <Link to="/admin/classrooms">
                  {t("classroom.list.adminLink", { defaultValue: "All classrooms (admin)" })}
                </Link>
              </Button>
            )}
            {canCreate && <CreateClassroomDialog />}
          </div>
        </div>

        {!canCreate && <BecomeTeacherBanner />}

        <PendingInvites />

        {!isLoadingTeaching && teaching && teaching.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="h6 text-neutral-800">
              {t("classroom.list.teachingHeading", { defaultValue: "Classes you teach" })}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teaching.map((classroom) => (
                <ClassroomCard key={classroom.id} classroom={classroom} />
              ))}
            </div>
          </section>
        )}

        {!isLoadingLearning && learning && learning.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="h6 text-neutral-800">
              {t("classroom.list.learningHeading", { defaultValue: "Classes you're in" })}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {learning.map((classroom) => (
                <ClassroomCard key={classroom.id} classroom={classroom} />
              ))}
            </div>
          </section>
        )}

        {!isLoadingTeaching &&
          !isLoadingLearning &&
          (teaching?.length ?? 0) === 0 &&
          (learning?.length ?? 0) === 0 && (
            <p className="body-base text-neutral-600">
              {t("classroom.list.empty", { defaultValue: "No classrooms yet." })}
            </p>
          )}
      </div>
    </PageWrapper>
  );
}
