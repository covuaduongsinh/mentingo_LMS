import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { PERMISSIONS } from "@repo/shared";
import { Type } from "@sinclair/typebox";
import { Validate } from "nestjs-typebox";

import { BaseResponse, baseResponse, UUIDSchema, type UUIDType } from "src/common";
import { RequirePermission } from "src/common/decorators/require-permission.decorator";
import { CurrentUser } from "src/common/decorators/user.decorator";
import { CurrentUserType } from "src/common/types/current-user.type";

import { AssignmentsService } from "./assignments.service";
import {
  assignmentSchema,
  assignmentTaskSchema,
  assignmentTaskSubmissionSchema,
  assignmentUserSubmissionSchema,
  assignmentWithTasksSchema,
  createAssignmentBodySchema,
  createAssignmentLessonBodySchema,
  createAssignmentLessonResponseSchema,
  createAssignmentTaskBodySchema,
  gradeAssignmentTaskSubmissionBodySchema,
  submitAssignmentTaskBodySchema,
  updateAssignmentBodySchema,
  updateAssignmentTaskBodySchema,
  type CreateAssignmentBody,
  type CreateAssignmentLessonBody,
  type CreateAssignmentTaskBody,
  type GradeAssignmentTaskSubmissionBody,
  type SubmitAssignmentTaskBody,
  type UpdateAssignmentBody,
  type UpdateAssignmentTaskBody,
} from "./schemas/assignment.schema";

