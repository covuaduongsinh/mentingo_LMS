import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CHESS_STUDY_MEMBER_ROLES,
  CHESS_STUDY_VISIBILITY,
  ENTITY_TYPES,
  PERMISSIONS,
} from "@repo/shared";

import { hasPermission } from "src/common/permissions/permission.utils";
import { AdminLessonRepository } from "src/lesson/repositories/adminLesson.repository";
import { AdminLessonService } from "src/lesson/services/adminLesson.service";
import { LocalizationService } from "src/localization/localization.service";
import { ENTITY_TYPE } from "src/localization/localization.types";

import { ChessStudyRepository, type ListChessStudiesParams } from "./chess-study.repository";
import { evaluatePracticeGoal, replayPracticeMoves } from "./utils/practice-goal.utils";
import {
  exportChapterPgn,
  exportStudyPgn,
  parseStudyPgnImport,
  StudyPgnError,
} from "./utils/study-pgn.utils";

import type {
  AddChessStudyMemberBody,
  CreateChessStudyBody,
  CreateChessStudyChapterBody,
  CreateChessStudyLessonBody,
  ImportStudyPgnBody,
  ReorderChessStudyChaptersBody,
  SubmitPracticeAttemptBody,
  UpdateChessStudyBody,
  UpdateChessStudyChapterBody,
  UpdateChessStudyLessonBody,
} from "./schemas/chess-study.schema";
import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

@Injectable()
export class ChessStudyService {
  constructor(
    private readonly repository: ChessStudyRepository,
    private readonly adminLessonRepository: AdminLessonRepository,
    private readonly adminLessonService: AdminLessonService,
    private readonly localizationService: LocalizationService,
  ) {}

  private canManageAny(user: CurrentUserType): boolean {
    return hasPermission(user.permissions, PERMISSIONS.CHESS_STUDY_MANAGE);
  }

  private isOwner(user: CurrentUserType, authorId: string | null): boolean {
    return authorId !== null && user.userId === authorId;
  }

  private async assertCanRead(
    study: { id: string; visibility: string; authorId: string | null },
    user: CurrentUserType,
  ) {
    if (
      study.visibility === CHESS_STUDY_VISIBILITY.PUBLIC ||
      this.isOwner(user, study.authorId) ||
      this.canManageAny(user)
    ) {
      return;
    }
    const role = await this.repository.getMemberRole(study.id, user.userId);
    if (!role) {
      throw new ForbiddenException("chess.study.errors.noAccess");
    }
  }

  private async assertCanWrite(
    study: { id: string; authorId: string | null },
    user: CurrentUserType,
  ) {
    if (this.isOwner(user, study.authorId) || this.canManageAny(user)) {
      return;
    }
    const role = await this.repository.getMemberRole(study.id, user.userId);
    if (role !== CHESS_STUDY_MEMBER_ROLES.WRITE) {
      throw new ForbiddenException("chess.study.errors.noWriteAccess");
    }
  }

  private assertCanManage(study: { authorId: string | null }, user: CurrentUserType) {
    if (!this.isOwner(user, study.authorId) && !this.canManageAny(user)) {
      throw new ForbiddenException("chess.study.errors.noManageAccess");
    }
  }

  private async getStudyOrThrow(id: UUIDType) {
    const study = await this.repository.getStudyById(id);
    if (!study) {
      throw new NotFoundException("chess.study.errors.studyNotFound");
    }
    return study;
  }

  async listStudies(user: CurrentUserType, params: Omit<ListChessStudiesParams, "viewerId">) {
    return this.repository.listStudies({ ...params, viewerId: user.userId });
  }

  async getStudyDetail(id: UUIDType, user: CurrentUserType) {
    const study = await this.getStudyOrThrow(id);
    await this.assertCanRead(study, user);

    const [chapters, members] = await Promise.all([
      this.repository.getChaptersByStudyId(id),
      this.repository.getMembersByStudyId(id),
    ]);

    const canWrite =
      this.isOwner(user, study.authorId) ||
      this.canManageAny(user) ||
      (await this.repository.getMemberRole(id, user.userId)) === CHESS_STUDY_MEMBER_ROLES.WRITE;

    return { ...study, chapters, members, canWrite };
  }

