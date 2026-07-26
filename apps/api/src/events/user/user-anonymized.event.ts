import type { UUIDType } from "src/common";
import type { ActorUserType } from "src/common/types/actor-user.type";

type UserAnonymizedData = {
  userId: UUIDType;
  actor: ActorUserType;
};

/** Published after a GDPR anonymize request scrubs a user's PII in place. */
export class UserAnonymizedEvent {
  constructor(public readonly userAnonymizedData: UserAnonymizedData) {}
}
