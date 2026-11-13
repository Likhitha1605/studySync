import { sampleStudent } from "./data/sampleStudent.js";
import { GATE_DATA, attemptYearOptions, defaultGateDate, paperForBranch } from "./engine/gateData.js";
import { buildGatePlan } from "./engine/buildGatePlan.js";
import { generatePlanForMode } from "./engine/generatePlanForMode.js";
import { buildAvailabilityWindows } from "./engine/buildAvailabilityWindows.js";
import { getDailyStudyMinutes } from "./engine/getDailyStudyMinutes.js";

const base = structuredClone(sampleStudent);
base.holidays = [
  { date: "2026-10-24", study: true },
  { date: "2026-10-25", study: true },
];

const errors = [];
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};
const hm = (minutes) => `${(minutes / 60).toFixed(1)} h`;
const sumAcademicMinutes = (result) =>
  result.plan.sessions.reduce((total, session) => total + session.durationMinutes, 0);
const weekAt = (result, start) => result.weeks.find((week) => week.start === start);

// A. Short plan: 24 Oct 2026 to the selected default GATE date (6 Feb 2027).
// Capacity is independent of academic semester dates, exams, holidays and free-time inputs.
const A = buildGatePlan(base, { today: "2026-10-24", gateDate: "2027-02-06" });
console.log(`A. mode=${A.mode} | ${A.monthsAvailable} months, ${A.weeksAvailable} weeks | revision weeks ${A.revisionWeeks}`);
console.log(`   capacity ${hm(A.capacity.totalMinutes)} (learning ${hm(A.capacity.learningMinutes)}) | syllabus ${hm(A.coverage.totalMinutes)} | selected ${A.coverage.percentHours}% of hours, ${A.coverage.marksCovered} of ${A.coverage.marksTotal} estimated marks`);
console.table(A.subjects.map((subject) => ({
  subject: subject.name,
  marks: subject.marks,
  hours: subject.hours,
  planned: subject.selectedHours,
  rank: subject.rank,
  status: subject.status,
})));
console.table(A.months.map((month) => ({
  month: month.key,
  hours: +(month.capacityMinutes / 60).toFixed(1),
  mocks: month.mocks,
  weeks: month.weeks.length,
})));
console.log("   First 3 weeks:");
A.weeks.slice(0, 3).forEach((week) => {
  console.log(`   ${week.start}..${week.end} [${week.phase}] ${hm(week.capacityMinutes)} -> ${week.targets.join(" | ")}`);
});
console.log("   Warnings:", A.warnings.map((warning) => warning.message).join(" // "));

expect(A.ok && A.mode === "short", "A should be a short plan");
expect(A.weeksAvailable === 16, `A should expose 16 calendar weeks, got ${A.weeksAvailable}`);
expect(Math.abs(A.monthsAvailable - 3.7) <= 0.1, `A should be about 3.7 months, got ${A.monthsAvailable}`);
expect(!("days" in A), "GATE output must not expose a daily GATE timetable");

let sequence = 0;
const first = {};
const last = {};
const scheduled = {};
for (const week of A.weeks) {
  expect(week.scheduledMinutes <= week.capacityMinutes, `week ${week.start}: scheduled above capacity`);
  if (week.capacityMinutes > 0) {
    expect(week.scheduledMinutes === week.capacityMinutes, `week ${week.start}: capacity not fully represented`);
  }
  if (week.phase !== "learn") {
    expect(!week.items.some((item) => item.type === "learn"), `week ${week.start}: learning appears in revision/final phase`);
  }
  for (const item of week.items) {
    if (item.type !== "learn") continue;
    sequence += 1;
    first[item.chapterId] ??= sequence;
    last[item.chapterId] = sequence;
    scheduled[item.chapterId] = (scheduled[item.chapterId] || 0) + item.minutes;
  }
}

