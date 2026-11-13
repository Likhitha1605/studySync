import { buildAvailabilityWindows } from "./buildAvailabilityWindows.js";
import { getDailyStudyMinutes } from "./getDailyStudyMinutes.js";
import { buildWorkItems, lastStudyDate } from "./buildWorkItems.js";

export function analyzeWorkload(input, startDate, endDate, now = new Date()) {
  const settings = input.settings || {};
  const days = buildAvailabilityWindows(input, startDate, endDate, now);
  const items = buildWorkItems(input, startDate, endDate);

  const minutesByDate = new Map(
    days.map((day) => [day.date, getDailyStudyMinutes(day, input)])
  );

  // Every distinct due date is a checkpoint.
  const deadlines = [...new Set(items.map((item) => item.dueDate))]
    .filter((date) => date && date >= startDate && date <= endDate)
    .sort();

  return deadlines.map((deadline) => {
    const cutoff = lastStudyDate(deadline, settings);

const requiredTasks = items.filter(
  (item) =>
    item.dueDate &&
    item.dueDate <= deadline &&
    item.scheduleByDate <= cutoff
);    const requiredMinutes = requiredTasks.reduce(
      (sum, item) => sum + item.remainingMinutes,
      0
    );

    const availableMinutes = days
      .filter((day) => day.date <= cutoff)
      .reduce((sum, day) => sum + (minutesByDate.get(day.date) || 0), 0);

    const shortageMinutes = Math.max(0, requiredMinutes - availableMinutes);

    const itemsFallingShort =
      shortageMinutes > 0
        ? [...requiredTasks]
            .sort((a, b) => b.remainingMinutes - a.remainingMinutes)
            .map((item) => ({
              id: item.id,
              title: item.title,
              type: item.kind,
              remainingHours: Number((item.remainingMinutes / 60).toFixed(2)),
            }))
        : [];

    return {
      deadline,
      requiredHours: Number((requiredMinutes / 60).toFixed(2)),
      availableHours: Number((availableMinutes / 60).toFixed(2)),
      shortageHours: Number((shortageMinutes / 60).toFixed(2)),
      feasible: shortageMinutes === 0,
      itemsFallingShort,
    };
  });
}