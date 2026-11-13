import { buildStudyPlan } from "./buildStudyPlan.js";
import { analyzeWorkload } from "./analyzeWorkload.js";
import { buildAvailabilityWindows } from "./buildAvailabilityWindows.js";
import { getDailyStudyMinutes } from "./getDailyStudyMinutes.js";
import { validateInput } from "./validateInput.js";

function isExamDay(input, date) {
  return (input.exams || []).some((exam) => {
    const start = exam.startDate;
    const end = exam.endDate || start;
    return Boolean(start && date >= start && date <= end);
  });
}

function warning(severity, message) {
  return { severity, message };
}

function sortWarnings(warnings) {
  return [...warnings].sort(
    (a, b) =>
      (a.severity === "blocking" ? 0 : 1) -
      (b.severity === "blocking" ? 0 : 1)
  );
}

/** Build the student-facing warnings for a generated academic plan. */
export function buildPlanWarnings(
  input,
  startDate,
  endDate,
  realityCheck = [],
  plan = { sessions: [], unscheduled: [] }
) {
  const warnings = [];
  const validation = validateInput(input, startDate, endDate);

  // Preserve every existing validation warning in the public warnings list.
  for (const existing of validation.warnings || []) {
    warnings.push(
      typeof existing === "string"
        ? warning("info", existing)
        : warning(existing.severity || "info", String(existing.message || existing))
    );
  }

  for (const task of plan.unscheduled || []) {
    const remainingMinutes = Math.max(0, Number(task.remainingMinutes || 0));
    if (remainingMinutes <= 0) continue;
    const deadline = task.dueDate ? ` before ${task.dueDate}` : " before its deadline";
    warnings.push(
      warning(
        "blocking",
        `${task.title || "A study task"} has ${(remainingMinutes / 60).toFixed(1)} h unscheduled${deadline}.`
      )
    );
  }

  const examSessions = new Map();
  for (const session of plan.sessions || []) {
    if (!isExamDay(input, session.date)) continue;
    const key = `${session.date}|${session.title || session.taskId || "session"}`;
    if (!examSessions.has(key)) examSessions.set(key, session);
  }
  for (const session of examSessions.values()) {
    warnings.push(
      warning(
        "blocking",
        `“${session.title || "A study session"}” is scheduled on an exam day (${session.date}).`
      )
    );
  }

  for (const deadline of realityCheck || []) {
    const shortageHours = Math.max(0, Number(deadline.shortageHours || 0));
    if (shortageHours <= 0) continue;
    warnings.push(
      warning(
        "blocking",
        `There is a ${shortageHours.toFixed(1)} h shortage before the ${deadline.deadline} deadline.`
      )
    );
  }

  const studyDays = buildAvailabilityWindows(input, startDate, endDate)
    .filter((day) => getDailyStudyMinutes(day, input) > 0)
    .map((day) => day.date);
  const firstQuarterCount = Math.ceil(studyDays.length * 0.25);
  const firstQuarter = new Set(studyDays.slice(0, firstQuarterCount));
  const allPlannedMinutes = (plan.sessions || []).reduce(
    (sum, session) => sum + Math.max(0, Number(session.durationMinutes || 0)),
    0
  );
  const earlyPlannedMinutes = (plan.sessions || []).reduce(
    (sum, session) =>
      sum + (firstQuarter.has(session.date) ? Math.max(0, Number(session.durationMinutes || 0)) : 0),
    0
  );

  if (allPlannedMinutes > 0 && earlyPlannedMinutes / allPlannedMinutes > 0.6) {
    warnings.push(
      warning("info", "Your plan is front-loaded. Spread the work to avoid burnout.")
    );
  }

  for (const subject of input.subjects || []) {
    for (const unit of subject.units || []) {
      const hours = Number(unit.estHours || 0);
      if (hours > 15) {
        warnings.push(
          warning(
            "info",
            `${subject.name || "A subject"}: “${unit.name || unit.id || "A unit"}” is estimated at ${hours} hours, over 15 hours. Consider splitting it into smaller milestones.`
          )
        );
      }
    }
  }

  if (
    input.settings?.revisionPercent !== undefined &&
    Number(input.settings.revisionPercent) !== 10
  ) {
    warnings.push(
      warning(
        "info",
        `Revision is set to ${input.settings.revisionPercent}%, not the recommended 10%.`
      )
    );
  }

  return sortWarnings(warnings);
}

export function generateStudentPlan(
  input,
  startDate,
  endDate,
  options = {}
) {
  const now = options.now;

  const planningDate = now?.date || input.today ||
    new Date().toISOString().slice(0, 10);

  const planningTime = now?.time || "12:00";

  const planningNow = now
    ? new Date(`${planningDate}T${planningTime}:00`)
    : new Date();

  if (Number.isNaN(planningNow.getTime())) {
    throw new Error("Invalid planning date or time.");
  }

  const planningInput = {
    ...input,
    today: planningDate,
    completedMinutesByTaskId:
      options.completedMinutesByTaskId || input.completedMinutesByTaskId || {},
  };

  const realityCheck = analyzeWorkload(
    planningInput,
    startDate,
    endDate,
    planningNow
  );

  const plan = buildStudyPlan(
    planningInput,
    startDate,
    endDate,
    planningNow
  );

  const warnings = buildPlanWarnings(
    planningInput,
    startDate,
    endDate,
    realityCheck,
    plan
  );
  const hasBlockingWarnings = warnings.some(
    (item) => item.severity === "blocking"
  );
  const status =
    hasBlockingWarnings || plan.unscheduled.length > 0
      ? "needs-adjustment"
      : "ready";

  return {
    status,
    canUseAsFinalPlan: status === "ready",
    message:
      status === "ready"
        ? "Your study plan fits the current workload and scheduling limits."
        : "Your workload needs attention. Review the blocking warnings and adjust your plan before relying on it.",
    realityCheck,
    warnings,
    plan,
    recommendations: realityCheck
      .filter((item) => !item.feasible)
      .map((item) => ({
        deadline: item.deadline,
        requiredHours: item.requiredHours,
        availableHours: item.availableHours,
        shortageHours: item.shortageHours,
        action:
          "Review priorities, available study time, or the workload due before this deadline.",
      })),
  };
}
