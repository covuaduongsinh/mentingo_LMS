import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse, UUIDSchema, type UUIDType } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";

import { ClassroomService } from "./classroom.service";
import {
  addClassroomTeacherBodySchema,
  classroomDetailSchema,
  classroomListSchema,
  classroomSchema,
  classroomTeacherListSchema,
  createClassroomBodySchema,
  setClassroomArchivedBodySchema,
  updateClassroomBodySchema,
  type AddClassroomTeacherBody,
  type CreateClassroomBody,
  type SetClassroomArchivedBody,
  type UpdateClassroomBody,
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
}
