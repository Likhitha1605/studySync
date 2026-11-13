
import { buildSlots } from "./engine/buildSlots.js";
import { buildAvailabilityWindows } from "./engine/buildAvailabilityWindows.js";
import { sampleStudent } from "./data/sampleStudent.js";

const startDate = "2026-10-21";
const endDate = "2026-10-25";
const testNow = new Date("2026-10-21T12:00:00+05:30");

const slots = buildSlots(
  sampleStudent,
  startDate,
  endDate,
  testNow
);
const windows = buildAvailabilityWindows(
  sampleStudent,
  startDate,
  endDate,
  testNow,
);

console.log("\nDaily study slots:");
console.table(slots);

console.log("\nActual free-time windows:");
console.table(
  windows.map((day) => ({
    date: day.date,
    weekday: day.weekday,
    isHoliday: day.isHoliday,
    freeHours: day.freeHours,
    studyLimitHours: day.studyLimitHours,
    intervals: day.intervals
      .map((slot) => `${slot.start}-${slot.end}`)
      .join(", "),
  }))
);

if (slots.length !== 5 || windows.length !== 5) {
  throw new Error("Test failed: expected five dates.");
}

const holiday = windows.find(
  (day) => day.date === "2026-10-25"
);

if (!holiday?.isHoliday) {
  throw new Error("Test failed: October 25 should be a holiday.");
}

const collegeDay = windows.find(
  (day) => day.date === "2026-10-21"
);

if (!collegeDay?.intervals.length) {
  throw new Error(
    "Test failed: expected an available study interval."
  );
}

if (
  collegeDay.intervals.some(
    (interval) => interval.start < "14:00"
  )
) {
  throw new Error(
    "Test failed: evening study should not start before 14:00."
  );
}

const noStudyHoliday = windows.find(
  (day) => day.date === "2026-10-24"
);

if (!noStudyHoliday?.isHoliday) {
  throw new Error("Test failed: October 24 should be a holiday.");
}

if (noStudyHoliday.holidayStudy !== false) {
  throw new Error(
    "Test failed: October 23 should be a no-study holiday."
  );
}

if (noStudyHoliday.intervals.length !== 0) {
  throw new Error(
    "Test failed: a no-study holiday should have no study intervals."
  );
}
const eveningNow = new Date(2026, 9, 21, 20, 0, 0);

const eveningWindows = buildAvailabilityWindows(
  sampleStudent,
  "2026-10-21",
  "2026-10-21",
  eveningNow
);

const eveningDay = eveningWindows[0];

if (
  eveningDay.intervals.some(
    (interval) => interval.start < "20:00"
  )
) {
  throw new Error(
    "Test failed: today's study interval starts before the current time."
  );
}
console.log("\n✅ StudySync availability tests passed!");
