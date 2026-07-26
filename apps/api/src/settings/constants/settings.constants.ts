import { SUPPORTED_LANGUAGES } from "@repo/shared";

const DEFAULT_COMPANY_INFORMATION = {
  companyName: "",
  companyShortName: "",
  registeredAddress: "",
  taxNumber: "",
  emailAddress: "",
  courtRegisterNumber: "",
};

export const DEFAULT_EMAIL_TRIGGERS = {
  userFirstLogin: false,
  userCourseAssignment: false,
  userShortInactivity: false,
  userLongInactivity: false,
  userChapterFinished: false,
  userCourseFinished: false,
};

export const DEFAULT_LIVE_TRAINING_MAX_PARALLEL_SESSIONS = 5;

export const DEFAULT_MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const DEFAULT_LOCKOUT_MINUTES = 15;

export const DEFAULT_AI_GENERATION_MONTHLY_LIMIT = 20;

export const DEFAULT_GLOBAL_SETTINGS = {
  unregisteredUserQAAccessibility: false,
  QAEnabled: false,
  unregisteredUserNewsAccessibility: false,
  newsEnabled: false,
  unregisteredUserArticlesAccessibility: false,
  articlesEnabled: false,
  learningPathsEnabled: false,
  unregisteredUserCoursesAccessibility: false,
  modernCourseListEnabled: true,
  courseDiscussionsEnabled: false,
  calendarEnabled: true,
  liveTrainingEnabled: false,
  liveTrainingMaxParallelSessions: DEFAULT_LIVE_TRAINING_MAX_PARALLEL_SESSIONS,
  aiGenerationMonthlyLimit: DEFAULT_AI_GENERATION_MONTHLY_LIMIT,
  companyInformation: DEFAULT_COMPANY_INFORMATION,
  enforceSSO: false,
  certificateBackgroundImage: null,
  platformLogoS3Key: null,
  loginBackgroundImageS3Key: null,
  platformSimpleLogoS3Key: null,
  MFAEnforcedRoles: [],
  defaultCourseCurrency: "pln",
  inviteOnlyRegistration: false,
  userEmailTriggers: DEFAULT_EMAIL_TRIGGERS,
  primaryColor: null,
  contrastColor: null,
  loginPageFiles: [],
  maxFailedLoginAttempts: DEFAULT_MAX_FAILED_LOGIN_ATTEMPTS,
  lockoutMinutes: DEFAULT_LOCKOUT_MINUTES,
};

export const DEFAULT_STUDENT_SETTINGS = {
  language: SUPPORTED_LANGUAGES.EN,
  isMFAEnabled: false,
  MFASecret: null,
};

export const DEFAULT_ADMIN_SETTINGS = {
  ...DEFAULT_STUDENT_SETTINGS,
  adminNewUserNotification: true,
  adminFinishedCourseNotification: false,
  adminOverdueCourseNotification: false,
  configWarningDismissed: false,
};

export const ALLOWED_CURRENCIES = ["pln", "eur", "gbp", "usd"] as const;
