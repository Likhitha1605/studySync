import { generateStudentPlan } from "./generateStudentPlan.js";
import { buildGatePlan, GATE_DEFAULTS } from "./buildGatePlan.js";
import { defaultGateDate } from "./gateData.js";

function localDateString() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Add the optional GATE plan to the existing academic result without changing
 * the protected academic engine modules. The API can pass explicit start/end
 * dates; otherwise the mode and student semester dates determine them.
 */
export function generatePlanForMode(
  input,
  {
    mode = "today",
    today,
    now,
    gate,
    startDate: requestedStartDate,
    endDate: requestedEndDate,
    completedMinutesByTaskId,
  } = {}
) {
  const planningToday = today || localDateString();
  const semesterStart = input.student?.semesterStart || input.profile?.semesterStart || planningToday;
  const semesterEnd = input.student?.semesterEnd || input.profile?.semesterEnd || requestedEndDate;

  const startDate = mode === "semesterStart"
    ? semesterStart
    : requestedStartDate || (
        planningToday > semesterStart ? planningToday : semesterStart
      );
  const endDate = requestedEndDate || semesterEnd;

  if (!startDate || !endDate) {
    throw new Error("A valid planning start and end date are required.");
  }

  const gateEnabled = gate?.enabled === true;
  let planningInput = {
    ...input,
    ...(completedMinutesByTaskId
      ? { completedMinutesByTaskId }
      : {}),
  };
  let gateMinutesPerDay = 0;

  if (gateEnabled) {
    const suppliedMinutes = gate.minutesPerDay ?? gate.settings?.gateMinutesPerDay;
    const fallbackHours = Number(input.settings?.gateHoursPerDay);
    gateMinutesPerDay = Number.isFinite(Number(suppliedMinutes))
      ? Math.max(0, Number(suppliedMinutes))
      : Number.isFinite(fallbackHours) && fallbackHours > 0
        ? fallbackHours * 60
        : GATE_DEFAULTS.gateMinutesPerDay;

    // getDailyStudyMinutes.js already owns the intentional academic reservation.
    // Set its existing settings on a cloned input; do not modify the adapter or
    // the reservation function itself.
    planningInput = {
      ...planningInput,
      settings: {
        ...(input.settings || {}),
        studyMode: "academics-gate",
        gateHoursPerDay: gateMinutesPerDay / 60,
      },
    };
  }

  const academicResult = generateStudentPlan(
    planningInput,
    startDate,
    endDate,
    {
      ...(now ? { now } : {}),
      ...(completedMinutesByTaskId ? { completedMinutesByTaskId } : {}),
    }
  );

  const result = {
    ...academicResult,
    startMode: mode,
    startDate,
    endDate,
  };

  if (!gateEnabled) return result;

  const graduationYear = Number(gate.graduationYear);
  const attemptYear = Number(gate.attemptYear || gate.graduationYear);
  const gateDate = gate.gateDate || defaultGateDate(attemptYear || graduationYear);
  const gateToday = gate.today || planningToday;

  result.gate = buildGatePlan(planningInput, {
    today: gateToday,
    gateDate,
    // The selected GATE paper may differ from the student's degree branch.
    ...(gate.paper || gate.paperCode
      ? { paper: String(gate.paper || gate.paperCode).toUpperCase() }
      : {}),
    settings: {
      ...(gate.settings || {}),
      // RA paper requires choosing exactly one optional syllabus track.
      ...(gate.raPart || gate.settings?.raPart
        ? { raPart: gate.raPart || gate.settings.raPart }
        : {}),
      // Keep capacity calculations aligned with the minutes reserved for academics.
      gateMinutesPerDay,
    },
    overrides: gate.overrides || {},
  });

  return result;
}
