import { Link, useParams } from "@remix-run/react";
import { CHESS_STUDY_CHAPTER_MODES, type ChessStudyChapterMode } from "@repo/shared";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAddChessStudyMember } from "~/api/mutations/useAddChessStudyMember";
import { useCreateChessStudyChapter } from "~/api/mutations/useCreateChessStudyChapter";
import { useDeleteChessStudyChapter } from "~/api/mutations/useDeleteChessStudyChapter";
import { useRemoveChessStudyMember } from "~/api/mutations/useRemoveChessStudyMember";
import { useReorderChessStudyChapters } from "~/api/mutations/useReorderChessStudyChapters";
import { useUpdateChessStudyChapter } from "~/api/mutations/useUpdateChessStudyChapter";
import { useChessStudy } from "~/api/queries/useChessStudy";
import { PageWrapper } from "~/components/PageWrapper";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ChessBoard, MoveTreeView } from "~/modules/Chess/board";
import { unflattenMoveTree } from "~/modules/Chess/board/moveTree";
import { useMoveTree } from "~/modules/Chess/board/useMoveTree";
import { useCurrentUserStore } from "~/modules/common/store/useCurrentUserStore";
import { setPageTitle } from "~/utils/setPageTitle";

import { ChessStudyChapterEditor } from "./ChessStudyChapterEditor";
import { ChessStudyGuidedChapter } from "./ChessStudyGuidedChapter";

import type { MetaFunction } from "@remix-run/react";
import type { GetStudyResponse } from "~/api/generated-api";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.chessStudies");

type ChapterData = GetStudyResponse["data"]["chapters"][number];

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function ChessStudyReadOnlyChapter({ chapter }: { chapter: ChapterData }) {
  const tree = useMemo(() => unflattenMoveTree(chapter.rootFen, chapter.moveNodes), [chapter]);
  const moveTree = useMoveTree(chapter.rootFen, tree);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
      <ChessBoard fen={moveTree.fen} interactive={false} size={400} />
      <div className="w-full rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <MoveTreeView
          tree={moveTree.tree}
          currentPath={moveTree.path}
          onNavigate={moveTree.goToPath}
          onPromote={() => {}}
          onDelete={() => {}}
          onSetGlyph={() => {}}
        />
      </div>
    </div>
  );
}

