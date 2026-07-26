import { useTranslation } from "react-i18next";

import { useWebhookDeliveries } from "~/api/queries/admin/useWebhookDeliveries";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

type WebhookDeliveriesDialogProps = {
  endpointId: string | null;
  onOpenChange: (open: boolean) => void;
};

export function WebhookDeliveriesDialog({
  endpointId,
  onOpenChange,
}: WebhookDeliveriesDialogProps) {
  const { t } = useTranslation();
  const { data: deliveries, isLoading } = useWebhookDeliveries(
    endpointId ?? "",
    Boolean(endpointId),
  );

  return (
    <Dialog open={Boolean(endpointId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("webhooks.deliveries.title")}</DialogTitle>
          <DialogDescription>{t("webhooks.deliveries.description")}</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <p className="text-sm text-muted-foreground">{t("webhooks.deliveries.loading")}</p>
        )}

        {!isLoading && !deliveries?.length && (
          <p className="text-sm text-muted-foreground">{t("webhooks.deliveries.empty")}</p>
        )}

        {!!deliveries?.length && (
          <div className="space-y-2">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{delivery.eventType}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(delivery.createdAt)}</p>
                  {delivery.errorMessage && (
                    <p className="text-xs text-destructive">{delivery.errorMessage}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t("webhooks.deliveries.attempt", { count: delivery.attemptCount })}
                  </span>
                  <Badge variant={delivery.success ? "success" : "destructive"}>
                    {delivery.statusCode ?? t("webhooks.deliveries.noResponse")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
