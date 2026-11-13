import { generateStudentPlan } from "./engine/generateStudentPlan.js";

const START = "2030-06-01";
const END = "2030-06-20";
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const input = {
  student: {
    id: "student-replan-test",
    branch: "CSE",
    year: 3,
    semester: "3-1",
    semesterStart: START,
    semesterEnd: END,
  },
  exams: [{ id: "end-exams", type: "end", name: "End exam", startDate: END, endDate: END }],
  holidays: [],
  subjects: [{
    id: "s1",
    name: "Test subject",
    confidence: "okay",
    difficulty: 2,
    endExamDate: END,
    units: [{ id: "s1-u1-p1", name: "Unit 1 part 1", estHours: 2, percentComplete: 0, mid: null }],
  }],
  assignments: [],
  collegeTimings: [],
  dailyStudyHours: weekdays.map((weekday) => ({ weekday, availableHours: 5 })),
  routine: { wakeTime: "06:00", sleepTime: "23:00", preferredStudyTime: "morning", fixedCommitments: [] },
  settings: { studyMode: "academics-only", sessionStepMinutes: 10, minSessionMinutes: 30, sessionMinutes: 60, breakMinutes: 10, revisionPercent: 10 },
};

const before = generateStudentPlan(input, START, END);
if (!before.plan.sessions.length) throw new Error("Test setup produced no sessions.");

const completedSession = before.plan.sessions.find(
  (session) => session.durationMinutes === 60 && session.type !== "revision" && session.taskId
);
if (!completedSession) throw new Error("Could not find a 60-minute first-pass session to mark done.");

const completedMinutesByTaskId = {
  [completedSession.taskId]: completedSession.durationMinutes,
};
const after = generateStudentPlan(
  { ...input, completedMinutesByTaskId },
  START,
  END,
  { completedMinutesByTaskId }
);

const scheduledMinutes = (result) => result.plan.sessions.reduce(
  (total, session) => total + Number(session.durationMinutes || 0),
  0
);
const taskMinutes = (result, taskId) => result.plan.sessions
  .filter((session) => String(session.taskId) === String(taskId))
  .reduce((total, session) => total + Number(session.durationMinutes || 0), 0);

const beforeTotal = scheduledMinutes(before);
const afterTotal = scheduledMinutes(after);
const beforeTask = taskMinutes(before, completedSession.taskId);
const afterTask = taskMinutes(after, completedSession.taskId);

if (beforeTotal - afterTotal !== completedSession.durationMinutes) {
  throw new Error(`Scheduled minutes should drop by ${completedSession.durationMinutes}; dropped ${beforeTotal - afterTotal}.`);
}
if (beforeTask - afterTask !== completedSession.durationMinutes) {
  throw new Error(`Task ${completedSession.taskId} should lose exactly ${completedSession.durationMinutes} scheduled minutes; dropped ${beforeTask - afterTask}.`);
}

console.log("Before scheduled minutes:", beforeTotal);
console.log("After scheduled minutes:", afterTotal);
console.log("Completed task:", completedSession.taskId, `(${completedSession.durationMinutes} min marked done)`);
console.log("COMPLETED REPLAN: ALL CHECKS PASSED");
