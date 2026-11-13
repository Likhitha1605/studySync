export const sampleStudent = {
  student: {
    id: "student-001",
    branch: "CSE",
    year: 3,
    semester: "3-1",
    semesterStart: "2026-07-01",
    semesterEnd: "2026-11-21",
  },

  exams: [
    { id: "mid-1", type: "mid", name: "Mid I", startDate: "2026-08-24", endDate: "2026-08-26" },
    { id: "mid-2", type: "mid", name: "Mid II", startDate: "2026-11-09", endDate: "2026-11-11" },
    { id: "practicals", type: "practical", name: "Practical Exams", startDate: "2026-11-12", endDate: "2026-11-15" },
    { id: "end-exams", type: "end", name: "Semester End Exams", startDate: "2026-11-16", endDate: "2026-11-21" },
  ],

  holidays: [
    { date: "2026-10-24", study: false },
    { date: "2026-10-25", study: true },
  ],

  subjects: [
    {
      id: "s1",
      name: "Data Structures",
      type: "theory",
      credits: 3,
      difficulty: 3,
      confidence: "okay",
      units: [
        { id: "s1-u1", name: "Arrays and Linked Lists", estHours: 2, percentComplete: 100, mid: 1 },
        { id: "s1-u2", name: "Stacks and Queues", estHours: 3, percentComplete: 60, mid: 1 },
        { id: "s1-u3", name: "Trees", estHours: 5, percentComplete: 10, mid: 2 },
        { id: "s1-u4", name: "Graphs", estHours: 6, percentComplete: 0, mid: 2 },
        { id: "s1-u5", name: "Sorting and Searching", estHours: 5, percentComplete: 0, mid: null },
      ],
    },
    {
      id: "s2",
      name: "Database Management Systems",
      type: "theory",
      credits: 3,
      difficulty: 2,
      confidence: "okay",
      endExamDate: "2026-11-11",
      units: [
        { id: "s2-u1", name: "Database Fundamentals", estHours: 2, percentComplete: 100, mid: 1 },
        { id: "s2-u2", name: "Relational Model and SQL", estHours: 5, percentComplete: 50, mid: 1 },
        { id: "s2-u3", name: "Normalization", estHours: 5, percentComplete: 20, mid: 2 },
        { id: "s2-u4", name: "Transactions", estHours: 5, percentComplete: 0, mid: 2 },
        { id: "s2-u5", name: "Indexing", estHours: 4, percentComplete: 0, mid: null },
      ],
    },
    {
      id: "s3",
      name: "Operating Systems",
      type: "theory",
      credits: 3,
      difficulty: 3,
      confidence: "weak",
      endExamDate: "2026-11-13",
      units: [
        { id: "s3-u1", name: "Introduction to OS", estHours: 3, percentComplete: 25, mid: 1 },
        { id: "s3-u2", name: "Process Management", estHours: 3, percentComplete: 25, mid: 1 },
        { id: "s3-u3", name: "Process Synchronization", estHours: 6, percentComplete: 0, mid: 2 },
        { id: "s3-u4", name: "Memory Management", estHours: 6, percentComplete: 0, mid: 2 },
        { id: "s3-u5", name: "File Systems", estHours: 4, percentComplete: 0, mid: null },
      ],
    },
    {
      id: "s4",
      name: "Mathematics",
      type: "theory",
      credits: 4,
      difficulty: 3,
      confidence: "okay",
      endExamDate: "2026-11-16",
      units: [
        { id: "s4-u1", name: "Matrices", estHours: 4, percentComplete: 25, mid: 1 },
        { id: "s4-u2", name: "Linear Algebra", estHours: 6, percentComplete: 0, mid: 1 },
        { id: "s4-u3", name: "Calculus", estHours: 6, percentComplete: 0, mid: null },
        { id: "s4-u4", name: "Probability", estHours: 5, percentComplete: 0, mid: null },
        { id: "s4-u5", name: "Numerical Methods", estHours: 4, percentComplete: 25, mid: null },
      ],
    },
    {
      id: "s5",
      name: "Computer Networks",
      type: "theory",
      credits: 3,
      difficulty: 2,
      confidence: "okay",
      endExamDate: "2026-11-19",
      units: [
        { id: "s5-u1", name: "Network Fundamentals", estHours: 4, percentComplete: 0, mid: 1 },
        { id: "s5-u2", name: "Data Link Layer", estHours: 5, percentComplete: 0, mid: 1 },
        { id: "s5-u3", name: "Network Layer", estHours: 4, percentComplete: 0, mid: null },
        { id: "s5-u4", name: "Transport Layer", estHours: 5, percentComplete: 0, mid: null },
        { id: "s5-u5", name: "Application Layer", estHours: 4, percentComplete: 0, mid: null },
      ],
    },
  ],

  assignments: [
    { id: "a1", title: "DBMS lab record", subjectId: "s2", dueDate: "2026-11-02", estHours: 3 },
  ],

  collegeTimings: [
    { weekday: "Monday", start: "08:40", end: "14:30" },
    { weekday: "Tuesday", start: "08:40", end: "14:30" },
    { weekday: "Wednesday", start: "08:40", end: "14:30" },
    { weekday: "Thursday", start: "08:40", end: "14:30" },
    { weekday: "Friday", start: "08:40", end: "14:30" },
    { weekday: "Saturday", start: "08:40", end: "14:30" },
  ],

  dailyStudyHours: [
    { weekday: "Monday", availableHours: 5 },
    { weekday: "Tuesday", availableHours: 5 },
    { weekday: "Wednesday", availableHours: 5 },
    { weekday: "Thursday", availableHours: 5 },
    { weekday: "Friday", availableHours: 5 },
    { weekday: "Saturday", availableHours: 7 },
    { weekday: "Sunday", availableHours: 7 },
  ],

  settings: {
    sessionStepMinutes: 10,
    minSessionMinutes: 30,
    maxSubjectsPerDay: 2,
    breakMinutes: 10,
    revisionPercent: 10,
    sessionMinutes: 50,
  },

  routine: {
    wakeTime: "05:30",
    sleepTime: "23:00",
    travelToMinutes: 60,
    travelFromMinutes: 60,
    preferredStudyTime: "evening",
    maxFocusMinutes: 60,
    fixedCommitments: [],
  },
};