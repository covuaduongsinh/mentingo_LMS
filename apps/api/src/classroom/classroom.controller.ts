import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse, UUIDSchema, type UUIDType } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";

import { ClassroomService } from "./classroom.service";
import {
  addClassroomTeacherBodySchema,
  adminClassroomListSchema,
  assignClassroomCourseBodySchema,
  assignClassroomStudyBodySchema,
  assignClassroomStudyResponseSchema,
  bulkCreateClassroomStudentsBodySchema,
  bulkCreateClassroomStudentsResponseSchema,
  classroomCourseListSchema,
  classroomDetailSchema,
  classroomIdForSourceGroupResponseSchema,
  classroomInviteListSchema,
  classroomListSchema,
  classroomProgressResponseSchema,
  classroomSchema,
  classroomStudentListSchema,
  classroomStudentSchema,
  classroomTeacherListSchema,
  createClassroomBodySchema,
  createClassroomStudentBodySchema,
  createClassroomStudentResponseSchema,
  inviteClassroomStudentBodySchema,
  inviteClassroomStudentResponseSchema,
  moveClassroomStudentBodySchema,
  myClassroomInviteListSchema,
  releaseClassroomStudentBodySchema,
  releaseClassroomStudentResponseSchema,
  resetClassroomStudentPasswordResponseSchema,
  runClassroomBulkActionBodySchema,
  sendClassroomAnnouncementBodySchema,
  setClassroomArchivedBodySchema,
  setClassroomStudentArchivedBodySchema,
  updateClassroomBodySchema,
  updateClassroomStudentBodySchema,
  type AddClassroomTeacherBody,
  type AssignClassroomCourseBody,
  type AssignClassroomStudyBody,
  type BulkCreateClassroomStudentsBody,
  type CreateClassroomBody,
  type CreateClassroomStudentBody,
  type InviteClassroomStudentBody,
  type MoveClassroomStudentBody,
  type ReleaseClassroomStudentBody,
  type RunClassroomBulkActionBody,
  type SendClassroomAnnouncementBody,
  type SetClassroomArchivedBody,
  type SetClassroomStudentArchivedBody,
  type UpdateClassroomBody,
  type UpdateClassroomStudentBody,
} from "./schemas/classroom.schema";

