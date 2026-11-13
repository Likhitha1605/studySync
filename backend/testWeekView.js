import { getSessionsForWeek, getWeekDates } from "../frontend/src/planHelpers.js";

const weekStart = "2026-10-19"; // Monday
const sessions = [
  { id: "s3", date: "2026-10-20", startTime: "10:00", endTime: "11:00", durationMinutes: 60 },
  { id: "s1", date: "2026-10-19", startTime: "09:00", endTime: "10:00", durationMinutes: 60 },
  { id: "s2", date: "2026-10-19", startTime: "11:00", endTime: "12:00", durationMinutes: 60 },
  { id: "outside-before", date: "2026-10-18", startTime: "12:00", endTime: "13:00", durationMinutes: 60 },
  { id: "outside-after", date: "2026-10-26", startTime: "12:00", endTime: "13:00", durationMinutes: 60 },
  { id: "duplicate", date: "2026-10-22", startTime: "09:00", endTime: "09:30", durationMinutes: 30 },
  { id: "duplicate", date: "2026-10-22", startTime: "09:00", endTime: "09:30", durationMinutes: 30 },
];

const dates = getWeekDates(weekStart);
const result = getSessionsForWeek(sessions, weekStart);
const expected = sessions.filter((session) => dates.includes(session.date));
const expectedUnique = [...new Map(expected.map((session) => [session.id, session])).values()];
const expectedByIdentity = [...expectedUnique].sort(
  (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id)
);

if (dates.length !== 7) throw new Error(`Expected exactly 7 days, got ${dates.length}.`);
if (result.length !== expectedByIdentity.length) throw new Error(`Expected ${expectedByIdentity.length} week sessions, got ${result.length}.`);
if (result.some((session) => !dates.includes(session.date))) throw new Error("Week view included a session outside Monday–Sunday.");
if (new Set(result.map((session) => session.id)).size !== result.length) throw new Error("Week view returned duplicate sessions.");
if (result.map((session) => session.id).join(",") !== expectedByIdentity.map((session) => session.id).join(",")) {
  throw new Error("Week view did not preserve the engine sessions in date/time order.");
}

console.log("Week starts Monday:", dates[0], "through", dates[6]);
console.log("Sessions returned:", result.length);
console.log("WEEK VIEW: ALL CHECKS PASSED");
