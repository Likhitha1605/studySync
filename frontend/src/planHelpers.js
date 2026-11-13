const DAY_MS = 24 * 60 * 60 * 1000;

export function addDateDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function getWeekStartMonday(dateString) {
  const date = new Date(`${dateString}T12:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

export function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, index) => addDateDays(weekStart, index));
}

function sessionIdentity(session) {
  return String(
    session.id ??
      [session.date, session.taskId, session.startTime, session.endTime, session.durationMinutes].join("|")
  );
}

export function getSessionCompletionKey(session, planId = "plan") {
  return [
    planId || "plan",
    session.id ?? "session",
    session.taskId ?? "task",
    session.date ?? "date",
    session.startTime ?? "start",
    Number(session.durationMinutes || 0),
  ].join("|");
}

export function getSessionsForWeek(sessions, weekStart) {
  const dates = new Set(getWeekDates(weekStart));
  const seen = new Set();

  return (Array.isArray(sessions) ? sessions : [])
    .filter((session) => dates.has(session.date))
    .filter((session) => {
      const identity = sessionIdentity(session);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        String(a.startTime || "").localeCompare(String(b.startTime || "")) ||
        String(a.id || "").localeCompare(String(b.id || ""))
    );
}

export function getThisWeekSubjectSummary(sessions, completedRecords, weekStart) {
  const dates = new Set(getWeekDates(weekStart));
  const groups = new Map();

  for (const session of getSessionsForWeek(sessions, weekStart)) {
    const name = session.subjectName || session.type || "Other";
    const row = groups.get(name) || {
      subjectName: name,
      plannedMinutes: 0,
      plannedSessions: 0,
      doneMinutes: 0,
      doneSessions: 0,
    };
    row.plannedMinutes += Number(session.durationMinutes || 0);
    row.plannedSessions += 1;
    groups.set(name, row);
  }

  const doneSeen = new Set();
  for (const record of Array.isArray(completedRecords) ? completedRecords : []) {
    if (!dates.has(record.date)) continue;
    const identity = String(record.sessionKey || record.sessionId || "");
    if (identity && doneSeen.has(identity)) continue;
    if (identity) doneSeen.add(identity);
    const name = record.subjectName || record.type || "Other";
    const row = groups.get(name) || {
      subjectName: name,
      plannedMinutes: 0,
      plannedSessions: 0,
      doneMinutes: 0,
      doneSessions: 0,
    };
    row.doneMinutes += Number(record.durationMinutes || 0);
    row.doneSessions += 1;
    groups.set(name, row);
  }

  return [...groups.values()].sort(
    (a, b) => b.plannedMinutes - a.plannedMinutes || a.subjectName.localeCompare(b.subjectName)
  );
}

export function minutesBetweenTimes(start, end) {
  if (!start || !end) return 0;
  const toMinutes = (value) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  return Math.max(0, toMinutes(end) - toMinutes(start));
}

export { DAY_MS };
