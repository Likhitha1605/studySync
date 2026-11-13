import { generateStudentPlan } from "./engine/generateStudentPlan.js";
import { buildWorkItems } from "./engine/buildWorkItems.js";
import fs from "fs";

const src = fs.readFileSync(new URL("./testInput.js", import.meta.url), "utf8");
const base = eval("(()=>{" + src + "; return input;})()");
const errors = [];
const expect = (cond, msg) => { if (!cond) errors.push(msg); };

function run(assignments, today = "2026-10-24", time = "17:52") {
  const input = structuredClone(base);
  input.holidays = [{ date: "2026-10-22", study: true }, { date: "2026-10-23", study: true }];
  input.assignments = assignments;
  const r = generateStudentPlan(input, today, input.student.semesterEnd, { now: { date: today, time } });
  const items = Object.fromEntries(buildWorkItems(input, today, input.student.semesterEnd).map((i) => [i.id, i]));
  const days = (id) => [...new Set(r.plan.sessions.filter((s) => s.taskId === id).map((s) => s.date))];
  return { r, items, days };
}

// Your current assignments (from the screenshot): FLAT 1 h and OS 3 h due 25 Oct, ML 3 h due 31 Oct. Today = 24 Oct.
const A = run([
  { id: "a1", title: "FLAT assignment", subjectId: "f", dueDate: "2026-10-25", estHours: 1 },
  { id: "a2", title: "OS assignment", subjectId: "o", dueDate: "2026-10-25", estHours: 3 },
  { id: "a3", title: "ML assignment", subjectId: "m", dueDate: "2026-10-31", estHours: 3 },
]);
console.log("Your current assignments (today 24 Oct 17:52):");
console.table(["a1", "a2", "a3"].map((id) => ({ id, opens: A.items[id].availableFrom, target: A.items[id].targetDate, latest: A.items[id].scheduleByDate, due: A.items[id].dueDate, scheduledOn: A.days(id).join(", ") || "NOT SCHEDULED" })));
expect(A.days("a1").every((d) => d === "2026-10-24") && A.days("a1").length === 1, "FLAT assignment should be done on 24 Oct");
expect(A.days("a2").every((d) => d === "2026-10-24") && A.days("a2").length === 1, "OS assignment should be done on 24 Oct");
expect(A.days("a3").length > 0, "ML assignment (due 31 Oct, right after the Mid II block) must be scheduled");
expect(A.days("a3").every((d) => d >= "2026-10-25" && d <= "2026-10-27"), "ML assignment must use 25-27 Oct, never the Mid II days");
expect(A.items.a3.availableFrom === "2026-10-25" && A.items.a3.targetDate === "2026-10-26" && A.items.a3.scheduleByDate === "2026-10-27", "ML window should be 25 / 26 / 27 Oct");
expect(A.r.plan.sessions.every((s) => s.date < "2026-10-28" || s.date > "2026-10-30"), "no sessions on Mid II days");
expect(A.r.plan.sessions.filter((s) => s.date === "2026-10-24").every((s) => s.startTime >= "17:55"), "nothing before the current time");

// Your expected-behaviour table (no exam block in the way): opens 3, target 2, latest 1 study day before the due date.
const B = run([
  { id: "x1", title: "Due 27 Oct", subjectId: "f", dueDate: "2026-10-27", estHours: 1 },
  { id: "x3", title: "Due 5 Nov", subjectId: "f", dueDate: "2026-11-05", estHours: 1 },
], "2026-10-20", "08:00");
console.table(["x1", "x3"].map((id) => ({ id, due: B.items[id].dueDate, opens: B.items[id].availableFrom, target: B.items[id].targetDate, latest: B.items[id].scheduleByDate })));
expect(B.items.x1.availableFrom === "2026-10-24" && B.items.x1.targetDate === "2026-10-25", "due 27 Oct: opens 24, target 25");
expect(B.items.x3.availableFrom === "2026-11-02" && B.items.x3.targetDate === "2026-11-03", "due 5 Nov: opens 2 Nov, target 3 Nov");
expect(B.days("x1").every((d) => d >= "2026-10-24") && B.days("x3").every((d) => d >= "2026-11-02"), "never scheduled before it opens");

// Added late: added on 26 Oct for a 27 Oct deadline -> may use the day before the deadline.
const C = run([{ id: "c1", title: "Late", subjectId: "f", dueDate: "2026-10-27", estHours: 1, assignedOn: "2026-10-26" }], "2026-10-24", "08:00");
console.log("Added late (26 Oct, due 27 Oct): scheduled on", C.days("c1").join(", "));
expect(C.days("c1").length === 1 && C.days("c1")[0] === "2026-10-26", "late assignment goes on the day before the deadline");

// Already past (or due today): overdue, reported, never silently planned.
const D = run([{ id: "d1", title: "Old", subjectId: "f", dueDate: "2026-10-20", estHours: 2 }, { id: "d2", title: "Today", subjectId: "f", dueDate: "2026-10-24", estHours: 1 }]);
const od = D.r.plan.unscheduled.filter((u) => u.status === "overdue").map((u) => u.id);
console.log("Overdue list:", od.join(", "));
expect(od.includes("d1") && od.includes("d2") && D.days("d1").length === 0, "past and same-day deadlines are overdue and not scheduled");
expect(D.r.realityCheck.every((x) => !x.itemsFallingShort.some((i) => i.id === "d1")), "overdue work is not counted in the Reality Check");

console.log(errors.length ? "\nERRORS:\n- " + errors.join("\n- ") : "\nASSIGNMENT RULES: ALL CHECKS PASSED");
process.exit(errors.length ? 1 : 0);