@Controller("classroom")
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Post()
  @RequirePermission(PERMISSIONS.CLASSROOM_CREATE)
  @Validate({
    request: [{ type: "body", schema: createClassroomBodySchema }],
    response: baseResponse(classroomSchema),
  })
  async createClassroom(@Body() body: CreateClassroomBody, @CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.classroomService.createClassroom(user, body));
  }

  // Đợt C2 backward-compat bridge: lets the old /admin/chess/classes/:groupId page link to
  // its corresponding new classroom, if the group was backfilled into one. Not part of the
  // Classroom feature surface — removed alongside the old page in Đợt C8.
  @Get("by-source-group/:groupId")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [{ type: "param", name: "groupId", schema: UUIDSchema }],
    response: baseResponse(classroomIdForSourceGroupResponseSchema),
  })
  async getClassroomIdForSourceGroup(@Param("groupId") groupId: UUIDType) {
    const classroomId = await this.classroomService.findClassroomIdForSourceGroup(groupId);
    return new BaseResponse({ classroomId });
  }

  @Get("teaching")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({ response: baseResponse(classroomListSchema) })
  async listTeachingClassrooms(@CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.classroomService.listTeachingClassrooms(user));
  }

  @Get("learning")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({ response: baseResponse(classroomListSchema) })
  async listLearningClassrooms(@CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.classroomService.listLearningClassrooms(user));
  }

  // Đợt C4 — self-service, deliberately has no @RequirePermission: this is exactly how a user
  // *without* classroom.create is meant to reach it (gated instead by an env flag + eligibility
  // checks inside the service).
  @Post("become-teacher")
  async becomeClassroomTeacher(@CurrentUser() user: CurrentUserType) {
    await this.classroomService.becomeTeacher(user);
  }

  // Đợt C4 — admin-only cross-tenant oversight list, gated by CLASSROOM_MANAGE (not the
  // coarser CLASSROOM_READ every other route uses) since it exposes every classroom regardless
  // of teaching/learning relationship.
  @Get("admin/classrooms")
  @RequirePermission(PERMISSIONS.CLASSROOM_MANAGE)
  @Validate({
    request: [{ type: "query", name: "includeArchived", schema: Type.Optional(Type.String()) }],
    response: baseResponse(adminClassroomListSchema),
  })
  async listAllClassroomsForAdmin(@Query("includeArchived") includeArchived: string | undefined) {
    return new BaseResponse(
      await this.classroomService.listAllClassroomsForAdmin(includeArchived === "true"),
    );
  }

  @Get("invites/mine")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({ response: baseResponse(myClassroomInviteListSchema) })
  async listMyClassroomInvites(@CurrentUser() user: CurrentUserType) {
    return new BaseResponse(await this.classroomService.listMyInvites(user));
  }

  @Post("invites/:inviteId/accept")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({ request: [{ type: "param", name: "inviteId", schema: UUIDSchema }] })
  async acceptClassroomInvite(
    @Param("inviteId") inviteId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.classroomService.acceptInvite(inviteId, user));
  }

  @Post("invites/:inviteId/decline")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({ request: [{ type: "param", name: "inviteId", schema: UUIDSchema }] })
  async declineClassroomInvite(
    @Param("inviteId") inviteId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.classroomService.declineInvite(inviteId, user));
  }

  @Get(":classroomId")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [{ type: "param", name: "classroomId", schema: UUIDSchema }],
    response: baseResponse(classroomDetailSchema),
  })
  async getClassroomDetail(
    @Param("classroomId") classroomId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.classroomService.getClassroomDetail(classroomId, user));
  }

  @Patch(":classroomId")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "body", schema: updateClassroomBodySchema },
    ],
    response: baseResponse(classroomSchema),
  })
  async updateClassroom(
    @Param("classroomId") classroomId: UUIDType,
    @Body() body: UpdateClassroomBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.classroomService.updateClassroom(classroomId, user, body));
  }

  @Post(":classroomId/archive")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "body", schema: setClassroomArchivedBodySchema },
    ],
    response: baseResponse(classroomSchema),
  })
  async setClassroomArchived(
    @Param("classroomId") classroomId: UUIDType,
    @Body() body: SetClassroomArchivedBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.setArchived(classroomId, user, body.archived),
    );
  }

  @Post(":classroomId/teachers")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "body", schema: addClassroomTeacherBodySchema },
    ],
    response: baseResponse(classroomTeacherListSchema),
  })
  async addClassroomTeacher(
    @Param("classroomId") classroomId: UUIDType,
    @Body() body: AddClassroomTeacherBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.classroomService.addTeacher(classroomId, user, body.userId));
  }

  @Delete(":classroomId/teachers/:userId")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "param", name: "userId", schema: UUIDSchema },
    ],
    response: baseResponse(classroomTeacherListSchema),
  })
  async removeClassroomTeacher(
    @Param("classroomId") classroomId: UUIDType,
    @Param("userId") userId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.classroomService.removeTeacher(classroomId, user, userId));
  }

  // ---------------------------------------------------------------------------------------
  // Bulletin & announcements (Đợt C4)
  // ---------------------------------------------------------------------------------------

  @Post(":classroomId/announcements")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "body", schema: sendClassroomAnnouncementBodySchema },
    ],
  })
  async sendClassroomAnnouncement(
    @Param("classroomId") classroomId: UUIDType,
    @Body() body: SendClassroomAnnouncementBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.classroomService.sendAnnouncement(classroomId, user, body.message, body.language);
  }

  // ---------------------------------------------------------------------------------------
  // Nối lớp với LMS (Đợt C5)
  // ---------------------------------------------------------------------------------------

  @Get(":classroomId/courses")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [{ type: "param", name: "classroomId", schema: UUIDSchema }],
    response: baseResponse(classroomCourseListSchema),
  })
  async listClassroomCourses(
    @Param("classroomId") classroomId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.classroomService.listCourses(classroomId, user));
  }

  @Post(":classroomId/courses")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "body", schema: assignClassroomCourseBodySchema },
    ],
    response: baseResponse(classroomCourseListSchema),
  })
  async assignClassroomCourse(
    @Param("classroomId") classroomId: UUIDType,
    @Body() body: AssignClassroomCourseBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.assignCourse(
        classroomId,
        user,
        body.courseId,
        body.isMandatory ?? false,
        body.dueDate ?? null,
      ),
    );
  }

  @Delete(":classroomId/courses/:courseId")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "param", name: "courseId", schema: UUIDSchema },
    ],
    response: baseResponse(classroomCourseListSchema),
  })
  async unassignClassroomCourse(
    @Param("classroomId") classroomId: UUIDType,
    @Param("courseId") courseId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.unassignCourse(classroomId, user, courseId),
    );
  }

  @Post(":classroomId/studies")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "body", schema: assignClassroomStudyBodySchema },
    ],
    response: baseResponse(assignClassroomStudyResponseSchema),
  })
  async assignClassroomStudy(
    @Param("classroomId") classroomId: UUIDType,
    @Body() body: AssignClassroomStudyBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.assignStudy(classroomId, user, body.studyId),
    );
  }

  // ---------------------------------------------------------------------------------------
  // Students (Đợt C3)
  // ---------------------------------------------------------------------------------------

  @Get(":classroomId/students")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "query", name: "includeArchived", schema: Type.Optional(Type.String()) },
    ],
    response: baseResponse(classroomStudentListSchema),
  })
  async listClassroomStudents(
    @Param("classroomId") classroomId: UUIDType,
    @Query("includeArchived") includeArchived: string | undefined,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.listStudents(classroomId, user, includeArchived === "true"),
    );
  }

  @Post(":classroomId/students")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "body", schema: createClassroomStudentBodySchema },
    ],
    response: baseResponse(createClassroomStudentResponseSchema),
  })
  async createClassroomStudent(
    @Param("classroomId") classroomId: UUIDType,
    @Body() body: CreateClassroomStudentBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.createStudent(classroomId, user, body.realName),
    );
  }

  @Post(":classroomId/students/bulk")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "body", schema: bulkCreateClassroomStudentsBodySchema },
    ],
    response: baseResponse(bulkCreateClassroomStudentsResponseSchema),
  })
  async bulkCreateClassroomStudents(
    @Param("classroomId") classroomId: UUIDType,
    @Body() body: BulkCreateClassroomStudentsBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    const students = await this.classroomService.bulkCreateStudents(classroomId, user, body.names);
    return new BaseResponse({ students });
  }

  @Get(":classroomId/students/:userId")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "param", name: "userId", schema: UUIDSchema },
    ],
    response: baseResponse(classroomStudentSchema),
  })
  async getClassroomStudentDetail(
    @Param("classroomId") classroomId: UUIDType,
    @Param("userId") userId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.getStudentDetail(classroomId, user, userId),
    );
  }

  @Patch(":classroomId/students/:userId")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "param", name: "userId", schema: UUIDSchema },
      { type: "body", schema: updateClassroomStudentBodySchema },
    ],
    response: baseResponse(classroomStudentSchema),
  })
  async updateClassroomStudent(
    @Param("classroomId") classroomId: UUIDType,
    @Param("userId") userId: UUIDType,
    @Body() body: UpdateClassroomStudentBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.updateStudent(classroomId, user, userId, body),
    );
  }

  @Post(":classroomId/students/:userId/archive")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "param", name: "userId", schema: UUIDSchema },
      { type: "body", schema: setClassroomStudentArchivedBodySchema },
    ],
    response: baseResponse(classroomStudentSchema),
  })
  async setClassroomStudentArchived(
    @Param("classroomId") classroomId: UUIDType,
    @Param("userId") userId: UUIDType,
    @Body() body: SetClassroomStudentArchivedBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.setStudentArchived(classroomId, user, userId, body.archived),
    );
  }

  @Post(":classroomId/students/:userId/reset-password")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "param", name: "userId", schema: UUIDSchema },
    ],
    response: baseResponse(resetClassroomStudentPasswordResponseSchema),
  })
  async resetClassroomStudentPassword(
    @Param("classroomId") classroomId: UUIDType,
    @Param("userId") userId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    const temporaryPassword = await this.classroomService.resetStudentPassword(
      classroomId,
      user,
      userId,
    );
    return new BaseResponse({ temporaryPassword });
  }

  @Post(":classroomId/students/:userId/release")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "param", name: "userId", schema: UUIDSchema },
      { type: "body", schema: releaseClassroomStudentBodySchema },
    ],
    response: baseResponse(releaseClassroomStudentResponseSchema),
  })
  async releaseClassroomStudent(
    @Param("classroomId") classroomId: UUIDType,
    @Param("userId") userId: UUIDType,
    @Body() body: ReleaseClassroomStudentBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    const createToken = await this.classroomService.releaseStudent(
      classroomId,
      user,
      userId,
      body.email,
    );
    return new BaseResponse({ createToken });
  }

  @Post(":classroomId/students/:userId/close")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "param", name: "userId", schema: UUIDSchema },
    ],
  })
  async closeClassroomStudent(
    @Param("classroomId") classroomId: UUIDType,
    @Param("userId") userId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.classroomService.closeStudent(classroomId, user, userId);
  }

  @Post(":classroomId/students/:userId/move")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "param", name: "userId", schema: UUIDSchema },
      { type: "body", schema: moveClassroomStudentBodySchema },
    ],
    response: baseResponse(classroomStudentListSchema),
  })
  async moveClassroomStudent(
    @Param("classroomId") classroomId: UUIDType,
    @Param("userId") userId: UUIDType,
    @Body() body: MoveClassroomStudentBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.moveStudent(classroomId, user, userId, body.targetClassroomId),
    );
  }

  @Post(":classroomId/bulk-actions")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "body", schema: runClassroomBulkActionBodySchema },
    ],
    response: baseResponse(classroomStudentListSchema),
  })
  async runClassroomBulkAction(
    @Param("classroomId") classroomId: UUIDType,
    @Body() body: RunClassroomBulkActionBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.runBulkStudentAction(
        classroomId,
        user,
        body.action,
        body.userIds,
        body.targetClassroomId,
      ),
    );
  }

  // ---------------------------------------------------------------------------------------
  // Invites (Đợt C3)
  // ---------------------------------------------------------------------------------------

  @Post(":classroomId/invites")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "body", schema: inviteClassroomStudentBodySchema },
    ],
    response: baseResponse(inviteClassroomStudentResponseSchema),
  })
  async inviteClassroomStudent(
    @Param("classroomId") classroomId: UUIDType,
    @Body() body: InviteClassroomStudentBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.inviteStudent(classroomId, user, body.username, body.realName),
    );
  }

  @Get(":classroomId/invites")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [{ type: "param", name: "classroomId", schema: UUIDSchema }],
    response: baseResponse(classroomInviteListSchema),
  })
  async listClassroomInvites(
    @Param("classroomId") classroomId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.classroomService.listClassroomInvites(classroomId, user));
  }

  @Delete(":classroomId/invites/:inviteId")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "param", name: "inviteId", schema: UUIDSchema },
    ],
  })
  async revokeClassroomInvite(
    @Param("classroomId") classroomId: UUIDType,
    @Param("inviteId") inviteId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.classroomService.revokeInvite(classroomId, user, inviteId);
  }

  // ---------------------------------------------------------------------------------------
  // Báo cáo tiến độ (Đợt C6)
  // ---------------------------------------------------------------------------------------

  @Get(":classroomId/progress")
  @RequirePermission(PERMISSIONS.CLASSROOM_READ)
  @Validate({
    request: [
      { type: "param", name: "classroomId", schema: UUIDSchema },
      { type: "query", name: "days", schema: Type.Optional(Type.Number()) },
    ],
    response: baseResponse(classroomProgressResponseSchema),
  })
  async getClassroomProgress(
    @Param("classroomId") classroomId: UUIDType,
    @Query("days") days: number | undefined,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.classroomService.getProgressReport(classroomId, user, days ?? 30),
    );
  }
}