  async createStudy(body: CreateChessStudyBody, user: CurrentUserType) {
    const study = await this.repository.createStudy(body, user.userId);
    return { ...study, canWrite: true };
  }

  async updateStudy(id: UUIDType, body: UpdateChessStudyBody, user: CurrentUserType) {
    const study = await this.getStudyOrThrow(id);
    await this.assertCanWrite(study, user);
    const updated = await this.repository.updateStudy(id, body);
    return { ...updated!, canWrite: true };
  }

  async deleteStudy(id: UUIDType, user: CurrentUserType) {
    const study = await this.getStudyOrThrow(id);
    this.assertCanManage(study, user);
    return this.repository.deleteStudy(id);
  }

  async cloneStudy(id: UUIDType, user: CurrentUserType) {
    const study = await this.getStudyOrThrow(id);
    await this.assertCanRead(study, user);
    const allowClone = study.allowClone !== false;
    if (!allowClone && !this.isOwner(user, study.authorId) && !this.canManageAny(user)) {
      throw new ForbiddenException("chess.study.errors.cloneNotAllowed");
    }
    const clone = await this.repository.cloneStudy(id, user.userId);
    if (!clone) {
      throw new NotFoundException("chess.study.errors.studyNotFound");
    }
    return { ...clone, canWrite: true };
  }

  async createChapter(studyId: UUIDType, body: CreateChessStudyChapterBody, user: CurrentUserType) {
    const study = await this.getStudyOrThrow(studyId);
    await this.assertCanWrite(study, user);
    return this.repository.createChapter(studyId, body);
  }

