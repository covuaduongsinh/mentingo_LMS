import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@remix-run/react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useClassLogin } from "~/api/mutations/useClassLogin";
import { useGlobalSettingsSuspense } from "~/api/queries/useGlobalSettings";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessClassLogin");

const classLoginSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .length(5, { message: t("chessClassLoginView.validation.code") })
      .transform((value) => value.toUpperCase()),
  });

type ClassLoginFormValues = { code: string };

export default function ChessClassLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    data: { loginBackgroundImageS3Key },
  } = useGlobalSettingsSuspense();

  const { mutateAsync: classLogin, isPending } = useClassLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassLoginFormValues>({ resolver: zodResolver(classLoginSchema(t)) });

  const onSubmit = (data: ClassLoginFormValues) =>
    classLogin({ code: data.code }).then(() => navigate("/"));

  return (
    <>
      {loginBackgroundImageS3Key && (
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `url(${loginBackgroundImageS3Key}) `,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle className="mt-6 text-center text-3xl font-bold tracking-tight">
              {t("chessClassLoginView.header")}
            </CardTitle>
            <CardDescription className="mt-2 text-center text-sm text-muted-foreground w-4/5 mx-auto pt-2">
              {t("chessClassLoginView.subHeader")}
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-1">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-2">
                <Label htmlFor="code">{t("chessClassLoginView.field.code")}</Label>
                <Input
                  id="code"
                  data-testid="class-login-code-input"
                  autoComplete="off"
                  autoCapitalize="characters"
                  maxLength={5}
                  placeholder="A1B2C"
                  className={cn("text-center text-2xl tracking-[0.5em]", {
                    "border-red-500": errors.code,
                  })}
                  {...register("code")}
                />
                {errors.code && <div className="text-sm text-red-500">{errors.code.message}</div>}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
                data-testid="class-login-submit-button"
              >
                {isPending ? t("common.button.saving") : t("chessClassLoginView.button.login")}
              </Button>
            </form>
            <div className="mt-8 flex justify-center">
              <Link to="/auth/login" className="text-sm font-medium text-muted-foreground">
                {t("chessClassLoginView.button.backToLogin")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
