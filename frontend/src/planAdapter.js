
const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseCoverageRange(raw, fallbackStart, fallbackEnd) {
  const text = String(raw ?? "").trim();
  if (!text || /not announced/i.test(text)) {
    return { start: fallbackStart, end: fallbackEnd };
  }
  const range = text.match(/Units?\s*(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/i);
  if (range) return { start: Number(range[1]), end: Number(range[2]) };
  const single = text.match(/^(\d+(?:\.\d+)?)$/);
  if (single) return { start: 1, end: Number(single[1]) };
  return { start: fallbackStart, end: fallbackEnd };
}

function getMid1Split(subject) {
  const range = parseCoverageRange(subject.midCoverage, 1, 2.5);
  return clamp(range.end, 1, Number(subject.units) || 1);
}

function getMid2Range(subject, mid1Split, totalUnits) {
  const fallbackStart = Math.floor(mid1Split) + (mid1Split % 1 ? 0.5 : 1);
  const range = parseCoverageRange(
    subject.mid2Coverage,
    Math.min(totalUnits, fallbackStart),
    totalUnits
  );
  return {
    start: clamp(range.start, 1, totalUnits),
    end: clamp(range.end, 1, totalUnits),
  };
}

export function mapFormToStudentInput(data) {
  const now = new Date();
  const localToday = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const today = data.today || localToday;

  const toExam = (id, type, name, startDate, endDate) => {
    if (!startDate || !endDate) return null;
    return { id, type, name, startDate, endDate };
  };

  const exams = [
    toExam("mid-1", "mid", "Mid I", data.mid1From, data.mid1To),
    toExam("mid-2", "mid", "Mid II", data.mid2From, data.mid2To),
    toExam("end-exams", "end", "Semester End Exams", data.endFrom, data.endTo),
  ].filter(Boolean);


  const subjects = (data.subjects || []).map((subject) => {
    const totalUnits = Math.max(1, Number(subject.units) || 1);
    const mid1Split = getMid1Split(subject);
    const mid2Range = getMid2Range(subject, mid1Split, totalUnits);
    const confidence = String(subject.confidence || "okay").toLowerCase();
    const unitDetails = Array.isArray(subject.unitDetails)
      ? subject.unitDetails
      : [];
    const units = [];

    for (let index = 0; index < totalUnits; index += 1) {
      const unitNumber = index + 1;
      const detail = unitDetails[index] || {};
      const unitName = String(detail.name || `Unit ${unitNumber}`).trim();
      const estHours = Math.max(0, Number(detail.estHours) || 0);
      const percentComplete = clamp(Number(detail.percentComplete) || 0, 0, 100);
      const boundaries = [unitNumber - 1, unitNumber];
      for (const boundary of [mid1Split, mid2Range.start - 1, mid2Range.end]) {
        if (boundary > unitNumber - 1 && boundary < unitNumber) boundaries.push(boundary);
      }
      boundaries.sort((a, b) => a - b);
      const unique = boundaries.filter((value, i) => i === 0 || value !== boundaries[i - 1]);

      for (let partIndex = 0; partIndex < unique.length - 1; partIndex += 1) {
        const from = unique[partIndex];
        const to = unique[partIndex + 1];
        const fraction = to - from;
        const midpoint = (from + to) / 2;
        const mid = midpoint <= mid1Split ? 1
          : midpoint >= mid2Range.start - 1 && midpoint <= mid2Range.end ? 2
          : null;
        // Completion is distributed across a split unit; whole units retain the exact entered percentage.
        const completionForPart = unique.length === 2
          ? percentComplete
          : clamp(((percentComplete / 100 - (from - (unitNumber - 1))) / fraction) * 100, 0, 100);
        const part = unique.length > 2 || fraction < 1;
        units.push({
          id: part ? `${subject.id}-u${unitNumber}-p${partIndex + 1}` : `${subject.id}-u${unitNumber}`,
          name: part ? `${subject.name.trim()} — ${unitName} (part ${partIndex + 1})` : `${subject.name.trim()} — ${unitName}`,
          estHours: estHours * fraction,
          percentComplete: part ? completionForPart : percentComplete,
          mid,
          confidence,
          parentUnitId: `${subject.id}-u${unitNumber}`,
          ...(part ? { part: partIndex + 1 } : {}),
        });
      }
    }

    return {
      id: String(subject.id),
      name: String(subject.name || "").trim(),
      type: String(subject.type || "Theory").toLowerCase(),
      credits: Number(subject.credits) || 0,
      difficulty: confidence === "weak" ? 3 : confidence === "strong" ? 1 : 2,
      confidence,
      endExamDate: data.endFrom || data.semesterEnd || "",
      mid1Split,
      mid2Range,
      units,
    };
  });

  const subjectIdFor = (name) =>
    subjects.find((subject) => subject.name === name)?.id || "";

  
  const assignments = (data.assignments || []).map((assignment) => ({
    id: String(assignment.id),
    title: String(assignment.title || "").trim(),
    subjectId: subjectIdFor(assignment.subject),
    dueDate: assignment.dueDate || data.semesterEnd || "",
    addedDate: assignment.addedDate || today,
    estHours: Math.max(0, Number(assignment.hours) || 0),
    completed: Boolean(assignment.completed),
  }));


  const collegeTimings = WEEKDAYS
    .filter((day) => (data.collegeDays || []).includes(day))
    .map((weekday) => {
      const override = data.timingOverrides?.[weekday];
      const hasOverride = Boolean(override?.startTime && override?.endTime);

      return {
        weekday,
        start: hasOverride ? override.startTime : data.collegeStart,
        end: hasOverride ? override.endTime : data.collegeEnd,
      };
    });

  const dailyStudyHours = WEEKDAYS.map((weekday) => ({
    weekday,
    availableHours: Math.max(
      0,
      Number(
        ["Saturday", "Sunday"].includes(weekday)
          ? data.sundayHours
          : data.weekdayHours
      ) || 0
    ),
  }));

  const maxFocusMinutes = Math.max(
    30,
    Number.parseInt(data.longestStretch, 10) || 60
  );

  return {
    student: {
      id: "student-001",
      branch: data.branch,
      college: data.college,
      year: Number.parseInt(data.year, 10) || 1,
      semester: data.semester,
      semesterStart: data.semesterStart,
      semesterEnd: data.semesterEnd,
    },

    today,
    exams,
    holidays: data.holidays || [],
    subjects,
    assignments,
    collegeTimings,
    dailyStudyHours,

    routine: {
      wakeTime: data.wakeTime || "06:00",
      sleepTime: data.sleepTime || "23:00",
      weeklySchedule: WEEKDAYS.map((weekday) => {
        const collegeDay = (data.collegeDays || []).includes(weekday);
        const override = data.timingOverrides?.[weekday];
        const hasOverride = Boolean(override?.startTime && override?.endTime);

        return {
          weekday,
          collegeDay,
          startTime: collegeDay
            ? hasOverride
              ? override.startTime
              : data.collegeStart
            : "",
          endTime: collegeDay
            ? hasOverride
              ? override.endTime
              : data.collegeEnd
            : "",
          travelToMinutes: collegeDay
            ? Number(data.travelToMinutes) || 0
            : 0,
          travelFromMinutes: collegeDay
            ? Number(data.travelFromMinutes) || 0
            : 0,
          dailyStudyLimitHours: Number(
            ["Saturday", "Sunday"].includes(weekday)
              ? data.sundayHours
              : data.weekdayHours
          ) || 0,
        };
      }),
      travelToMinutes: Number(data.travelToMinutes) || 0,
      travelFromMinutes: Number(data.travelFromMinutes) || 0,
      preferredStudyTime: String(data.bestTime || "Evening").toLowerCase(),
      maxFocusMinutes,
      fixedCommitments: [],
    },

    settings: {
      studyMode: data.studyMode || "academics-only",
      gateHoursPerDay: data.studyMode === "academics-gate" ? Math.max(0, Number(data.gateHoursPerDay) || 0) : 0,
      dailyCapacityHours: Math.max(
        0,
        Number(data.weekdayHours) || 0,
        Number(data.sundayHours) || 0
      ),
      sessionMinutes: maxFocusMinutes,
      breakMinutes: 10,
    },
  };
}
