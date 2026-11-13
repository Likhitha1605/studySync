
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function subtractBlockedTime(dayStart, dayEnd, blocked) {
  const intervals = blocked
    .map(({ start, end }) => ({
      start: Math.max(dayStart, start),
      end: Math.min(dayEnd, end),
    }))
    .filter((item) => item.end > item.start)
    .sort((a, b) => a.start - b.start);

  const merged = [];

  for (const interval of intervals) {
    const previous = merged[merged.length - 1];

    if (previous && interval.start <= previous.end) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  const free = [];
  let cursor = dayStart;

  for (const interval of merged) {
    if (interval.start > cursor) {
      free.push({ start: cursor, end: interval.start });
    }

    cursor = Math.max(cursor, interval.end);
  }

  if (cursor < dayEnd) {
    free.push({ start: cursor, end: dayEnd });
  }

  return free;
}

export function buildAvailabilityWindows(
  input,
  startDate,
  endDate,
  now = new Date()
) {
  const windows = [];
  const current = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);

  const routine = input.routine || {};
  const wakeTime = routine.wakeTime || "06:00";
  const sleepTime = routine.sleepTime || "23:00";

 
let dayStart = toMinutes(wakeTime);
let dayEnd = toMinutes(sleepTime);

  if (dayEnd <= dayStart) {
    dayEnd += 1440;
  }

  // const preferredTime = String(
  //   routine.preferredStudyTime || ""
  // ).trim().toLowerCase();

  // if (preferredTime === "evening") {
  //   dayStart = 17 * 60;
  //   dayEnd = Math.max(dayStart, dayEnd - 15);
  // } else if (preferredTime === "night") {
  //   dayStart = 20 * 60;
  // }

  


  const holidays = input.holidays || [];

  while (current <= end) {
    const date = current.toISOString().slice(0, 10);
    const examToday = (input.exams || []).some((exam) => {
    const examStart = exam.startDate;
    const examEnd = exam.endDate || examStart;

  return examStart && date >= examStart && date <= examEnd;
});
    const weekday = WEEKDAYS[current.getUTCDay()];

    const holiday = holidays.find((item) =>
      typeof item === "string" ? item === date : item?.date === date
    );

    const isHoliday = Boolean(holiday);
    const holidayStudy =
      !isHoliday ||
      typeof holiday === "string" ||
      holiday.study !== false;

    const blocked = [];
    const college = (input.collegeTimings || []).find(
      (item) => item.weekday === weekday
    );

    if (college && !isHoliday) {
      const travelTo = Number(routine.travelToMinutes ?? 0);
      const travelFrom = Number(routine.travelFromMinutes ?? 0);

      blocked.push({
        start: toMinutes(college.start) - travelTo,
        end: toMinutes(college.end) + travelFrom,
      });
    }

    for (const item of routine.fixedCommitments || []) {
      if (item.date && item.date !== date) continue;
      if (!item.date && item.weekday !== weekday) continue;

      const start = toMinutes(item.start);
      let endTime = toMinutes(item.end);

      if (endTime <= start) endTime += 1440;

      blocked.push({ start, end: endTime });
    }

    const dailyStudyHours = input.dailyStudyHours || [];

const allowanceWeekday =
  isHoliday && holidayStudy ? "Sunday" : weekday;

const dailyLimit = dailyStudyHours.find(
  (item) => item.weekday === allowanceWeekday
);

const studyLimitHours = !holidayStudy
  ? 0
  : Math.max(0, Number(dailyLimit?.availableHours ?? 0));

const preferredTime = String(
  routine.preferredStudyTime || ""
).trim().toLowerCase();

let freeIntervals = [];

if (preferredTime === "evening") {
  const sleepMinutes = toMinutes(sleepTime);

  const latestEnd =
    (sleepMinutes <= toMinutes(wakeTime)
      ? sleepMinutes + 1440
      : sleepMinutes) - 30;

  const travelFrom = Number(
    routine.travelFromMinutes ?? 0
  );

  const earliestPreferredStart =
    college && !isHoliday
      ? toMinutes(college.end) + travelFrom
      : 16 * 60;

  let candidateStart = earliestPreferredStart;

  while (candidateStart >= 14 * 60) {
    const candidateIntervals = subtractBlockedTime(
      candidateStart,
      latestEnd,
      blocked
    );

    const candidateFreeMinutes = candidateIntervals.reduce(
      (sum, interval) => sum + interval.end - interval.start,
      0
    );

    freeIntervals = candidateIntervals;

    if (
      !holidayStudy ||
      candidateFreeMinutes >= studyLimitHours * 60 ||
      candidateStart === 14 * 60
    ) {
      break;
    }

    candidateStart -= 30;
  }
} else {
  let dayStart = toMinutes(wakeTime);
  let dayEnd = toMinutes(sleepTime);

  if (dayEnd <= dayStart) {
    dayEnd += 1440;
  }

  freeIntervals = subtractBlockedTime(
    dayStart,
    dayEnd,
    blocked
  );
}

// No study sessions on exam days or no-study holidays.
if (examToday || !holidayStudy) {
  freeIntervals = [];
}

// On the current day, exclude time intervals that have already elapsed.
const todayDate = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
].join("-");

if (date === todayDate) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  freeIntervals = freeIntervals
    .map((interval) => ({
      ...interval,
      start: Math.max(interval.start, currentMinutes),
    }))
    .filter((interval) => interval.end > interval.start);
}

    const freeHours = freeIntervals.reduce(
      (sum, interval) =>
        sum + (interval.end - interval.start) / 60,
      0
    );

    windows.push({
      date,
      weekday,
      isHoliday,
      holidayStudy: isHoliday ? holidayStudy : null,
      freeHours: Number(freeHours.toFixed(2)),
      studyLimitHours,
      intervals: freeIntervals.map((interval) => ({
        start: formatTime(interval.start),
        end: formatTime(interval.end),
        endsNextDay: interval.end >= 1440,
        durationMinutes: interval.end - interval.start,
      })),
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return windows;
}
