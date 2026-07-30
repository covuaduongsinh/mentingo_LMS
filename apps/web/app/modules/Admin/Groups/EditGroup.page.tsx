import { Link, useParams } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useGroupById } from "~/api/queries/admin/useGroupById";
import { useClassroomIdForSourceGroup } from "~/api/queries/useClassroomIdForSourceGroup";
import { getLocalizedResourceLanguage } from "~/components/LanguageSelector/utils";
import { PageWrapper } from "~/components/PageWrapper";
import { Button } from "~/components/ui/button";
import { EditGroupForm } from "~/modules/Admin/Groups/components/EditGroupForm";
import { GroupLanguageSelector } from "~/modules/Admin/Groups/components/GroupLanguageSelector";
import Loader from "~/modules/common/Loader/Loader";
import { useLanguageStore } from "~/modules/Dashboard/Settings/Language/LanguageStore";
import { setPageTitle } from "~/utils/setPageTitle";

import { GROUP_PAGE_HANDLES } from "../../../../e2e/data/groups/handles";

import type { MetaFunction } from "@remix-run/react";
import type { ReactElement } from "react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.editGroup");

const EditGroup = (): ReactElement => {
  const { id: groupId } = useParams();

  const { t } = useTranslation();

  const appLanguage = useLanguageStore((state) => state.language);
  const [selectedGroupLanguage, setSelectedGroupLanguage] = useState(appLanguage);

  const { data, isLoading } = useGroupById(groupId ?? "", selectedGroupLanguage);
  const { data: linkedClassroomId } = useClassroomIdForSourceGroup(groupId ?? "", {
    enabled: !!groupId,
  });

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );

  if (!data) throw new Error(t("adminGroupsView.updateGroup.groupNotFound"));

  const { effectiveLanguage, formKey, selectorProps } = getLocalizedResourceLanguage({
    value: selectedGroupLanguage,
    onChange: setSelectedGroupLanguage,
    baseLanguage: data.baseLanguage,
    availableLocales: data.availableLocales,
    formKeyParts: [data.id, data.name, data.characteristic ?? ""],
  });

  return (
    <PageWrapper
      className="flex h-full flex-col"
      breadcrumbs={[
        {
          title: t("adminGroupsView.breadcrumbs.groups"),
          href: "/admin/groups",
        },
        {
          title: t("adminGroupsView.updateGroup.header"),
          href: "/admin/groups/new",
        },
      ]}
    >
      <div data-testid={GROUP_PAGE_HANDLES.PAGE} className="flex h-full flex-col gap-4">
        {linkedClassroomId && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="w-fit" asChild>
              <Link to={`/classrooms/${linkedClassroomId}`}>
                {t("classroom.nav.viewClassroom", { defaultValue: "View corresponding classroom" })}
              </Link>
            </Button>
          </div>
        )}
        <EditGroupForm
          key={formKey}
          formKey={formKey}
          group={data}
          groupId={groupId ?? ""}
          language={effectiveLanguage}
          languageSelector={<GroupLanguageSelector group={data} {...selectorProps} />}
        />
      </div>
    </PageWrapper>
  );
};

export default EditGroup;
