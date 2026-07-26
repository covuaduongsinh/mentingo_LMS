import { isAdminSettings } from "~/utils/isAdminSettings";

import ChangePasswordForm from "../forms/ChangePasswordForm";
import UserDetailsForm from "../forms/UserDetailsForm";

import { IntegrationApiKeyCard } from "./IntegrationApiKeyCard";
import LanguageSelect from "./LanguageSelect";
import NotificationPreferences from "./NotificationPreferences";
import { PublicProfileSettingsCard } from "./PublicProfileSettingsCard";
import { ResetOnboarding } from "./ResetOnboarding";
import { WebhooksCard } from "./WebhooksCard";

import type { AdminSettings, UserSettings } from "../types";

interface AccountTabContentProps {
  canManageCourses: boolean;
  canManageUsers: boolean;
  canAccessIntegrationApi: boolean;
  canResetOnboarding: boolean;
  settings: AdminSettings | UserSettings;
}

export default function AccountTabContent({
  canManageCourses,
  canManageUsers,
  canAccessIntegrationApi,
  canResetOnboarding,
  settings,
}: AccountTabContentProps) {
  return (
    <>
      <LanguageSelect />
      {(canManageCourses || canManageUsers) && <UserDetailsForm />}
      <ChangePasswordForm />
      <PublicProfileSettingsCard />
      {isAdminSettings(settings) && <NotificationPreferences adminSettings={settings} />}
      {canAccessIntegrationApi && <IntegrationApiKeyCard />}
      {canAccessIntegrationApi && <WebhooksCard />}
      {canResetOnboarding && <ResetOnboarding />}
    </>
  );
}
