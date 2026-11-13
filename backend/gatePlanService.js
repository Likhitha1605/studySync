import { buildGatePlan, GATE_DEFAULTS } from "./engine/buildGatePlan.js";
import {
  attemptYearOptions,
  defaultGateDate,
  paperForBranch,
  GATE_DATA,
} from "./engine/gateData.js ";

function localDateString() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

const isDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
  new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;

function parseYearAndSemester(body) {
  const combined = String(body.yearSemester || body.currentYearSemester || "").trim();
  const match = combined.match(/^([1-4])\s*[-/]\s*([12])$/);
  const currentYear = Number(body.currentYear ?? body.yearOfStudy ?? match?.[1]);
  const semester = Number(body.semester ?? body.currentSemester ?? match?.[2]);
  return { currentYear, semester };
}

/**
 * Build a GATE plan from GATE-specific setup only. Academic semester dates,
 * holidays, college routines and free-time windows are intentionally not read.
 *
 * Request fields:
 * today? (YYYY-MM-DD), currentYear (1..4), semester (1|2), graduationYear,
 * attemptYear, branch, paper?, gateDate?, raPart?, overrides?, settings?
 */
export function createStandaloneGatePlan(body = {}, todayFallback = localDateString()) {
  const today = body.today || todayFallback;
  if (!isDate(today)) {
    return { ok: false, error: "Today must use YYYY-MM-DD format." };
  }

  const { currentYear, semester } = parseYearAndSemester(body);
  if (!Number.isInteger(currentYear) || currentYear < 1 || currentYear > 4) {
    return { ok: false, error: "Select a current year of study from 1 to 4." };
  }
  if (![1, 2].includes(semester)) {
    return { ok: false, error: "Select semester 1 or semester 2." };
  }

  const graduationYear = Number(body.graduationYear);
  if (!Number.isInteger(graduationYear) || graduationYear < 2000 || graduationYear > 2200) {
    return { ok: false, error: "Enter a valid graduation year." };
  }

  const attemptYear = Number(body.attemptYear);
  if (!attemptYearOptions(graduationYear).includes(attemptYear)) {
    return {
      ok: false,
      error: `Choose either ${graduationYear - 1} or ${graduationYear} as the GATE attempt year.`,
    };
  }

  const branch = String(body.branch || "").trim();
  if (!branch) {
    return { ok: false, error: "Select your engineering branch." };
  }

  const requestedPaper = String(body.paper || body.paperCode || "").trim().toUpperCase();
  const paper = requestedPaper || paperForBranch(branch);
  if (!paper || !GATE_DATA[paper]) {
    return {
      ok: false,
      error: `No GATE dataset is available for ${requestedPaper || branch}. Choose a supported paper.`,
    };
  }

  const gateDate = body.gateDate || defaultGateDate(attemptYear);
  if (!isDate(gateDate)) {
    return { ok: false, error: "The GATE exam date must use YYYY-MM-DD format." };
  }
  if (gateDate <= today) {
    return { ok: false, error: "The GATE exam date must be after today." };
  }

  // Capacity settings are engine assumptions, not additional student details.
  // Settings may also be supplied later by the plan's Apply suggestion action.
  const suppliedSettings = body.settings && typeof body.settings === "object"
    ? body.settings
    : {};
  const settings = {
    ...GATE_DEFAULTS,
    gateMinutesPerDay: Number.isFinite(Number(suppliedSettings.gateMinutesPerDay))
      ? Math.min(480, Math.max(0, Number(suppliedSettings.gateMinutesPerDay)))
      : GATE_DEFAULTS.gateMinutesPerDay,
    ...(body.raPart || suppliedSettings.raPart
      ? { raPart: body.raPart || suppliedSettings.raPart }
      : {}),
    restDay: suppliedSettings.restDay ?? GATE_DEFAULTS.restDay,
    restBeforeExamDays:
      suppliedSettings.restBeforeExamDays ?? GATE_DEFAULTS.restBeforeExamDays,
    shortMonths: suppliedSettings.shortMonths ?? GATE_DEFAULTS.shortMonths,
    mockMinutes: suppliedSettings.mockMinutes ?? GATE_DEFAULTS.mockMinutes,
  };

  // The planner receives only branch context. No academic semester dates,
  // dailyStudyHours, exams or holidays are passed into GATE capacity logic.
  const plan = buildGatePlan(
    { student: { branch }, profile: { branch } },
    {
      today,
      gateDate,
      paper,
      settings,
      overrides: body.overrides || {},
    }
  );

  return {
    ...plan,
    // Read-only syllabus view data; this does not affect monthly or weekly planning.
    syllabus: GATE_DATA[paper].subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      estimatedMarks: subject.marks,
      topics: (subject.chapters || []).map((chapter) => chapter.name),
    })),
    setup: {
      currentYear,
      semester,
      yearSemester: `${currentYear}-${semester}`,
      graduationYear,
      attemptYear,
      branch,
      paper,
      gateDate,
      currentMonth: today.slice(0, 7),
    },
  };
}
