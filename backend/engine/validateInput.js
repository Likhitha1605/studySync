const WEEKDAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday",
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MID_VALUES = [undefined, null, 0, 1, 2];

function findExam(input, idOrType) {
  return (input.exams || []).find(
    (exam) => exam.id === idOrType || exam.type === idOrType
  );
}

export function validateInput(input, startDate, endDate) {
  const errors = [];
  const warnings = [];

  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["Input is missing."], warnings };
  }

  if (!DATE_RE.test(startDate || "") || !DATE_RE.test(endDate || "")) {
    errors.push("startDate and endDate must be in YYYY-MM-DD format.");
  } else if (startDate > endDate) {
    errors.push("startDate must be on or before endDate.");
  }

  const settings = input.settings || {};
  const step = settings.sessionStepMinutes ?? 10;
  const minSession = settings.minSessionMinutes ?? 30;

  if (settings.studyMode !== undefined && !["academics-only", "academics-gate"].includes(settings.studyMode)) {
    errors.push('settings.studyMode must be "academics-only" or "academics-gate".');
  }
  if (settings.studyMode === "academics-gate") {
    const gateHours = Number(settings.gateHoursPerDay);
    if (!Number.isFinite(gateHours) || gateHours <= 0) {
      errors.push("settings.gateHoursPerDay must be greater than 0 when GATE mode is enabled.");
    }
  }
  

  if (!Number.isInteger(step) || step < 5) {
    errors.push("settings.sessionStepMinutes must be a whole number, at least 5.");
  }
  if (!Number.isInteger(minSession) || minSession < step) {
    errors.push("settings.minSessionMinutes must be a whole number, at least sessionStepMinutes.");
  }

  if (!Array.isArray(input.subjects) || input.subjects.length === 0) {
    errors.push("subjects must be a non-empty list.");
  }

  const subjectIds = new Set();

  for (const subject of input.subjects || []) {
    const label = `Subject ${subject.id ?? "(no id)"}`;

    if (!subject.id) errors.push(`${label}: missing id.`);
    else if (subjectIds.has(subject.id)) errors.push(`${label}: duplicate id.`);
    subjectIds.add(subject.id);

    if (!subject.name) errors.push(`${label}: missing name.`);
    if (!subject.endExamDate) {
      warnings.push(`${label}: no endExamDate, so the semester end is used.`);
    } else if (!DATE_RE.test(subject.endExamDate)) {
      errors.push(`${label}: endExamDate must be YYYY-MM-DD.`);
    }

    if (!Array.isArray(subject.units) || subject.units.length === 0) {
      warnings.push(`${label}: has no units.`);
    }

    const unitIds = new Set();

    for (const unit of subject.units || []) {
      const ulabel = `${label}, unit ${unit.id ?? "(no id)"}`;

      if (!unit.id) errors.push(`${ulabel}: missing id.`);
      else if (unitIds.has(unit.id)) errors.push(`${ulabel}: duplicate id.`);
      unitIds.add(unit.id);

      if (!unit.name) errors.push(`${ulabel}: missing name.`);

      const est = Number(unit.estHours);
      if (unit.estHours === undefined || !Number.isFinite(est) || est < 0) {
        errors.push(`${ulabel}: estHours must be a number, 0 or more.`);
      }

      if (unit.percentComplete !== undefined) {
        const pct = Number(unit.percentComplete);
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
          errors.push(`${ulabel}: percentComplete must be between 0 and 100.`);
        }
      }

      if (!MID_VALUES.includes(unit.mid)) {
        errors.push(`${ulabel}: mid must be 1, 2, or null.`);
      }
    }
  }

  // Exams
  const exams = input.exams || [];
  for (const exam of exams) {
    if (exam.startDate && !DATE_RE.test(exam.startDate)) {
      errors.push(`Exam ${exam.id}: startDate must be YYYY-MM-DD.`);
    }
    if (exam.endDate && !DATE_RE.test(exam.endDate)) {
      errors.push(`Exam ${exam.id}: endDate must be YYYY-MM-DD.`);
    }
    if (exam.startDate && exam.endDate && exam.endDate < exam.startDate) {
      errors.push(`Exam ${exam.id}: endDate must be on or after startDate.`);
    }
  }

  if (!findExam(input, "end")) {
    warnings.push(
      'No end exam found (type "end"). Subject end dates or the semester end will be used.'
    );
  }

  const hasMidUnits = (input.subjects || []).some((subject) =>
    (subject.units || []).some((unit) => unit.mid === 1 || unit.mid === 2)
  );
  if (hasMidUnits) {
    for (const n of [1, 2]) {
      if (!findExam(input, `mid-${n}`)) {
        warnings.push(
          `No Mid ${n === 1 ? "I" : "II"} exam found (id "mid-${n}"). Units tagged mid ${n} will use the end date.`
        );
      }
    }
  }

  // Daily hours
  const dailyHours = input.dailyStudyHours || [];
  if (dailyHours.length === 0) {
    errors.push("dailyStudyHours is missing. Add an entry for each weekday.");
  }
  for (const day of WEEKDAYS) {
    const entry = dailyHours.find((item) => item.weekday === day);
    if (!entry) {
      warnings.push(`No dailyStudyHours entry for ${day}, so it counts as 0 hours.`);
    } else if (!Number.isFinite(Number(entry.availableHours)) || Number(entry.availableHours) < 0) {
      errors.push(`dailyStudyHours for ${day}: availableHours must be 0 or more.`);
    }
  }

  // College timings
  for (const item of input.collegeTimings || []) {
    if (!WEEKDAYS.includes(item.weekday)) {
      errors.push(`collegeTimings: unknown weekday "${item.weekday}".`);
    }
    if (!TIME_RE.test(item.start || "") || !TIME_RE.test(item.end || "")) {
      errors.push(`collegeTimings for ${item.weekday}: start and end must be HH:MM.`);
    }
  }

  // Routine
  const routine = input.routine || {};
  for (const key of ["wakeTime", "sleepTime"]) {
    if (routine[key] !== undefined && !TIME_RE.test(routine[key])) {
      errors.push(`routine.${key} must be HH:MM.`);
    }
  }

  // Holidays
  for (const holiday of input.holidays || []) {
    const date = typeof holiday === "string" ? holiday : holiday?.date;
    if (!DATE_RE.test(date || "")) {
      errors.push(`Holiday entry "${JSON.stringify(holiday)}" needs a YYYY-MM-DD date.`);
    }
  }

  // Assignments
  for (const assignment of input.assignments || []) {
    const alabel = `Assignment ${assignment.id ?? "(no id)"}`;
    if (!assignment.id) errors.push(`${alabel}: missing id.`);
    if (!assignment.title) errors.push(`${alabel}: missing title.`);
    if (assignment.dueDate && !DATE_RE.test(assignment.dueDate)) {
      errors.push(`${alabel}: dueDate must be YYYY-MM-DD.`);
    }
    if (!assignment.dueDate) {
      warnings.push(`${alabel}: no dueDate, so the end date is used.`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}