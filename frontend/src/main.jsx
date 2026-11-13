
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { mapFormToStudentInput } from "./planAdapter.js";
import { defaultTestData } from "./data/defaultTestData.js";
import {
  addDateDays,
  getSessionCompletionKey,
  getSessionsForWeek,
  getThisWeekSubjectSummary,
  getWeekDates,
  getWeekStartMonday,
  minutesBetweenTimes,
} from "./planHelpers.js";

const steps = [
  "About you",
  "Semester dates",
  "Subjects",
  "Deadlines",
  "Free time",
  "Review",
];

const tips = [
  "We use your branch and semester to suggest subjects and syllabus later.",
  "Dates come from your college academic calendar. If one is unknown, leave it and update it later.",
  "Weak subjects get more hours. Units already done reduce the hours needed.",
  "Records and assignments take real time, so we schedule them like exams.",
  "A smaller, realistic plan works better than a perfect one you cannot follow.",
  "If you are short, pick a fix. You can change it at any time.",
];

const initialData = {
  // New setups intentionally begin without assumed academic or timetable data.
  branch: "",
  college: "",
  year: "",
  semester: "",
  semesterStart: "",
  semesterEnd: "",
  mid1From: "",
  mid1To: "",
  mid2From: "",
  mid2To: "",
  prepFrom: "",
  prepTo: "",
  endFrom: "",
  endTo: "",
  endUnknown: false,
  holidays: [],
  wakeTime: "",
  sleepTime: "",
  travelToMinutes: "",
  travelFromMinutes: "",
  collegeDays: [],
  collegeStart: "",
  collegeEnd: "",
  timingOverrides: {},
  subjects: [],
  assignments: [],
  // Preferences/settings may keep useful starting values.
  weekdayHours: "3",
  sundayHours: "4",
  studyMode: "academics-only",
  gateHoursPerDay: "1",
  longestStretch: "60 min",
  bestTime: "Evening",
  acceptLowerCoverage: false,
  skipLowWeightUnit: false,
};

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function readStorageJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getOrCreateProfileId() {
  try {
    const existing = window.localStorage.getItem("studysync-profile-id");
    if (existing) return existing;
    const generated = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `profile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem("studysync-profile-id", generated);
    return generated;
  } catch {
    return "profile-local-session";
  }
}

function createPlanInstanceId() {
  return window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getLocalToday() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDefaultGateDate(year) {
  const parsedYear = Number(year);
  if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2200) return "";
  const date = new Date(Date.UTC(parsedYear, 1, 1));
  while (date.getUTCDay() !== 6) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

const GATE_PAPERS = [
  { code: "CS", name: "Computer Science and Information Technology" },
  { code: "CH", name: "Chemical Engineering" },
  { code: "CE", name: "Civil Engineering" },
  { code: "DA", name: "Data Science and Artificial Intelligence" },
  { code: "EC", name: "Electronics and Communication Engineering" },
  { code: "EE", name: "Electrical Engineering" },
  { code: "ME", name: "Mechanical Engineering" },
  { code: "RA", name: "Robotics and Automation" },
];

const GATE_BRANCHES = [
  { value: "CSE", label: "Computer Science Engineering (CSE)", paper: "CS" },
  { value: "IT", label: "Information Technology (IT)", paper: "CS" },
  { value: "Chemical Engineering", label: "Chemical Engineering", paper: "CH" },
  { value: "Civil Engineering", label: "Civil Engineering", paper: "CE" },
  { value: "Data Science and Artificial Intelligence", label: "Data Science and AI", paper: "DA" },
  { value: "ECE", label: "Electronics and Communication (ECE)", paper: "EC" },
  { value: "EEE", label: "Electrical and Electronics (EEE)", paper: "EE" },
  { value: "Mechanical Engineering", label: "Mechanical Engineering", paper: "ME" },
  { value: "Robotics and Automation", label: "Robotics and Automation", paper: "RA" },
];

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} />;
}

function SelectInput({ children, ...props }) {
  return <select {...props}>{children}</select>;
}

function App() {
  const [profileId] = useState(() => getOrCreateProfileId());
  const completedStorageKey = `studysync-completed-sessions:${profileId}`;
  const lastSetupStorageKey = `studysync-last-setup:${profileId}`;
  const planInstanceStorageKey = `studysync-plan-instance:${profileId}`;
  const gateSetupStorageKey = `studysync-gate-setup:${profileId}`;
  const gatePlanStorageKey = `studysync-gate-plan:${profileId}`;
  const [gateSetup, setGateSetup] = useState(() => ({
    currentYear: "",
    semester: "",
    graduationYear: "",
    attemptYear: "",
    branch: "",
    paper: "",
    gateDate: "",
    raPart: "B1",
    settings: { gateMinutesPerDay: 120 },
    overrides: { marks: {}, hours: {} },
    ...readStorageJson(gateSetupStorageKey, {}),
  }));
  const [gatePlan, setGatePlan] = useState(() => readStorageJson(gatePlanStorageKey, null));
  const [showGateSetup, setShowGateSetup] = useState(true);
  const [showGateSyllabus, setShowGateSyllabus] = useState(false);
  const [selectedGateMonth, setSelectedGateMonth] = useState(() => {
    const savedPlan = readStorageJson(gatePlanStorageKey, null);
    return savedPlan?.months?.[0]?.key || getLocalToday().slice(0, 7);
  });
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState("");
  const [savedSetup, setSavedSetup] = useState(() => readStorageJson(lastSetupStorageKey, null));
  const [setupKind, setSetupKind] = useState("new");
  const [showSetupChoices, setShowSetupChoices] = useState(true);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showRealityCheckModal, setShowRealityCheckModal] = useState(false);
  const [planInstanceId, setPlanInstanceId] = useState(() => {
    try {
      const existing = window.localStorage.getItem(planInstanceStorageKey);
      if (existing) return existing;
      const created = createPlanInstanceId();
      window.localStorage.setItem(planInstanceStorageKey, created);
      return created;
    } catch {
      return createPlanInstanceId();
    }
  });
  const [step, setStep] = useState(0);
  const [showPlan, setShowPlan] = useState(false);
  const [activeView, setActiveView] = useState("Dashboard");
  const [uiTheme, setUiTheme] = useState(() => {
    try { return window.localStorage.getItem("studysync-ui-theme") === "dark" ? "dark" : "light"; }
    catch { return "light"; }
  });
  function toggleUiTheme() {
    setUiTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try { window.localStorage.setItem("studysync-ui-theme", next); } catch {}
      return next;
    });
  }
  const [planTab, setPlanTab] = useState("Monthly View");
  const [planStartMode, setPlanStartMode] = useState(() => {
    try {
      return window.localStorage.getItem("studysync-plan-start-mode") === "semester"
        ? "semester"
        : "today";
    } catch {
      return "today";
    }
  });
  const [calendarMonth, setCalendarMonth] = useState(() => getLocalToday().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(() => getLocalToday());
  const [weekStart, setWeekStart] = useState(() => getWeekStartMonday(getLocalToday()));
  const [completedSessionRecords, setCompletedSessionRecords] = useState(() => {
    const records = readStorageJson(completedStorageKey, []);
    return Array.isArray(records) ? records.filter((record) => record && typeof record === "object" && record.sessionKey) : [];
  });
  const completedSessionIds = completedSessionRecords.map((record) => record.sessionKey);
  const [data, setData] = useState(() => cloneData(initialData));
  const [showTimingOverrides, setShowTimingOverrides] = useState(false);
  const [overrideDay, setOverrideDay] = useState("Monday");
  const [holidayInput, setHolidayInput] = useState("");
  const [generated, setGenerated] = useState(false);
  const [planResult, setPlanResult] = useState(() => readStorageJson(`studysync-plan-result:${profileId}`, null));
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusMode, setFocusMode] = useState("Focus");
  useEffect(() => {
    if (!focusRunning) return undefined;
    const timer = window.setInterval(() => setFocusSeconds((seconds) => {
      if (seconds <= 1) { setFocusRunning(false); return 0; }
      return seconds - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [focusRunning]);
  useEffect(() => {
    try {
      if (planResult) window.localStorage.setItem(`studysync-plan-result:${profileId}`, JSON.stringify(planResult));
      else window.localStorage.removeItem(`studysync-plan-result:${profileId}`);
    } catch { /* The current session still works when storage is unavailable. */ }
  }, [planResult, profileId]);
  const [generating, setGenerating] = useState(false);
  const [apiError, setApiError] = useState("");

  function choosePlanStartMode(mode) {
    setPlanStartMode(mode);
    try {
      window.localStorage.setItem("studysync-plan-start-mode", mode);
    } catch {
      // The selection still works for this session if storage is unavailable.
    }
  }

  function persistGateSetup(nextSetup) {
    setGateSetup(nextSetup);
    try {
      window.localStorage.setItem(gateSetupStorageKey, JSON.stringify(nextSetup));
    } catch {
      setGateError("Your GATE choices could not be saved in this browser. They will remain available during this session.");
    }
  }

  function updateGateSetupField(field, value) {
    const nextSetup = { ...gateSetup, [field]: value };
    persistGateSetup(nextSetup);
  }

  function updateGateGraduationYear(value) {
    const numericYear = Number(value);
    const validYear = Number.isInteger(numericYear) && numericYear >= 2000 && numericYear <= 2200;
    const attemptYear = validYear ? String(numericYear - 1) : "";
    const nextSetup = {
      ...gateSetup,
      graduationYear: value,
      attemptYear,
      gateDate: validYear ? getDefaultGateDate(numericYear - 1) : "",
    };
    persistGateSetup(nextSetup);
  }

  function updateGateAttemptYear(value) {
    const nextSetup = {
      ...gateSetup,
      attemptYear: value,
      gateDate: value ? getDefaultGateDate(value) : "",
    };
    persistGateSetup(nextSetup);
  }

  function updateGateBranch(value) {
    const branchChoice = GATE_BRANCHES.find((item) => item.value === value);
    const nextSetup = {
      ...gateSetup,
      branch: value,
      paper: branchChoice?.paper || gateSetup.paper,
      raPart: value === "Robotics and Automation" ? gateSetup.raPart || "B1" : gateSetup.raPart,
    };
    persistGateSetup(nextSetup);
  }

  function updateGateSettings(settings) {
    const nextSetup = { ...gateSetup, settings: { ...(gateSetup.settings || {}), ...settings } };
    persistGateSetup(nextSetup);
  }

  async function generateGatePlan(overrides = gateSetup.overrides, setupOverride = null) {
    const activeSetup = setupOverride || gateSetup;
    setGateError("");
    const today = getLocalToday();
    const currentYear = Number(activeSetup.currentYear);
    const semester = Number(activeSetup.semester);
    const graduationYear = Number(activeSetup.graduationYear);
    const attemptYear = Number(activeSetup.attemptYear);
    const gateDate = activeSetup.gateDate || getDefaultGateDate(attemptYear);

    if (!Number.isInteger(currentYear) || currentYear < 1 || currentYear > 4) {
      setGateError("Select your current year of study (1 to 4).");
      return;
    }
    if (![1, 2].includes(semester)) {
      setGateError("Select your current semester (1 or 2).");
      return;
    }
    if (!Number.isInteger(graduationYear) || graduationYear < 2000 || graduationYear > 2200) {
      setGateError("Enter a valid graduation year.");
      return;
    }
    if (![graduationYear - 1, graduationYear].includes(attemptYear)) {
      setGateError(`Choose GATE ${graduationYear - 1} or ${graduationYear}, based on your graduation year.`);
      return;
    }
    if (!activeSetup.branch || !activeSetup.paper) {
      setGateError("Select your engineering branch and GATE paper.");
      return;
    }
    if (!gateDate || gateDate <= today) {
      setGateError("Choose a GATE exam date that is after today.");
      return;
    }
    if (activeSetup.paper === "RA" && !["B1", "B2"].includes(activeSetup.raPart)) {
      setGateError("For RA, choose Part B1 (Electrical) or Part B2 (Mechanical).");
      return;
    }

    const nextSetup = { ...activeSetup, attemptYear: String(attemptYear), gateDate, overrides: overrides || { marks: {}, hours: {} } };
    persistGateSetup(nextSetup);
    setGateLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/gate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          today,
          currentYear,
          semester,
          graduationYear,
          attemptYear,
          branch: nextSetup.branch,
          paper: nextSetup.paper,
          gateDate,
          raPart: nextSetup.paper === "RA" ? nextSetup.raPart : undefined,
          settings: nextSetup.settings,
          overrides: nextSetup.overrides,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.ok === false) {
        throw new Error(result.error || "StudySync could not generate the GATE plan.");
      }
      setGatePlan(result);
      try {
        window.localStorage.setItem(gatePlanStorageKey, JSON.stringify(result));
        window.localStorage.setItem(gateSetupStorageKey, JSON.stringify({ ...nextSetup, overrides: result.overrides || nextSetup.overrides }));
      } catch {
        setGateError("The plan was generated, but this browser could not save the result for your next visit.");
      }
      setShowGateSetup(false);
      const selectedMonth = result.months?.find((month) => month.key === today.slice(0, 7))?.key || result.months?.[0]?.key || "";
      setSelectedGateMonth(selectedMonth);
    } catch (error) {
      setGateError(error.message || "Could not connect to StudySync. Check that the backend is running on port 3001.");
    } finally {
      setGateLoading(false);
    }
  }

  function applyGateSuggestion(settings) {
    if (!settings || !Object.keys(settings).length) return;
    const nextSetup = { ...gateSetup, settings: { ...(gateSetup.settings || {}), ...settings } };
    persistGateSetup(nextSetup);
    generateGatePlan(nextSetup.overrides, nextSetup);
  }

  function rotatePlanInstance() {
    const nextId = createPlanInstanceId();
    setPlanInstanceId(nextId);
    try {
      window.localStorage.setItem(planInstanceStorageKey, nextId);
    } catch {
      // Keep the in-memory plan id if browser storage is unavailable.
    }
  }

  function startNewSetup() {
    rotatePlanInstance();
    setData(cloneData(initialData));
    setSetupKind("new");
    setShowSetupChoices(false);
    setStep(0);
    setGenerated(false);
    setShowPlan(false);
    setPlanResult(null);
    try { window.localStorage.removeItem(`studysync-plan-result:${profileId}`); } catch {}
    setApiError("");
    setActiveView("My Plan");
  }

  function startFromSample() {
    rotatePlanInstance();
    const sample = cloneData(defaultTestData);
    sample.studyMode = sample.studyMode || "academics-only";
    sample.gateHoursPerDay = sample.gateHoursPerDay || "1";
    sample.assignments = (sample.assignments || []).map((assignment) => ({ ...assignment, addedDate: assignment.addedDate || getLocalToday() }));
    setData(sample);
    setSetupKind("sample");
    setShowSetupChoices(false);
    setStep(5);
    setGenerated(false);
    setShowPlan(false);
    setPlanResult(null);
    setApiError("");
  }

  function useLastSetup() {
    if (!savedSetup?.data) return;
    const restored = cloneData(savedSetup.data);
    restored.assignments = (restored.assignments || []).map((assignment) => ({ ...assignment, addedDate: assignment.addedDate || getLocalToday() }));
    setData(restored);
    setSetupKind("saved");
    setShowSetupChoices(false);
    setStep(5);
    setGenerated(false);
    setShowPlan(false);
    setPlanResult(null);
    setApiError("");
  }

  function isSessionDone(session) {
    return completedSessionIds.includes(getSessionCompletionKey(session, planInstanceId));
  }

  function toggleSessionDone(session) {
    const sessionKey = getSessionCompletionKey(session, planInstanceId);
    const existing = completedSessionRecords.some((record) => record.sessionKey === sessionKey);
    const nextRecords = existing
      ? completedSessionRecords.filter((record) => record.sessionKey !== sessionKey)
      : [...completedSessionRecords, {
          sessionKey,
          planId: planInstanceId,
          sessionId: String(session.id || ""),
          taskId: String(session.taskId || ""),
          durationMinutes: Number(session.durationMinutes || 0),
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          title: session.title,
          subjectName: session.subjectName,
          type: session.type,
        }];

    setCompletedSessionRecords(nextRecords);
    try {
      window.localStorage.setItem(completedStorageKey, JSON.stringify(nextRecords));
    } catch {
      setApiError("Completed sessions could not be saved in this browser. Check localStorage permissions.");
    }
  }

  function update(key, value) {
  setData((old) => ({
    ...old,
    [key]: value,
    ...(key === "endFrom" || key === "endTo"
      ? value
        ? { endUnknown: false }
        : {}
      : {}),
  }));
}
  
  function updateCollegeDay(day, key, value) {
    setData((old) => ({
      ...old,
      collegeSchedule: {
        ...old.collegeSchedule,
        [day]: {
          ...old.collegeSchedule[day],
          [key]: value,
        },
      },
    }));
  }


  function updateItem(list, id, key, value) {
    update(
      list,
      data[list].map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    );
  }

  
function updateUnitDetail(subjectId, index, key, value) {
  const subject = data.subjects.find(
    (item) => item.id === subjectId
  );

  if (!subject) return;

  const count = Math.max(1, Number(subject.units) || 1);

  const unitDetails = Array.from({ length: count }, (_, i) =>
    subject.unitDetails?.[i] || {
      name: "",
      estHours: "",
      percentComplete: "",
    }
  );

  unitDetails[index] = {
    ...unitDetails[index],
    [key]: value,
  };

  update(
    "subjects",
    data.subjects.map((item) =>
      item.id === subjectId
        ? { ...item, unitDetails }
        : item
    )
  );
}


  function addSubject() {
    update("subjects", [
      ...data.subjects,
      {
        id: Date.now(),
        name: "",
        credits: "",
        units: "",
        type: "",
        confidence: "",
        done: "",
        midCoverage: "",
        mid2Coverage: "",
        unitDetails: [],
      },
    ]);
  }

  function addAssignment() {
    update("assignments", [
      ...data.assignments,
      {
        id: Date.now(),
        title: "",
        subject: data.subjects[0]?.name || "",
        dueDate: "",
        hours: "4",
        addedDate: (() => {
          const now = new Date();
          return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
        })(),
      },
    ]);
  }

function addHoliday() {
  if (!holidayInput) return;

  if (data.holidays.some((item) =>
    (typeof item === "string" ? item : item.date) === holidayInput
  )) {
    return;
  }

  update("holidays", [
    ...data.holidays,
    { date: holidayInput, study: true },
  ]);

  setHolidayInput("");
}

  const estimatedHours = data.subjects.reduce((sum, subject) => {
    const remaining = Math.max(
      0,
      Number(subject.units || 0) - Number(subject.done || 0)
    );
    const confidenceFactor =
      subject.confidence === "Weak"
        ? 1.5
        : subject.confidence === "Strong"
          ? 0.8
          : 1;
    return sum + remaining * 3 * confidenceFactor;
  }, 0);

  const assignmentHours = data.assignments.reduce(
    (sum, item) => sum + Number(item.hours || 0),
    0
  );

  const availableHours =
    Number(data.weekdayHours || 0) * 5 +
    Number(data.sundayHours || 0) * 2;

  const workloadHours = estimatedHours + assignmentHours;
  const shortHours = Math.max(0, Math.ceil(workloadHours - availableHours));

  
async function generatePlan() {
  setApiError("");

  if (!data.branch || !data.college || !data.year || !data.semester) {
    setApiError("Please complete your branch, college, year, and semester in About you.");
    setStep(0);
    return;
  }

  if (!data.semesterEnd) {
    setApiError("Please enter your semester end date first.");
    setStep(1);
    return;
  }

  if (
    !data.wakeTime ||
    !data.sleepTime ||
    data.travelToMinutes === "" ||
    data.travelFromMinutes === ""
  ) {
    setApiError(
      "Please enter your wake-up time, sleep time, and travel durations."
    );
    setStep(4);
    return;
  }

  if (!data.subjects.length) {
    setApiError("Add at least one subject before generating your plan.");
    setStep(2);
    return;
  }

  if (data.subjects.some((subject) => !String(subject.name || "").trim())) {
    setApiError("Please enter a name for every subject.");
    setStep(2);
    return;
  }

  if ((data.assignments || []).some((assignment) => !assignment.dueDate)) {
    setApiError("Enter a due date for every assignment. Blank deadlines are not silently replaced with the semester end date.");
    setStep(3);
    return;
  }

  if (data.subjects.some((subject) => !subject.credits || !subject.units || !subject.type || !subject.confidence || !subject.midCoverage || !subject.mid2Coverage)) {
    setApiError("Please complete the credits, unit count, type, confidence, and Mid-I/Mid-II coverage for every subject.");
    setStep(2);
    return;
  }

  for (const subject of data.subjects) {
    const count = Number(subject.units) || 0;
    const unitDetails = Array.isArray(subject.unitDetails) ? subject.unitDetails : [];
    if (count <= 0 || unitDetails.length < count || unitDetails.slice(0, count).some((unit) => !String(unit.name || "").trim() || unit.estHours === "" || !Number.isFinite(Number(unit.estHours)) || Number(unit.estHours) < 0 || unit.percentComplete === "" || !Number.isFinite(Number(unit.percentComplete)))) {
      setApiError(`Please enter each unit name, estimated study hours, and completion percentage for ${subject.name}.`);
      setStep(2);
      return;
    }
  }

  
if (!data.collegeDays || data.collegeDays.length === 0) {
  setApiError("Please select at least one college day.");
  setStep(4);
  return;
}

if (
  !data.collegeStart ||
  !data.collegeEnd ||
  data.collegeEnd <= data.collegeStart
) {
  setApiError("College end time must be later than college start time.");
  setStep(4);
  return;
}

for (const day of data.collegeDays) {
  const override = data.timingOverrides?.[day];

  if (!override) continue;

  const hasStart = Boolean(override.startTime);
  const hasEnd = Boolean(override.endTime);

  if (hasStart !== hasEnd) {
    setApiError(
      `Please enter both start and end times for ${day}'s override.`
    );
    setStep(4);
    return;
  }

  if (hasStart && override.endTime <= override.startTime) {
    setApiError(
      `College end time must be later than start time for ${day}.`
    );
    setStep(4);
    return;
  }
}


  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  if (planStartMode === "semester" && !data.semesterStart) {
    setApiError("Enter your semester start date first, then generate the plan from semester start.");
    setStep(1);
    return;
  }

  const startDate = planStartMode === "semester" ? data.semesterStart : today;

  const requiredEndDates = [
  data.semesterEnd,
  data.mid1To,
  data.mid2To,
  data.endTo,
  data.prepTo,
  ...data.assignments.map((item) => item.dueDate),
].filter(Boolean);

