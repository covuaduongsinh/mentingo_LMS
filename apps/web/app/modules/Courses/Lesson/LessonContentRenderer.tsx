import { memo } from "react";
import { match } from "ts-pattern";

import Viewer from "~/components/RichText/Viever";
import { RICH_TEXT_VIEWER_VARIANT } from "~/components/RichText/viewerTypes";

import AiMentorLesson from "./AiMentorLesson/AiMentorLesson";
import { AssignmentLesson } from "./AssignmentLesson/AssignmentLesson";
import { ChessStudyLesson } from "./ChessStudyLesson/ChessStudyLesson";
import { EmbedLesson } from "./EmbedLesson/EmbedLesson";
import { LiveTrainingLesson } from "./LiveTrainingLesson/LiveTrainingLesson";
import { Quiz } from "./Quiz";
import { ScormLesson } from "./ScormLesson/ScormLesson";

import type { SupportedLanguages } from "@repo/shared";
import type { CurrentUserResponse, GetLessonByIdResponse } from "~/api/generated-api";
import type { VideoCoverageSnapshotChange } from "~/components/VideoPlayer/videoCoverage.types";
import type { LessonPreviewUser } from "~/modules/Courses/Lesson/types";

type LessonContentRendererProps = {
  lesson: GetLessonByIdResponse["data"];
  user: CurrentUserResponse["data"] | undefined;
  previewUser?: LessonPreviewUser;
  hideControls?: boolean;
  lessonLoading: boolean;
  onVideoEnded?: (index: number | null) => void;
  videoCoverageTracking?: {
    enabled: boolean;
    showCoverageMarkers?: boolean;
    lessonId: string;
    language: SupportedLanguages;
    onSnapshotChange?: (change: VideoCoverageSnapshotChange) => void;
  };
};

export const LessonContentRenderer = memo(
  ({
    lesson,
    user,
    previewUser,
    hideControls = false,
    lessonLoading,
    onVideoEnded,
    videoCoverageTracking,
  }: LessonContentRendererProps) => {
    // Cast: generated-api may lag behind LESSON_TYPES until swagger refresh (S4 chess_study).
    return match(lesson.type as string)
      .with("content", () => (
        <Viewer
          variant={RICH_TEXT_VIEWER_VARIANT.CONTENT}
          content={lesson?.description ?? ""}
          onVideoEnded={onVideoEnded}
          videoCoverageTracking={videoCoverageTracking}
        />
      ))
      .with("quiz", () => <Quiz lesson={lesson} userId={user?.id || ""} />)
      .with("ai_mentor", () => (
        <AiMentorLesson
          lesson={lesson}
          lessonLoading={lessonLoading}
          previewUser={previewUser}
          hideControls={hideControls}
        />
      ))
      .with("embed", () => (
        <EmbedLesson lessonResources={lesson.lessonResources ?? []} lesson={lesson} />
      ))
      .with("scorm", () => <ScormLesson lessonId={lesson.id} />)
      .with("live_training", () => <LiveTrainingLesson lesson={lesson} />)
      .with("assignment", () => <AssignmentLesson lessonId={lesson.id} lesson={lesson} />)
      .with("chess_study", () => <ChessStudyLesson lessonId={lesson.id} />)
      .otherwise(() => null);
  },
);

LessonContentRenderer.displayName = "LessonContentRenderer";
