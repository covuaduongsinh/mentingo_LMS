# Chess Teacher Track Business Spec

## Business Overview

Cờ Vua Học Đường serves **two tracks**: student learning and **teacher / coach** development. The teacher track covers pedagogical skills, student psychology, lesson design, and use of the exercise/game banks to teach school-age learners.

## Who Uses It

- School chess teachers and club coaches enroll in teacher-oriented courses.
- Admins curate learning paths that mix pedagogy content with chess knowledge.

## Feature Functions

- Audience tagging on bank items (`teacher` | `both`)
- Courses and learning paths labeled for teachers (categories / paths)
- MCQ and text assessments for rules, psychology, pedagogy (no board required)
- Future: class assignment reports (phase 3)

## Key Technical Context

- Shared taxonomy: `CHESS_TOPICS.PEDAGOGY`, `STUDENT_PSYCHOLOGY`, …
- Reuses Mentingo courses, groups, and quiz engine
- Permissions for bank manage map to content creator / admin roles

## Non-Goals (current)

- Separate LMS for teachers only
- Parent guardian accounts (later)
