import { Link } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAdminClassroomList } from "~/api/queries/useAdminClassroomList";
import { PageWrapper } from "~/components/PageWrapper";
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

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.adminClassrooms");

export default function AdminClassroomListPage() {
  const { t } = useTranslation();
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: classrooms, isLoading } = useAdminClassroomList(includeArchived);

  return (
    <PageWrapper
      breadcrumbs={[
        {
          title: t("adminClassrooms.title", { defaultValue: "Classrooms" }),
          href: "/admin/classrooms",
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="h4 text-neutral-950">
            {t("adminClassrooms.heading", { defaultValue: "All classrooms" })}
          </h1>
          <div className="flex items-center gap-2">
            <Switch
              id="admin-classrooms-include-archived"
              checked={includeArchived}
              onCheckedChange={setIncludeArchived}
            />
            <label htmlFor="admin-classrooms-include-archived" className="body-sm cursor-pointer">
              {t("adminClassrooms.includeArchived", { defaultValue: "Include archived" })}
            </label>
          </div>
        </div>

        <Table className="border bg-neutral-50">
          <TableHeader>
            <TableRow>
              <TableHead>{t("adminClassrooms.columns.name", { defaultValue: "Name" })}</TableHead>
              <TableHead>
                {t("adminClassrooms.columns.teachers", { defaultValue: "Teachers" })}
              </TableHead>
              <TableHead>
                {t("adminClassrooms.columns.students", { defaultValue: "Active students" })}
              </TableHead>
              <TableHead>
                {t("adminClassrooms.columns.status", { defaultValue: "Status" })}
              </TableHead>
              <TableHead>
                {t("adminClassrooms.columns.lastViewed", { defaultValue: "Last viewed" })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && classrooms?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="body-sm text-center text-neutral-500">
                  {t("adminClassrooms.empty", { defaultValue: "No classrooms found" })}
                </TableCell>
              </TableRow>
            )}
            {classrooms?.map((classroom) => (
              <TableRow key={classroom.id}>
                <TableCell>
                  <Link to={`/classrooms/${classroom.id}`} className="text-primary-700 underline">
                    {classroom.name}
                  </Link>
                </TableCell>
                <TableCell>{classroom.teacherCount}</TableCell>
                <TableCell>{classroom.activeStudentCount}</TableCell>
                <TableCell>
                  {classroom.archivedAt
                    ? t("adminClassrooms.status.archived", { defaultValue: "Archived" })
                    : t("adminClassrooms.status.active", { defaultValue: "Active" })}
                </TableCell>
                <TableCell>{new Date(classroom.viewedAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
}