  async importStudyPgn(studyId: UUIDType, body: ImportStudyPgnBody, user: CurrentUserType) {
    const study = await this.getStudyOrThrow(studyId);
    await this.assertCanWrite(study, user);

    let drafts;
    try {
      drafts = parseStudyPgnImport(body.pgn);
    } catch (error) {
      if (error instanceof StudyPgnError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const chapterBodies: CreateChessStudyChapterBody[] = drafts.map((draft) => ({
      title: draft.title,
      rootFen: draft.rootFen,
      moveNodes: draft.moveNodes,
      mode: body.mode,
      orientation: draft.orientation,
      pgnTags: draft.pgnTags,
    }));

    return this.repository.createChaptersFromImport(studyId, chapterBodies);
  }

  async exportStudyPgn(studyId: UUIDType, user: CurrentUserType): Promise<string> {
    const study = await this.getStudyOrThrow(studyId);
    await this.assertCanRead(study, user);
    const chapters = await this.repository.getChaptersByStudyId(studyId);
    return exportStudyPgn(
      chapters.map((chapter) => ({
        rootFen: chapter.rootFen,
        moveNodes: chapter.moveNodes,
        pgnTags: chapter.pgnTags,
        orientation: chapter.orientation,
        title: chapter.title,
      })),
    );
  }

  async exportStudyChapterPgn(
    studyId: UUIDType,
    chapterId: UUIDType,
    user: CurrentUserType,
  ): Promise<string> {
    const study = await this.getStudyOrThrow(studyId);
    await this.assertCanRead(study, user);
    const chapter = await this.repository.getChapterById(chapterId);
    if (!chapter || chapter.studyId !== studyId) {
      throw new NotFoundException("chess.study.errors.chapterNotFound");
    }
    return exportChapterPgn({
      rootFen: chapter.rootFen,
      moveNodes: chapter.moveNodes,
      pgnTags: chapter.pgnTags ?? { Event: chapter.title },
      orientation: chapter.orientation,
    });
  }

  async updateChapter(
    studyId: UUIDType,
    chapterId: UUIDType,
    body: UpdateChessStudyChapterBody,
    user: CurrentUserType,
  ) {
    const study = await this.getStudyOrThrow(studyId);
    await this.assertCanWrite(study, user);
    const chapter = await this.repository.getChapterById(chapterId);
    if (!chapter || chapter.studyId !== studyId) {
      throw new NotFoundException("chess.study.errors.chapterNotFound");
    }
    return this.repository.updateChapter(chapterId, body);
  }

  async deleteChapter(studyId: UUIDType, chapterId: UUIDType, user: CurrentUserType) {
    const study = await this.getStudyOrThrow(studyId);
    await this.assertCanWrite(study, user);
    const chapter = await this.repository.getChapterById(chapterId);
    if (!chapter || chapter.studyId !== studyId) {
      throw new NotFoundException("chess.study.errors.chapterNotFound");
    }
    return this.repository.deleteChapter(studyId, chapterId);
  }

  async reorderChapters(
    studyId: UUIDType,
    body: ReorderChessStudyChaptersBody,
    user: CurrentUserType,
  ) {
    const study = await this.getStudyOrThrow(studyId);
    await this.assertCanWrite(study, user);
    const chapters = await this.repository.getChaptersByStudyId(studyId);
    const knownIds = new Set(chapters.map((chapter) => chapter.id));
    if (
      body.chapterIds.length !== chapters.length ||
      !body.chapterIds.every((id) => knownIds.has(id))
    ) {
      throw new BadRequestException("chess.study.errors.reorderMismatch");
    }
    await this.repository.reorderChapters(studyId, body.chapterIds);
  }

  async addMember(studyId: UUIDType, body: AddChessStudyMemberBody, user: CurrentUserType) {
    const study = await this.getStudyOrThrow(studyId);
    this.assertCanManage(study, user);

    let targetUserId = body.userId;
    if (!targetUserId && body.identity) {
      targetUserId = (await this.repository.findUserIdByIdentity(body.identity)) ?? undefined;
      if (!targetUserId) {
        throw new NotFoundException("chess.study.errors.memberUserNotFound");
      }
    }
    if (!targetUserId) {
      throw new BadRequestException("chess.study.errors.memberIdentityRequired");
    }
    if (targetUserId === study.authorId) {
      throw new BadRequestException("chess.study.errors.cannotAddOwnerAsMember");
    }
    await this.repository.addMember(
      studyId,
      targetUserId,
      body.role ?? CHESS_STUDY_MEMBER_ROLES.READ,
    );
  }

  async removeMember(studyId: UUIDType, userId: UUIDType, user: CurrentUserType) {
    const study = await this.getStudyOrThrow(studyId);
    this.assertCanManage(study, user);
    await this.repository.removeMember(studyId, userId);
  }

  // --- S4: course lesson embed ---

  async createChessStudyLesson(body: CreateChessStudyLessonBody, user: CurrentUserType) {
    // Ownership / chapter access only — avoid importing CourseModule (circular dep with Chess).
    await this.adminLessonService.validateAccess(ENTITY_TYPES.CHAPTER, user, body.chapterId);

    // Author must be able to read the study they embed.
    const study = await this.getStudyOrThrow(body.studyId);
    await this.assertCanRead(study, user);

    if (body.studyChapterId) {
      const chapter = await this.repository.getChapterById(body.studyChapterId);
      if (!chapter || chapter.studyId !== body.studyId) {
        throw new BadRequestException("chess.study.errors.chapterNotFound");
      }
    }

    const { language } = await this.localizationService.getBaseLanguage(
      ENTITY_TYPE.CHAPTER,
      body.chapterId,
    );
    const displayOrder = (await this.adminLessonRepository.getMaxDisplayOrder(body.chapterId)) + 1;

    const lessonRow = await this.repository.createChessStudyLessonRow(
      body.chapterId,
      language,
      body.title,
      body.description ?? undefined,
      displayOrder,
    );

    const link = await this.repository.createLessonChessStudyLink({
      lessonId: lessonRow.id,
      studyId: body.studyId,
      studyChapterId: body.studyChapterId ?? null,
    });

    return {
      lessonId: lessonRow.id,
      studyId: link.studyId,
      studyChapterId: link.studyChapterId,
    };
  }

  async getChessStudyLessonForLearner(lessonId: UUIDType, user: CurrentUserType) {
    const link = await this.repository.getLessonChessStudyLink(lessonId);
    if (!link) {
      throw new NotFoundException("chess.study.errors.lessonEmbedNotFound");
    }

    const canAccessLesson =
      this.canManageAny(user) ||
      hasPermission(user.permissions, PERMISSIONS.COURSE_READ_MANAGEABLE) ||
      hasPermission(user.permissions, PERMISSIONS.COURSE_UPDATE) ||
      (await this.repository.canAccessChessStudyLesson(lessonId, user.userId));

    if (!canAccessLesson) {
      throw new ForbiddenException("chess.study.errors.lessonAccessDenied");
    }

    if (!link.studyId) {
      return {
        lessonId,
        studyId: null,
        studyChapterId: link.studyChapterId,
        studyMissing: true,
        study: null,
      };
    }

    const study = await this.repository.getStudyById(link.studyId);
    if (!study) {
      return {
        lessonId,
        studyId: link.studyId,
        studyChapterId: link.studyChapterId,
        studyMissing: true,
        study: null,
      };
    }

    // Lesson enrollment grants temporary read of private studies for this view only.
    const [chaptersList, members] = await Promise.all([
      this.repository.getChaptersByStudyId(study.id),
      this.repository.getMembersByStudyId(study.id),
    ]);

    const filteredChapters = link.studyChapterId
      ? chaptersList.filter((chapter) => chapter.id === link.studyChapterId)
      : chaptersList;

    return {
      lessonId,
      studyId: study.id,
      studyChapterId: link.studyChapterId,
      studyMissing: false,
      study: {
        ...study,
        chapters: filteredChapters.length > 0 ? filteredChapters : chaptersList,
        members,
        canWrite: false,
      },
    };
  }

  async updateChessStudyLesson(
    lessonId: UUIDType,
    body: UpdateChessStudyLessonBody,
    user: CurrentUserType,
  ) {
    await this.adminLessonService.validateAccess(ENTITY_TYPES.LESSON, user, lessonId);

    const link = await this.repository.getLessonChessStudyLink(lessonId);
    if (!link) {
      throw new NotFoundException("chess.study.errors.lessonEmbedNotFound");
    }

    if (body.studyId) {
      const study = await this.getStudyOrThrow(body.studyId);
      await this.assertCanRead(study, user);
    }

    const nextStudyId = body.studyId ?? link.studyId;
    if (body.studyChapterId && nextStudyId) {
      const chapter = await this.repository.getChapterById(body.studyChapterId);
      if (!chapter || chapter.studyId !== nextStudyId) {
        throw new BadRequestException("chess.study.errors.chapterNotFound");
      }
    }

    return this.repository.updateLessonChessStudyLink(lessonId, {
      studyId: body.studyId,
      studyChapterId: body.studyChapterId,
    });
  }

  async submitPracticeAttempt(
    studyId: UUIDType,
    chapterId: UUIDType,
    body: SubmitPracticeAttemptBody,
    user: CurrentUserType,
  ) {
    const study = await this.getStudyOrThrow(studyId);
    await this.assertCanRead(study, user);

    const chapter = await this.repository.getChapterById(chapterId);
    if (!chapter || chapter.studyId !== studyId) {
      throw new NotFoundException("chess.study.errors.chapterNotFound");
    }
    if (!chapter.practiceGoalType) {
      throw new BadRequestException("chess.study.errors.notAPracticeChapter");
    }

    const replay = replayPracticeMoves(chapter.rootFen, body.movesUci);
    if (!replay.legal) {
      throw new BadRequestException("chess.study.errors.illegalMoveSequence");
    }

    const achievedGoal = evaluatePracticeGoal(
      chapter.practiceGoalType,
      chapter.practiceGoalTargetValue,
      replay.finalFen,
      replay.movesUsed,
    );

    await this.repository.insertPracticeAttempt({
      chapterId,
      userId: user.userId,
      movesUsed: replay.movesUsed,
      achievedGoal,
    });

    const bestMovesUsed = await this.repository.getBestMovesUsed(chapterId, user.userId);

    return { achievedGoal, movesUsed: replay.movesUsed, bestMovesUsed };
  }

  async getContinueChapterId(studyId: UUIDType, user: CurrentUserType) {
    const study = await this.getStudyOrThrow(studyId);
    await this.assertCanRead(study, user);
    return this.repository.findNextIncompletePracticeChapter(studyId, user.userId);
  }
}
