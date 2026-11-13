const DEFAULT_STEP_MINUTES = 10;

export function getDailyStudyMinutes(day, input) {
  if (!day || !input) return 0;

  if (day.isHoliday && day.holidayStudy === false) {
    return 0;
  }

  const step = Math.max(
    1,
    Math.floor(
      Number(input.settings?.sessionStepMinutes ?? DEFAULT_STEP_MINUTES)
    )
  );

  const freeMinutes = Math.max(
    0,
    Math.floor(Number(day.freeHours || 0) * 60)
  );

  const limitMinutes = Math.max(
    0,
    Math.floor(Number(day.studyLimitHours || 0) * 60)
  );

  const totalUsableMinutes = Math.min(freeMinutes, limitMinutes);
  const gateEnabled = input.settings?.studyMode === "academics-gate";
  const gateReserveMinutes = gateEnabled
    ? Math.max(0, Math.floor(Number(input.settings?.gateHoursPerDay || 0) * 60))
    : 0;
  const academicMinutes = Math.max(0, totalUsableMinutes - gateReserveMinutes);

  return Math.floor(academicMinutes / step) * step;
}