const allChapters = Object.fromEntries(
  GATE_DATA.CS.subjects.flatMap((subject) => subject.chapters.map((chapter) => [chapter.id, chapter]))
);
for (const [id, minutes] of Object.entries(scheduled)) {
  expect(minutes === allChapters[id].hours * 60, `${id}: scheduled ${minutes} min, expected ${allChapters[id].hours * 60}`);
}
for (const [id, chapter] of Object.entries(allChapters)) {
  if (scheduled[id] === undefined) {
    expect(A.skipped.some((item) => item.id === id), `${id}: neither scheduled nor listed as skipped`);
  }
  for (const requiredId of chapter.requires || []) {
    if (scheduled[requiredId] !== undefined && scheduled[id] !== undefined) {
      expect(last[requiredId] < first[id], `${id} starts before its prerequisite ${requiredId} finishes`);
    }
  }
}
expect(Object.keys(scheduled).length + A.skipped.length === Object.keys(allChapters).length, "every chapter should be scheduled or listed as skipped");
expect(weekAt(A, "2026-10-26")?.capacityMinutes === 720, `a full week should have 720 minutes at the 2-hour/day default, got ${weekAt(A, "2026-10-26")?.capacityMinutes}`);
expect(weekAt(A, "2026-11-23")?.capacityMinutes === 720, `a full week should use the same standalone capacity regardless of semester dates, got ${weekAt(A, "2026-11-23")?.capacityMinutes}`);
expect(A.weeks.at(-1)?.capacityMinutes === 480, `last week should have 480 minutes before the configured exam buffer, got ${A.weeks.at(-1)?.capacityMinutes}`);
expect(A.months.reduce((total, month) => total + month.capacityMinutes, 0) === A.capacity.totalMinutes, "monthly capacities must sum to total capacity");
expect(A.explanations.length >= 3 && A.subjects.every((subject) => subject.reason), "subjects and plan need explanations");

// B. Long plan beginning 1 July 2026. Foundation subject PDS should appear first.
const B = buildGatePlan(base, { today: "2026-07-01", gateDate: "2027-02-06" });
console.log(`\nB. mode=${B.mode} | ${B.monthsAvailable} months | revision weeks ${B.revisionWeeks} | selected ${B.coverage.percentHours}% of estimated hours`);
expect(B.ok && B.mode === "long", "B should be a long plan");
expect(B.revisionWeeks === 4, `B should reserve 4 final weeks, got ${B.revisionWeeks}`);
const firstLearningSubject = B.weeks
  .filter((week) => week.phase === "learn")
  .flatMap((week) => week.items.filter((item) => item.type === "learn" && item.subjectId !== "ga").map((item) => item.subjectId))[0];
expect(firstLearningSubject === "pds", `long plan should start with PDS foundation topics, got ${firstLearningSubject}`);

// C. Academics + GATE reserves time from academics; GATE is a separate weekly/monthly result.
const opts = { mode: "today", today: "2026-10-24", now: { date: "2026-10-24", time: "17:52" } };
const plain = generatePlanForMode(base, opts);
const combined = generatePlanForMode(base, {
  ...opts,
  gate: { enabled: true, minutesPerDay: 60, gateDate: "2027-02-06" },
});
const windows = Object.fromEntries(
  buildAvailabilityWindows(base, "2026-10-24", "2026-11-21").map((window) => [window.date, window])
);
const minutesByDate = {};
for (const session of combined.plan.sessions) {
  minutesByDate[session.date] = (minutesByDate[session.date] || 0) + session.durationMinutes;
}
for (const [date, minutes] of Object.entries(minutesByDate)) {
  const available = getDailyStudyMinutes(windows[date], base);
  const hasExam = (base.exams || []).some((exam) => date >= exam.startDate && date <= (exam.endDate || exam.startDate));
  const reservation = hasExam ? 0 : Math.min(60, available);
  expect(minutes <= available - reservation || hasExam, `${date}: academic sessions ${minutes} did not leave the GATE reserve`);
}
console.log(`\nC. academic minutes without GATE ${sumAcademicMinutes(plain)} -> with GATE ${sumAcademicMinutes(combined)}`);
expect(sumAcademicMinutes(combined) <= sumAcademicMinutes(plain), "GATE reservation must not add academic sessions");
expect(combined.gate?.ok && combined.gate.mode === "short", "generatePlanForMode should attach the GATE plan");
expect(!("days" in combined.gate), "GATE plan should expose no daily GATE schedule");