export default function ChessStudyDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const currentUser = useCurrentUserStore((state) => state.currentUser);
  const { data: study, isLoading } = useChessStudy(id);

  const { mutateAsync: createChapter, isPending: isCreatingChapter } = useCreateChessStudyChapter();
  const { mutateAsync: deleteChapter } = useDeleteChessStudyChapter();
  const { mutateAsync: reorderChapters } = useReorderChessStudyChapters();
  const { mutateAsync: updateChapter } = useUpdateChessStudyChapter();
  const { mutateAsync: addMember, isPending: isAddingMember } = useAddChessStudyMember();
  const { mutateAsync: removeMember } = useRemoveChessStudyMember();

  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>();
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<"read" | "write">("read");

  useEffect(() => {
    if (!selectedChapterId && study && study.chapters.length > 0) {
      setSelectedChapterId(study.chapters[0].id);
    }
  }, [study, selectedChapterId]);

  const breadcrumbs = [
    { title: t("chess.nav.studies", { defaultValue: "Studies" }), href: "/chess/studies" },
    { title: study?.title ?? "…", href: id ? `/chess/studies/${id}` : "/chess/studies" },
  ];

  if (isLoading) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p>{t("common.loading", { defaultValue: "Loading…" })}</p>
      </PageWrapper>
    );
  }

  if (!study || !id) {
    return (
      <PageWrapper breadcrumbs={breadcrumbs}>
        <p className="text-neutral-600">
          {t("chess.study.notFound", { defaultValue: "Study not found." })}
        </p>
      </PageWrapper>
    );
  }

  const isOwner = study.authorId === currentUser?.id;
  const chapters = [...study.chapters].sort((a, b) => a.displayOrder - b.displayOrder);
  const selectedChapter =
    chapters.find((chapter) => chapter.id === selectedChapterId) ?? chapters[0];

  const handleAddChapter = async () => {
    const chapter = await createChapter({
      studyId: id,
      data: {
        title: t("chess.study.newChapter", { defaultValue: "New chapter" }),
        rootFen: START_FEN,
      },
    });
    setSelectedChapterId(chapter.id);
  };

  const handleMoveChapter = async (chapterId: string, direction: -1 | 1) => {
    const index = chapters.findIndex((chapter) => chapter.id === chapterId);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;
    const reordered = [...chapters];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    await reorderChapters({ studyId: id, chapterIds: reordered.map((chapter) => chapter.id) });
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (
      !window.confirm(
        t("chess.study.confirmDeleteChapter", { defaultValue: "Delete this chapter?" }),
      )
    )
      return;
    await deleteChapter({ studyId: id, chapterId });
    if (selectedChapterId === chapterId) setSelectedChapterId(undefined);
  };

  const handleModeChange = async (chapterId: string, mode: ChessStudyChapterMode) => {
    await updateChapter({ studyId: id, chapterId, data: { mode } });
  };

  const handleAddMember = async () => {
    if (!memberUserId.trim()) return;
    await addMember({ studyId: id, data: { userId: memberUserId.trim(), role: memberRole } });
    setMemberUserId("");
  };

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="h4 text-neutral-950">{study.title}</h1>
            {study.description ? (
              <p className="body-base text-neutral-600">{study.description}</p>
            ) : null}
          </div>
          <Button asChild variant="outline">
            <Link to="/chess/studies">
              {t("chess.study.backToList", { defaultValue: "All studies" })}
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="h6">{t("chess.study.chapters", { defaultValue: "Chapters" })}</h2>
              {study.canWrite ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isCreatingChapter}
                  onClick={() => void handleAddChapter()}
                >
                  <Plus className="size-4" />
                </Button>
              ) : null}
            </div>
            <div className="space-y-1">
              {chapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  className={`flex items-center gap-1 rounded-md border p-2 ${
                    chapter.id === selectedChapter?.id
                      ? "border-primary-300 bg-primary-50"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 truncate text-left text-sm"
                    onClick={() => setSelectedChapterId(chapter.id)}
                  >
                    {chapter.title}
                    {chapter.mode !== CHESS_STUDY_CHAPTER_MODES.NORMAL ? (
                      <Badge variant="secondary" className="ml-1 text-[10px]">
                        {chapter.mode}
                      </Badge>
                    ) : null}
                  </button>
                  {study.canWrite ? (
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => void handleMoveChapter(chapter.id, -1)}
                        className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === chapters.length - 1}
                        onClick={() => void handleMoveChapter(chapter.id, 1)}
                        className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteChapter(chapter.id)}
                        className="text-neutral-400 hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {chapters.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  {t("chess.study.noChapters", { defaultValue: "No chapters yet." })}
                </p>
              ) : null}
            </div>

            {isOwner ? (
              <div className="space-y-2 rounded-md border border-neutral-200 bg-white p-3">
                <h3 className="text-sm font-semibold">
                  {t("chess.study.members", { defaultValue: "Members" })}
                </h3>
                {study.members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between text-xs">
                    <span>
                      {member.firstName ?? member.userId} {member.lastName ?? ""} ({member.role})
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeMember({ studyId: id, userId: member.userId })}
                      className="text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-1">
                  <Input
                    className="h-8 text-xs"
                    placeholder={t("chess.study.memberUserId", { defaultValue: "User id" })}
                    value={memberUserId}
                    onChange={(e) => setMemberUserId(e.target.value)}
                  />
                  <Select
                    value={memberRole}
                    onValueChange={(value) => setMemberRole(value as "read" | "write")}
                  >
                    <SelectTrigger className="h-8 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">
                        {t("chess.study.roleRead", { defaultValue: "Read" })}
                      </SelectItem>
                      <SelectItem value="write">
                        {t("chess.study.roleWrite", { defaultValue: "Write" })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={isAddingMember}
                    onClick={() => void handleAddMember()}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div>
            {!selectedChapter ? (
              <p className="text-neutral-600">
                {t("chess.study.selectChapter", {
                  defaultValue: "Select or add a chapter to begin.",
                })}
              </p>
            ) : study.canWrite ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-200 bg-white p-3">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {t("chess.study.mode", { defaultValue: "Mode" })}
                    </Label>
                    <Select
                      value={selectedChapter.mode}
                      onValueChange={(value) =>
                        void handleModeChange(selectedChapter.id, value as ChessStudyChapterMode)
                      }
                    >
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CHESS_STUDY_CHAPTER_MODES.NORMAL}>
                          {t("chess.study.modeNormal", { defaultValue: "Normal" })}
                        </SelectItem>
                        <SelectItem value={CHESS_STUDY_CHAPTER_MODES.GAMEBOOK}>
                          {t("chess.study.modeGamebook", { defaultValue: "Gamebook" })}
                        </SelectItem>
                        <SelectItem value={CHESS_STUDY_CHAPTER_MODES.CONCEAL}>
                          {t("chess.study.modeConceal", { defaultValue: "Conceal" })}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ChessStudyChapterEditor
                  key={selectedChapter.id}
                  studyId={id}
                  chapter={selectedChapter}
                />
              </div>
            ) : selectedChapter.mode === CHESS_STUDY_CHAPTER_MODES.NORMAL ? (
              <ChessStudyReadOnlyChapter key={selectedChapter.id} chapter={selectedChapter} />
            ) : (
              <ChessStudyGuidedChapter
                key={selectedChapter.id}
                tree={unflattenMoveTree(selectedChapter.rootFen, selectedChapter.moveNodes)}
                concealFromPly={
                  selectedChapter.mode === CHESS_STUDY_CHAPTER_MODES.CONCEAL
                    ? (selectedChapter.concealFromPly ?? 0)
                    : 0
                }
              />
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
