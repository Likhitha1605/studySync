import { GATE_DATA, paperForBranch } from "./gateData.js ";

// The GATE page deliberately does not ask for college timings, holidays,
// semester dates or free-time windows. Its month/week plan uses this transparent
// default capacity until the exam date: 2 hours per study day, Sunday off, and
// a rest/light day before the exam. Academics + GATE can override the minutes
// with the same amount reserved by the academic planner.
export const GATE_DEFAULTS = {
  gateMinutesPerDay: 120,
  restDay: 0,
  restBeforeExamDays: 1,
  shortMonths: 6,
  mockMinutes: 180,
};

export function addDays(date, amount) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

const dow = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
const mondayOf = (date) => addDays(date, -((dow(date) + 6) % 7));
const round10 = (minutes) => Math.round(minutes / 10) * 10;
const hm = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours ? `${hours} h` : ""}${hours && remainder ? " " : ""}${remainder ? `${remainder} min` : ""}` || "0 h";
};
const diffDays = (from, to) =>
  Math.round(
    (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000
  );

function dayCapacities(_input, today, gateDate, settings) {
  const last = addDays(gateDate, -1);
  const configuredMinutes = Number(
    settings.gateMinutesPerDay ?? GATE_DEFAULTS.gateMinutesPerDay
  );
  const minutesPerStudyDay = Number.isFinite(configuredMinutes)
    ? Math.min(480, Math.max(0, configuredMinutes))
    : GATE_DEFAULTS.gateMinutesPerDay;
  const restDay = Number(settings.restDay ?? GATE_DEFAULTS.restDay);
  const restBeforeExamDays = Math.max(
    0,
    Number(settings.restBeforeExamDays ?? GATE_DEFAULTS.restBeforeExamDays) || 0
  );
  const step = 10;
  const lastActiveDate = addDays(gateDate, -1 - restBeforeExamDays);
  const days = [];

  for (let date = today; date <= last; date = addDays(date, 1)) {
    const isRestDay = dow(date) === restDay;
    const isExamBuffer = date > lastActiveDate;
    const minutes = isRestDay || isExamBuffer
      ? 0
      : Math.floor(minutesPerStudyDay / step) * step;
    days.push({ date, minutes });
  }

  return days;
}

function makeWeeks(days) {
  const weeks = [];
  for (const day of days) {
    const key = mondayOf(day.date);
    let week = weeks[weeks.length - 1];
    if (!week || week.key !== key) {
      // Expose a consistent Monday-to-Sunday date range even when the planning
      // window starts or ends partway through a calendar week.
      week = { key, start: key, end: addDays(key, 6), minutes: 0 };
      weeks.push(week);
    }
    week.minutes += day.minutes;
  }
  return weeks;
}

const revisionWeekCount = (count) =>
  count >= 20 ? 4 : count >= 12 ? 3 : count >= 6 ? 2 : count >= 3 ? 1 : 0;

function invalidResult(error, paper = null) {
  return { ok: false, error, paper };
}

/**
 * Build a GATE preparation plan at monthly and weekly granularity.
 * No daily GATE timetable is generated.
 */
export function buildGatePlan(
  input,
  { today, gateDate, settings = {}, overrides = {}, data = GATE_DATA, paper: requestedPaper } = {}
) {
  const st = { ...GATE_DEFAULTS, ...settings };
  const branch = input.student?.branch || input.profile?.branch || "CSE";
  const suppliedPaper = String(requestedPaper || "").trim().toUpperCase();
  const paper = suppliedPaper || paperForBranch(branch);

  if (!paper || !data[paper]) {
    return invalidResult(
      `GATE syllabus and planning data for ${paper || branch} has not been added yet (see gateData.js).`,
      paper
    );
  }
  if (!today || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return invalidResult("A valid planning date is required.", paper);
  }
  if (!gateDate || !/^\d{4}-\d{2}-\d{2}$/.test(gateDate) || !(gateDate > today)) {
    return invalidResult("The GATE date must be after today.", paper);
  }

  const rawPaperData = data[paper];
  let paperData = rawPaperData;

  // GATE RA contains a common Part A plus one candidate-selected option:
  // Part B1 (Electrical) or Part B2 (Mechanical). Never schedule both options.
  if (paper === "RA") {
    const raPart = String(st.raPart || "").trim().toUpperCase();
    if (!["B1", "B2"].includes(raPart)) {
      return invalidResult(
        "For GATE RA, select Part B1 (Electrical Engineering) or Part B2 (Mechanical Engineering).",
        paper
      );
    }
    st.raPart = raPart;
    paperData = {
      ...rawPaperData,
      subjects: rawPaperData.subjects.filter(
        (subject) => !subject.part || subject.part === "COMMON" || subject.part === raPart
      ),
    };
  }

  const chapters = [];
  const subjects = paperData.subjects.map((subject) => {
    const suppliedMarks = overrides.marks?.[subject.id] ?? subject.marks;
    const marks = Number.isFinite(Number(suppliedMarks))
      ? Math.max(0, Number(suppliedMarks))
      : subject.marks;
    const chapterList = subject.chapters.map((chapter) => {
      const suppliedHours = overrides.hours?.[chapter.id] ?? chapter.hours;
      const hours = Number.isFinite(Number(suppliedHours))
        ? Math.max(0, Number(suppliedHours))
        : chapter.hours;
      return { ...chapter, hours };
    });
    return {
      ...subject,
      marks,
      chapters: chapterList,
      hours: chapterList.reduce((total, chapter) => total + chapter.hours, 0),
    };
  });

  for (const subject of subjects) {
    for (const chapter of subject.chapters) {
      const share = chapter.share ?? (subject.hours > 0 ? chapter.hours / subject.hours : 0);
      const minutes = Math.round(chapter.hours * 60);
      chapters.push({
        ...chapter,
        subjectId: subject.id,
        subjectName: subject.name,
        parallel: Boolean(subject.parallel),
        minutes,
        marks: subject.marks * share,
        efficiency: chapter.hours > 0 ? (subject.marks * share) / chapter.hours : 0,
        index: chapters.length,
        subjectOrder: paperData.order.indexOf(subject.id),
      });
    }
  }

  const chaptersById = Object.fromEntries(chapters.map((chapter) => [chapter.id, chapter]));
  for (const subject of subjects) {
    subject.efficiency = subject.hours > 0 ? subject.marks / subject.hours : 0;
  }
  const rank = Object.fromEntries(
    [...subjects]
      .sort((a, b) => b.efficiency - a.efficiency)
      .map((subject, index) => [subject.id, index + 1])
  );

  const capacityFor = (settingsToUse) => {
    const days = dayCapacities(input, today, gateDate, settingsToUse);
    const weeks = makeWeeks(days);
    // A final week always exists when there is planning capacity; for very short
    // plans, reserve at least that final week even if no extra revision week fits.
    const revisionWeeks = weeks.length ? Math.max(1, revisionWeekCount(weeks.length)) : 0;
    const learningWeeks = weeks.slice(0, Math.max(0, weeks.length - revisionWeeks));
    return {
      days,
      weeks,
      revisionWeeks,
      learning: learningWeeks.reduce((total, week) => total + week.minutes, 0),
      total: days.reduce((total, day) => total + day.minutes, 0),
    };
  };

  const capacity = capacityFor(st);
  const { weeks, revisionWeeks } = capacity;
  const monthsAvailable = Number((weeks.length / 4.345).toFixed(1));
  const mode = monthsAvailable < Number(st.shortMonths) ? "short" : "long";
  const totalMinutes = chapters.reduce((total, chapter) => total + chapter.minutes, 0);

  // Select high-return chapters when capacity is short, adding prerequisites
  // so the plan never schedules a dependent chapter without its foundation.
  const picked = new Set();
  const prerequisiteClosure = (chapter, seen = new Set()) => {
    if (!chapter || seen.has(chapter.id)) return [];
    seen.add(chapter.id);
    return [
      chapter,
      ...(chapter.requires || []).flatMap((requiredId) =>
        chaptersById[requiredId]
          ? prerequisiteClosure(chaptersById[requiredId], seen)
          : []
      ),
    ];
  };

  if (totalMinutes <= capacity.learning) {
    // A long plan can cover the entire syllabus when the available capacity permits.
    chapters.forEach((chapter) => picked.add(chapter.id));
  } else {
    let usedMinutes = 0;
    let candidates;

    if (mode === "short") {
      // Short plans maximize estimated marks per hour, with foundations as a tie-breaker.
      candidates = [...chapters].sort(
        (a, b) =>
          b.efficiency - a.efficiency ||
          Number(Boolean(b.basic)) - Number(Boolean(a.basic)) ||
          a.index - b.index
      );
    } else {
      // If a nominally long plan still cannot fit the whole syllabus, preserve
      // General Aptitude and then work through technical foundations in syllabus order.
      // This keeps a transparent coverage warning instead of pretending the full
      // syllabus fits or silently switching the long plan to short-plan ranking.
      const technical = chapters.filter((chapter) => !chapter.parallel);
      const placed = new Set();
      const foundationOrder = [];
      const rest = [...technical];
      while (rest.length) {
        const ready = rest.filter((chapter) =>
          (chapter.requires || []).every((requiredId) =>
            placed.has(requiredId) || !chaptersById[requiredId]
          )
        );
        const next = [...(ready.length ? ready : rest)].sort(
          (a, b) => a.subjectOrder - b.subjectOrder || a.index - b.index
        )[0];
        rest.splice(rest.indexOf(next), 1);
        placed.add(next.id);
        foundationOrder.push(next);
      }
      candidates = [
        ...chapters.filter((chapter) => chapter.parallel).sort((a, b) => a.index - b.index),
        ...foundationOrder,
      ];
    }

    for (const chapter of candidates) {
      if (picked.has(chapter.id)) continue;
      const needed = prerequisiteClosure(chapter).filter((item) => !picked.has(item.id));
      const cost = needed.reduce((total, item) => total + item.minutes, 0);
      if (usedMinutes + cost <= capacity.learning) {
        needed.forEach((item) => picked.add(item.id));
        usedMinutes += cost;
      }
    }
  }

  const chosen = chapters.filter((chapter) => picked.has(chapter.id));

  const ordered = (list) => {
    const placed = new Set();
    const output = [];
    const remaining = [...list];
    const compare = mode === "short"
      ? (a, b) =>
          b.efficiency - a.efficiency ||
          Number(Boolean(b.basic)) - Number(Boolean(a.basic)) ||
          a.index - b.index
      : (a, b) => a.subjectOrder - b.subjectOrder || a.index - b.index;

    while (remaining.length) {
      const ready = remaining.filter((chapter) =>
        (chapter.requires || []).every((requiredId) => placed.has(requiredId) || !picked.has(requiredId))
      );
      const next = [...(ready.length ? ready : remaining)].sort(compare)[0];
      remaining.splice(remaining.indexOf(next), 1);
      placed.add(next.id);
      output.push(next);
    }
    return output;
  };

  const mainQueue = ordered(chosen.filter((chapter) => !chapter.parallel)).map((chapter) => ({
    ...chapter,
    left: chapter.minutes,
    started: false,
  }));
  const aptitudeQueue = ordered(chosen.filter((chapter) => chapter.parallel)).map((chapter) => ({
    ...chapter,
    left: chapter.minutes,
    started: false,
  }));
  const aptitudeShare =
    aptitudeQueue.reduce((total, chapter) => total + chapter.minutes, 0) /
    Math.max(1, chosen.reduce((total, chapter) => total + chapter.minutes, 0));

  const dependents = {};
  for (const chapter of chosen) {
    for (const requiredId of chapter.requires || []) {
      (dependents[requiredId] ||= []).push(chapter.name);
    }
  }

  const reasonFor = (chapter) => {
    const reasons = [];
    if (dependents[chapter.id]?.length) {
      reasons.push(`foundation for ${dependents[chapter.id].slice(0, 2).join(" and ")}`);
    } else if (chapter.basic) {
      reasons.push("basic chapter, studied before harder topics");
    }
    reasons.push(
      `${chapter.efficiency.toFixed(2)} expected marks per study hour (subject ranked ${rank[chapter.subjectId]} of ${subjects.length})`
    );
    return reasons.join("; ");
  };

  const take = (queue, minutes, output) => {
    let used = 0;
    for (const chapter of queue) {
      if (used >= minutes) break;
      if (chapter.left <= 0) continue;
      const chunk = Math.min(chapter.left, minutes - used);
      chapter.left -= chunk;
      used += chunk;
      output.push({
        type: "learn",
        subjectId: chapter.subjectId,
        subjectName: chapter.subjectName,
        chapterId: chapter.id,
        name: chapter.name,
        minutes: chunk,
        finishes: chapter.left === 0,
        continues: chapter.started,
        reason: reasonFor(chapter),
      });
      chapter.started = true;
    }
    return used;
  };

  const weeksOut = weeks.map((week, index) => {
    const phase = index < weeks.length - revisionWeeks
      ? "learn"
      : index === weeks.length - 1
        ? "final"
        : "revise";
    const items = [];

    if (phase === "learn") {
      const aptitudeCapacity = round10(week.minutes * aptitudeShare);
      let used = take(aptitudeQueue, aptitudeCapacity, items);
      used += take(mainQueue, week.minutes - used, items);
      used += take(aptitudeQueue, week.minutes - used, items);
      if (used < week.minutes) {
        items.push({
          type: "practice",
          name: "Previous-year questions and practice",
          minutes: week.minutes - used,
          reason: "The selected chapters are finished early, so use the remaining capacity for practice.",
        });
      }
    } else if (week.minutes > 0) {
      const mockMinutes = week.minutes >= 240
        ? Number(st.mockMinutes)
        : week.minutes >= 120
          ? 90
          : 0;
      if (mockMinutes > 0) {
        items.push({
          type: "mock",
          name: mockMinutes >= 180 ? "Full-length mock test and error analysis" : "Sectional mock test",
          minutes: Math.min(mockMinutes, week.minutes),
          reason: "Timed practice builds speed and helps identify weak topics.",
        });
      }

      const coveredSubjects = subjects
        .map((subject) => ({
          subject,
          weight: subject.marks *
            (chosen.filter((chapter) => chapter.subjectId === subject.id)
              .reduce((total, chapter) => total + chapter.hours, 0) / Math.max(1, subject.hours)),
        }))
        .filter((item) => item.weight > 0);
      const totalWeight = coveredSubjects.reduce((total, item) => total + item.weight, 0);
      let rest = Math.max(0, week.minutes - Math.min(mockMinutes, week.minutes));

      coveredSubjects
        .sort((a, b) => b.weight - a.weight)
        .forEach((item, itemIndex) => {
          const minutes = itemIndex === coveredSubjects.length - 1
            ? rest
            : Math.min(rest, round10((Math.max(0, week.minutes - Math.min(mockMinutes, week.minutes)) * item.weight) / Math.max(1, totalWeight)));
          if (minutes >= 10) {
            items.push({
              type: "revise",
              subjectId: item.subject.id,
              subjectName: item.subject.name,
              name: `Revise ${item.subject.name}`,
              minutes,
              reason: "Revision time is distributed according to the subjects' expected marks.",
            });
            rest -= minutes;
          }
        });

      if (rest > 0) {
        items.push({
          type: "practice",
          name: "Previous-year questions and error review",
          minutes: rest,
          reason: "Use remaining revision capacity to review mistakes and reinforce important topics.",
        });
      }
    }

    const targets = items.map((item) => {
      if (item.type === "learn") {
        const marker = item.finishes ? " · finish this" : item.continues ? " · continue" : "";
        return `${item.subjectName}: ${item.name} · ${hm(item.minutes)}${marker}`;
      }
      return `${item.name} · ${hm(item.minutes)}`;
    });

    return {
      index,
      start: week.start,
      end: week.end,
      phase,
      capacityMinutes: week.minutes,
      scheduledMinutes: items.reduce((total, item) => total + item.minutes, 0),
      items,
      targets,
    };
  });

  const monthMap = new Map();
  for (const week of weeksOut) {
    const midpoint = addDays(week.start, Math.floor(diffDays(week.start, week.end) / 2));
    const key = midpoint.slice(0, 7);
    if (!monthMap.has(key)) {
      monthMap.set(key, { key, capacityMinutes: 0, weeks: [], bySubjectOrItem: new Map(), mocks: 0 });
    }
    const month = monthMap.get(key);
    month.capacityMinutes += week.capacityMinutes;
    month.weeks.push(week.index);

    for (const item of week.items) {
      if (item.type === "mock") month.mocks += 1;
      const groupKey = item.subjectName || item.name;
      const entry = month.bySubjectOrItem.get(groupKey) || {
        name: groupKey,
        minutes: 0,
        finished: [],
        type: item.type,
      };
      entry.minutes += item.minutes;
      if (item.finishes) entry.finished.push(item.name);
      month.bySubjectOrItem.set(groupKey, entry);
    }
  }

  const months = [...monthMap.values()].map((month) => ({
    key: month.key,
    capacityMinutes: month.capacityMinutes,
    weeks: month.weeks,
    mocks: month.mocks,
    subjects: [...month.bySubjectOrItem.values()].map((entry) => ({
      name: entry.name,
      minutes: entry.minutes,
      finished: entry.finished,
    })),
    targets: [...month.bySubjectOrItem.values()].map((entry) =>
      `${entry.name}: ${hm(entry.minutes)}${entry.finished.length ? ` — complete ${entry.finished.join("; ")}` : ""}`
    ),
  }));

  const selectedMinutes = chosen.reduce((total, chapter) => total + chapter.minutes, 0);
  const skipped = chapters
    .filter((chapter) => !picked.has(chapter.id))
    .map((chapter) => ({
      id: chapter.id,
      subjectName: chapter.subjectName,
      name: chapter.name,
      hours: chapter.hours,
      reason: `Left out: ${chapter.marks.toFixed(1)} expected marks for ${chapter.hours} h is a lower return for the time available.`,
    }));

  const subjectsOut = subjects.map((subject) => {
    const selectedHours = chosen
      .filter((chapter) => chapter.subjectId === subject.id)
      .reduce((total, chapter) => total + chapter.hours, 0);
    const status = selectedHours === 0
      ? "skipped"
      : selectedHours < subject.hours
        ? "partial"
        : "scheduled";
    const first = weeksOut.find((week) =>
      week.items.some((item) => item.subjectId === subject.id && item.type === "learn")
    );
    return {
      id: subject.id,
      name: subject.name,
      marks: subject.marks,
      hours: subject.hours,
      selectedHours,
      efficiency: Number(subject.efficiency.toFixed(3)),
      rank: rank[subject.id],
      status,
      firstWeek: first ? first.start : null,
      reason: status === "skipped"
        ? `Not in this plan: ${subject.marks} expected marks for ${subject.hours} h ranks ${rank[subject.id]} of ${subjects.length} in marks per hour.`
        : `${subject.marks} expected marks for ${subject.hours} h of study (rank ${rank[subject.id]} of ${subjects.length} in marks per hour)${status === "partial" ? "; only its best chapters fit" : ""}.`,
    };
  });

  const warnings = [];
  const explanations = [
    mode === "short"
      ? `Only ${monthsAvailable} months remain (under ${st.shortMonths}), so StudySync prioritizes chapters with higher estimated marks per study hour and includes their prerequisites.`
      : `${monthsAvailable} months remain (${st.shortMonths} or more), so StudySync uses the long-plan order with foundation topics first where capacity permits.`,
    `The last ${revisionWeeks} week${revisionWeeks === 1 ? "" : "s"} are reserved for revision and mock-test work.`,
    `This plan assumes ${st.gateMinutesPerDay / 60} study hours per study day, with ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][Number(st.restDay)] || "the selected rest day"} off and ${Number(st.restBeforeExamDays) || 0} rest/light day(s) before the exam. It does not use college timetables, semester dates, holidays or free-time windows.`,
  ];

  if (skipped.length) {
    warnings.push({
      type: "coverage",
      message: `${hm(totalMinutes - selectedMinutes)} of the estimated syllabus does not fit and is left out (${[...new Set(skipped.map((item) => item.subjectName))].join(", ")}).`,
    });

    const fits = (minutesPerStudyDay) =>
      capacityFor({ ...st, gateMinutesPerDay: minutesPerStudyDay }).learning >= totalMinutes;

    let suggestion = null;
    for (let minutes = st.gateMinutesPerDay + 30; minutes <= 480 && !suggestion; minutes += 30) {
      if (fits(minutes)) suggestion = { gateMinutesPerDay: minutes };
    }

    warnings.push({
      type: "suggestion",
      settings: suggestion,
      message: suggestion
        ? `To cover the complete estimated syllabus before this date, the plan would need about ${suggestion.gateMinutesPerDay / 60} study hours per study day (the current default is ${st.gateMinutesPerDay / 60} h).`
        : "The complete estimated syllabus does not fit before this GATE date, even at the tested maximum of 8 study hours per study day. Consider a later attempt or prioritize the highest-value chapters.",
    });
  }

  return {
    ok: true,
    paper,
    paperName: paperData.paperName,
    source: paperData.source,
    today,
    gateDate,
    mode,
    monthsAvailable,
    weeksAvailable: weeks.length,
    revisionWeeks,
    settings: st,
    overrides: {
      marks: { ...(overrides.marks || {}) },
      hours: { ...(overrides.hours || {}) },
    },
    capacity: { totalMinutes: capacity.total, learningMinutes: capacity.learning },
    coverage: {
      selectedMinutes,
      totalMinutes,
      percentHours: totalMinutes > 0 ? Math.round((selectedMinutes / totalMinutes) * 100) : 0,
      marksCovered: Number(chosen.reduce((total, chapter) => total + chapter.marks, 0).toFixed(1)),
      marksTotal: Number(chapters.reduce((total, chapter) => total + chapter.marks, 0).toFixed(1)),
    },
    weeks: weeksOut,
    months,
    subjects: subjectsOut,
    skipped,
    explanations,
    warnings,
  };
}