@Controller("assignments")
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // --- Authoring ---------------------------------------------------------

  @Post("lessons")
  @RequirePermission(PERMISSIONS.ASSIGNMENT_MANAGE, PERMISSIONS.ASSIGNMENT_MANAGE_OWN)
  @Validate({
    request: [{ type: "body", schema: createAssignmentLessonBodySchema }],
    response: baseResponse(createAssignmentLessonResponseSchema),
  })
  async createAssignmentLesson(@Body() body: CreateAssignmentLessonBody) {
    return new BaseResponse(await this.assignmentsService.createAssignmentLesson(body));
  }

  @Post()
  @RequirePermission(PERMISSIONS.ASSIGNMENT_MANAGE, PERMISSIONS.ASSIGNMENT_MANAGE_OWN)
  @Validate({
    request: [{ type: "body", schema: createAssignmentBodySchema }],
    response: baseResponse(assignmentWithTasksSchema),
  })
  async createAssignment(@Body() body: CreateAssignmentBody) {
    return new BaseResponse(await this.assignmentsService.createAssignment(body));
  }

  @Get("lesson/:lessonId/author")
  @RequirePermission(PERMISSIONS.ASSIGNMENT_MANAGE, PERMISSIONS.ASSIGNMENT_MANAGE_OWN)
  @Validate({
    request: [{ type: "param", name: "lessonId", schema: UUIDSchema }],
    response: baseResponse(assignmentWithTasksSchema),
  })
  async getAssignmentForAuthor(@Param("lessonId") lessonId: UUIDType) {
    return new BaseResponse(await this.assignmentsService.getAssignmentForAuthor(lessonId));
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.ASSIGNMENT_MANAGE, PERMISSIONS.ASSIGNMENT_MANAGE_OWN)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: updateAssignmentBodySchema },
    ],
    response: baseResponse(assignmentSchema),
  })
  async updateAssignment(@Param("id") id: UUIDType, @Body() body: UpdateAssignmentBody) {
    return new BaseResponse(await this.assignmentsService.updateAssignment(id, body));
  }

  @Delete(":id")
  @RequirePermission(PERMISSIONS.ASSIGNMENT_MANAGE, PERMISSIONS.ASSIGNMENT_MANAGE_OWN)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(Type.Object({ id: UUIDSchema })),
  })
  async deleteAssignment(@Param("id") id: UUIDType) {
    return new BaseResponse(await this.assignmentsService.deleteAssignment(id));
  }

  @Post(":id/tasks")
  @RequirePermission(PERMISSIONS.ASSIGNMENT_MANAGE, PERMISSIONS.ASSIGNMENT_MANAGE_OWN)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "body", schema: createAssignmentTaskBodySchema },
    ],
    response: baseResponse(assignmentTaskSchema),
  })
  async addTask(@Param("id") id: UUIDType, @Body() body: CreateAssignmentTaskBody) {
    return new BaseResponse(await this.assignmentsService.addTask(id, body));
  }

  @Patch("tasks/:taskId")
  @RequirePermission(PERMISSIONS.ASSIGNMENT_MANAGE, PERMISSIONS.ASSIGNMENT_MANAGE_OWN)
  @Validate({
    request: [
      { type: "param", name: "taskId", schema: UUIDSchema },
      { type: "body", schema: updateAssignmentTaskBodySchema },
    ],
    response: baseResponse(assignmentTaskSchema),
  })
  async updateTask(@Param("taskId") taskId: UUIDType, @Body() body: UpdateAssignmentTaskBody) {
    return new BaseResponse(await this.assignmentsService.updateTask(taskId, body));
  }

  @Delete("tasks/:taskId")
  @RequirePermission(PERMISSIONS.ASSIGNMENT_MANAGE, PERMISSIONS.ASSIGNMENT_MANAGE_OWN)
  @Validate({
    request: [{ type: "param", name: "taskId", schema: UUIDSchema }],
    response: baseResponse(Type.Object({ id: UUIDSchema })),
  })
  async deleteTask(@Param("taskId") taskId: UUIDType) {
    return new BaseResponse(await this.assignmentsService.deleteTask(taskId));
  }

  // --- Learner -------------------------------------------------------------

  @Get("lesson/:lessonId")
  @RequirePermission(PERMISSIONS.ASSIGNMENT_READ)
  @Validate({
    request: [{ type: "param", name: "lessonId", schema: UUIDSchema }],
    response: baseResponse(
      Type.Object({
        assignment: assignmentSchema,
        tasks: Type.Array(assignmentTaskSchema),
        userSubmission: Type.Union([assignmentUserSubmissionSchema, Type.Null()]),
        taskSubmissions: Type.Array(assignmentTaskSubmissionSchema),
      }),
    ),
  })
  async getAssignmentForLearner(
    @Param("lessonId") lessonId: UUIDType,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.assignmentsService.getAssignmentForLearner(lessonId, user.userId),
    );
  }

  @Post("tasks/:taskId/submissions")
  @RequirePermission(PERMISSIONS.ASSIGNMENT_SUBMIT)
  @Validate({
    request: [
      { type: "param", name: "taskId", schema: UUIDSchema },
      { type: "body", schema: submitAssignmentTaskBodySchema },
    ],
    response: baseResponse(assignmentUserSubmissionSchema),
  })
  async submitTask(
    @Param("taskId") taskId: UUIDType,
    @Body() body: SubmitAssignmentTaskBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(await this.assignmentsService.submitTask(taskId, user.userId, body));
  }

  // --- Grading -------------------------------------------------------------

  @Get(":id/submissions")
  @RequirePermission(PERMISSIONS.ASSIGNMENT_GRADE)
  @Validate({
    request: [{ type: "param", name: "id", schema: UUIDSchema }],
    response: baseResponse(Type.Array(assignmentUserSubmissionSchema)),
  })
  async listSubmissionsForGrading(@Param("id") id: UUIDType) {
    return new BaseResponse(await this.assignmentsService.listSubmissionsForGrading(id));
  }

  @Get(":id/submissions/:userId")
  @RequirePermission(PERMISSIONS.ASSIGNMENT_GRADE)
  @Validate({
    request: [
      { type: "param", name: "id", schema: UUIDSchema },
      { type: "param", name: "userId", schema: UUIDSchema },
    ],
    response: baseResponse(
      Type.Object({
        assignment: assignmentSchema,
        aggregate: Type.Union([assignmentUserSubmissionSchema, Type.Null()]),
        tasks: Type.Array(assignmentTaskSchema),
        taskSubmissions: Type.Array(assignmentTaskSubmissionSchema),
      }),
    ),
  })
  async getSubmissionForGrading(@Param("id") id: UUIDType, @Param("userId") userId: UUIDType) {
    return new BaseResponse(await this.assignmentsService.getSubmissionForGrading(id, userId));
  }

  @Patch("task-submissions/:taskSubmissionId/grade")
  @RequirePermission(PERMISSIONS.ASSIGNMENT_GRADE)
  @Validate({
    request: [
      { type: "param", name: "taskSubmissionId", schema: UUIDSchema },
      { type: "body", schema: gradeAssignmentTaskSubmissionBodySchema },
    ],
    response: baseResponse(assignmentUserSubmissionSchema),
  })
  async gradeTaskSubmission(
    @Param("taskSubmissionId") taskSubmissionId: UUIDType,
    @Body() body: GradeAssignmentTaskSubmissionBody,
    @CurrentUser() user: CurrentUserType,
  ) {
    return new BaseResponse(
      await this.assignmentsService.gradeTaskSubmissionManually(
        taskSubmissionId,
        user.userId,
        body,
      ),
    );
  }
}
