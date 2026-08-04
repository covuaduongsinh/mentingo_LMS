import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CHESS_STUDY_MEMBER_ROLES, CHESS_STUDY_VISIBILITY, PERMISSIONS } from "@repo/shared";

import { hasPermission } from "src/common/permissions/permission.utils";

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
  ImportStudyPgnBody,
  ReorderChessStudyChaptersBody,
  SubmitPracticeAttemptBody,
  UpdateChessStudyBody,
  UpdateChessStudyChapterBody,
} from "./schemas/chess-study.schema";
import type { UUIDType } from "src/common";
import type { CurrentUserType } from "src/common/types/current-user.type";

@Injectable()
export class ChessStudyService {
  constructor(private readonly repository: ChessStudyRepository) {}

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
    if (body.userId === study.authorId) {
      throw new BadRequestException("chess.study.errors.cannotAddOwnerAsMember");
    }
    await this.repository.addMember(studyId, body);
  }

  async removeMember(studyId: UUIDType, userId: UUIDType, user: CurrentUserType) {
    const study = await this.getStudyOrThrow(studyId);
    this.assertCanManage(study, user);
    await this.repository.removeMember(studyId, userId);
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
