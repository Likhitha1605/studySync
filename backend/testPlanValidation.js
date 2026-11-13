
import { buildStudyPlan } from "./engine/buildStudyPlan.js";
import { buildAvailabilityWindows } from "./engine/buildAvailabilityWindows.js";
import { sampleStudent } from "./data/sampleStudent.js";

const startDate = "2026-10-21";
const endDate = "2026-11-21";
const testNow = new Date("2026-10-21T12:00:00+05:30");

const plan = buildStudyPlan(sampleStudent, startDate, endDate, testNow);
const windows = buildAvailabilityWindows(
  sampleStudent,
  startDate,
  endDate,
  testNow
);

const errors = [];
const settings = sampleStudent.settings || {};

const capacity = Number(settings.dailyCapacityHours ?? Infinity);
const focusMinutes = Number(
  sampleStudent.routine?.maxFocusMinutes ||
  settings.sessionMinutes ||
  50
);

const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// 1. Every session must have a valid duration and time range.
for (const session of plan.sessions) {
  const duration = toMinutes(session.endTime) - toMinutes(session.startTime);

  if (duration < 25 || duration > focusMinutes) {
    errors.push(`Invalid duration: ${session.title} on ${session.date}`);
  }

  if (duration !== session.durationMinutes) {
    errors.push(`Duration mismatch: ${session.title} on ${session.date}`);
  }

  // Syllabus preparation must finish before the exam starts.
  if (["first-pass", "revision"].includes(session.type) && session.date >= session.dueDate) {
    errors.push(`Study scheduled too late: ${session.title}`);
  }

  // Assignments may be completed on their due date, but not afterwards.
  if (session.type === "assignment" && session.date > session.dueDate) {
    errors.push(`Assignment scheduled too late: ${session.title}`);
  }
}
// 2. Every session must fit inside an actual free-time window.
for (const session of plan.sessions) {
  const day = windows.find((item) => item.date === session.date);

  const fits = day?.intervals.some(
    (interval) =>
      session.startTime >= interval.start &&
      session.endTime <= interval.end
  );

  if (!fits) {
    errors.push(
      `Session outside available time: ${session.title} on ${session.date}`
    );
  }
}

// 2. Sessions must not overlap on the same day.
const byDate = new Map();

for (const session of plan.sessions) {
  if (!byDate.has(session.date)) byDate.set(session.date, []);
  byDate.get(session.date).push(session);
}

for (const [date, sessions] of byDate) {
  sessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

  for (let i = 1; i < sessions.length; i++) {
    if (sessions[i].startTime < sessions[i - 1].endTime) {
      errors.push(
        `Overlapping sessions on ${date}: ${sessions[i - 1].title} / ${sessions[i].title}`
      );
    }
  }
}

// 3. Daily scheduled study time must respect the capacity and buffer.
for (const day of windows) {
  const scheduled = plan.sessions
    .filter((session) => session.date === day.date)
    .reduce((sum, session) => sum + session.durationMinutes, 0);

  const allowed = Math.floor(
    Math.min(day.freeHours, day.studyLimitHours, capacity) * 60
  );

  if (scheduled > allowed) {
    errors.push(
      `Daily limit exceeded on ${day.date}: ${scheduled} > ${allowed} minutes`
    );
  }
}

// 4. Summary counts must agree with the actual task report.
if (plan.summary.totalSessions !== plan.sessions.length) {
  errors.push("Session count does not match the summary.");
}

if (plan.summary.unscheduledTasks !== plan.unscheduled.length) {
  errors.push("Unscheduled-task count does not match the summary.");
}

if (
  plan.summary.missedDeadlines !==
  plan.unscheduled.filter((task) => task.status === "deadline-missed").length
) {
  errors.push("Missed-deadline count does not match the task report.");
}

console.log("Sessions:", plan.summary.totalSessions);
console.log("Unscheduled tasks:", plan.summary.unscheduledTasks);
console.log("Missed deadlines:", plan.summary.missedDeadlines);

if (errors.length > 0) {
  console.error("\n❌ Validation failed:");
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("\n✅ All current timetable validation checks passed.");
}
