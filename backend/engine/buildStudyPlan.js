
import { buildAvailabilityWindows } from "./buildAvailabilityWindows.js";
import { getDailyStudyMinutes } from "./getDailyStudyMinutes.js";
import { buildWorkItems } from "./buildWorkItems.js";

const DEFAULT_BREAK_MINUTES = 10;

function minutesFromTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(total) {
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(
    normalized % 60
  ).padStart(2, "0")}`;
}

function daysBetween(from, to) {
  if (!from || !to) return 0;
  const a = new Date(`${from}T12:00:00Z`);
  const b = new Date(`${to}T12:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86400000));
}

function formatDate(date) {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!date || Number.isNaN(parsed.getTime())) return "upcoming deadline";
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function describeReason(item, date) {
  if (item.kind === "assignment") {
    return `Assignment due ${formatDate(item.dueDate)}`;
  }

  const left = daysBetween(date, item.dueDate);
  const daysText = `${left} day${left === 1 ? "" : "s"} left`;

  if (item.kind === "revision") {
    return item.mid === 2
      ? `Revision before Mid II (${daysText})`
      : `Revision before exam (${daysText})`;
  }

  return item.mid === 2
    ? `Mid II first pass (${daysText})`
    : `First-pass study before exam (${daysText})`;
}

// Phases:
// 0 = assignments and Mid II first pass
// 1 = Mid II revision
// 2 = remaining first pass (including carried-over work)
// 3 = revision for the rest (prep week and end exams)
function phaseOf(item) {
  if (item.phaseOverride !== undefined) return item.phaseOverride;
  if (item.kind === "assignment") return 0;
  if (item.mid === 2) return item.kind === "first-pass" ? 0 : 1;
  return item.kind === "first-pass" ? 2 : 3;
}

function applyCarryOver(item, date) {
  if (
    item.carried ||
    !item.carryDeadline ||
    item.remainingMinutes <= 0 ||
    item.scheduleByDate >= date
  ) {
    return null;
  }

  item.carried = true;
item.carriedFrom = item.scheduleByDate;
item.originalDueDate = item.originalDueDate || item.dueDate;
item.scheduleByDate = item.carryDeadline;
item.dueDate = item.finalDeadline;
item.phaseOverride = item.kind === "revision" ? 3 : 2;

  return {
    id: item.id,
    title: item.title,
    type: item.kind,
    missedDeadline: item.carriedFrom,
    carriedTo: item.carryDeadline,
    remainingMinutes: item.remainingMinutes,
  };
}

function sortForDay(date, prioritizeExamPhases) {
  return (a, b) => {
    // Give assignments first access to available study time, ordering them by
    // earliest deadline so they are not starved by syllabus/revision work.
    const assignmentA = a.kind === "assignment";
    const assignmentB = b.kind === "assignment";
    if (assignmentA !== assignmentB) return assignmentA ? -1 : 1;
    if (assignmentA && assignmentB && a.dueDate !== b.dueDate) {
      return a.dueDate < b.dueDate ? -1 : 1;
    }

    const phaseDiff = phaseOf(a) - phaseOf(b);
    const overdueA = a.scheduleByDate < date ? 0 : 1;
    const overdueB = b.scheduleByDate < date ? 0 : 1;

    // When generating from today, preserve the same exam-phase order used
    // by a semester-long plan. Old deadlines must not let backlog from an
    // already-passed phase jump ahead of work for the next upcoming exam.
    if (prioritizeExamPhases && phaseDiff !== 0) return phaseDiff;
    if (overdueA !== overdueB) return overdueA - overdueB;
    if (phaseDiff !== 0) return phaseDiff;

    if (a.scheduleByDate !== b.scheduleByDate) {
      return a.scheduleByDate < b.scheduleByDate ? -1 : 1;
    }

    if (a.priority === "high" && b.priority !== "high") return -1;
    if (b.priority === "high" && a.priority !== "high") return 1;

    return b.difficulty - a.difficulty;
  };
}

