import { generateStudentPlan, buildPlanWarnings } from "./engine/generateStudentPlan.js";

const START = "2030-06-01";
const END = "2030-06-30";
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dailyStudyHours = weekdays.map((weekday) => ({ weekday, availableHours: 6 }));

function baseInput() {
  return {
    student: { id: "warning-test", branch: "CSE", year: 3, semester: "3-1", semesterStart: START, semesterEnd: END },
    exams: [
      { id: "mid-1", type: "mid", name: "Mid I", startDate: "2030-06-15", endDate: "2030-06-15" },
      { id: "end-exams", type: "end", name: "End exams", startDate: END, endDate: END },
    ],
    holidays: [],
    subjects: [{
      id: "s1", name: "Test subject", confidence: "okay", difficulty: 2, endExamDate: END,
      units: [{ id: "s1-u1", name: "Long unit", estHours: 16, percentComplete: 0, mid: null }],
    }],
    assignments: [{ id: "a-no-date", title: "Assignment missing deadline", subjectId: "s1", estHours: 1 }],
    collegeTimings: [],
    dailyStudyHours,
    routine: { wakeTime: "06:00", sleepTime: "23:00", preferredStudyTime: "morning", fixedCommitments: [] },
    settings: { studyMode: "academics-only", sessionStepMinutes: 10, minSessionMinutes: 30, sessionMinutes: 60, breakMinutes: 10, revisionPercent: 25 },
  };
}

const warningInput = baseInput();
const syntheticPlan = {
  sessions: [
    { id: "early-1", date: "2030-06-01", startTime: "08:00", endTime: "09:00", durationMinutes: 60, taskId: "s1-u1", title: "Long unit" },
    { id: "early-2", date: "2030-06-02", startTime: "08:00", endTime: "09:00", durationMinutes: 60, taskId: "s1-u1", title: "Long unit" },
    { id: "exam-day", date: "2030-06-15", startTime: "08:00", endTime: "08:30", durationMinutes: 30, taskId: "s1-u1", title: "Long unit" },
    { id: "late-1", date: "2030-06-20", startTime: "08:00", endTime: "08:10", durationMinutes: 10, taskId: "s1-u1", title: "Long unit" },
  ],
  unscheduled: [{ id: "s1-u1", title: "Long unit", type: "study", dueDate: END, remainingMinutes: 60 }],
};
const syntheticReality = [{ deadline: END, requiredHours: 20, availableHours: 18, shortageHours: 2, feasible: false }];
const warnings = buildPlanWarnings(warningInput, START, END, syntheticReality, syntheticPlan);
const allMessages = warnings.map((item) => item.message).join("\n");
const has = (pattern) => warnings.some((item) => pattern.test(item.message));
const blocking = warnings.filter((item) => item.severity === "blocking");
if (!has(/unscheduled/i) || !blocking.length) throw new Error("Missing blocking warning for unscheduled work.");
if (!has(/exam day/i)) throw new Error("Missing blocking warning for a session on an exam day.");
if (!has(/shortage/i)) throw new Error("Missing blocking warning for a deadline shortage.");
if (!has(/Your plan is front-loaded\. Spread the work to avoid burnout\./)) throw new Error("Missing front-loaded-plan info warning.");
if (!has(/over 15 hours/i)) throw new Error("Missing over-15-hour-unit info warning.");
if (!has(/not the recommended 10%/i)) throw new Error("Missing non-10% revision warning.");
if (!has(/no dueDate/i)) throw new Error("Existing validateInput warning was not merged into warnings.");
const firstInfoIndex = warnings.findIndex((item) => item.severity !== "blocking");
if (firstInfoIndex >= 0 && warnings.slice(firstInfoIndex).some((item) => item.severity === "blocking")) {
  throw new Error("Warnings are not sorted with blocking warnings first.");
}

const cleanInput = baseInput();
cleanInput.exams = [{ id: "end-exams", type: "end", name: "End exams", startDate: END, endDate: END }];
cleanInput.subjects[0].units = [{ id: "s1-u1", name: "Completed unit", estHours: 0, percentComplete: 100, mid: null }];
cleanInput.assignments = [];
cleanInput.settings.revisionPercent = 10;
const cleanResult = generateStudentPlan(cleanInput, START, END);
if (!Array.isArray(cleanResult.warnings)) throw new Error("generateStudentPlan did not return a warnings array.");
if (cleanResult.warnings.length !== 0) {
  throw new Error(`Expected clean plan to have no warnings, got:\n${cleanResult.warnings.map((item) => `${item.severity}: ${item.message}`).join("\n")}`);
}
if (cleanResult.status !== "ready") throw new Error(`Clean plan should be ready, got ${cleanResult.status}.`);

console.log("Triggered warnings:", warnings.length);
console.log("Clean-plan warnings:", cleanResult.warnings.length);
console.log("PLAN WARNINGS: ALL CHECKS PASSED");
