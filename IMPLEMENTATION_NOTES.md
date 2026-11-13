# StudySync — Four Requested Changes

## What changed

1. **Completed sessions and replan from today**
   - `frontend/src/main.jsx`: profile-scoped localStorage for completed sessions, restore/save behavior, and the **Replan from today** action.
   - `backend/server.js`: accepts completed session snapshots, deduplicates them, and sums minutes by the exact engine `taskId`.
   - `backend/engine/buildWorkItems.js`: subtracts those minutes from the corresponding first-pass unit ID, `${unit.id}-revision` ID, or assignment ID before planning.
   - `backend/testCompletedReplan.js`: verifies one completed 60-minute session reduces total and same-task scheduled minutes by exactly 60.

2. **Week View**
   - `frontend/src/planHelpers.js`: Monday-to-Sunday date helper, week filtering, duplicate removal, sorting, current-week subject summary, and gap calculation.
   - `frontend/src/main.jsx` and `frontend/src/style.css`: Week View tab, previous/next week navigation, seven day columns, break-gap rows, day-to-Daily-view navigation, and This week subject summary.
   - `backend/testWeekView.js`: confirms seven dates, correct sessions, ordering, and no duplicates or outside-week sessions.

3. **Returning student setup and sample setup**
   - `frontend/src/main.jsx` and `frontend/src/style.css`: profile-scoped last-setup storage, **Use my last setup**, **Start new**, **Start from sample**, a visible sample-data warning, and Review values with Edit links. Academic form data starts blank; no new academic defaults were added.

4. **Warnings and Reality Check**
   - `backend/engine/generateStudentPlan.js`: returns one warnings array, merges validation warnings, checks unscheduled work, exam-day sessions, deadline shortages, front-loaded schedules, units over 15 hours, and revision percentage differing from 10; blocking warnings sort first. `status` is ready only when there are no blocking warnings and no unscheduled work.
   - `frontend/src/main.jsx` and `frontend/src/style.css`: displays warnings in Review and the Reality Check modal.
   - `backend/testWarnings.js`: triggers the specified warning types and verifies a clean input returns no warnings.

## Settings and protected files

- `frontend/src/planAdapter.js` was **not changed**. The existing settings were preserved as instructed.
- `backend/engine/getDailyStudyMinutes.js` was **not changed**; the intentional GATE reservation is preserved.
- Other engine files were not modified except `buildWorkItems.js` (completed-minute subtraction) and `generateStudentPlan.js` (the requested warnings/status work).

## Test results

Passed:
- `node backend/testBuildSlots.js`
- `node backend/testStudyPlan.js`
- `node backend/testWorkload.js`
- `node backend/testGenerateStudentPlan.js`
- `node backend/testCompletedReplan.js`
- `node backend/testWeekView.js`
- `node backend/testWarnings.js`

Known or baseline failures left unchanged:
- `node backend/testWorkloadAdjustment.js`: fails because `backend/testInput.js` is missing, as specified.
- `node backend/testBatch1Scenarios.js`: fails because GATE sessions are not yet generated, as specified.
- `node backend/testPlanValidation.js`: fails the existing minimum-30-minute validation expectation for short sessions, as specified.
- `node backend/testAdaptiveAssignmentWindow.js`: also fails against the untouched uploaded ZIP with the same result (`actual 2026-10-25`, expected `2026-10-19`). This is an existing mismatch between that test and the assignment-window behavior in the supplied source; this task did not change the assignment-window policy.
- `package.json` references `backend/testAssignmentDeadlines.js` in `test:engine`, but that test file is absent from the uploaded project. It was not created or changed because it is outside this task scope.

Frontend JSX syntax was parsed successfully. A full Vite build could not be run in this container because the supplied `node_modules` is a Windows install containing `@esbuild/win32-x64` and `@rollup/rollup-win32-x64`, while the container is Linux. `npm install` could not complete in this environment, so the browser build remains unverified here. On your machine, run `npm install` first, then the normal Vite build/dev command.

## Returning-user click check

From the setup start screen, click **Use my last setup** once. The code restores the saved form and sets the wizard directly to Review (`step = 5`), so the path from the start screen to Review is one click. Click Generate from Review to generate the plan. This was checked by tracing the component state transition; it was not browser-tested because the native frontend build dependency is unavailable in this environment.

## Task ID assumption

The engine's generated sessions contain `taskId` from the work-item ID. Therefore completed minutes are keyed by the emitted `session.taskId`, not by `session.id` or a parent unit ID. Adapter-split units are handled through their actual IDs (for example `s1-u3-p1`), while revision minutes use `<unit id>-revision`. The server deduplicates snapshots by `sessionKey` before aggregating minutes.

## Commands

```bash
npm install
node backend/server.js
npm run dev

# Existing engine tests, each separately
node backend/testBuildSlots.js
node backend/testStudyPlan.js
node backend/testWorkload.js
node backend/testGenerateStudentPlan.js

# New tests
node backend/testCompletedReplan.js
node backend/testWeekView.js
node backend/testWarnings.js
```