// D. All supported papers, branch detection, defaults and editable weightage.
for (const [branch, expectedPaper] of [["EEE", "EE"], ["ECE", "EC"], ["DS", "DA"]]) {
  const candidate = structuredClone(base);
  candidate.student.branch = branch;
  const result = buildGatePlan(candidate, { today: "2026-10-24", gateDate: "2027-02-06" });
  expect(result.ok === true, `${branch} should produce a GATE plan, not a data-not-added error: ${result.error || ""}`);
  expect(result.paper === expectedPaper, `${branch} should select paper ${expectedPaper}, got ${result.paper}`);
  expect(result.subjects?.length > 1, `${branch} should include subject-weightage data`);
  expect(result.weeks?.length === 16, `${branch} should expose the same 16-week calendar window in this test`);
  expect(result.capacity?.totalMinutes > 0, `${branch} should return usable plan capacity`);
}
expect(buildGatePlan(base, { today: "2027-02-10", gateDate: "2027-02-06" }).ok === false, "a past GATE date must be rejected");
const overridden = buildGatePlan(base, {
  today: "2026-10-24",
  gateDate: "2027-02-06",
  overrides: { marks: { algo: 30 } },
});
expect(overridden.subjects.find((subject) => subject.id === "algo")?.rank === 1, "weightage edits should change ranking");
expect(overridden.overrides.marks.algo === 30, "the active overrides should be returned with the plan");
expect(paperForBranch("CSE (AI & ML)") === "CS", "CSE AI & ML should map to CS data");
expect(paperForBranch("IT") === "CS", "IT should map to CS data");
expect(paperForBranch("CS") === "CS", "CS paper code should map to CS data");
expect(paperForBranch("EEE") === "EE", "EEE should map to the EE paper code");
expect(paperForBranch("ECE") === "EC", "ECE should map to the EC paper code");
expect(paperForBranch("DS") === "DA", "DS should map to the official DA paper code");
expect(paperForBranch("DA") === "DA", "DA paper code should map to DA data");
expect(paperForBranch("Data Science and Artificial Intelligence") === "DA", "Data Science and AI should map to DA");
expect(paperForBranch("CH") === "CH", "CH paper code should map to CH data");
expect(paperForBranch("Chemical Engineering") === "CH", "Chemical Engineering should map to CH data");
expect(paperForBranch("CE") === "CE", "CE paper code should map to CE data");
expect(paperForBranch("Civil Engineering") === "CE", "Civil Engineering should map to CE data");
expect(paperForBranch("ME") === "ME", "ME paper code should map to ME data");
expect(paperForBranch("Mechanical Engineering") === "ME", "Mechanical Engineering should map to ME data");
expect(paperForBranch("RA") === "RA", "RA paper code should map to RA data");
expect(paperForBranch("Robotics and Automation") === "RA", "Robotics and Automation should map to RA data");
expect(["CS", "CH", "CE", "DA", "EC", "EE", "ME", "RA"].every((code) => GATE_DATA[code]), "all eight requested GATE datasets should be present");

