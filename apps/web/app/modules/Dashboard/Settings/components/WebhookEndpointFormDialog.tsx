import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

const WEBHOOK_EVENT_TYPES = [
  "enrollment.created",
  "course.completed",
  "lesson.completed",
  "assignment.submitted",
  "assignment.graded",
  "certificate.issued",
] as const;

type WebhookEndpointFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: { url: string; events: string[] }) => Promise<void>;
  isSubmitting: boolean;
};

export function WebhookEndpointFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: WebhookEndpointFormDialogProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);

  const resetForm = () => {
    setUrl("");
    setEvents([]);
  };

  const toggleEvent = (event: string) => {
    setEvents((current) =>
      current.includes(event) ? current.filter((item) => item !== event) : [...current, event],
    );
  };

  const handleSubmit = async () => {
    if (!url.trim() || !events.length) return;
    await onSubmit({ url: url.trim(), events });
    resetForm();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("webhooks.form.title")}</DialogTitle>
          <DialogDescription>{t("webhooks.form.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="webhook-url">{t("webhooks.form.urlLabel")}</Label>
            <Input
              id="webhook-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/webhooks/mentingo"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("webhooks.form.eventsLabel")}</Label>
            <div className="space-y-2">
              {WEBHOOK_EVENT_TYPES.map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={events.includes(event)}
                    onCheckedChange={() => toggleEvent(event)}
                  />
                  {event}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.button.cancel")}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!url.trim() || !events.length || isSubmitting}
          >
            {t("webhooks.form.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
