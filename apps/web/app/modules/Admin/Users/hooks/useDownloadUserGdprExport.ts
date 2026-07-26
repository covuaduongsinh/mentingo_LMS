import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "~/components/ui/use-toast";

export function useDownloadUserGdprExport() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadExport = async (userId: string) => {
    setIsDownloading(true);

    try {
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const response = await fetch(`${baseUrl}/api/user/gdpr-export?id=${userId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to download GDPR export");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const linkElement = document.createElement("a");
      linkElement.href = url;

      const today = new Date().toISOString().split("T")[0];
      linkElement.download = `user-${userId}-gdpr-export-${today}.json`;

      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);
      URL.revokeObjectURL(url);

      toast({ description: t("adminUserView.gdpr.toast.exportSuccess") });
    } catch {
      toast({
        description: t("adminUserView.gdpr.toast.exportError"),
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return { downloadExport, isDownloading };
}
