
import { buildAvailabilityWindows } from "./buildAvailabilityWindows.js";
import { getDailyStudyMinutes } from "./getDailyStudyMinutes.js";

export function buildSlots(input, startDate, endDate, now = new Date()) {
  const windows = buildAvailabilityWindows(
    input,
    startDate,
    endDate,
    now
  );

  return windows.map((day) => {
    const studyMinutes = getDailyStudyMinutes(day, input);

    const rawMinutes = Math.max(
      0,
      Math.floor(
        Math.min(day.freeHours, day.studyLimitHours) * 60
      )
    );
    
    return {
      date: day.date,
      weekday: day.weekday,
      isHoliday: day.isHoliday,
      holidayStudy: day.holidayStudy,
      rawHours: Number((rawMinutes / 60).toFixed(2)),
      bufferHours: Number(
        ((rawMinutes - studyMinutes) / 60).toFixed(2)
      ),
      studyHours: Number((studyMinutes / 60).toFixed(2)),
      studyMinutes,
    };
  });
}
