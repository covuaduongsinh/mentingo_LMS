import { Injectable } from "@nestjs/common";
import { EventsHandler } from "@nestjs/cqrs";
import { match } from "ts-pattern";

import { QuizCompletedEvent, UserActivityEvent } from "src/events";

import { StatisticsService } from "../statistics.service";

import type { IEventHandler } from "@nestjs/cqrs";

type StatisticsEvent = QuizCompletedEvent | UserActivityEvent;

// Previously also registered for CourseStartedEvent, but nothing in the app
// ever publishes that event (only activity-logs' course-activity.handler.ts
// consumes it) and this handler has no logic for it — it only ever hit the
// `.otherwise()` throw below. Dropped the registration rather than add
// speculative handling; re-add both if course-start statistics are needed.
@Injectable()
@EventsHandler(QuizCompletedEvent, UserActivityEvent)
export class StatisticsHandler implements IEventHandler<QuizCompletedEvent | UserActivityEvent> {
  constructor(private readonly statisticsService: StatisticsService) {}

  async handle(event: StatisticsEvent) {
    try {
      match(event)
        .when(
          (e): e is QuizCompletedEvent => e instanceof QuizCompletedEvent,
          async (quizEvent) => {
            await this.handleQuizCompleted(quizEvent);
          },
        )
        .when(
          (e): e is UserActivityEvent => e instanceof UserActivityEvent,
          async (activityEvent) => {
            await this.handleUserActivity(activityEvent);
          },
        )
        .otherwise(() => {
          throw new Error("Unknown event type");
        });
    } catch (error) {
      console.error("Error handling event:", error);
    }
  }

  private async handleQuizCompleted(event: QuizCompletedEvent) {
    await this.statisticsService.createQuizAttempt({
      userId: event.userId,
      courseId: event.courseId,
      lessonId: event.lessonId,
      correctAnswers: event.correctAnswers,
      wrongAnswers: event.wrongAnswers,
      score: event.score,
    });
  }

  private async handleUserActivity(event: UserActivityEvent) {
    await this.statisticsService.updateUserActivity(event.userId);
  }
}
