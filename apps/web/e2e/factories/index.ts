import { ArticleFactory } from "./article.factory";
import { CategoryFactory } from "./category.factory";
import { ChessExerciseFactory, ChessGameFactory, ChessPlaySessionFactory } from "./chess.factory";
import { ClassroomFactory } from "./classroom.factory";
import { CourseFactory } from "./course.factory";
import { CurriculumFactory } from "./curriculum.factory";
import { EnrollmentFactory } from "./enrollment.factory";
import { GroupFactory } from "./group.factory";
import { LiveTrainingFactory } from "./live-training.factory";
import { NewsFactory } from "./news.factory";
import { QAFactory } from "./qa.factory";
import { TenantFactory } from "./tenant.factory";
import { UserFactory } from "./user.factory";

import type { FixtureApiClient } from "../utils/api-client";

export type FixtureFactories = {
  createArticleFactory: () => ArticleFactory;
  createCategoryFactory: () => CategoryFactory;
  createChessExerciseFactory: () => ChessExerciseFactory;
  createChessGameFactory: () => ChessGameFactory;
  createChessPlaySessionFactory: () => ChessPlaySessionFactory;
  createClassroomFactory: () => ClassroomFactory;
  createCourseFactory: () => CourseFactory;
  createCurriculumFactory: () => CurriculumFactory;
  createEnrollmentFactory: () => EnrollmentFactory;
  createGroupFactory: () => GroupFactory;
  createLiveTrainingFactory: () => LiveTrainingFactory;
  createNewsFactory: () => NewsFactory;
  createQAFactory: () => QAFactory;
  createTenantFactory: () => TenantFactory;
  createUserFactory: () => UserFactory;
};

export const createFixtureFactories = (apiClient: FixtureApiClient): FixtureFactories => {
  let articleFactory: ArticleFactory | undefined;
  let categoryFactory: CategoryFactory | undefined;
  let chessExerciseFactory: ChessExerciseFactory | undefined;
  let chessGameFactory: ChessGameFactory | undefined;
  let chessPlaySessionFactory: ChessPlaySessionFactory | undefined;
  let classroomFactory: ClassroomFactory | undefined;
  let courseFactory: CourseFactory | undefined;
  let curriculumFactory: CurriculumFactory | undefined;
  let enrollmentFactory: EnrollmentFactory | undefined;
  let groupFactory: GroupFactory | undefined;
  let liveTrainingFactory: LiveTrainingFactory | undefined;
  let newsFactory: NewsFactory | undefined;
  let qaFactory: QAFactory | undefined;
  let tenantFactory: TenantFactory | undefined;
  let userFactory: UserFactory | undefined;

  return {
    createArticleFactory: () => {
      articleFactory ??= new ArticleFactory(apiClient);
      return articleFactory;
    },
    createCategoryFactory: () => {
      categoryFactory ??= new CategoryFactory(apiClient);
      return categoryFactory;
    },
    createChessExerciseFactory: () => {
      chessExerciseFactory ??= new ChessExerciseFactory(apiClient);
      return chessExerciseFactory;
    },
    createChessGameFactory: () => {
      chessGameFactory ??= new ChessGameFactory(apiClient);
      return chessGameFactory;
    },
    createChessPlaySessionFactory: () => {
      chessPlaySessionFactory ??= new ChessPlaySessionFactory(apiClient);
      return chessPlaySessionFactory;
    },
    createClassroomFactory: () => {
      classroomFactory ??= new ClassroomFactory(apiClient);
      return classroomFactory;
    },
    createCourseFactory: () => {
      courseFactory ??= new CourseFactory(apiClient);
      return courseFactory;
    },
    createCurriculumFactory: () => {
      curriculumFactory ??= new CurriculumFactory(apiClient);
      return curriculumFactory;
    },
    createEnrollmentFactory: () => {
      enrollmentFactory ??= new EnrollmentFactory(apiClient);
      return enrollmentFactory;
    },
    createGroupFactory: () => {
      groupFactory ??= new GroupFactory(apiClient);
      return groupFactory;
    },
    createLiveTrainingFactory: () => {
      liveTrainingFactory ??= new LiveTrainingFactory(apiClient);
      return liveTrainingFactory;
    },
    createNewsFactory: () => {
      newsFactory ??= new NewsFactory(apiClient);
      return newsFactory;
    },
    createQAFactory: () => {
      qaFactory ??= new QAFactory(apiClient);
      return qaFactory;
    },
    createTenantFactory: () => {
      tenantFactory ??= new TenantFactory(apiClient);
      return tenantFactory;
    },
    createUserFactory: () => {
      userFactory ??= new UserFactory(apiClient);
      return userFactory;
    },
  };
};

export { ArticleFactory } from "./article.factory";
export { CategoryFactory } from "./category.factory";
export { ChessExerciseFactory, ChessGameFactory, ChessPlaySessionFactory } from "./chess.factory";
export { ClassroomFactory } from "./classroom.factory";
export { CourseFactory } from "./course.factory";
export { CurriculumFactory } from "./curriculum.factory";
export { EnrollmentFactory } from "./enrollment.factory";
export { GroupFactory } from "./group.factory";
export { NewsFactory } from "./news.factory";
export { QAFactory } from "./qa.factory";
export { TenantFactory } from "./tenant.factory";
export { UserFactory } from "./user.factory";
