const DEFAULT_CONFIDENCE_FACTORS = {
  strong: 0.8,
  okay: 1.0,
  weak: 1.3,
};

const DEFAULT_ROUNDING_STEP = 10;
const DEFAULT_REVISION_PERCENT = 25;

export function previousDate(date) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

function nextDate(date) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

export function lastStudyDate(deadline, settings = {}) {
  return settings.cutoffRule === "deadline-day"
    ? deadline
    : previousDate(deadline);
}

function roundUp(minutes, step) {
  return Math.ceil(Math.max(0, Number(minutes) || 0) / step) * step;
}

function findExamStart(input, id) {
  return (
    input.exams?.find(
      (exam) => exam.id === id || exam.type === id
    )?.startDate || ""
  );
}

export function getFinalDeadline(input, subject, endDate) {
  return (
    subject.endExamDate ||
    findExamStart(input, "end") ||
    input.student?.semesterEnd ||
    endDate
  );
}

export function getUnitDeadline(
  input,
  subject,
  unit,
  startDate,
  endDate
) {
  const mid = Number(unit.mid);

  if (mid === 1 || mid === 2) {
    const midDate = findExamStart(input, `mid-${mid}`);

    if (midDate && midDate >= startDate) {
      return midDate;
    }
  }

  return getFinalDeadline(input, subject, endDate);
}

export function buildWorkItems(input, startDate, endDate) {
  const settings = input.settings || {};

  const confidenceFactors = {
    ...DEFAULT_CONFIDENCE_FACTORS,
    ...(settings.confidenceFactors || {}),
  };

  const step = Math.max(
    1,
    Number(settings.sessionStepMinutes ?? DEFAULT_ROUNDING_STEP)
  );

  const revisionPercent = Math.max(
    0,
    Number(settings.revisionPercent ?? DEFAULT_REVISION_PERCENT)
  );

  const items = [];
  const completedMinutesByTaskId = input.completedMinutesByTaskId || {};
  const alreadyCompleted = (taskId) => Math.max(
    0,
    Number(completedMinutesByTaskId[String(taskId)] || 0)
  );

  // --------------------------------------------------
  // SUBJECT STUDY AND REVISION
  // Preserve the existing subject-study functionality.
  // --------------------------------------------------

  for (const subject of input.subjects || []) {
    for (const unit of subject.units || []) {
      const completion = Math.min(
        100,
        Math.max(0, Number(unit.percentComplete || 0))
      );

      const confidence = String(
        unit.confidence || subject.confidence || "okay"
      ).toLowerCase();

      const factor = Math.max(
        0,
        Number(confidenceFactors[confidence] ?? 1)
      );

      const estMinutes = Math.max(
        0,
        Number(unit.estHours || 0)
      ) * 60;

      const deadline = getUnitDeadline(
        input,
        subject,
        unit,
        startDate,
        endDate
      );

      const finalDeadline = getFinalDeadline(
        input,
        subject,
        endDate
      );

      const firstPassMinutes = Math.max(
        0,
        roundUp(estMinutes * (1 - completion / 100) * factor, step) -
          alreadyCompleted(unit.id)
      );

      const revisionMinutes = Math.max(
        0,
        roundUp((estMinutes * revisionPercent) / 100, step) -
          alreadyCompleted(`${unit.id}-revision`)
      );

      const common = {
        subjectId: subject.id,
        subjectName: subject.name,
        mid: Number(unit.mid || 0),
        dueDate: deadline,
        scheduleByDate: lastStudyDate(deadline, settings),

        carryDeadline:
          deadline !== finalDeadline
            ? lastStudyDate(finalDeadline, settings)
            : null,

        finalDeadline,
        difficulty: Number(subject.difficulty || 1),
        priority: unit.priority || "normal",
        eligibleFrom: startDate,
      };

      if (firstPassMinutes > 0) {
        items.push({
          ...common,
          id: unit.id,
          title: unit.name,
          kind: "first-pass",
          remainingMinutes: firstPassMinutes,
          dependsOn: null,
        });
      }

      if (revisionMinutes > 0) {
        items.push({
          ...common,
          id: `${unit.id}-revision`,
          title: `${unit.name} — Revision`,
          kind: "revision",
          scheduleByDate: lastStudyDate(deadline, settings),
          carryDeadline: null,
          remainingMinutes: revisionMinutes,
          dependsOn: firstPassMinutes > 0 ? unit.id : null,
        });
      }
    }
  }

  // --------------------------------------------------
  // ASSIGNMENT SCHEDULING
  //
  // Normal assignments:
  // Schedule only on available dates 2 days or 1 day
  // before the original deadline.
  //
  // Semester-start mode:
  // Use the selected semester start date, not today's
  // date, as the beginning of the planning timeline.
  //
  // Present-date mode:
  // Overdue assignments become backlog and can be
  // scheduled on future available days.
  // --------------------------------------------------

  const now = new Date();

  const localToday = input.today || [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const isSemesterStartPlan =
    input.planStartMode === "semester" ||
    (!input.planStartMode && startDate < localToday);

  for (const assignment of input.assignments || []) {
    if (assignment.completed) continue;

    const subject = (input.subjects || []).find(
      (item) =>
        item.id === assignment.subjectId ||
        item.name === assignment.subject
    );

    const minutes = Math.max(
      0,
      roundUp(Number(assignment.estHours ?? assignment.hours ?? 1) * 60, step) -
        alreadyCompleted(assignment.id)
    );

    if (minutes <= 0) continue;

    const dueDate = assignment.dueDate || endDate;

    const addedDate = assignment.addedDate || localToday;

    const baseEligibleFrom = isSemesterStartPlan
      ? startDate
      : [
          startDate,
          addedDate,
          localToday,
        ].reduce((latest, date) =>
          date > latest ? date : latest
        );

    const twoDaysBeforeDue = previousDate(
      previousDate(dueDate)
    );

    const dayBeforeDue = previousDate(dueDate);

    // For a semester-start plan, only dates before the selected
    // planning start are considered past the planning window.
    //
    // For a present-date plan, deadlines already passed are backlog.
    const isOverdue = isSemesterStartPlan
      ? dueDate < startDate
      : dueDate <= localToday || dueDate < baseEligibleFrom;

    let eligibleFrom;
    let scheduleByDate;

    if (isOverdue) {
      // Keep the original deadline for display.
      // Backlog work can be scheduled in the future.
      eligibleFrom = isSemesterStartPlan
        ? startDate
        : nextDate(
            baseEligibleFrom > localToday
              ? baseEligibleFrom
              : localToday
          );

      scheduleByDate = endDate;
    } else {
      // Only the two days before the assignment's deadline.
      // Never use the deadline itself as a study date.
      eligibleFrom =
        baseEligibleFrom > twoDaysBeforeDue
          ? baseEligibleFrom
          : twoDaysBeforeDue;

      scheduleByDate = dayBeforeDue;
    }

    items.push({
      id: String(assignment.id),
      title: assignment.title || "Untitled assignment",
      kind: "assignment",

      subjectId: String(
        assignment.subjectId ??
          subject?.id ??
          assignment.subject ??
          ""
      ),

      subjectName: subject?.name || assignment.subject || "",
      mid: 0,

      dueDate,
      originalDueDate: dueDate,

      scheduleByDate,
      carryDeadline: null,

      remainingMinutes: minutes,
      difficulty: Number(subject?.difficulty || 1),

      // Prioritize assignments among work competing for study time.
      priority: assignment.priority || "high",

      eligibleFrom,
      dependsOn: null,
      overdue: isOverdue,
      addedDate,
    });
  }

  return items;
}