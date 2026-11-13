
export const USE_TEST_DEFAULTS = true;

const makeSubject = (id, name, units, mid1Coverage, mid2Coverage) => ({
  id,
  name,
  credits: "3",
  units: "5",
  type: "Theory",
  confidence: "Okay",
  done: "0",
  midCoverage: mid1Coverage,
  mid2Coverage,
  unitDetails: units.map(([unitName, estHours, percentComplete]) => ({
    name: unitName,
    estHours: String(estHours),
    percentComplete: String(percentComplete),
  })),
});

export const defaultTestData = {
  branch: "Computer Science (CSE)",
  college: "GVP College of Engineering",
  year: "3rd year",
  semester: "1",

  semesterStart: "2026-06-29",
  semesterEnd: "2026-11-21",
  mid1From: "2026-08-24",
  mid1To: "2026-08-27",
  mid2From: "2026-10-28",
  mid2To: "2026-10-30",
  prepFrom: "2026-11-02",
  prepTo: "2026-11-07",
  endFrom: "2026-11-09",
  endTo: "2026-11-21",
  endUnknown: false,

  holidays: [
    { date: "2026-10-22", study: true },
    { date: "2026-10-23", study: false },
  ],

  wakeTime: "06:00",
  sleepTime: "23:00",
  travelToMinutes: "120",
  travelFromMinutes: "120",

  collegeDays: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  collegeStart: "08:40",
  collegeEnd: "14:30",
  timingOverrides: {},

  subjects: [
    makeSubject(1, "FORMAL LANGUAGE AND AUTOMATA THEORY", [
      ["FA", 3, 50],
      ["RE", 3, 50],
      ["CFG", 4, 25],
      ["PDA", 5, 0],
      ["TM", 5, 0],
    ], "Units 1 – 2.5", "Units 3 – 4"),

    makeSubject(2, "Operating Systems", [
      ["INTRODUCTION", 3, 50],
      ["PC", 3, 50],
      ["Synchronization", 4, 25],
      ["MM", 5, 0],
      ["FILE SYSTEM", 5, 0],
    ], "Units 1 – 2.5", "Units 3 – 4"),

    makeSubject(3, "Machine Learning", [
      ["Introduction", 3, 25],
      ["ETE", 3, 25],
      ["SL", 4, 0],
      ["ASL", 4, 0],
      ["DR", 5, 0],
    ], "Units 1 – 2.5", "Units 3 – 4"),
  ],

  assignments: [
    {
      id: 1,
      title: "FLAT assignment",
      subject: "FORMAL LANGUAGE AND AUTOMATA THEORY",
      dueDate: "2026-10-27",
      hours: "1",
    },
    {
      id: 2,
      title: "OS assignment",
      subject: "Operating Systems",
      dueDate: "2026-10-27",
      hours: "3",
    },
    {
      id: 3,
      title: "ML assignment",
      subject: "Machine Learning",
      dueDate: "2026-10-27",
      hours: "3",
    },
  ],

  weekdayHours: "4",
  sundayHours: "6",
  longestStretch: "60 min",
  bestTime: "Evening",
  acceptLowerCoverage: false,
  skipLowWeightUnit: false,
};
