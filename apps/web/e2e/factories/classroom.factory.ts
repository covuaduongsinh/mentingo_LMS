import { randomUUID } from "node:crypto";

import { TEST_DATA } from "../data/test-data/entity-name.data";

import type { FixtureApiClient } from "../utils/api-client";
import type {
  CreateClassroomBody,
  CreateClassroomStudentResponse,
  GenerateClassroomLoginCodesResponse,
  GetClassroomDetailResponse,
} from "~/api/generated-api";

export type ClassroomFactoryRecord = GetClassroomDetailResponse["data"];
export type ClassroomFactoryCreateInput = Partial<CreateClassroomBody>;
export type ClassroomStudentFactoryRecord = CreateClassroomStudentResponse["data"];
export type ClassroomLoginCodesFactoryRecord = GenerateClassroomLoginCodesResponse["data"];

const createClassroomName = () => `${TEST_DATA.classroom.namePrefix} ${randomUUID().slice(0, 8)}`;
const createStudentName = () =>
  `${TEST_DATA.classroom.studentNamePrefix} ${randomUUID().slice(0, 8)}`;

export class ClassroomFactory {
  constructor(private readonly apiClient: FixtureApiClient) {}

  async create(input: ClassroomFactoryCreateInput = {}): Promise<ClassroomFactoryRecord> {
    const response = await this.apiClient.api.classroomControllerCreateClassroom({
      name: createClassroomName(),
      ...input,
    });

    return this.getById(response.data.data.id);
  }

  async getById(id: string): Promise<ClassroomFactoryRecord> {
    const response = await this.apiClient.api.classroomControllerGetClassroomDetail(id);
    return response.data.data;
  }

  async createStudent(
    classroomId: string,
    realName: string = createStudentName(),
  ): Promise<ClassroomStudentFactoryRecord> {
    const response = await this.apiClient.api.classroomControllerCreateClassroomStudent(
      classroomId,
      { realName },
    );

    return response.data.data;
  }

  async generateLoginCodes(classroomId: string): Promise<ClassroomLoginCodesFactoryRecord> {
    const response =
      await this.apiClient.api.classroomControllerGenerateClassroomLoginCodes(classroomId);

    return response.data.data;
  }

  /** No hard-delete endpoint by design (see docs/specs/classroom-business-spec.md) — archiving
   * is the only teardown available, same as a teacher closing a classroom for real. */
  async archive(id: string): Promise<void> {
    await this.apiClient.api.classroomControllerSetClassroomArchived(id, { archived: true });
  }
}
