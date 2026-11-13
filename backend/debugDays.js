import { buildAvailabilityWindows } from "./engine/buildAvailabilityWindows.js";
import { getDailyStudyMinutes } from "./engine/getDailyStudyMinutes.js";
import { sampleStudent } from "./data/sampleStudent.js";

const days = buildAvailabilityWindows(sampleStudent, "2026-10-23", "2026-10-27");

console.table(
  days.map((d) => ({
    date: d.date,
    weekday: d.weekday,
    holiday: d.isHoliday,
    holidayStudy: d.holidayStudy,
    freeHours: d.freeHours,
    limitHours: d.studyLimitHours,
    usableMinutes: getDailyStudyMinutes(d, sampleStudent),
  }))
);