// Verify the added papers generate plans using explicit GATE paper selections,
// independent of the student's degree branch. RA requires one chosen optional part.
for (const [code, raPart] of [["CH", null], ["CE", null], ["DA", null], ["EC", null], ["EE", null], ["ME", null], ["RA", "B1"], ["RA", "B2"]]) {
  const result = buildGatePlan(base, {
    today: "2026-10-24",
    gateDate: "2027-02-06",
    paper: code,
    settings: raPart ? { raPart } : {},
  });
  expect(result.ok, `${code}${raPart ? ` ${raPart}` : ""} should generate a plan: ${result.error || ""}`);
  expect(result.paper === code, `${code}${raPart ? ` ${raPart}` : ""} should report the selected paper`);
  expect(result.subjects?.length > 1 && result.weeks?.length === 16, `${code}${raPart ? ` ${raPart}` : ""} should return subjects and weekly data`);
  if (code === "RA") {
    const optionSubjects = result.subjects.filter((subject) => subject.name.startsWith("Part B"));
    expect(optionSubjects.length > 0 && optionSubjects.every((subject) => subject.name.includes(raPart)), `RA ${raPart} should include only its chosen optional part`);
  }
  if (["CH", "CE", "ME", "DA", "EC", "EE", "RA"].includes(code)) {
    const markTotal = result.subjects.reduce((sum, subject) => sum + subject.marks, 0);
    expect(Math.abs(markTotal - 100) < 0.11, `${code}${raPart ? ` ${raPart}` : ""} editable planning marks should total 100; got ${markTotal}`);
  }
  const activeChapterIds = new Set(
    GATE_DATA[code].subjects
      .filter((subject) => !subject.part || subject.part === "COMMON" || !raPart || subject.part === raPart)
      .flatMap((subject) => subject.chapters.map((chapter) => chapter.id))
  );
  for (const subject of GATE_DATA[code].subjects.filter((subject) => !subject.part || subject.part === "COMMON" || !raPart || subject.part === raPart)) {
    for (const chapter of subject.chapters) {
      for (const requiredId of chapter.requires || []) {
        expect(activeChapterIds.has(requiredId), `${code}${raPart ? ` ${raPart}` : ""}: ${chapter.id} requires missing ${requiredId}`);
      }
    }
  }
}
const raWithoutPart = buildGatePlan(base, { today: "2026-10-24", gateDate: "2027-02-06", paper: "RA" });
expect(!raWithoutPart.ok && /Part B1.*Part B2/.test(raWithoutPart.error), "RA must ask students to choose Part B1 or Part B2");
const selectedChemicalPlan = generatePlanForMode(base, {
  mode: "today",
  today: "2026-10-24",
  gate: { enabled: true, paper: "CH", minutesPerDay: 60, gateDate: "2027-02-06" },
});
expect(selectedChemicalPlan.gate?.ok && selectedChemicalPlan.gate.paper === "CH", "API wrapper should pass an explicitly selected CH paper");
const selectedRaPlan = generatePlanForMode(base, {
  mode: "today",
  today: "2026-10-24",
  gate: { enabled: true, paper: "RA", raPart: "B2", minutesPerDay: 60, gateDate: "2027-02-06" },
});
expect(selectedRaPlan.gate?.ok && selectedRaPlan.gate.settings.raPart === "B2", "API wrapper should pass the RA optional part selection");
expect(selectedRaPlan.gate?.subjects.filter((subject) => subject.name.startsWith("Part B")).every((subject) => subject.name.includes("B2")), "API wrapper must not schedule the unselected RA optional part");
expect(JSON.stringify(attemptYearOptions(2028)) === JSON.stringify([2027, 2028]), "attempt year choices should be graduation year minus one and graduation year");
expect(defaultGateDate(2027) === "2027-02-06", "the app default GATE 2027 date should be 6 Feb 2027");
const tiny = buildGatePlan(base, { today: "2027-01-10", gateDate: "2027-02-06" });
expect(tiny.ok && tiny.weeks.every((week) => week.scheduledMinutes === week.capacityMinutes), "short remaining plans must represent each week's capacity");

console.log(errors.length ? "\nERRORS:\n- " + errors.join("\n- ") : "\nGATE PLAN: ALL CHECKS PASSED");
process.exit(errors.length ? 1 : 0);
