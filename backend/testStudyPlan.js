import { generateStudentPlan } from "./engine/generateStudentPlan.js";
import { sampleStudent } from "./data/sampleStudent.js";

const START = "2026-10-23";
const END = "2026-11-21";

const result = generateStudentPlan(sampleStudent, START, END);

if (result.errors?.length) {
  console.log("Input errors:");
  result.errors.forEach((e) => console.log(" -", e));
  process.exit(1);
}

const { sessions, unscheduled, carriedOver, lateCompleted } = result.plan;
const step = sampleStudent.settings?.sessionStepMinutes ?? 10;

// Map each unit id to its subject name
const unitToSubject = new Map();
for (const subject of sampleStudent.subjects) {
  for (const unit of subject.units) {
    unitToSubject.set(unit.id, subject.name);
  }
}

function subjectFor(item) {
  const baseId = item.id.replace(/-revision$/, "");
  return unitToSubject.get(baseId) ?? "Assignments and other";
}

const toHours = (minutes) => Number((minutes / 60).toFixed(2));

console.log("\nStatus:", result.status);
console.log(result.message);

// 1. Work that will not be covered, grouped by subject
const bySubject = {};
for (const item of unscheduled) {
  const name = subjectFor(item);
  if (!bySubject[name]) {
    bySubject[name] = { firstPassMinutes: 0, revisionMinutes: 0, items: 0 };
  }
  if (item.type === "revision") {
    bySubject[name].revisionMinutes += item.remainingMinutes;
  } else {
    bySubject[name].firstPassMinutes += item.remainingMinutes;
  }
  bySubject[name].items += 1;
}

console.log("\nWork that will NOT be covered, by subject:");
console.table(
  Object.entries(bySubject).map(([subject, v]) => ({
    subject,
    items: v.items,
    firstPassHours: toHours(v.firstPassMinutes),
    revisionHours: toHours(v.revisionMinutes),
    totalHours: toHours(v.firstPassMinutes + v.revisionMinutes),
  }))
);

const totalFirstPass = unscheduled
  .filter((i) => i.type !== "revision")
  .reduce((sum, i) => sum + i.remainingMinutes, 0);
const totalRevision = unscheduled
  .filter((i) => i.type === "revision")
  .reduce((sum, i) => sum + i.remainingMinutes, 0);

console.log(
  `\nTotal not covered: ${toHours(totalFirstPass)} h first-pass, ` +
    `${toHours(totalRevision)} h revision.`
);

// 2. Work that was finished, but after its original deadline
console.log("\nFinished after the original deadline:");
console.table(
  lateCompleted.map((l) => ({
    title: l.title,
    dueDate: l.dueDate,
    completedOn: l.completedOn,
  }))
);

// 3. Work moved to a later deadline
console.log("\nMoved to a later deadline:");
console.table(
  carriedOver.map((c) => ({
    title: c.title,
    missedDeadline: c.missedDeadline,
    carriedTo: c.carriedTo,
    remainingMinutes: c.remainingMinutes,
  }))
);

// 4. Sanity check on sessions
const badSessions = sessions.filter(
  (s) => s.date < START || s.durationMinutes < step || s.durationMinutes % step !== 0
);
if (badSessions.length > 0) {
  throw new Error(
    `Invalid sessions: ${badSessions.length}. First: ${JSON.stringify(badSessions[0])}`
  );
}

console.log(`\nSessions scheduled: ${sessions.length}`);
console.log("Engine check passed.");
const examDaySessions = sessions.filter((session) =>
  sampleStudent.exams.some((exam) => session.date >= exam.startDate && session.date <= (exam.endDate || exam.startDate))
);
if (examDaySessions.length) {
  throw new Error(`Exam-day blocking failed: ${examDaySessions.length} sessions landed on exam dates.`);
}
console.log("Exam-day blocking check passed.");
