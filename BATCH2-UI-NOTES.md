# StudySync Batch 2 UI notes

This package builds on Batch 1 and adds the post-generation StudySync dashboard UI.

## Dashboard views
- Left navigation with Dashboard, My Plan, Student Details, Semester & Exam Dates, Subjects & Syllabus, Free Time & Routine, GATE Plan, Assignments, and Settings.
- Monthly calendar with clickable dates and session/event markers.
- Upcoming events and subject completion progress panels.
- Semester roadmap/timeline, selected-day schedule, and Reality Check.
- Mark-session-done controls for the currently generated plan.
- Quick Actions to edit the student details, semester dates, subjects, and available time.

## Timetable start mode
On the Review step, select either:
- **From present date**: the generation API receives today's date as `startDate`.
- **From semester starting date**: the generation API receives the configured `semesterStart` as `startDate`. If no semester start date is configured, generation returns to the Semester dates step with a validation message.

The choice is available in Settings after generation as well; choosing a new basis returns to Review so the student can regenerate with that range.

## Run
From the `studysync-v2` folder:
1. `npm install`
2. Terminal 1: `node backend/server.js`
3. Terminal 2: `npm run dev`

The backend remains the Batch 1 engine. This environment passed the existing engine test suite and a TypeScript parser syntax check, but the full Vite production build could not be run here because dependency installation timed out.
