import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "~/components/ui/use-toast";

export function useDownloadAdvancedAnalyticsReport() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadReport = async () => {
    setIsDownloading(true);

    try {
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const response = await fetch(`${baseUrl}/api/analytics/org/export`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to download report");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const linkElement = document.createElement("a");
      linkElement.href = url;

      const today = new Date().toISOString().split("T")[0];
      linkElement.download = `advanced-analytics-${today}.xlsx`;

      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);
      URL.revokeObjectURL(url);

      toast({ description: t("adminStatisticsView.toast.reportDownloadSuccess") });
    } catch (error) {
      toast({
        description: t("adminStatisticsView.toast.reportDownloadError"),
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return { downloadReport, isDownloading };
}