export function buildStudyPlan(input, startDate, endDate) {
  const settings = input.settings || {};
  const days = buildAvailabilityWindows(input, startDate, endDate);
  const items = buildWorkItems(input, startDate, endDate);
  const semesterStart = input.student?.semesterStart;
  const isStartingMidSemester = Boolean(
    semesterStart && startDate > semesterStart
  );

  const step = Math.max(1, Number(settings.sessionStepMinutes ?? 10));
  const minSession = Math.max(
    step,
    Number(settings.minSessionMinutes ?? 30)
  );
  const maxSubjectsPerDay = Math.max(
    1,
    Number(settings.maxSubjectsPerDay ?? 2)
  );
  const breakMinutes = Math.max(
    DEFAULT_BREAK_MINUTES,
    Number(settings.breakMinutes ?? DEFAULT_BREAK_MINUTES)
  );
  const maxFocus = Number(
    input.routine?.maxFocusMinutes || settings.sessionMinutes || 60
  );
  const focusMinutes = Math.min(
    60,
    Math.max(minSession, Math.floor(maxFocus / step) * step)
  );

  const sessions = [];
  const completedOn = new Map();
  const carriedOver = [];
  const lateCompleted = [];

function isEligible(item, date) {
  if (
    item.remainingMinutes <= 0 ||
    date < item.eligibleFrom ||
    date > item.scheduleByDate
  ) {
    return false;
  }

  if (item.dependsOn) {
    const firstPassDone = completedOn.get(item.dependsOn);
    return Boolean(firstPassDone) && firstPassDone < date;
  }

  return true;
}


  for (const day of days) {
    // Missed deadlines move into the next phase instead of being dropped.
    for (const item of items) {
      const moved = applyCarryOver(item, day.date);
      if (moved) carriedOver.push(moved);
    }

    let budget = getDailyStudyMinutes(day, input);
    if (budget < step) continue;

    const intervals = (day.intervals || [])
      .map((interval) => {
        const start = minutesFromTime(interval.start);
        let end = minutesFromTime(interval.end);
        if (interval.endsNextDay && end <= start) end += 1440;
        return { start, end, cursor: start };
      })
      .sort((a, b) => a.start - b.start);

    const subjectsToday = new Set();

    const eligible = items
      .filter((item) => isEligible(item, day.date))
      .sort(sortForDay(day.date, isStartingMidSemester));

    for (const item of eligible) {
      if (budget < step) break;

      const key = String(item.subjectId || item.subjectName || item.id);

      // Assignments are deadline-bound deliverables; don't let the daily
      // academic-subject limit prevent them from using available study time.
      if (
        item.kind !== "assignment" &&
        !subjectsToday.has(key) &&
        subjectsToday.size >= maxSubjectsPerDay
      ) {
        continue;
      }

      let placed = false;

      for (const interval of intervals) {
        while (item.remainingMinutes > 0 && budget >= step) {
          const available = interval.end - interval.cursor;
          const cap = Math.min(
            focusMinutes,
            item.remainingMinutes,
            budget,
            available
          );
          const duration = Math.floor(cap / step) * step;

          // A session shorter than minSession is only allowed when it
          // finishes what is left of the task.
          if (duration < Math.min(minSession, item.remainingMinutes)) {
            break;
          }
          if (duration < step) break;

          const sessionStart = interval.cursor;

          sessions.push({
            id: `session-${sessions.length + 1}`,
            date: day.date,
            weekday: day.weekday,
            startTime: timeFromMinutes(sessionStart),
            endTime: timeFromMinutes(sessionStart + duration),
            durationMinutes: duration,
            taskId: item.id,
            title: item.title,
            type: item.kind,
            subjectId: item.subjectId,
            subjectName: item.subjectName,
            dueDate: item.dueDate,
            reason: describeReason(item, day.date),
            completed: false,
          });

          item.remainingMinutes -= duration;
          budget -= duration;
          interval.cursor += duration;
          placed = true;

          if (item.remainingMinutes === 0) {
            completedOn.set(item.id, day.date);

            const completionDeadline =
              item.kind === "assignment" ? item.dueDate : item.scheduleByDate;
            if (completionDeadline && day.date > completionDeadline) {
              lateCompleted.push({
                id: item.id,
                title: item.title,
                type: item.kind,
                dueDate: item.dueDate,
                completedOn: day.date,
              });
            }
          } else {
            interval.cursor = Math.min(
              interval.end,
              interval.cursor + breakMinutes
            );
          }
        }
      }

      if (placed && item.kind !== "assignment") subjectsToday.add(key);
    }
  }

  const lastDate = days.length ? days[days.length - 1].date : endDate;

  const unscheduled = items
    .filter((item) => item.remainingMinutes > 0)
    .map((item) => ({
      id: item.id,
      title: item.title,
      type: item.kind,
      dueDate: item.originalDueDate || item.dueDate,
      remainingMinutes: item.remainingMinutes,
      status:
      item.carried || item.scheduleByDate <= lastDate
      ? "deadline-missed"
      : "not-scheduled",
    }));

  return {
    sessions,
    unscheduled,
    carriedOver,
    lateCompleted,
    summary: {
      totalSessions: sessions.length,
      scheduledMinutes: sessions.reduce(
        (total, session) => total + session.durationMinutes,
        0
      ),
      unscheduledTasks: unscheduled.length,
      missedDeadlines: unscheduled.filter(
        (task) => task.status === "deadline-missed"
      ).length,
      carriedOver: carriedOver.length,
      completedLate: lateCompleted.length,
    },
  };
}