const endDate = requiredEndDates.reduce(
  (latest, date) => (date > latest ? date : latest),
  data.semesterEnd
);
if (data.endTo && data.semesterEnd < data.endTo) {
  setApiError(
    "Semester end date cannot be before the last end-sem exam date. Please update your semester end date."
  );
  setStep(1);
  return;
}

  if (startDate > endDate) {
    setApiError(
      "Your semester end date has passed. Please review your semester dates."
    );
    setStep(1);
    return;
  }

  setGenerating(true);
  setGenerated(false);

  try {
    const input = mapFormToStudentInput(data);
    input.planStartMode = planStartMode;

    const response = await fetch(
      "http://localhost:3001/api/generate-plan",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input,
          startDate,
          endDate,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const validationDetails = Array.isArray(result.errors) && result.errors.length
        ? `\n\nPlease fix these fields:\n• ${result.errors.join("\n• ")}`
        : "";
      const serverDetails = result.details ? `\n\n${result.details}` : "";
      throw new Error(
        `${result.error || "The server could not generate your plan."}${validationDetails}${serverDetails}`
      );
    }

    // Keep the exact date range/mode used for this generated plan. The UI must
    // describe the plan that was actually generated, not a later/default mode.
    setPlanResult({
      ...result,
      planning: { startDate, endDate, mode: planStartMode },
    });
    if (setupKind !== "sample") {
      const completedSetup = {
        data: cloneData(data),
        savedAt: new Date().toISOString(),
      };
      try {
        window.localStorage.setItem(lastSetupStorageKey, JSON.stringify(completedSetup));
        setSavedSetup(completedSetup);
      } catch {
        // The generated plan still works when local storage is unavailable.
      }
    }
    setShowSetupChoices(false);
    setShowSetupWizard(false);
    setGenerated(true);
    setActiveView("My Plan");
    setPlanTab("Monthly View");
    setWeekStart(getWeekStartMonday(startDate));
    setCalendarMonth(startDate.slice(0, 7));
    // When the student asks for a semester-start plan, open on the semester's
    // first date so the historical schedule is immediately visible.
    setSelectedDate(planStartMode === "semester" ? startDate : (startDate <= today && today <= endDate ? today : startDate));
  } catch (error) {
    setApiError(
      error.message ||
        "Could not contact StudySync. Check that the backend is running."
    );
  } finally {
    setGenerating(false);
  }
}


  async function replanFromToday() {
    if (!planResult) return;
    const today = getLocalToday();
    const requiredEndDates = [
      data.semesterEnd,
      data.mid1To,
      data.mid2To,
      data.endTo,
      data.prepTo,
      ...(data.assignments || []).map((item) => item.dueDate),
    ].filter(Boolean);
    const endDate = requiredEndDates.reduce(
      (latest, date) => (date > latest ? date : latest),
      data.semesterEnd || today
    );

    if (!endDate || today > endDate) {
      setApiError("The plan end date has passed. Update your semester dates before replanning.");
      return;
    }

    setApiError("");
    setGenerating(true);
    try {
      const input = mapFormToStudentInput(data);
      input.planStartMode = "today";
      const response = await fetch("http://localhost:3001/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          startDate: today,
          endDate,
          completedSessions: completedSessionRecords,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const validationDetails = Array.isArray(result.errors) && result.errors.length
          ? `\n\nPlease fix these fields:\n• ${result.errors.join("\n• ")}`
          : "";
        throw new Error(`${result.error || "The server could not replan your schedule."}${validationDetails}`);
      }
      setPlanResult({
        ...result,
        planning: { startDate: today, endDate, mode: "today", replanned: true },
      });
      rotatePlanInstance();
      setGenerated(true);
      setShowPlan(false);
      setActiveView("My Plan");
      setPlanTab("Monthly View");
      setCalendarMonth(today.slice(0, 7));
      setSelectedDate(today);
      setWeekStart(getWeekStartMonday(today));
    } catch (error) {
      setApiError(error.message || "Could not replan. Check that the backend is running.");
    } finally {
      setGenerating(false);
    }
  }

  function next() {
    if (step < 4) {
      const nextStep = step + 1;
      setStep(nextStep);
      const nextViews = ["Student Details", "Semester & Exam Dates", "Subjects & Syllabus", "Assignments", "Free Time & Routine"];
      setActiveView(nextViews[nextStep]);
      setGenerated(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setActiveView("My Plan");
      generatePlan();
    }
  }

  function back() {
    setStep(Math.max(0, step - 1));
    setGenerated(false);
  }

  function editStep(index) {
    setStep(index);
    setGenerated(false);
  }

  function renderAbout() {
    return (
      <>
        {!generated && showSetupChoices && <section className="setup-choice-card">
          <div>
            <h3>Start your StudySync plan</h3>
            <p>Use a saved setup, start with a blank form, or explore with clearly labelled sample data.</p>
          </div>
          <div className="setup-choice-actions">
            {savedSetup?.data && <button type="button" className="ss-primary" onClick={useLastSetup}>Use my last setup</button>}
            <button type="button" className="outline-btn" onClick={startNewSetup}>Start new</button>
            <button type="button" className="outline-btn" onClick={startFromSample}>Start from sample</button>
            <button type="button" className="outline-btn" onClick={() => { setGateError(""); setActiveView("GATE Plan"); setShowGateSetup(true); }}>Open GATE Plan</button>
          </div>
        </section>}
        {setupKind === "sample" && <div className="ss-sample-banner"><strong>Sample data</strong><span>This is example data, not your personal timetable. Review every field and edit it before using the plan.</span></div>}
        <div className="field-grid">
          <Field label="Branch">
            <SelectInput
              value={data.branch}
              onChange={(e) => update("branch", e.target.value)}
            >
              <option value="">Select your branch</option>
              <option>Computer Science (CSE)</option>
              <option>CSE (AI & ML)</option>
              <option>Information Technology (IT)</option>
              <option>Electrical Engineering (EEE)</option>
              <option>Electronics and Communication (ECE)</option>
              <option>Mechanical Engineering</option>
              <option>Civil Engineering</option>
            </SelectInput>
          </Field>
          <Field label="College">
            <SelectInput
              value={data.college}
              onChange={(e) => update("college", e.target.value)}
            >
              <option value="">Select your college</option>
              <option>GVP College of Engineering</option>
              <option>Andhra University College of Engineering</option>
              <option>Other college</option>
            </SelectInput>
          </Field>
          <Field label="Year">
            <SelectInput
              value={data.year}
              onChange={(e) => update("year", e.target.value)}
            >
              <option value="">Select year</option>
              {["1st year", "2nd year", "3rd year", "4th year"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Semester">
            <SelectInput
              value={data.semester}
              onChange={(e) => update("semester", e.target.value)}
            >
              <option value="">Select semester</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </SelectInput>
          </Field>
        </div>
      </>
    );
  }

  function dateField(label, key) {
    return (
      <Field label={label} key={key}>
        <TextInput
          type="date"
          value={data[key]}
          onChange={(e) => update(key, e.target.value)}
        />
      </Field>
    );
  }

  function renderSemester() {
    return (
      <>
        <div className="field-grid">
          {dateField("Semester starts", "semesterStart")}
          {dateField("Semester ends", "semesterEnd")}
          {dateField("Mid-I from", "mid1From")}
          {dateField("Mid-I to", "mid1To")}
          {dateField("Mid-II from", "mid2From")}
          {dateField("Mid-II to", "mid2To")}
          {dateField("Prep week from", "prepFrom")}
          {dateField("Prep week to", "prepTo")}
          {dateField("End sem from", "endFrom")}
          {dateField("End sem to", "endTo")}
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={data.endUnknown}
            onChange={(e) => update("endUnknown", e.target.checked)}
          />
          End-sem dates not announced yet
        </label>

        <div className="inline-add">
          <TextInput
            type="date"
            value={holidayInput}
            onChange={(e) => setHolidayInput(e.target.value)}
          />
          <button className="outline-btn" onClick={addHoliday}>
            + Add holiday
          </button>
        </div>

{data.holidays.map((holiday) => {
  const date = typeof holiday === "string" ? holiday : holiday.date;
  const study = typeof holiday === "string" || holiday.study !== false;

  return (
    <div className="saved-item" key={date}>
      <span>Holiday · {date}</span>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={study}
          onChange={(e) =>
            update(
              "holidays",
              data.holidays.map((item) =>
                (typeof item === "string" ? item : item.date) === date
                  ? { date, study: e.target.checked }
                  : item
              )
            )
          }
        />
        I will study
      </label>

      <button
        className="text-btn"
        onClick={() =>
          update(
            "holidays",
            data.holidays.filter(
              (item) =>
                (typeof item === "string" ? item : item.date) !== date
            )
          )
        }
      >
        Remove
      </button>
    </div>
  );
})}

      </>
    );
  }

  function renderSubjects() {
    return (
      <>
        {data.subjects.map((subject) => (
          <div className="subject-editor" key={subject.id}>
            <Field label="Subject name">
              <TextInput
                value={subject.name}
                onChange={(e) =>
                  updateItem("subjects", subject.id, "name", e.target.value)
                }
                placeholder="Enter subject name"
              />
            </Field>

            <div className="field-grid">
              <Field label="Credits">
                <SelectInput
                  value={subject.credits}
                  onChange={(e) =>
                    updateItem(
                      "subjects",
                      subject.id,
                      "credits",
                      e.target.value
                    )
                  }
                >
                  <option value="">Select credits</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Units">
                <SelectInput
                  value={subject.units}
                  onChange={(e) =>
                    updateItem("subjects", subject.id, "units", e.target.value)
                  }
                >
                  <option value="">Select units</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Completed units (summary)">
                <TextInput
                  type="number"
                  min="0"
                  max={Number(subject.units) || undefined}
                  value={subject.done ?? ""}
                  onChange={(e) => updateItem("subjects", subject.id, "done", e.target.value)}
                  placeholder="Enter completed units"
                />
              </Field>
              <Field label="Type">
                <div className="segmented">
                  {["Theory", "Lab"].map((x) => (
                    <button
                      type="button"
                      key={x}
                      className={subject.type === x ? "selected" : ""}
                      onClick={() =>
                        updateItem("subjects", subject.id, "type", x)
                      }
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Confidence">
                <div className="segmented">
                  {["Strong", "Okay", "Weak"].map((x) => (
                    <button
                      type="button"
                      key={x}
                      className={subject.confidence === x ? "selected" : ""}
                      onClick={() =>
                        updateItem("subjects", subject.id, "confidence", x)
                      }
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </Field>
<Field label="Mid-I covers">     
<SelectInput
  value={subject.midCoverage}
  onChange={(e) =>
    updateItem(
      "subjects",
      subject.id,
      "midCoverage",
      e.target.value
    )
  }
>
  <option value="">Select coverage</option>
  <option value="Units 1 – 2">Units 1 – 2</option>
<option value="Units 1 – 2.5">Units 1 – 2.5</option>
<option value="Units 1 – 3">Units 1 – 3</option>
<option value="Units 1 – 3.5">Units 1 – 3.5</option>
<option value="Units 1 – 4">Units 1 – 4</option>
</SelectInput>

</Field>
<Field label="Mid-II covers">
  <SelectInput
    value={subject.mid2Coverage || ""}
    onChange={(e) => updateItem("subjects", subject.id, "mid2Coverage", e.target.value)}
  >
    <option value="">Select coverage</option>
    {["Units 2 – 3", "Units 2 – 4", "Units 3 – 4", "Units 3 – 5", "Units 3 – 6", "Units 4 – 5", "Units 4 – 6", "Units 1 – 5"].map((value) => (
      <option key={value} value={value}>{value}</option>
    ))}
  </SelectInput>
</Field>
</div>

            
<p className="field-caption">Syllabus topics and estimated study time</p>

{Array.from(
  { length: Number(subject.units) > 0 ? Number(subject.units) : 0 },
  (_, index) => {
    const unit =
      subject.unitDetails?.[index] || {
        name: "",
        estHours: "",
        percentComplete: "",
      };

    return (
      <div className="subject-editor" key={`${subject.id}-unit-${index}`}>
        <strong>Unit {index + 1}</strong>

        <div className="field-grid">
          <Field label="Actual topic or unit name">
            <TextInput
              value={unit.name}
              placeholder={`Enter Unit ${index + 1} name`}
              onChange={(e) =>
                updateUnitDetail(
                  subject.id,
                  index,
                  "name",
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Estimated study hours">
            <TextInput
              type="number"
              min="0.5"
              step="0.5"
              value={unit.estHours}
              onChange={(e) =>
                updateUnitDetail(
                  subject.id,
                  index,
                  "estHours",
                  e.target.value
                )
              }
            />
          </Field>

          <Field label="Unit completed (%)">
            <SelectInput
              value={unit.percentComplete}
              onChange={(e) =>
                updateUnitDetail(
                  subject.id,
                  index,
                  "percentComplete",
                  e.target.value
                )
              }
            >
              <option value="">Select completion</option>
              {[0, 25, 50, 75, 100].map((percent) => (
                <option key={percent} value={String(percent)}>
                  {percent}%
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </div>
    );
  }
)}


            <div className="saved-item">
              <div>
                <strong>{subject.name || "New subject"}</strong>
                <p>
                  {subject.credits} credits · {subject.units} units ·{" "}
                  {subject.confidence}
                </p>
              </div>
              {data.subjects.length > 1 && (
                <button
                  className="text-btn"
                  onClick={() =>
                    update(
                      "subjects",
                      data.subjects.filter((x) => x.id !== subject.id)
                    )
                  }
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <button className="outline-btn" onClick={addSubject}>
          + Add subject
        </button>
      </>
    );
  }

  function renderAssignments() {
    const formatAssignmentDate = (date) =>
      date
        ? new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Date not set";

    return (
      <>
        {data.assignments.map((item) => (
            <div className="assignment-editor" key={item.id}>
              <div className="field-grid">
                <Field label="Title">
                  <TextInput
                    value={item.title}
                    onChange={(e) =>
                      updateItem("assignments", item.id, "title", e.target.value)
                    }
                    placeholder="e.g. Lab record"
                  />
                </Field>
                <Field label="Subject">
                  <SelectInput
                    value={item.subject}
                    onChange={(e) =>
                      updateItem(
                        "assignments",
                        item.id,
                        "subject",
                        e.target.value
                      )
                    }
                  >
                    {data.subjects.map((subject) => (
                      <option key={subject.id}>
                        {subject.name || "New subject"}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Added date">
                  <TextInput
                    type="date"
                    value={item.addedDate || ""}
                    onChange={(e) => updateItem("assignments", item.id, "addedDate", e.target.value)}
                  />
                </Field>
                <Field label="Due date">
                  <TextInput
                    type="date"
                    value={item.dueDate}
                    onChange={(e) =>
                      updateItem(
                        "assignments",
                        item.id,
                        "dueDate",
                        e.target.value
                      )
                    }
                  />
                </Field>
                <Field label="Estimated hours">
                  <TextInput
                    type="number"
                    min="1"
                    value={item.hours}
                    onChange={(e) =>
                      updateItem("assignments", item.id, "hours", e.target.value)
                    }
                  />
                </Field>
              </div>
              <div className="saved-item">
                <div>
                  <strong>{item.title || "Untitled assignment"}</strong>
                  <p>
                    {item.subject} · Due {formatAssignmentDate(item.dueDate)} · about{" "}
                    {item.hours} h
                  </p>
                </div>
                <button
                  className="text-btn"
                  onClick={() =>
                    update(
                      "assignments",
                      data.assignments.filter((x) => x.id !== item.id)
                    )
                  }
                >
                  Remove
                </button>
              </div>
            </div>
        ))}
        <button className="outline-btn" onClick={addAssignment}>
          + Add another
        </button>
      </>
    );
  }


  function renderFreeTime() {
  const days = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday",
  ];

  const selectedOverrideDay =
    data.timingOverrides?.[overrideDay] || {
      startTime: "",
      endTime: "",
    };

  function updateOverride(key, value) {
    update("timingOverrides", {
      ...data.timingOverrides,
      [overrideDay]: {
        ...selectedOverrideDay,
        [key]: value,
      },
    });
  }

  return (
    <>
      <div className="field-grid">
        <Field label="Wake-up time">
          <TextInput
            type="time"
            value={data.wakeTime}
            onChange={(e) => update("wakeTime", e.target.value)}
          />
        </Field>

        <Field label="Sleep time">
          <TextInput
            type="time"
            value={data.sleepTime}
            onChange={(e) => update("sleepTime", e.target.value)}
          />
        </Field>

        <Field label="Travel to college (minutes)">
          <TextInput
            type="number"
            min="0"
            value={data.travelToMinutes}
            onChange={(e) => update("travelToMinutes", e.target.value)}
          />
        </Field>

        <Field label="Travel back home (minutes)">
          <TextInput
            type="number"
            min="0"
            value={data.travelFromMinutes}
            onChange={(e) => update("travelFromMinutes", e.target.value)}
          />
        </Field>
      </div>

      <p className="field-caption">College days</p>
      <p className="step-intro">
        Select your college days. The same timings apply to each selected
        day unless you add an override.
      </p>

      <div className="field-grid">
        {days.map((day) => (
          <label className="checkbox-row" key={day}>
            <input
              type="checkbox"
              checked={(data.collegeDays || []).includes(day)}
              onChange={(e) =>
                update(
                  "collegeDays",
                  e.target.checked
                    ? [...(data.collegeDays || []), day]
                    : (data.collegeDays || []).filter((x) => x !== day)
                )
              }
            />
            {day}
          </label>
        ))}
      </div>

      <div className="field-grid">
        <Field label="College starts">
          <TextInput
            type="time"
            value={data.collegeStart}
            onChange={(e) => update("collegeStart", e.target.value)}
          />
        </Field>

        <Field label="College ends">
          <TextInput
            type="time"
            value={data.collegeEnd}
            onChange={(e) => update("collegeEnd", e.target.value)}
          />
        </Field>
      </div>

      <details className="timing-overrides">
        <summary>Different timing for one day?</summary>

        <div className="field-grid">
          <Field label="Choose day">
            <SelectInput
              value={overrideDay}
              onChange={(e) => setOverrideDay(e.target.value)}
            >
              {days
                .filter((day) => (data.collegeDays || []).includes(day))
                .map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
            </SelectInput>
          </Field>

          <Field label="College starts on this day">
            <TextInput
              type="time"
              value={selectedOverrideDay.startTime}
              onChange={(e) => updateOverride("startTime", e.target.value)}
            />
          </Field>

          <Field label="College ends on this day">
            <TextInput
              type="time"
              value={selectedOverrideDay.endTime}
              onChange={(e) => updateOverride("endTime", e.target.value)}
            />
          </Field>
        </div>

        {data.timingOverrides?.[overrideDay] && (
        <button type="button" className="text-btn"
        onClick={() => {
        const next = { ...data.timingOverrides };
        delete next[overrideDay];
        update("timingOverrides", next);
        }} >
        Remove this day's override
        </button>
        )}
      </details>

      <div className="field-grid">
        <Field label="Study plan focus">
          <SelectInput value={data.studyMode || "academics-only"} onChange={(e) => update("studyMode", e.target.value)}>
            <option value="academics-only">Academics only</option>
            <option value="academics-gate">Academics + GATE</option>
          </SelectInput>
        </Field>
        {data.studyMode === "academics-gate" && (
          <Field label="Hours reserved for GATE each study day">
            <SelectInput value={data.gateHoursPerDay || "1"} onChange={(e) => update("gateHoursPerDay", e.target.value)}>
              {[0.5, 1, 1.5, 2, 2.5, 3].map((n) => <option key={n} value={n}>{n} hours</option>)}
            </SelectInput>
          </Field>
        )}
        <Field label="Available study hours on weekdays">
          <SelectInput
            value={data.weekdayHours}
            onChange={(e) => update("weekdayHours", e.target.value)}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n} hours</option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Available study hours on weekends">
          <SelectInput
            value={data.sundayHours}
            onChange={(e) => update("sundayHours", e.target.value)}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n} hours</option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Longest study session">
          <div className="segmented">
            {["30 min", "60 min", "90 min"].map((x) => (
              <button
                type="button"
                key={x}
                className={data.longestStretch === x ? "selected" : ""}
                onClick={() => update("longestStretch", x)}
              >
                {x}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Preferred study time">
          <div className="segmented">
            {["Morning", "Evening", "Night"].map((x) => (
              <button
                type="button"
                key={x}
                className={data.bestTime === x ? "selected" : ""}
                onClick={() => update("bestTime", x)}
              >
                {x}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <div className="field-grid ss-setting-checkboxes">
        <label className="checkbox-row">
          <input type="checkbox" checked={Boolean(data.acceptLowerCoverage)} onChange={(e) => update("acceptLowerCoverage", e.target.checked)} />
          Accept lower syllabus coverage
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={Boolean(data.skipLowWeightUnit)} onChange={(e) => update("skipLowWeightUnit", e.target.checked)} />
          Skip low-weight units
        </label>
      </div>
    </>
  );
}

function formatPlanDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function getDayLabels(dateString) {
  const labels = [];
  const date = new Date(`${dateString}T12:00:00`);
  const weekday = date.getDay();

  if (data.holidays.includes(dateString)) labels.push("Holiday");

  const within = (from, to) =>
    Boolean(from && to && dateString >= from && dateString <= to);

  if (within(data.mid1From, data.mid1To)) labels.push("Mid I");
  if (within(data.mid2From, data.mid2To)) labels.push("Mid II");
  if (within(data.prepFrom, data.prepTo)) labels.push("Prep week");
  if (within(data.endFrom, data.endTo)) labels.push("End exams");

  return labels;
}

function formatHours(minutes) {
  return `${(minutes / 60).toFixed(1)} h`;
}


function renderReview() {
  const fieldRow = (label, value, index, key) => ({
    label,
    value: value === undefined || value === null || value === "" ? "Not set" : String(value),
    index,
    key: key || label,
  });
  const dateValue = (value) => value ? formatPlanDate(value) : "Not set";
  const profileRows = [
    fieldRow("Branch", data.branch, 0),
    fieldRow("College", data.college, 0),
    fieldRow("Current year", data.year, 0),
    fieldRow("Semester", data.semester, 0),
  ];
  const semesterRows = [
    fieldRow("Semester starts", dateValue(data.semesterStart), 1),
    fieldRow("Semester ends", dateValue(data.semesterEnd), 1),
    fieldRow("Mid I starts", dateValue(data.mid1From), 1),
    fieldRow("Mid I ends", dateValue(data.mid1To), 1),
    fieldRow("Mid II starts", dateValue(data.mid2From), 1),
    fieldRow("Mid II ends", dateValue(data.mid2To), 1),
    fieldRow("Prep week starts", dateValue(data.prepFrom), 1),
    fieldRow("Prep week ends", dateValue(data.prepTo), 1),
    fieldRow("End-sem exams start", dateValue(data.endFrom), 1),
    fieldRow("End-sem exams end", dateValue(data.endTo), 1),
    fieldRow("End date not announced", data.endUnknown ? "Yes" : "No", 1),
  ];
  const holidayRows = (data.holidays || []).length
    ? data.holidays.map((holiday, index) => {
        const record = typeof holiday === "string" ? { date: holiday, study: false } : holiday;
        return fieldRow(`Holiday ${index + 1}`, `${dateValue(record.date)} · ${record.study ? "I will study" : "No study"}`, 1, `holiday-${record.date}`);
      })
    : [fieldRow("Holidays", "No holidays added", 1)];
  const subjectRows = [];
  for (const [subjectIndex, subject] of (data.subjects || []).entries()) {
    const prefix = `Subject ${subjectIndex + 1}`;
    subjectRows.push(fieldRow(`${prefix} · Name`, subject.name, 2, `${prefix}-name`));
    subjectRows.push(fieldRow(`${prefix} · Credits`, subject.credits, 2, `${prefix}-credits`));
    subjectRows.push(fieldRow(`${prefix} · Number of units`, subject.units, 2, `${prefix}-units`));
    subjectRows.push(fieldRow(`${prefix} · Type`, subject.type, 2, `${prefix}-type`));
    subjectRows.push(fieldRow(`${prefix} · Confidence`, subject.confidence, 2, `${prefix}-confidence`));
    subjectRows.push(fieldRow(`${prefix} · Completed units`, subject.done, 2, `${prefix}-done`));
    subjectRows.push(fieldRow(`${prefix} · Mid I coverage`, subject.midCoverage, 2, `${prefix}-mid1`));
    subjectRows.push(fieldRow(`${prefix} · Mid II coverage`, subject.mid2Coverage, 2, `${prefix}-mid2`));
    for (const [unitIndex, unit] of (subject.unitDetails || []).entries()) {
      subjectRows.push(fieldRow(`${prefix} · Unit ${unitIndex + 1} name`, unit.name, 2, `${prefix}-unit-${unitIndex}-name`));
      subjectRows.push(fieldRow(`${prefix} · Unit ${unitIndex + 1} estimated hours`, unit.estHours, 2, `${prefix}-unit-${unitIndex}-hours`));
      subjectRows.push(fieldRow(`${prefix} · Unit ${unitIndex + 1} percent complete`, unit.percentComplete === "" || unit.percentComplete == null ? "Not set" : `${unit.percentComplete}%`, 2, `${prefix}-unit-${unitIndex}-complete`));
    }
  }
  if (!subjectRows.length) subjectRows.push(fieldRow("Subjects", "No subjects added", 2));

  const assignmentRows = [];
  for (const [assignmentIndex, assignment] of (data.assignments || []).entries()) {
    const prefix = `Assignment ${assignmentIndex + 1}`;
    assignmentRows.push(fieldRow(`${prefix} · Title`, assignment.title, 3, `${prefix}-title`));
    assignmentRows.push(fieldRow(`${prefix} · Subject`, assignment.subject, 3, `${prefix}-subject`));
    assignmentRows.push(fieldRow(`${prefix} · Added date`, dateValue(assignment.addedDate), 3, `${prefix}-added`));
    assignmentRows.push(fieldRow(`${prefix} · Due date`, dateValue(assignment.dueDate), 3, `${prefix}-due`));
    assignmentRows.push(fieldRow(`${prefix} · Estimated hours`, assignment.hours, 3, `${prefix}-hours`));
    assignmentRows.push(fieldRow(`${prefix} · Completed`, assignment.completed ? "Yes" : "No", 3, `${prefix}-completed`));
  }
  if (!assignmentRows.length) assignmentRows.push(fieldRow("Assignments", "No assignments added", 3));

  const timingOverrideRows = Object.entries(data.timingOverrides || {}).map(([day, timing]) =>
    fieldRow(`${day} timing override`, `${timing.startTime || "Start not set"} – ${timing.endTime || "End not set"}`, 4, `override-${day}`)
  );
  const freeTimeRows = [
    fieldRow("Wake-up time", data.wakeTime, 4),
    fieldRow("Sleep time", data.sleepTime, 4),
    fieldRow("Travel to college (minutes)", data.travelToMinutes, 4),
    fieldRow("Travel home (minutes)", data.travelFromMinutes, 4),
    fieldRow("College days", (data.collegeDays || []).join(", ") || "No college days selected", 4),
    fieldRow("College starts", data.collegeStart, 4),
    fieldRow("College ends", data.collegeEnd, 4),
    ...timingOverrideRows,
    fieldRow("Available study hours on weekdays", data.weekdayHours, 4),
    fieldRow("Available study hours on weekends", data.sundayHours, 4),
    fieldRow("Study plan focus", data.studyMode === "academics-gate" ? "Academics + GATE" : "Academics only", 4),
    ...(data.studyMode === "academics-gate" ? [fieldRow("GATE hours reserved per study day", data.gateHoursPerDay, 4)] : []),
    fieldRow("Longest study session", data.longestStretch, 4),
    fieldRow("Preferred study time", data.bestTime, 4),
    fieldRow("Accept lower syllabus coverage", data.acceptLowerCoverage ? "Yes" : "No", 4),
    fieldRow("Skip low-weight units", data.skipLowWeightUnit ? "Yes" : "No", 4),
  ];

  const sections = [
    { title: "Student details", rows: profileRows },
    { title: "Semester and exam dates", rows: semesterRows },
    { title: "Subjects and unit details", rows: subjectRows },
    { title: "Assignments", rows: assignmentRows },
    { title: "Free time and routine", rows: freeTimeRows },
    { title: "Holidays", rows: holidayRows },
  ];
  const warnings = [...(planResult?.warnings || [])].sort(
    (a, b) => (a.severity === "blocking" ? 0 : 1) - (b.severity === "blocking" ? 0 : 1)
  );

  return (
    <>
      {setupKind === "sample" && <div className="ss-sample-banner"><strong>Sample data</strong><span>These values are examples. Edit them to match your real semester before relying on the generated plan.</span></div>}
      <div className="review-list ss-review-details">
        {sections.map((section) => (
          <details className="ss-review-section" key={section.title}>
            <summary>
              <span className="ss-review-section-title">{section.title}</span>
              <span className="ss-review-section-meta">{section.rows.length} items · Expand to review</span>
            </summary>
            <div className="ss-review-section-body">
              {section.rows.map((row) => (
                <div className="review-row" key={row.key}>
                  <div><span>{row.label}</span><p>{row.value}</p></div>
                  <button className="text-btn" onClick={() => { const targets = ["Student Details", "Semester & Exam Dates", "Subjects & Syllabus", "Assignments", "Free Time & Routine"]; setStep(row.index); setActiveView(targets[row.index] || "Review"); }}>Edit</button>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>

      <section className="start-mode-card">
        <h3>When should your timetable begin?</h3>
        <p>Choose the date range the planner should generate. This choice changes the actual scheduled dates.</p>
        <div className="start-mode-options">
          <button type="button" className={planStartMode === "today" ? "selected" : ""} onClick={() => choosePlanStartMode("today")}>
            <strong>From present date</strong><span>Start from today and plan the remaining semester.</span>
          </button>
          <button type="button" className={planStartMode === "semester" ? "selected" : ""} onClick={() => choosePlanStartMode("semester")}>
            <strong>From semester starting date</strong><span>{data.semesterStart ? `Start from ${formatPlanDate(data.semesterStart)} and create the plan from the beginning.` : "Set a semester start date in Semester dates first."}</span>
          </button>
        </div>
      </section>

      {planResult && (
        <div className={planResult.canUseAsFinalPlan ? "success-card" : "warning-card"}>
          <h3>{planResult.canUseAsFinalPlan ? "Your plan is ready" : "Your plan needs adjustment"}</h3>
          <p>{planResult.message}</p>
          <h4>Reality Check</h4>
          <table className="plan-table">
            <thead><tr><th>Deadline</th><th>Required</th><th>Available</th><th>Shortage</th></tr></thead>
            <tbody>{(planResult.realityCheck || []).map((item) => <tr key={item.deadline}><td>{item.deadline}</td><td>{item.requiredHours} h</td><td>{item.availableHours} h</td><td>{item.shortageHours} h</td></tr>)}</tbody>
          </table>
          {warnings.length > 0 && <section className="ss-warning-list"><h4>Plan warnings</h4>{warnings.map((item, index) => <div className={`ss-warning-item ${item.severity}`} key={`${item.severity}-${index}`}><strong>{item.severity === "blocking" ? "Needs attention" : "Information"}</strong><p>{item.message}</p></div>)}</section>}
          <p>{planResult.plan.sessions.length} sessions generated · {formatHours(planResult.plan.sessions.reduce((total, session) => total + session.durationMinutes, 0))} scheduled</p>
          {planResult.plan.unscheduled.length > 0 && <p>{planResult.plan.unscheduled.length} tasks require attention. Review the full plan for details.</p>}
          <button type="button" className="primary-btn" onClick={() => activeView === "Review" ? setActiveView("My Plan") : setShowPlan(true)}>
            {activeView === "Review" ? "Back to My Plan" : "View full plan"}
          </button>
        </div>
      )}
    </>
  );
}

function renderPlan() {
  if (!planResult) return null;

  const sessions = [...planResult.plan.sessions].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime)
  );

  const groupedSessions = sessions.reduce((groups, session) => {
    if (!groups[session.date]) groups[session.date] = [];
    groups[session.date].push(session);
    return groups;
  }, {});

  const subjectTotals = sessions.reduce((totals, session) => {
    const subject = session.subjectName || session.type || "Other";

    if (!totals[subject]) {
      totals[subject] = { count: 0, minutes: 0 };
    }

    totals[subject].count += 1;
    totals[subject].minutes += session.durationMinutes;

    return totals;
  }, {});

  return (
    <div className="full-plan">
      <div className="plan-page-header">
        <div>
          <h1>Your Study Plan</h1>
          <p>
            {sessions.length} sessions ·{" "}
            {formatHours(
              sessions.reduce(
                (total, session) =>
                  total + session.durationMinutes,
                0
              )
            )}{" "}
            total study time
          </p>
        </div>

        <button
          type="button"
          className="outline-btn"
          onClick={() => setShowPlan(false)}
        >
          Back to Review
        </button>
      </div>

      {sessions.length === 0 ? (
        <p>No study sessions could be scheduled for this period.</p>
      ) : (
        Object.entries(groupedSessions).map(([date, daySessions]) => {
          const dayMinutes = daySessions.reduce(
            (total, session) =>
              total + session.durationMinutes,
            0
          );

          const labels = getDayLabels(date);

          return (
            <section className="plan-day" key={date}>
              <div className="plan-day-heading">
                <h2>{formatPlanDate(date)}</h2>
                <strong>{formatHours(dayMinutes)}</strong>

                {labels.length > 0 && (
                  <div className="plan-day-labels">
                    {labels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="plan-day-sessions">
                {daySessions.map((session) => (
                  <article
                    className="plan-session"
                    key={session.id}
                  >
                    <div className="plan-session-time">
                      {session.startTime}–{session.endTime}
                    </div>

                    <div className="plan-session-details">
                      <strong>{session.title}</strong>
                      <p>
                        {session.subjectName || session.type}
                      </p>
                      <p>
                        {session.durationMinutes} minutes
                      </p>
                      <p className="plan-session-reason">
                        {session.reason || "Scheduled study session"}
                      </p>
                    </div>

                    <span className="plan-session-duration">
                      {session.durationMinutes} min
                    </span>
                  </article>
                ))}
              </div>
            </section>
          );
        })
      )}

      <section className="plan-totals">
        <h2>Study totals by subject</h2>
        <p>Total sessions: {sessions.length}</p>
        <p>
          Total study hours:{" "}
          {formatHours(
            sessions.reduce(
              (total, session) =>
                total + session.durationMinutes,
              0
            )
          )}
        </p>

        <table className="plan-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Sessions</th>
              <th>Total hours</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(subjectTotals).map(([subject, total]) => (
              <tr key={subject}>
                <td>{subject}</td>
                <td>{total.count}</td>
                <td>{formatHours(total.minutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {planResult.plan.unscheduled.length > 0 && (
        <section className="plan-totals">
          <h2>
            Tasks requiring attention (
            {planResult.plan.unscheduled.length})
          </h2>

          {planResult.plan.unscheduled.map((task, index) => (
            <div
              className="review-row"
              key={`${task.id}-${index}`}
            >
              <div>
                <strong>{task.title}</strong>
                <p>
                  {task.status} · Due{" "}
                  {task.dueDate || "date not set"}
                </p>
              </div>
              <span>
                {formatHours(task.remainingMinutes)} left
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}


  const content = [
    renderAbout,
    renderSemester,
    renderSubjects,
    renderAssignments,
    renderFreeTime,
    renderReview,
  ];

  const subtitles = [
    "Takes about 20 seconds.",
    "Copy these from your college calendar.",
    "Add each subject once.",
    "Optional. Skip if you have none.",
    "Tell us when you can really study.",
    "Check everything, then see if it fits.",
  ];

  function renderGatePlanPage() {
    const plan = gatePlan?.ok ? gatePlan : null;
    const selectedMonth = plan?.months?.find((month) => month.key === selectedGateMonth) || plan?.months?.[0] || null;
    const monthWeeks = selectedMonth
      ? (plan.weeks || []).filter((week) => selectedMonth.weeks?.includes(week.index))
      : [];
    const paperName = GATE_PAPERS.find((paper) => paper.code === gateSetup.paper)?.name || gateSetup.paper || "Select a paper";
    const formatGateDate = (value) => value
      ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
      : "Not set";
    const formatGateHours = (minutes) => `${(Number(minutes || 0) / 60).toFixed(1)} h`;
    const monthName = (key) => {
      const [year, month] = String(key || "").split("-").map(Number);
      return year && month ? new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) : key;
    };
    const phaseLabel = (phase) => phase === "final" ? "Final week" : phase === "revise" ? "Revise" : "Learn";
    const field = (label, child) => <label className="ss-gate-field"><span>{label}</span>{child}</label>;

    return (
      <section className="ss-gate-page">
        <div className="ss-plan-heading ss-gate-heading">
          <div>
            <span className="ss-gate-eyebrow">GATE PREPARATION</span>
            <h1>GATE Plan</h1>
            <p>A focused monthly plan and weekly targets—without asking for your college timetable.</p>
          </div>
          <div className="ss-gate-heading-actions">
            {plan && <span className={`ss-gate-mode-pill ${plan.mode}`}>{plan.mode === "short" ? "Short plan" : "Long plan"}</span>}
            <button type="button" className="ss-review-button" onClick={() => { setGateError(""); setShowGateSetup((value) => !value); }}>{showGateSetup ? "Hide setup" : "Edit setup"}</button>
            {!generated && <button type="button" className="ss-review-button" onClick={() => setActiveView("About you")}>Back to academic setup</button>}
          </div>
        </div>

        {gateError && <div className="ss-inline-error"><strong>GATE plan needs attention</strong><p>{gateError}</p></div>}

        {showGateSetup && <section className="ss-panel ss-gate-setup">
          <div className="ss-panel-title"><div><h2>GATE setup</h2><p className="ss-gate-subcopy">Choose your attempt details. Today’s date and preparation duration are calculated automatically.</p></div><span className="ss-gate-step-tag">STEP 1 · SETUP</span></div>
          <div className="ss-gate-form-grid">
            {field("Current year of study", <select value={gateSetup.currentYear} onChange={(event) => updateGateSetupField("currentYear", event.target.value)}><option value="">Select year</option>{[1,2,3,4].map((year) => <option key={year} value={year}>{year}{year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} year</option>)}</select>)}
            {field("Current semester", <select value={gateSetup.semester} onChange={(event) => updateGateSetupField("semester", event.target.value)}><option value="">Select semester</option><option value="1">Semester 1</option><option value="2">Semester 2</option></select>)}
            {field("Graduation year", <input type="number" min="2000" max="2200" placeholder="e.g. 2028" value={gateSetup.graduationYear} onChange={(event) => updateGateGraduationYear(event.target.value)} />)}
            {field("GATE attempt year", <select value={gateSetup.attemptYear} onChange={(event) => updateGateAttemptYear(event.target.value)} disabled={!gateSetup.graduationYear}><option value="">Choose attempt year</option>{Number.isInteger(Number(gateSetup.graduationYear)) && Number(gateSetup.graduationYear) >= 2000 && [Number(gateSetup.graduationYear) - 1, Number(gateSetup.graduationYear)].map((year) => <option key={year} value={year}>{year}{year === Number(gateSetup.graduationYear) - 1 ? " · one year before graduation" : " · graduation year"}</option>)}</select>)}
            {field("Engineering branch", <select value={gateSetup.branch} onChange={(event) => updateGateBranch(event.target.value)}><option value="">Select your branch</option>{GATE_BRANCHES.map((branch) => <option value={branch.value} key={branch.value}>{branch.label}</option>)}</select>)}
            {field("GATE paper", <select value={gateSetup.paper} onChange={(event) => updateGateSetupField("paper", event.target.value)}><option value="">Select paper</option>{GATE_PAPERS.map((paper) => <option value={paper.code} key={paper.code}>{paper.code} — {paper.name}</option>)}</select>)}
            {field("GATE exam date", <input type="date" value={gateSetup.gateDate || getDefaultGateDate(gateSetup.attemptYear)} min={addDateDays(getLocalToday(), 1)} onChange={(event) => updateGateSetupField("gateDate", event.target.value)} disabled={!gateSetup.attemptYear} />)}
            {field("Study hours per study day", <input type="number" min="0.5" max="8" step="0.5" value={(Number(gateSetup.settings?.gateMinutesPerDay ?? 120) / 60)} onChange={(event) => { const hours = Number(event.target.value); if (event.target.value !== "" && Number.isFinite(hours) && hours >= 0.5 && hours <= 8) updateGateSettings({ gateMinutesPerDay: Math.round(hours * 60) }); }} />)}
            {gateSetup.paper === "RA" && field("RA optional section", <select value={gateSetup.raPart || "B1"} onChange={(event) => updateGateSetupField("raPart", event.target.value)}><option value="B1">Part B1 — Electrical Engineering</option><option value="B2">Part B2 — Mechanical Engineering</option></select>)}
          </div>
          <div className="ss-gate-capacity-note"><span className="ss-gate-note-icon">◷</span><div><strong>Your study time, your plan</strong><p>The plan uses the hours you enter below. You can change this after applying a suggestion, then select Regenerate GATE plan. Current assumption: {(Number(gateSetup.settings?.gateMinutesPerDay ?? 120) / 60).toFixed(1)} study hours on each study day, Sunday off, and a light/rest day before the exam. This is a planning assumption—not a claim about your actual free time.</p></div></div>
          <div className="ss-gate-form-actions"><button type="button" className="ss-primary" onClick={() => generateGatePlan()} disabled={gateLoading}>{gateLoading ? "Generating GATE plan…" : plan ? "Regenerate GATE plan" : "Generate my GATE plan"}</button>{plan && <button type="button" className="ss-review-button" onClick={() => setShowGateSetup(false)}>Cancel</button>}</div>
        </section>}

        {!plan && !showGateSetup && <section className="ss-panel ss-gate-empty"><h2>Your GATE plan starts here</h2><p>Enter your attempt details to generate a monthly plan and weekly targets.</p><button type="button" className="ss-primary" onClick={() => setShowGateSetup(true)}>Open GATE setup</button></section>}

        {plan && !showGateSetup && <>
          <div className="ss-gate-metric-grid">
            <article className="ss-panel ss-gate-metric"><span>Time remaining</span><strong>{plan.monthsAvailable} <small>months</small></strong><p>{plan.weeksAvailable} preparation weeks · exam {formatGateDate(plan.gateDate)}</p></article>
            <article className="ss-panel ss-gate-metric"><span>Estimated syllabus coverage</span><strong>{plan.coverage.percentHours}%</strong><div className="ss-gate-progress"><i style={{ width: `${Math.max(0, Math.min(100, plan.coverage.percentHours))}%` }} /></div><p>{plan.coverage.marksCovered} of {plan.coverage.marksTotal} estimated marks</p></article>
            <article className="ss-panel ss-gate-metric"><span>Study capacity</span><strong>{formatGateHours(plan.capacity.totalMinutes)}</strong><p>{formatGateHours(plan.capacity.learningMinutes)} available for learning before revision weeks</p></article>
            <article className="ss-panel ss-gate-metric"><span>Selected paper</span><strong>{plan.paper}</strong><p>{plan.paperName}</p></article>
          </div>

          {plan.warnings?.length > 0 && <section className="ss-panel ss-gate-warnings"><div className="ss-panel-title"><h2>Plan warnings</h2><span>{plan.warnings.length} notice{plan.warnings.length === 1 ? "" : "s"}</span></div>{plan.warnings.map((warning, index) => <div className="ss-gate-warning" key={`${warning.type}-${index}`}><div><strong>{warning.type === "suggestion" ? "Suggested adjustment" : "Coverage warning"}</strong><p>{warning.message}</p></div>{warning.type === "suggestion" && warning.settings && <button type="button" className="ss-review-button" disabled={gateLoading} onClick={() => applyGateSuggestion(warning.settings)}>Apply suggestion</button>}</div>)}</section>}

          <section className="ss-gate-syllabus-section">
            <div className="ss-gate-syllabus-toolbar">
              <div><h2>GATE syllabus</h2><p>Check subject-wise estimated marks and expand a subject to view its topics.</p></div>
              <button type="button" className="ss-review-button" onClick={() => setShowGateSyllabus((value) => !value)} aria-expanded={showGateSyllabus}>
                {showGateSyllabus ? "Hide syllabus" : "View syllabus"}
              </button>
            </div>
            {showGateSyllabus && <section className="ss-panel ss-gate-syllabus-panel">
              <p className="ss-gate-syllabus-disclaimer"><strong>Important:</strong> These subject-wise marks are StudySync estimates based on historical paper analysis, not official chapter-wise weightage or guaranteed marks. Refer to the official GATE syllabus for the authoritative topic list.</p>
              <div className="ss-gate-syllabus-list">
                {(plan.syllabus || []).map((subject) => <details className="ss-gate-syllabus-subject" key={subject.id}>
                  <summary>
                    <span className="ss-gate-syllabus-subject-name">{subject.name}</span>
                    <span className="ss-gate-syllabus-marks">≈ {Number(subject.estimatedMarks).toLocaleString("en-IN", { maximumFractionDigits: 1 })} marks <small>estimated</small></span>
                  </summary>
                  {subject.topics?.length ? <ul>{subject.topics.map((topic, index) => <li key={`${subject.id}-${index}`}>{topic}</li>)}</ul> : <p className="ss-muted-copy">No topic details are available for this subject in the current dataset.</p>}
                </details>)}
              </div>
              {!plan.syllabus?.length && <p className="ss-muted-copy">Syllabus details are not available in this saved plan yet. Regenerate the GATE plan to load them.</p>}
            </section>}
          </section>

          <section className="ss-gate-month-section">
            <div className="ss-panel-title ss-gate-section-heading"><div><h2>Monthly targets</h2><p>Select a month to inspect its weeks and study targets.</p></div><span>{plan.months.length} months</span></div>
            <div className="ss-gate-month-grid">
              {plan.months.map((month) => <article role="button" tabIndex={0} className={`ss-panel ss-gate-month-card ${selectedMonth?.key === month.key ? "selected" : ""}`} key={month.key} onClick={() => setSelectedGateMonth(month.key)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedGateMonth(month.key); } }}>
                <span className="ss-gate-month-name">{monthName(month.key)}</span>
                <strong>{formatGateHours(month.capacityMinutes)}</strong>
                <span className="ss-gate-month-meta">{month.weeks.length} weeks · {month.mocks} mock test{month.mocks === 1 ? "" : "s"}</span>
                <span className="ss-gate-card-divider" />
                <span className="ss-gate-card-target-heading">Targets</span>
                {month.targets?.length ? <ul>{month.targets.slice(0, 3).map((target, index) => <li key={`${month.key}-${index}`}>{target}</li>)}</ul> : <p className="ss-muted-copy">No targets returned for this month.</p>}
                {month.targets?.length > 3 && <small className="ss-gate-more-targets">+ {month.targets.length - 3} more targets</small>}
              </article>)}
            </div>
          </section>

          {selectedMonth && <section className="ss-panel ss-gate-selected-month"><div className="ss-panel-title"><div><h2>{monthName(selectedMonth.key)} · Weekly overview</h2><p>{selectedMonth.weeks.length} week groups · {formatGateHours(selectedMonth.capacityMinutes)} capacity</p></div><span className="ss-gate-step-tag">MONTH SELECTED</span></div>
            {selectedMonth.targets?.length > 0 && <details className="ss-gate-all-targets"><summary>View all monthly targets ({selectedMonth.targets.length})</summary><ul>{selectedMonth.targets.map((target, index) => <li key={`month-target-${selectedMonth.key}-${index}`}>{target}</li>)}</ul></details>}
            {monthWeeks.length ? <div className="ss-gate-month-weeks">{monthWeeks.map((week) => <article className="ss-gate-week-summary" key={`${week.index}-${week.start}`}><div className="ss-gate-week-date"><span>WEEK {week.index + 1}</span><strong>{formatGateDate(week.start)} – {formatGateDate(week.end)}</strong></div><span className={`ss-gate-phase ${week.phase}`}>{phaseLabel(week.phase)}</span><div className="ss-gate-week-summary-hours"><strong>{formatGateHours(week.capacityMinutes)}</strong><span>capacity</span></div><div className="ss-gate-week-targets">{week.targets?.slice(0, 3).map((target, index) => <span key={`${week.index}-${index}`}>{target}</span>)}{week.targets?.length > 3 && <small>+ {week.targets.length - 3} targets in this week</small>}</div></article>)}</div> : <p className="ss-muted-copy">No week groups were returned for this month.</p>}
          </section>}

          <p className="ss-gate-source-note"><strong>Source and estimates:</strong> {plan.source} Subject weightages are estimates, and chapter hours are StudySync planning estimates—not guarantees.</p>
        </>}
      </section>
    );
  }

  function renderAppShell() {
    const sessions = [...(planResult?.plan?.sessions || [])].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const today = getLocalToday();
    const totalMinutes = sessions.reduce((sum, session) => sum + Number(session.durationMinutes || 0), 0);
    const doneMinutes = completedSessionRecords.reduce((sum, record) => sum + Number(record.durationMinutes || 0), 0);
    const allTrackedMinutes = totalMinutes + doneMinutes;
    const selectedWeekDates = getWeekDates(weekStart);
    const selectedWeekSessions = getSessionsForWeek(sessions, weekStart);
    const currentWeekStart = getWeekStartMonday(today);
    const currentWeekDates = getWeekDates(currentWeekStart);
    const currentWeekSessions = getSessionsForWeek(sessions, currentWeekStart);
    const thisWeekSummary = getThisWeekSubjectSummary(sessions, completedSessionRecords, currentWeekStart);
    const monthDate = new Date(`${calendarMonth}-01T12:00:00`);
    const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
    const calendarOffset = monthStart.getDay();
    const calendarCount = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const gridStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 - calendarOffset, 12);
    const calendarDays = Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart); date.setDate(gridStart.getDate() + i);
      return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    });
    const holidayRecords = Array.isArray(data.holidays) ? data.holidays.map((holiday) => typeof holiday === "string" ? { date: holiday, study: false } : holiday) : [];
    // Render one marker for every kind of session on a date (not one generic
    // green marker for any session). This makes assignment work dates visible.
    const dateEvents = (date) => {
      const events = [];
      const daySessions = sessions.filter((session) => session.date === date);
      if (daySessions.some((session) => session.type !== "revision" && session.type !== "assignment" && session.type !== "gate")) events.push("study");
      if (daySessions.some((session) => session.type === "revision")) events.push("revision");
      if (daySessions.some((session) => session.type === "assignment")) events.push("assignment");
      if (daySessions.some((session) => session.type === "gate")) events.push("gate");
      if (holidayRecords.some((holiday) => holiday.date === date)) events.push("holiday");
      if ((data.mid1From && data.mid1To && date >= data.mid1From && date <= data.mid1To) ||
          (data.mid2From && data.mid2To && date >= data.mid2From && date <= data.mid2To) ||
          (data.endFrom && data.endTo && date >= data.endFrom && date <= data.endTo)) events.push("exam");
      if (data.prepFrom && data.prepTo && date >= data.prepFrom && date <= data.prepTo) events.push("revision");
      if ((data.assignments || []).some((assignment) => assignment.dueDate === date)) events.push("assignment");
      return [...new Set(events)];
    };
    const events = [];
    const addRangeEvent = (title, from, to, kind) => { if (from && to) events.push({ title, from, to, kind }); };
    addRangeEvent("Mid-I Exams", data.mid1From, data.mid1To, "exam");
    addRangeEvent("Mid-II Exams", data.mid2From, data.mid2To, "exam");
    addRangeEvent("Prep Week (End Sem)", data.prepFrom, data.prepTo, "revision");
    addRangeEvent("End Semester Exams", data.endFrom, data.endTo, "exam");
    holidayRecords.forEach((holiday) => events.push({ title: "Holiday", from: holiday.date, to: holiday.date, kind: "holiday" }));
    (data.assignments || []).forEach((assignment) => { if (assignment.dueDate) events.push({ title: assignment.title || "Assignment", from: assignment.dueDate, to: assignment.dueDate, kind: "assignment" }); });
    // List all assignments independently of due-date events, including overdue
    // ones, so their scheduled study dates never get hidden by the 5-event limit.
    const assignmentEventRows = (data.assignments || [])
      .map((assignment) => {
        const byId = sessions.filter(
          (session) => session.type === "assignment" &&
            String(session.taskId ?? "") === String(assignment.id)
        );
        const matchedSessions = byId.length ? byId : sessions.filter(
          (session) => session.type === "assignment" &&
            (session.title || "").trim().toLowerCase() ===
              (assignment.title || "Assignment").trim().toLowerCase()
        );
        const unscheduledTask = (planResult?.plan?.unscheduled || []).find(
          (task) => task.type === "assignment" && String(task.id) === String(assignment.id)
        );
        return {
          assignment,
          scheduledDates: [...new Set(matchedSessions.map((session) => session.date).filter(Boolean))].sort(),
          remainingMinutes: Number(unscheduledTask?.remainingMinutes || 0),
        };
      })
      .sort((a, b) => String(a.assignment.dueDate || "9999-12-31").localeCompare(String(b.assignment.dueDate || "9999-12-31")));
    const futureEvents = events
      .filter((event) => event.kind !== "assignment" && event.to >= today)
      .sort((a, b) => a.from.localeCompare(b.from))
      .slice(0, 5);
    const selectedSessions = sessions.filter((session) => session.date === selectedDate);
    const selectedDay = new Date(`${selectedDate}T12:00:00`);
    const selectedLabel = selectedDay.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const remaining = planResult?.plan?.unscheduled || [];
    const realityItems = planResult?.realityCheck || [];
    const totalShortage = realityItems.reduce((sum, item) => sum + Number(item.shortageHours || 0), 0);
    const subjectProgress = (data.subjects || []).map((subject) => {
      const units = Number(subject.units) || 0;
      const details = Array.isArray(subject.unitDetails) ? subject.unitDetails : [];
      const progress = details.length ? details.reduce((sum, unit) => sum + (Number(unit.percentComplete) || 0), 0) / details.length : (Number(subject.done) || 0) / Math.max(1, units) * 100;
      return { name: subject.name, progress: Math.round(progress) };
    });
    // One primary planning dashboard only. The full My Plan view is the dashboard;
    // do not expose a second, simplified Dashboard screen after generation.
    const navItems = [
      ["Dashboard", "⌂"], ["Student Details", "♙"], ["Semester & Exam Dates", "▦"], ["Subjects & Syllabus", "▤"], ["Free Time & Routine", "◷"], ["Assignments", "▧"], ["My Plan", "▤"], ["GATE Plan", "♧"], ["Settings", "⚙"],
    ];
    const editorSteps = { "Student Details": 0, "Semester & Exam Dates": 1, "Subjects & Syllabus": 2, "Assignments": 3, "Free Time & Routine": 4 };
    const previousMonth = () => { const d = new Date(`${calendarMonth}-01T12:00:00`); d.setMonth(d.getMonth() - 1); setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
    const nextMonth = () => { const d = new Date(`${calendarMonth}-01T12:00:00`); d.setMonth(d.getMonth() + 1); setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
    const shiftMonth = (delta) => { const d = new Date(`${calendarMonth}-01T12:00:00`); d.setMonth(d.getMonth() + delta); setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
    const displayDate = (date) => date ? new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Date not set";
    const getSessionColor = (type) => type === "revision" ? "revision" : type === "assignment" ? "assignment" : type === "gate" ? "gate" : "study";
    const editorIndex = editorSteps[activeView];
    const changeWeek = (delta) => setWeekStart(addDateDays(weekStart, delta * 7));
    const weekLabel = `${displayDate(weekStart)} – ${displayDate(addDateDays(weekStart, 6))}`;
    const orderedWarnings = [...(planResult?.warnings || [])].sort(
      (a, b) => (a.severity === "blocking" ? 0 : 1) - (b.severity === "blocking" ? 0 : 1)
    );
    const completedSessionSet = new Set(completedSessionIds);

    return (
      <div className={`ss-app-shell ${uiTheme === "dark" ? "ss-theme-dark" : "ss-theme-light"}`}>
        <aside className="ss-sidebar">
          <div className="ss-brand"><strong>StudySync</strong><span>YOUR SEMESTER, ORGANIZED</span></div>
          <nav>{navItems.map(([label, icon]) => <button key={label} className={`ss-nav-item ${activeView === label ? "active" : ""} ${["My Plan", "GATE Plan", "Settings"].includes(label) ? "lower" : ""}`} onClick={() => { setActiveView(label); if (label === "GATE Plan") setShowGateSetup(true); if (editorSteps[label] !== undefined) setStep(editorSteps[label]); }}><span className="ss-nav-icon">{icon}</span><span>{label}</span></button>)}</nav>
          <div className="ss-sidebar-footer"><p>Academic + GATE mode appears when selected during setup.</p></div>
        </aside>
        <main className="ss-main">
          <header className="ss-topbar">
            <div className="ss-topbar-spacer" aria-hidden="true" />
            <div className="ss-profile"><button type="button" className="ss-theme-toggle" onClick={toggleUiTheme} aria-label={`Switch to ${uiTheme === "dark" ? "light" : "dark"} view`} title={`Switch to ${uiTheme === "dark" ? "light" : "dark"} view`}>{uiTheme === "dark" ? "☀ Light view" : "☾ Dark view"}</button><span className="ss-avatar">{(data.name || "D").trim().charAt(0).toUpperCase()}</span><strong>{data.name || "Dharani"}</strong></div>
          </header>
          <div className={`ss-content ${planResult && activeView === "My Plan" && planTab === "Monthly View" ? "ss-content-dashboard-grid" : ""}`}>
            {apiError && <div className="ss-inline-error"><strong>We need to check something</strong><p>{apiError}</p></div>}
            {activeView === "Dashboard" ? <>
              <section className="ss-home-heading"><div><span className="ss-home-eyebrow">YOUR STUDY SPACE</span><h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}{data.name ? `, ${data.name}` : ""}! 👋</h1><p>Your semester, subjects, assignments, exams and GATE preparation — organized in one place.</p></div><button type="button" className="ss-primary" onClick={() => { setStep(0); setApiError(""); setActiveView("Student Details"); }}>＋ Create academic plan</button></section>
              <section className="ss-home-stats"><article className="ss-panel ss-home-stat"><span>Study plan</span><strong>{planResult ? "Ready" : "Not created yet"}</strong><small>{planResult ? "Your timetable is ready to view" : "Create your plan to populate your dashboard"}</small></article><article className="ss-panel ss-home-stat"><span>Subjects</span><strong>{(data.subjects || []).length}</strong><small>Subjects added to your semester</small></article><article className="ss-panel ss-home-stat"><span>Upcoming events</span><strong>{futureEvents.length + assignmentEventRows.length}</strong><small>Exams and assignment deadlines</small></article><article className="ss-panel ss-home-stat"><span>GATE preparation</span><strong>{gatePlan?.ok ? `${gatePlan.paper} plan ready` : "Ready to set up"}</strong><small>{gatePlan?.ok ? `${gatePlan.weeksAvailable} preparation weeks` : "Independent from your academic plan"}</small></article></section>
              <div className="ss-home-grid">
                <section className="ss-panel ss-home-calendar"><div className="ss-panel-title"><div className="ss-month-nav"><button type="button" onClick={previousMonth}>‹</button><h2>{monthLabel}</h2><button type="button" onClick={nextMonth}>›</button></div><button className="ss-link" type="button" onClick={() => setActiveView("Semester & Exam Dates")}>Manage dates</button></div><div className="ss-calendar"><div className="ss-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="ss-calendar-days">{calendarDays.map((date) => <button type="button" key={date} className={`ss-calendar-day ${date.slice(0,7) !== calendarMonth ? "muted" : ""} ${selectedDate === date ? "chosen" : ""}`} onClick={() => { setSelectedDate(date); setCalendarMonth(date.slice(0,7)); setWeekStart(getWeekStartMonday(date)); }}><span>{Number(date.slice(-2))}</span><div className="ss-dots">{dateEvents(date).map((marker, index) => <i key={`${marker}-${index}`} className={marker}/>)}</div></button>)}</div></div><div className="ss-home-calendar-footer"><span><i className="study"/> Study</span><span><i className="exam"/> Exam</span><span><i className="assignment"/> Assignment</span></div></section>
                <section className="ss-panel ss-home-today"><div className="ss-panel-title"><div><h2>Today's Schedule</h2><p>{displayDate(today)}</p></div><button type="button" className="ss-link" onClick={() => setActiveView("My Plan")}>View timetable</button></div>{planResult ? (selectedSessions.length ? selectedSessions.slice(0,5).map((session) => <article className={`ss-home-session ${getSessionColor(session.type)} ${isSessionDone(session) ? "completed" : ""}`} key={session.id}><span>{session.startTime}–{session.endTime}</span><div><strong>{session.title}</strong><small>{session.durationMinutes} min · {session.type}</small></div><label className="ss-home-check" title={isSessionDone(session) ? "Mark as not done" : "Mark as done"}><input type="checkbox" checked={isSessionDone(session)} onChange={() => toggleSessionDone(session)} aria-label={`Mark ${session.title} ${isSessionDone(session) ? "not done" : "done"}`} /></label></article>) : <p className="ss-home-empty">No sessions scheduled for today. View your timetable to explore your schedule.</p>) : <div className="ss-home-empty-state"><span>◷</span><strong>Your schedule will appear here</strong><p>Create an academic plan to see study sessions, revision, assignments and breaks.</p><button type="button" className="ss-review-button" onClick={() => { setStep(0); setActiveView("Student Details"); }}>Set up my timetable</button></div>}</section>
                <section className="ss-panel ss-focus-timer"><div className="ss-panel-title"><div><h2>Focus Timer</h2><p>{focusMode === "Focus" ? "One focused session at a time" : "Take a short break"}</p></div><select aria-label="Focus timer mode" value={focusMode} onChange={(event) => { setFocusMode(event.target.value); setFocusRunning(false); setFocusSeconds(event.target.value === "Focus" ? 25 * 60 : 5 * 60); }}><option>Focus</option><option>Break</option></select></div><div className="ss-focus-ring"><div><strong>{String(Math.floor(focusSeconds / 60)).padStart(2, "0")}:{String(focusSeconds % 60).padStart(2, "0")}</strong><span>{focusSeconds === 0 ? "Session complete" : focusMode === "Focus" ? "Stay focused" : "Rest a little"}</span></div></div><div className="ss-focus-actions"><button type="button" className="ss-primary" onClick={() => { if (focusSeconds === 0) setFocusSeconds(focusMode === "Focus" ? 25 * 60 : 5 * 60); setFocusRunning(!focusRunning); }}>{focusRunning ? "Pause" : focusSeconds === 0 ? "Restart" : "Start"}</button><button type="button" className="ss-review-button" onClick={() => { setFocusRunning(false); setFocusSeconds(focusMode === "Focus" ? 25 * 60 : 5 * 60); }}>Reset</button></div><p className="ss-focus-note">Focus on progress, not perfection.</p></section>
                <section className="ss-panel ss-home-events"><div className="ss-panel-title"><h2>Upcoming Events</h2><button type="button" className="ss-link" onClick={() => setActiveView("Semester & Exam Dates")}>View all</button></div>{[...assignmentEventRows.slice(0,3).map(({assignment}) => ({title:assignment.title || "Assignment",date:assignment.dueDate,kind:"assignment"})), ...futureEvents.slice(0,4).map((event) => ({title:event.title,date:event.from,kind:event.kind}))].sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999")).slice(0,5).map((event,index) => <div className={`ss-home-event ${event.kind}`} key={`${event.title}-${event.date}-${index}`}><span className="ss-event-icon">{event.kind === "assignment" ? "▧" : "▦"}</span><div><strong>{event.title}</strong><small>{event.date ? displayDate(event.date) : "Date not set"}</small></div></div>)}{!futureEvents.length && !assignmentEventRows.length && <p className="ss-home-empty">Your exams and assignment deadlines will appear here after you add them.</p>}</section>
                <section className="ss-panel ss-home-quick"><div className="ss-panel-title"><h2>Quick Actions</h2><span>Jump straight to a section</span></div><div className="ss-home-quick-grid"><button type="button" onClick={() => setActiveView("Student Details")}><span>♙</span><strong>Student Details</strong><small>Profile and academic details</small></button><button type="button" onClick={() => setActiveView("Semester & Exam Dates")}><span>▦</span><strong>Semester & exams</strong><small>Important academic dates</small></button><button type="button" onClick={() => setActiveView("Subjects & Syllabus")}><span>▤</span><strong>Subjects & syllabus</strong><small>Subjects and unit progress</small></button><button type="button" onClick={() => setActiveView("Free Time & Routine")}><span>◷</span><strong>Free time & routine</strong><small>Set your study availability</small></button><button type="button" onClick={() => {setActiveView("GATE Plan");setShowGateSetup(true);}}><span>♧</span><strong>GATE Plan</strong><small>Independent exam preparation</small></button></div></section>
              </div>
            </> : activeView === "GATE Plan" ? renderGatePlanPage() : activeView === "My Plan" ? <>
              {!planResult && <section className="ss-panel ss-no-plan"><span className="ss-home-eyebrow">MY PLAN</span><h1>Your academic plan hasn't been generated yet</h1><p>Set up your semester details, subjects, deadlines and availability to generate your personalized timetable. Your GATE plan can be created independently.</p><div className="ss-welcome-actions"><button type="button" className="ss-primary" onClick={() => { setStep(0); setApiError(""); setActiveView("Student Details"); }}>Create my academic plan</button></div></section>}
              {planResult && <>
              <section className="ss-plan-heading"><div><h1>My Plan</h1><p>Your semester, month, week and day — all in one plan.</p></div><div className="ss-next-exam"><span>▦</span><div><small>Next Exam</small><strong>{futureEvents.find((event) => event.kind === "exam")?.title || "Exam dates not set"}</strong><p>{futureEvents.find((event) => event.kind === "exam") ? displayDate(futureEvents.find((event) => event.kind === "exam").from) : "Update your semester dates"}</p></div></div></section>
              <div className="ss-plan-tabs">{["Semester View", "Monthly View", "Week View", "Daily View"].map((tab) => <button key={tab} className={planTab === tab ? "selected" : ""} onClick={() => setPlanTab(tab)}>{tab}</button>)}<button type="button" className="ss-replan-button" onClick={replanFromToday} disabled={generating}>{generating ? "Replanning…" : "Replan from today"}</button><button type="button" className="ss-reality-toggle" onClick={() => setShowRealityCheckModal(true)}>Reality Check</button></div>
              {planTab === "Monthly View" ? <div className="ss-plan-grid">
                <section className="ss-panel ss-calendar-panel"><div className="ss-panel-title"><div className="ss-month-nav"><button onClick={previousMonth}>‹</button><h2>{monthLabel}</h2><button onClick={nextMonth}>›</button></div><span className="ss-legend"><i className="study"/>Study <i className="revision"/>Revision <i className="assignment"/>Assignment <i className="gate"/>GATE</span></div><div className="ss-calendar"><div className="ss-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="ss-calendar-days">{calendarDays.map((date) => { const markers = dateEvents(date); const inMonth = date.slice(0, 7) === calendarMonth; return <button key={date} className={`ss-calendar-day ${!inMonth ? "muted" : ""} ${selectedDate === date ? "chosen" : ""} ${holidayRecords.some((holiday) => holiday.date === date) ? "holiday" : ""}`} onClick={() => { setSelectedDate(date); setWeekStart(getWeekStartMonday(date)); if (!inMonth) setCalendarMonth(date.slice(0, 7)); }}><span>{Number(date.slice(-2))}</span><div className="ss-dots">{markers.map((marker, index) => <i key={`${marker}-${index}`} className={marker}/>)}</div>{holidayRecords.some((holiday) => holiday.date === date) && <em>Holiday</em>}</button>; })}</div></div><div className="ss-calendar-legend"><span><i className="study"/>Study Session</span><span><i className="revision"/>Revision</span><span><i className="assignment"/>Assignment</span><span><i className="gate"/>GATE Session</span><span><i className="exam"/>Exam</span><span><i className="holiday-dot"/>Holiday</span></div></section>
                <section className="ss-panel ss-events-panel"><div className="ss-panel-title"><h2>Upcoming Events</h2><button className="ss-link" onClick={() => setActiveView("Semester & Exam Dates")}>View all</button></div>{assignmentEventRows.map(({ assignment, scheduledDates, remainingMinutes }) => { const dueDate = assignment.dueDate || ""; const isOverdue = Boolean(dueDate && dueDate < today); const daysUntilDue = dueDate ? Math.ceil((new Date(`${dueDate}T12:00:00`) - new Date(`${today}T12:00:00`)) / 86400000) : null; return <div className="ss-event-row assignment" key={`assignment-${assignment.id}`}><span className="ss-event-icon">▧</span><div><strong>{assignment.title || "Assignment"}</strong><p>Due: {displayDate(dueDate)}</p><small className="ss-assignment-schedule-date">Scheduled: {scheduledDates.length ? scheduledDates.map(displayDate).join(", ") : "Not scheduled in this timetable"}</small>{remainingMinutes > 0 && <small className="ss-assignment-schedule-date ss-assignment-remaining">Remaining: {(remainingMinutes / 60).toFixed(1)} h still unscheduled</small>}</div><small>{isOverdue ? "Overdue" : daysUntilDue === 0 ? "Today" : daysUntilDue === null ? "No due date" : `${Math.max(0, daysUntilDue)} days`}</small></div>; })}{futureEvents.map((event, index) => <div className={`ss-event-row ${event.kind}`} key={`${event.title}-${event.from}-${index}`}><span className="ss-event-icon">▦</span><div><strong>{event.title}</strong><p>{displayDate(event.from)}{event.from !== event.to ? ` – ${displayDate(event.to)}` : ""}</p></div><small>{event.from === today ? "Today" : `${Math.max(0, Math.ceil((new Date(`${event.from}T12:00:00`) - new Date(`${today}T12:00:00`)) / 86400000))} days`}</small></div>)}{!assignmentEventRows.length && !futureEvents.length && <p className="ss-muted-copy">Add exam dates and assignments to see them here.</p>}<div className="ss-subject-progress"><div className="ss-panel-title"><h2>Subject Progress</h2><button className="ss-link" onClick={() => setActiveView("Subjects & Syllabus")}>View details</button></div>{subjectProgress.slice(0, 4).map((subject, index) => <div className="ss-progress-row" key={subject.name}><span>{subject.name}</span><div><i style={{ width: `${subject.progress}%` }} className={`ss-progress-fill p${index % 4}`}/></div><strong>{subject.progress}%</strong></div>)}</div></section>
                <section className="ss-panel ss-timeline-panel"><h2>Semester Timeline <span>({displayDate(data.semesterStart)} – {displayDate(data.semesterEnd)})</span></h2><div className="ss-timeline-months">{Array.from({ length: 6 }, (_, i) => { const start = new Date(`${(data.semesterStart || today).slice(0, 7)}-01T12:00:00`); start.setMonth(start.getMonth() + i); return <span key={i}>{start.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>; })}</div><div className="ss-timeline-row"><strong>Academic Study</strong><div><i className="academic-bar"/></div></div><div className="ss-timeline-row"><strong>Revision</strong><div><i className="revision-bar"/></div></div><div className="ss-timeline-row"><strong>Exams</strong><div className="ss-timeline-exams">{[["Mid-I", data.mid1From, data.mid1To], ["Mid-II", data.mid2From, data.mid2To], ["End Sem", data.endFrom, data.endTo]].filter((x) => x[1] && x[2]).map(([label, from, to]) => <span key={label}><b>{label}</b><small>{displayDate(from)} – {displayDate(to)}</small></span>)}</div></div><div className="ss-timeline-row"><strong>Holidays</strong><div className="ss-holiday-track">{holidayRecords.map((holiday) => <i key={holiday.date} title={holiday.date}/>)}</div></div><div className="ss-timeline-row"><strong>GATE Preparation</strong><div>{data.studyMode === "academics-gate" ? <i className="gate-bar"/> : <span className="ss-gate-locked">♙ &nbsp; Choose Academics + GATE to add GATE sessions to your plan.</span>}</div></div></section>
              </div> : planTab === "Week View" ? <div className="ss-week-view">
                <section className="ss-panel ss-week-toolbar">
                  <button type="button" className="ss-week-nav" onClick={() => changeWeek(-1)} aria-label="Previous week">‹ Previous week</button>
                  <div><h2>Week view</h2><p>{weekLabel}</p></div>
                  <button type="button" className="ss-week-nav" onClick={() => changeWeek(1)} aria-label="Next week">Next week ›</button>
                </section>
                <div className="ss-week-columns">
                  {selectedWeekDates.map((date) => {
                    const daySessions = selectedWeekSessions.filter((session) => session.date === date);
                    const dateObj = new Date(`${date}T12:00:00Z`);
                    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
                    const dayTotal = daySessions.reduce((sum, session) => sum + Number(session.durationMinutes || 0), 0);
                    return <section className={`ss-panel ss-week-day ${date === selectedDate ? "chosen" : ""}`} key={date}>
                      <button type="button" className="ss-week-day-heading" onClick={() => { setSelectedDate(date); setCalendarMonth(date.slice(0, 7)); setPlanTab("Daily View"); }}>
                        <span>{dayName}</span><strong>{Number(date.slice(-2))}</strong><small>{formatHours(dayTotal)}</small>
                      </button>
                      {daySessions.length ? <div className="ss-week-session-list">{daySessions.map((session, index) => {
                        const previous = daySessions[index - 1];
                        const gap = previous ? minutesBetweenTimes(previous.endTime, session.startTime) : 0;
                        return <React.Fragment key={session.id}>
                          {gap > 0 && <div className="ss-week-break-row">☕ Break · {gap} min</div>}
                          <article className={`ss-week-session ${getSessionColor(session.type)} ${isSessionDone(session) ? "done" : ""}`}>
                            <time>{session.startTime}–{session.endTime}</time>
                            <strong>{session.title}</strong>
                            <span>{session.subjectName || session.type} · {session.durationMinutes} min</span>
                            <button type="button" className={`ss-done-btn ${isSessionDone(session) ? "done" : ""}`} onClick={() => toggleSessionDone(session)}>{isSessionDone(session) ? "✓ Done" : "Mark done"}</button>
                          </article>
                        </React.Fragment>;
                      })}</div> : <p className="ss-muted-copy">No sessions scheduled.</p>}
                    </section>;
                  })}
                </div>
                <section className="ss-panel ss-this-week-panel">
                  <div className="ss-panel-title"><h2>This week</h2><span>{displayDate(currentWeekDates[0])} – {displayDate(currentWeekDates[6])}</span></div>
                  {thisWeekSummary.length ? <div className="ss-this-week-list">{thisWeekSummary.map((row) => <article className="ss-this-week-row" key={row.subjectName}>
                    <div><strong>{row.subjectName}</strong><span>{row.plannedSessions} planned session{row.plannedSessions === 1 ? "" : "s"} · {formatHours(row.plannedMinutes)} planned</span></div>
                    <div className="ss-this-week-done"><strong>{row.doneSessions} done</strong><span>{formatHours(row.doneMinutes)} completed</span></div>
                  </article>)}</div> : <p className="ss-muted-copy">No sessions planned for the current week yet.</p>}
                </section>
              </div> : planTab === "Daily View" ? <div className="ss-daily-only"><label className="ss-date-chooser">Choose day <input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setCalendarMonth(event.target.value.slice(0, 7)); setWeekStart(getWeekStartMonday(event.target.value)); }} /></label><section className="ss-panel ss-day-panel"><div className="ss-day-navigation"><button type="button" className="ss-day-nav-btn" onClick={() => { const date = addDateDays(selectedDate, -1); setSelectedDate(date); setCalendarMonth(date.slice(0, 7)); setWeekStart(getWeekStartMonday(date)); }}>‹ Previous Day</button><h2>Schedule for {selectedLabel}</h2><button type="button" className="ss-day-nav-btn" onClick={() => { const date = addDateDays(selectedDate, 1); setSelectedDate(date); setCalendarMonth(date.slice(0, 7)); setWeekStart(getWeekStartMonday(date)); }}>Next Day ›</button></div>{selectedSessions.length ? selectedSessions.map((session) => <article className={`ss-session-row ${getSessionColor(session.type)}`} key={session.id}><div className="ss-session-time">{session.startTime} – {session.endTime}</div><div className="ss-session-content"><strong>{session.title}</strong><span>{session.type === "revision" ? "Revision" : session.type === "assignment" ? "Assignment" : session.type === "gate" ? "GATE session" : "First-pass study"} · {session.durationMinutes} min</span><p>{session.reason}</p></div><button className={`ss-done-btn ${isSessionDone(session) ? "done" : ""}`} onClick={() => toggleSessionDone(session)}>{isSessionDone(session) ? "✓ Done" : "Mark done"}</button></article>) : <p className="ss-muted-copy">No study sessions scheduled for this date. Use Previous Day or Next Day to explore your plan.</p>}</section></div> : <div className="ss-semester-view"><section className="ss-panel"><h2>Semester Roadmap</h2><p>Follow the monthly milestones derived from your semester dates and planned sessions.</p><div className="ss-roadmap-grid">{Array.from({ length: 6 }, (_, i) => { const start = new Date(`${(data.semesterStart || today).slice(0, 7)}-01T12:00:00`); start.setMonth(start.getMonth() + i); const month = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`; const count = sessions.filter((session) => session.date.startsWith(month)).length; const mins = sessions.filter((session) => session.date.startsWith(month)).reduce((sum, session) => sum + session.durationMinutes, 0); return <article key={month}><small>{start.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</small><strong>{count} sessions</strong><span>{formatHours(mins)} planned</span></article>; })}</div><div className="ss-timeline-list">{events.sort((a,b)=>a.from.localeCompare(b.from)).map((event, index) => <div key={`${event.title}-${event.from}-${index}`}><span className={`ss-event-dot ${event.kind}`}/><strong>{event.title}</strong><span>{displayDate(event.from)}{event.from !== event.to ? ` – ${displayDate(event.to)}` : ""}</span></div>)}</div></section></div>}
              {planTab === "Monthly View" && <section className="ss-lower-grid"><div className="ss-panel ss-day-panel"><h2>Schedule for {selectedLabel} <span className="ss-feasible">● Plan {planResult.canUseAsFinalPlan ? "feasible" : "needs attention"}</span></h2>{selectedSessions.length ? selectedSessions.map((session) => <article className={`ss-session-row ${getSessionColor(session.type)}`} key={session.id}><div className="ss-session-time">{session.startTime} – {session.endTime}</div><div className="ss-session-content"><strong>{session.title}</strong><span>{session.type === "revision" ? "Revision" : session.type === "assignment" ? "Assignment" : session.type === "gate" ? "GATE session" : "First-pass study"} · {session.durationMinutes} min</span><p>{session.reason}</p></div><button className={`ss-done-btn ${isSessionDone(session) ? "done" : ""}`} onClick={() => toggleSessionDone(session)}>{isSessionDone(session) ? "✓ Done" : "Mark done"}</button></article>) : <p className="ss-muted-copy">No sessions scheduled for this date. Choose a date with colored dots in the calendar.</p>}</div></section>}
              <div className="ss-start-mode-note">Plan starts {((planResult?.planning?.mode || planStartMode) === "today") ? `from today (${displayDate(planResult?.planning?.startDate || today)})` : `from semester start (${displayDate(planResult?.planning?.startDate || data.semesterStart)})`}. <button onClick={() => setActiveView("Settings")}>Change</button></div>
              </>}
            </> : activeView === "Review" ? <section className="ss-panel ss-review-page"><div className="ss-review-page-heading"><div><h1>Review & warnings</h1><p>Check the values used to generate this plan and review its warnings.</p></div><button className="outline-btn" onClick={() => setActiveView("My Plan")}>Back to My Plan</button></div>{renderReview()}<div className="ss-review-generate-actions"><button type="button" className="ss-primary" onClick={() => generatePlan()} disabled={generating}>{generating ? "Generating timetable…" : planResult ? "Regenerate timetable" : "Generate timetable"}</button></div></section> : activeView === "Settings" ? <section className="ss-panel ss-settings-panel"><h1>Settings</h1><p>Choose where your timetable begins. This affects the next plan generation.</p><div className="ss-start-options"><button className={planStartMode === "today" ? "selected" : ""} onClick={() => choosePlanStartMode("today")}><strong>From present date</strong><span>Schedule from today forward. Past dates are not scheduled.</span></button><button className={planStartMode === "semester" ? "selected" : ""} onClick={() => choosePlanStartMode("semester")}><strong>From semester starting date</strong><span>Build the plan from {displayDate(data.semesterStart)} and include the semester timeline.</span></button></div><button className="ss-primary" onClick={() => { setGenerated(false); setActiveView("Review"); }}>Review and regenerate timetable</button></section> : editorIndex !== undefined ? <section className="ss-editor-panel"><div className="ss-plan-heading"><div><h1>{activeView}</h1><p>Update details and regenerate your timetable when ready.</p></div></div><div className="form-card ss-editor-card">{content[editorIndex]()}<div className="form-actions"><button className="outline-btn" onClick={() => { if (editorIndex > 0) { const previousViews = ["Student Details", "Semester & Exam Dates", "Subjects & Syllabus", "Assignments", "Free Time & Routine"]; setStep(editorIndex - 1); setActiveView(previousViews[editorIndex - 1]); } else setActiveView("My Plan"); }}>Back</button><button className="primary-btn" onClick={() => { setGenerated(false); setShowSetupWizard(false); if (editorIndex < 4) { const nextViews = ["Student Details", "Semester & Exam Dates", "Subjects & Syllabus", "Assignments", "Free Time & Routine"]; setStep(editorIndex + 1); setActiveView(nextViews[editorIndex + 1]); } else { setActiveView("My Plan"); generatePlan(); } window.scrollTo({ top: 0, behavior: "smooth" }); }}>{editorIndex < 4 ? (editorIndex === 0 ? "Save and go to semester dates" : editorIndex === 1 ? "Save and go to subjects" : editorIndex === 2 ? "Save and go to assignments" : "Save and go to free time") : (generating ? "Generating timetable…" : "Save and generate timetable")}</button></div></div></section> : <section className="ss-panel"><h1>{activeView}</h1><p>Update the timetable settings and regenerate the plan.</p><button className="ss-primary" onClick={() => setActiveView("Settings")}>Open plan settings</button></section>}
          </div>
        </main>
        {showRealityCheckModal && <div className="ss-modal-backdrop" role="presentation" onClick={() => setShowRealityCheckModal(false)}>
          <section className="ss-reality-modal" role="dialog" aria-modal="true" aria-labelledby="ss-reality-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="ss-reality-modal-header"><div><h2 id="ss-reality-modal-title">Reality Check</h2><p>Hours needed before each deadline compared with hours you have</p></div><button type="button" className="ss-modal-close-icon" onClick={() => setShowRealityCheckModal(false)} aria-label="Close">×</button></div>
            <div className="ss-reality-modal-table-wrap"><table className="ss-reality-modal-table"><thead><tr><th>Deadline</th><th>Required</th><th>Available</th><th>Shortage</th><th>Status</th></tr></thead><tbody>{realityItems.length ? realityItems.map((item) => <tr key={item.deadline}><td>{displayDate(item.deadline)}</td><td>{Number(item.requiredHours || 0).toFixed(1)} h</td><td>{Number(item.availableHours || 0).toFixed(1)} h</td><td>{Number(item.shortageHours || 0).toFixed(1)} h</td><td><span className={`ss-status-pill ${item.feasible && Number(item.shortageHours || 0) === 0 ? "good" : "bad"}`}>{item.feasible && Number(item.shortageHours || 0) === 0 ? "On track" : "Needs attention"}</span></td></tr>) : <tr><td colSpan="5">No deadline checkpoints were returned.</td></tr>}</tbody></table></div>
            {orderedWarnings.length ? <section className="ss-warning-list"><h3>Warnings</h3>{orderedWarnings.map((item, index) => <div className={`ss-warning-item ${item.severity}`} key={`${item.severity}-${index}`}><strong>{item.severity === "blocking" ? "Needs attention" : "Information"}</strong><p>{item.message}</p></div>)}</section> : <div className="ss-modal-success">✓ Your available time is enough to complete the planned work.</div>}
            <div className="ss-reality-modal-footer"><button type="button" className="outline-btn" onClick={() => setShowRealityCheckModal(false)}>Close</button></div>
          </section>
        </div>}
      </div>
    );
  }

  return renderAppShell();
}

createRoot(document.getElementById("root")).render(<App />);
