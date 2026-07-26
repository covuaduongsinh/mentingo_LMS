import { useTranslation } from "react-i18next";

import { Skeleton } from "~/components/ui/skeleton";

import type { GetCertificateIssuanceRateResponse } from "~/api/generated-api";

type CertificateIssuanceRateCardProps = {
  data: GetCertificateIssuanceRateResponse["data"] | undefined;
  isLoading?: boolean;
};

export const CertificateIssuanceRateCard = ({
  data,
  isLoading = false,
}: CertificateIssuanceRateCardProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg bg-white p-8 drop-shadow-card">
        <Skeleton className="h-6 w-[200px] rounded-lg" />
        <Skeleton className="h-12 w-[100px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg bg-white p-8 text-center drop-shadow-card">
      <h2 className="body-lg-md text-neutral-950">
        {t("adminStatisticsView.other.certificateIssuanceRate")}
      </h2>
      <p className="h2 text-primary-700">{data?.percentage ?? 0}%</p>
      <p className="body-sm-md text-neutral-800">
        {t("adminStatisticsView.other.certificateIssuanceRateDetail", {
          certified: data?.certifiedCount ?? 0,
          completed: data?.completedCount ?? 0,
        })}
      </p>
    </div>
  );
};
