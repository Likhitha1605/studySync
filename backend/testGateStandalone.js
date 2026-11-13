import { createStandaloneGatePlan } from "./gatePlanService.js";
import { GATE_DEFAULTS } from "./engine/buildGatePlan.js";

const errors = [];
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};

// This is intentionally a small GATE-only input. It has no academic semester
// start/end dates, exams, holidays, dailyStudyHours or free-time windows.
const minimal = {
  today: "2026-10-25",
  currentYear: 3,
  semester: 1,
  graduationYear: 2028,
  attemptYear: 2027,
  branch: "EEE",
};

const result = createStandaloneGatePlan(minimal);
expect(result.ok, `minimal EEE setup should generate a plan: ${result.error || ""}`);
expect(result.paper === "EE", `EEE should map to EE, received ${result.paper}`);
expect(result.setup?.yearSemester === "3-1", "year/semester context should be returned");
expect(result.setup?.currentMonth === "2026-10", "current month should come from today's date");
expect(result.setup?.gateDate === "2027-02-06", "GATE 2027 should default to 6 February, editable by the user");
expect(result.weeksAvailable === 16, `should return 16 weeks, got ${result.weeksAvailable}`);
expect(Math.abs(result.monthsAvailable - 3.7) <= 0.1, `should return about 3.7 months, got ${result.monthsAvailable}`);
expect(result.capacity?.totalMinutes > 0, "standalone plan should have capacity without academic inputs");
expect(result.weeks?.every((week) => week.scheduledMinutes <= week.capacityMinutes), "weekly scheduled minutes must not exceed capacity");
expect(result.settings?.gateMinutesPerDay === GATE_DEFAULTS.gateMinutesPerDay, "default daily planning capacity should be 120 minutes");
expect(!("days" in result), "GATE plan must not expose a daily GATE timetable");

const noAcademicData = createStandaloneGatePlan({
  ...minimal,
  gateDate: "2027-02-06",
  settings: { gateMinutesPerDay: 90 },
});
expect(noAcademicData.ok, `the plan should work with an internal capacity override: ${noAcademicData.error || ""}`);
expect(noAcademicData.settings?.gateMinutesPerDay === 90, "capacity override should be applied without adding a form field");

const validAttemptChoices = createStandaloneGatePlan({ ...minimal, attemptYear: 2029 });
expect(!validAttemptChoices.ok && /2027 or 2028/.test(validAttemptChoices.error), "attempt year must be graduation year minus one or graduation year");

const raMissingPart = createStandaloneGatePlan({ ...minimal, branch: "Robotics and Automation", paper: "RA" });
expect(!raMissingPart.ok && /Part B1.*Part B2/.test(raMissingPart.error), "RA setup must request either Part B1 or Part B2");

const raWithPart = createStandaloneGatePlan({ ...minimal, branch: "Robotics and Automation", paper: "RA", raPart: "B1" });
expect(raWithPart.ok, `RA with Part B1 should generate: ${raWithPart.error || ""}`);
expect(raWithPart.settings?.raPart === "B1", "the selected RA option should be preserved");

console.log(`Standalone GATE plan: ${result.monthsAvailable} months, ${result.weeksAvailable} weeks, ${Math.round(result.capacity.totalMinutes / 60)} estimated capacity hours`);
console.log(errors.length ? "\nERRORS:\n- " + errors.join("\n- ") : "GATE STANDALONE INPUT: ALL CHECKS PASSED");
process.exit(errors.length ? 1 : 0);
