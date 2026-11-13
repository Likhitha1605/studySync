import { generateStudentPlan } from "./engine/generateStudentPlan.js";
import { analyzeWorkload } from "./engine/analyzeWorkload.js";
import { sampleStudent } from "./data/sampleStudent.js";
import { mapFormToStudentInput } from "../frontend/src/planAdapter.js";

const START = "2026-10-23";
const END = "2026-11-21";
const NOW = { date: "2026-10-23", time: "06:00" };
const assert = (condition, message) => { if (!condition) throw new Error(message); };

// Scenario 1: exam dates have no study sessions, including the Mid-II range.
const academicPlan = generateStudentPlan(structuredClone(sampleStudent), START, END, { now: NOW });
const examDays = sampleStudent.exams.flatMap((exam) => {
  const dates = [];
  for (let date = exam.startDate; date <= (exam.endDate || exam.startDate);) {
    dates.push(date);
    const next = new Date(`${date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    date = next.toISOString().slice(0, 10);
  }
  return dates;
});
assert(!academicPlan.plan.sessions.some((session) => examDays.includes(session.date)), "Sessions were scheduled on an exam date.");

// Scenario 2: GATE time is reserved separately and included in the same timetable.
const gateInput = structuredClone(sampleStudent);
gateInput.settings.studyMode = "academics-gate";
gateInput.settings.gateHoursPerDay = 1;
const gatePlan = generateStudentPlan(gateInput, START, END, { now: NOW });
assert(gatePlan.plan.sessions.some((session) => session.type === "gate"), "GATE mode did not create GATE sessions.");
const academicDay = gatePlan.plan.sessions.find((session) => session.type === "gate")?.date;
const daySessions = gatePlan.plan.sessions.filter((session) => session.date === academicDay);
assert(daySessions.some((session) => session.type === "gate"), "Reserved GATE session missing from the shared timetable.");
const dayWindows = (await import("./engine/buildAvailabilityWindows.js")).buildAvailabilityWindows(gateInput, academicDay, academicDay, new Date(`${academicDay}T06:00:00`));
const dayCapacity = Math.floor(Math.min(dayWindows[0].freeHours, dayWindows[0].studyLimitHours) * 60);
assert(daySessions.reduce((sum, session) => sum + session.durationMinutes, 0) <= dayCapacity, "Academic + GATE sessions exceeded the daily capacity.");
const sortedDaySessions = [...daySessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
const toMinutes = (time) => { const [hours, minutes] = time.split(":").map(Number); return hours * 60 + minutes; };
for (let i = 1; i < sortedDaySessions.length; i += 1) {
  const gap = toMinutes(sortedDaySessions[i].startTime) - toMinutes(sortedDaySessions[i - 1].endTime);
  assert(gap >= 10, `Missing break between ${sortedDaySessions[i - 1].title} and ${sortedDaySessions[i].title} on ${academicDay}.`);
}

// Scenario 3: Reality Check explicitly deducts GATE allocation from academic capacity.
const academicReport = analyzeWorkload(sampleStudent, START, END, new Date(`${NOW.date}T${NOW.time}:00`));
const gateReport = analyzeWorkload(gateInput, START, END, new Date(`${NOW.date}T${NOW.time}:00`));
const matchingGateDeadline = gateReport.find((item) => item.deadline === academicReport.at(-1)?.deadline);
assert(matchingGateDeadline && matchingGateDeadline.availableHours < academicReport.at(-1).availableHours, "Reality Check did not reserve GATE time from academic capacity.");

// Scenario 4: unit completion stays intact even when its topic is outside Mid-I coverage.
const mapped = mapFormToStudentInput({
  today: START, semesterStart: START, semesterEnd: END,
  mid1From: "2026-08-01", mid1To: "2026-08-02", mid2From: "2026-10-28", mid2To: "2026-10-30",
  endFrom: "2026-11-09", endTo: END, weekdayHours: "5", sundayHours: "7",
  subjects: [{ id: 1, name: "Test", units: "5", midCoverage: "Units 1 – 2", mid2Coverage: "Units 3 – 4", unitDetails: Array.from({length:5}, (_,i)=>({name:`U${i+1}`,estHours:"2",percentComplete:i===4?"75":"0"})) }],
  assignments: [], collegeDays: [],
});
const finalUnit = mapped.subjects[0].units.find((unit) => unit.parentUnitId === "1-u5");
assert(finalUnit && finalUnit.percentComplete === 75 && finalUnit.mid === null, "Completion percentage for end-exam coverage was lost or misclassified.");

// Scenario 5: overloaded work remains explicitly marked as not ready.
assert(academicPlan.status === "needs-adjustment" && academicPlan.canUseAsFinalPlan === false, "Overloaded plan was incorrectly marked ready.");
console.log("Batch 1 scenario checks passed: exam blocking, GATE reservation, capacity accounting, unit completion mapping, overload status.");
