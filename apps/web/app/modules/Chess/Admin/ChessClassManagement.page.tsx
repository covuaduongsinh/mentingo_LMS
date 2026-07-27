import { Link, useParams } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useBulkCreateChessClassStudents } from "~/api/mutations/useBulkCreateChessClassStudents";
import { useGenerateChessClassLoginCodes } from "~/api/mutations/useGenerateChessClassLoginCodes";
import { useReleaseChessClassStudentAccount } from "~/api/mutations/useReleaseChessClassStudentAccount";
import { useResetChessClassStudentPassword } from "~/api/mutations/useResetChessClassStudentPassword";
import { useChessClassProgress } from "~/api/queries/useChessClassProgress";
import { useClassroomIdForSourceGroup } from "~/api/queries/useClassroomIdForSourceGroup";
import { PageWrapper } from "~/components/PageWrapper";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { useToast } from "~/components/ui/use-toast";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) =>
  setPageTitle(matches, "pages.chessClassManagement");

function ReleaseAccountDialog({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const { mutateAsync: releaseAccount, isPending } = useReleaseChessClassStudentAccount();

  const handleRelease = () => {
    releaseAccount({ userId, email }).then(() => {
      toast({ description: t("chessClass.toast.released", { defaultValue: "Account released" }) });
      setOpen(false);
      setEmail("");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {t("chessClass.button.release", { defaultValue: "Release" })}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("chessClass.releaseDialog.title", { defaultValue: "Release student account" })}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="release-email">
            {t("chessClass.releaseDialog.emailLabel", { defaultValue: "Student's real email" })}
          </Label>
          <Input
            id="release-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" disabled={!email || isPending} onClick={handleRelease}>
            {t("chessClass.button.confirmRelease", { defaultValue: "Confirm release" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ChessClassManagementPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { t } = useTranslation();
  const { toast } = useToast();

  if (!groupId)
    throw new Error(t("chessClass.errors.groupNotFound", { defaultValue: "Group not found" }));

  const { data: linkedClassroomId } = useClassroomIdForSourceGroup(groupId);

  const [namesText, setNamesText] = useState("");
  const [createdStudents, setCreatedStudents] = useState<
    Array<{ userId: string; username: string; temporaryPassword: string; realName: string }>
  >([]);
  const [loginCodes, setLoginCodes] = useState<
    Array<{ userId: string; username: string | null; displayName: string; code: string }>
  >([]);
  const [loginCodesExpiresAt, setLoginCodesExpiresAt] = useState<string | null>(null);

  const { data: progress, isLoading: isProgressLoading } = useChessClassProgress(groupId, 30);
  const { mutateAsync: bulkCreate, isPending: isBulkCreating } =
    useBulkCreateChessClassStudents(groupId);
  const { mutateAsync: generateLoginCodes, isPending: isGeneratingCodes } =
    useGenerateChessClassLoginCodes(groupId);
  const { mutateAsync: resetPassword } = useResetChessClassStudentPassword();

  const handleBulkCreate = () => {
    const names = namesText
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);

    if (!names.length) return;

    bulkCreate({ names }).then((data) => {
      setCreatedStudents(data.students);
      setNamesText("");
      toast({
        description: t("chessClass.toast.bulkCreateSuccess", {
          defaultValue: "{{count}} student accounts created",
          count: data.students.length,
        }),
      });
    });
  };

  const handleGenerateLoginCodes = () => {
    generateLoginCodes().then((data) => {
      setLoginCodes(data.codes);
      setLoginCodesExpiresAt(data.expiresAt);
    });
  };

  const handleResetPassword = (userId: string) => {
    resetPassword(userId).then((data) => {
      toast({
        description: t("chessClass.toast.newPassword", {
          defaultValue: "New password: {{password}}",
          password: data.temporaryPassword,
        }),
      });
    });
  };

  const breadcrumbs = [
    { title: t("chessClass.nav.title", { defaultValue: "Chess class" }), href: "/admin/groups" },
  ];

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {linkedClassroomId && (
          <Alert>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {t("chessClass.deprecatedBanner.text", {
                  defaultValue: "This page is being replaced by the new Classroom module.",
                })}
              </span>
              <Button asChild variant="outline" size="sm">
                <Link to={`/classrooms/${linkedClassroomId}`}>
                  {t("chessClass.deprecatedBanner.link", {
                    defaultValue: "View corresponding classroom",
                  })}
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {t("chessClass.bulkCreate.title", { defaultValue: "Add students in bulk" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={t("chessClass.bulkCreate.placeholder", {
                defaultValue: "One student name per line",
              })}
              rows={6}
              value={namesText}
              onChange={(event) => setNamesText(event.target.value)}
            />
            <Button
              type="button"
              disabled={isBulkCreating || !namesText.trim()}
              onClick={handleBulkCreate}
            >
              {isBulkCreating
                ? t("common.button.saving", { defaultValue: "Saving…" })
                : t("chessClass.bulkCreate.submit", { defaultValue: "Create accounts" })}
            </Button>

            {createdStudents.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
                <p className="body-sm-md mb-2">
                  {t("chessClass.bulkCreate.showOnceWarning", {
                    defaultValue: "Save these credentials now — they won't be shown again.",
                  })}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("chessClass.table.realName", { defaultValue: "Name" })}
                      </TableHead>
                      <TableHead>
                        {t("chessClass.table.username", { defaultValue: "Username" })}
                      </TableHead>
                      <TableHead>
                        {t("chessClass.table.password", { defaultValue: "Password" })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {createdStudents.map((student) => (
                      <TableRow key={student.userId}>
                        <TableCell>{student.realName}</TableCell>
                        <TableCell className="font-mono">{student.username}</TableCell>
                        <TableCell className="font-mono">{student.temporaryPassword}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("chessClass.loginCodes.title", { defaultValue: "Class login codes" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button type="button" disabled={isGeneratingCodes} onClick={handleGenerateLoginCodes}>
              {t("chessClass.loginCodes.generate", { defaultValue: "Generate new codes" })}
            </Button>

            {loginCodes.length > 0 && (
              <div className="space-y-2">
                {loginCodesExpiresAt && (
                  <p className="body-sm text-neutral-500">
                    {t("chessClass.loginCodes.expiresAt", {
                      defaultValue: "Expires at {{time}}",
                      time: new Date(loginCodesExpiresAt).toLocaleTimeString(),
                    })}
                  </p>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("chessClass.table.displayName", { defaultValue: "Display name" })}
                      </TableHead>
                      <TableHead>{t("chessClass.table.code", { defaultValue: "Code" })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginCodes.map((code) => (
                      <TableRow key={code.userId}>
                        <TableCell>{code.displayName}</TableCell>
                        <TableCell className="font-mono text-lg tracking-widest">
                          {code.code}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("chessClass.progress.title", { defaultValue: "Class progress (last 30 days)" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isProgressLoading ? (
              <p className="body-base text-neutral-600">
                {t("common.loading", { defaultValue: "Loading…" })}
              </p>
            ) : progress ? (
              <>
                <div className="flex gap-4">
                  <Badge variant="outline">
                    {t("chessClass.progress.classWinRate", {
                      defaultValue: "Class win rate: {{rate}}%",
                      rate: Math.round(progress.classAverage.winRate * 100),
                    })}
                  </Badge>
                  <Badge variant="outline">
                    {t("chessClass.progress.classPuzzleAccuracy", {
                      defaultValue: "Class puzzle accuracy: {{rate}}%",
                      rate: Math.round(progress.classAverage.puzzleAccuracy * 100),
                    })}
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("chessClass.table.displayName", { defaultValue: "Display name" })}
                      </TableHead>
                      <TableHead>
                        {t("chessClass.table.matches", { defaultValue: "Matches" })}
                      </TableHead>
                      <TableHead>
                        {t("chessClass.table.winRate", { defaultValue: "Win rate" })}
                      </TableHead>
                      <TableHead>
                        {t("chessClass.table.puzzles", { defaultValue: "Puzzles" })}
                      </TableHead>
                      <TableHead>
                        {t("chessClass.table.actions", { defaultValue: "Actions" })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {progress.students.map((student) => (
                      <TableRow key={student.userId}>
                        <TableCell>{student.displayName}</TableCell>
                        <TableCell>
                          {student.matchesWon}/{student.matchesPlayed}
                        </TableCell>
                        <TableCell>{Math.round(student.winRate * 100)}%</TableCell>
                        <TableCell>
                          {student.puzzlesCorrect}/{student.puzzlesAttempted}
                        </TableCell>
                        <TableCell>
                          {student.isManagedAccount ? (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleResetPassword(student.userId)}
                              >
                                {t("chessClass.button.resetPassword", {
                                  defaultValue: "Reset password",
                                })}
                              </Button>
                              <ReleaseAccountDialog userId={student.userId} />
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
