import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useUpdatePublicProfileSettings } from "~/api/mutations/useUpdatePublicProfileSettings";
import { usePublicProfileSettings } from "~/api/queries/usePublicProfileSettings";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

export function PublicProfileSettingsCard() {
  const { t } = useTranslation();
  const { data: settings } = usePublicProfileSettings();
  const { mutate: updateSettings, isPending } = useUpdatePublicProfileSettings();

  const [username, setUsername] = useState("");
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(false);
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!settings) return;
    setUsername(settings.username ?? "");
    setPublicProfileEnabled(settings.publicProfileEnabled);
    setBio(settings.bio ?? "");
  }, [settings]);

  const handleSave = () => {
    updateSettings({
      username: username.trim() ? username.trim() : null,
      publicProfileEnabled,
      bio: bio.trim() ? bio.trim() : null,
    });
  };

  return (
    <div className="flex flex-col gap-y-4 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="body-lg-md text-neutral-950">{t("publicProfileView.settings.title")}</h2>
      <div className="flex flex-col gap-y-2">
        <Label>{t("publicProfileView.settings.username")}</Label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder={t("publicProfileView.settings.usernamePlaceholder")}
        />
      </div>
      <div className="flex flex-col gap-y-2">
        <Label>{t("publicProfileView.settings.bio")}</Label>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
      </div>
      <div className="flex items-center gap-x-3">
        <Switch checked={publicProfileEnabled} onCheckedChange={setPublicProfileEnabled} />
        <Label>{t("publicProfileView.settings.enablePublicProfile")}</Label>
      </div>
      <Button type="button" className="w-fit" disabled={isPending} onClick={handleSave}>
        {t("common.button.save")}
      </Button>
    </div>
  );
}
