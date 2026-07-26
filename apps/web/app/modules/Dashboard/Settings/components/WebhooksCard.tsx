import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateWebhookEndpoint } from "~/api/mutations/admin/useCreateWebhookEndpoint";
import { useDeleteWebhookEndpoint } from "~/api/mutations/admin/useDeleteWebhookEndpoint";
import { usePingWebhookEndpoint } from "~/api/mutations/admin/usePingWebhookEndpoint";
import { useRotateWebhookSecret } from "~/api/mutations/admin/useRotateWebhookSecret";
import { useUpdateWebhookEndpoint } from "~/api/mutations/admin/useUpdateWebhookEndpoint";
import { useWebhookEndpoints } from "~/api/queries/admin/useWebhookEndpoints";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useToast } from "~/components/ui/use-toast";
import { copyToClipboard } from "~/utils/copyToClipboard";

import { WebhookDeliveriesDialog } from "./WebhookDeliveriesDialog";
import { WebhookEndpointFormDialog } from "./WebhookEndpointFormDialog";

import type { WebhookEndpoint } from "~/api/queries/admin/useWebhookEndpoints";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export function WebhooksCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: endpoints, isLoading } = useWebhookEndpoints();
  const { mutateAsync: createEndpoint, isPending: isCreating } = useCreateWebhookEndpoint();
  const { mutateAsync: updateEndpoint } = useUpdateWebhookEndpoint();
  const { mutateAsync: deleteEndpoint, isPending: isDeleting } = useDeleteWebhookEndpoint();
  const { mutateAsync: rotateSecret, isPending: isRotating } = useRotateWebhookSecret();
  const { mutateAsync: pingEndpoint, isPending: isPinging } = usePingWebhookEndpoint();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [deliveriesEndpointId, setDeliveriesEndpointId] = useState<string | null>(null);

  const handleCreate = async (body: { url: string; events: string[] }) => {
    const result = await createEndpoint(body as Parameters<typeof createEndpoint>[0]);
    setRevealedSecret(result.secret);
    setIsFormOpen(false);
  };

  const handleToggleActive = async (endpoint: WebhookEndpoint) => {
    await updateEndpoint({ id: endpoint.id, body: { active: !endpoint.active } });
  };

  const handleRotate = async (id: string) => {
    const result = await rotateSecret(id);
    setRevealedSecret(result.secret);
  };

  const handleDelete = async (id: string) => {
    setRevealedSecret(null);
    await deleteEndpoint(id);
  };

  const handlePing = async (id: string) => {
    const result = await pingEndpoint(id);
    toast({
      description: result.success
        ? t("webhooks.toast.pingSuccess", { statusCode: result.statusCode })
        : t("webhooks.toast.pingFailure", { error: result.errorMessage }),
      variant: result.success ? "default" : "destructive",
    });
  };

  return (
    <Card id="webhooks">
      <CardHeader>
        <CardTitle className="h5">{t("webhooks.title")}</CardTitle>
        <CardDescription className="body-lg-md">{t("webhooks.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {revealedSecret && (
          <div className="space-y-3 rounded-lg border border-primary-200 bg-primary-50 p-4">
            <p className="text-sm font-medium">{t("webhooks.generated.title")}</p>
            <p className="break-all text-xs md:text-sm">{revealedSecret}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                copyToClipboard(
                  revealedSecret,
                  t("webhooks.toast.copySuccess"),
                  t("webhooks.toast.copyError"),
                )
              }
            >
              {t("webhooks.copy")}
            </Button>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">{t("webhooks.loading")}</p>}

        {!isLoading && !endpoints?.length && (
          <p className="text-sm text-muted-foreground">{t("webhooks.empty")}</p>
        )}

        {!!endpoints?.length && (
          <div className="space-y-3">
            {endpoints.map((endpoint) => (
              <div key={endpoint.id} className="rounded-lg border border-neutral-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{endpoint.url}</p>
                    <p className="mt-1 flex flex-wrap gap-1">
                      {endpoint.eventsSubscribed.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </p>
                  </div>
                  <Badge variant={endpoint.active ? "default" : "outline"}>
                    {endpoint.active ? t("webhooks.active") : t("webhooks.inactive")}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {t("webhooks.createdAt")}: {formatDate(endpoint.createdAt)}
                  </span>
                  <span>
                    {t("webhooks.successRate")}:{" "}
                    {endpoint.successRate === null ? "-" : `${endpoint.successRate}%`}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPinging}
                    onClick={() => void handlePing(endpoint.id)}
                  >
                    {t("webhooks.ping")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeliveriesEndpointId(endpoint.id)}
                  >
                    {t("webhooks.viewDeliveries")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleToggleActive(endpoint)}
                  >
                    {endpoint.active ? t("webhooks.deactivate") : t("webhooks.activate")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRotating}
                    onClick={() => void handleRotate(endpoint.id)}
                  >
                    {t("webhooks.rotateSecret")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => void handleDelete(endpoint.id)}
                  >
                    {t("webhooks.delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t py-4">
        <Button onClick={() => setIsFormOpen(true)}>{t("webhooks.newEndpoint")}</Button>
      </CardFooter>

      <WebhookEndpointFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
      />

      <WebhookDeliveriesDialog
        endpointId={deliveriesEndpointId}
        onOpenChange={(open) => !open && setDeliveriesEndpointId(null)}
      />
    </Card>
  );
}
