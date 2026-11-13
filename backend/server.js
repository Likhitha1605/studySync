
import express from "express";
import cors from "cors";
import { generateStudentPlan } from "./engine/generateStudentPlan.js";
import { generatePlanForMode } from "./engine/generatePlanForMode.js";
import { validateInput } from "./engine/validateInput.js";
import { GATE_DEFAULTS } from "./engine/buildGatePlan.js";
import { createStandaloneGatePlan } from "./gatePlanService.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "StudySync backend is running",
  });
});

// GATE-only planner endpoint. It deliberately does not require academic
// semester dates, holidays, college hours or daily free-time inputs.
app.post("/api/gate-plan", (req, res) => {
  try {
    const result = createStandaloneGatePlan(req.body || {});
    return res.status(result.ok ? 200 : 400).json(result);
  } catch (error) {
    console.error("StudySync GATE plan-generation error:", error);
    return res.status(500).json({
      ok: false,
      error: "Could not generate the GATE plan.",
    });
  }
});

app.post("/api/generate-plan", (req, res) => {
  try {
    const {
      input,
      startDate,
      endDate,
      completedSessions = [],
      gate,
      mode = "today",
      today,
      now,
    } = req.body;

    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return res.status(400).json({
        error: "A valid student input object is required.",
      });
    }

    if (
      !Array.isArray(input.subjects) ||
      !Array.isArray(input.dailyStudyHours)
    ) {
      return res.status(400).json({
        error: "Student input must include subjects and dailyStudyHours arrays.",
      });
    }

    const isValidDate = (value) =>
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
      new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({
        error: "Start and end dates must use YYYY-MM-DD format.",
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        error: "Start date must not be after end date.",
      });
    }

    const requestedGateMinutes = gate?.minutesPerDay ?? gate?.settings?.gateMinutesPerDay;
    const suppliedGateMinutes = Number(requestedGateMinutes);
    const existingGateHours = Number(input.settings?.gateHoursPerDay);
    const gateMinutesForValidation = Number.isFinite(suppliedGateMinutes)
      ? Math.max(0, suppliedGateMinutes)
      : Number.isFinite(existingGateHours) && existingGateHours > 0
        ? existingGateHours * 60
        : GATE_DEFAULTS.gateMinutesPerDay;
    const validationInput = gate?.enabled
      ? {
          ...input,
          settings: {
            ...(input.settings || {}),
            studyMode: "academics-gate",
            gateHoursPerDay: gateMinutesForValidation / 60,
          },
        }
      : input;
    const validation = validateInput(validationInput, startDate, endDate);
    if (!validation.ok) {
      return res.status(400).json({
        error: "Student input failed validation.",
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

const candidateEndDates = [
  endDate,
  input.student?.semesterEnd,
  ...(input.exams || []).map((exam) => exam.endDate),
  ...(input.assignments || []).map((assignment) => assignment.dueDate),
  ...(input.subjects || []).map((subject) => subject.endExamDate),
].filter(
  (date) =>
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T12:00:00Z`))
);

const planningEndDate = candidateEndDates.reduce(
  (latest, date) => (date > latest ? date : latest),
  endDate
);

// Completed entries are session snapshots. Aggregate minutes by the exact
// taskId emitted by buildStudyPlan (including split unit IDs and -revision IDs).
// Ignore duplicate snapshots so retries cannot subtract the same work twice.
const completedMinutesByTaskId = {};
const seenCompletedSessions = new Set();
for (const completed of Array.isArray(completedSessions) ? completedSessions : []) {
  const taskId = String(completed?.taskId || "");
  const minutes = Number(completed?.durationMinutes || 0);
  const key = String(
    completed?.sessionKey ||
      [taskId, completed?.date, completed?.startTime, minutes].join("|")
  );
  if (!taskId || !Number.isFinite(minutes) || minutes <= 0 || seenCompletedSessions.has(key)) {
    continue;
  }
  seenCompletedSessions.add(key);
  completedMinutesByTaskId[taskId] = (completedMinutesByTaskId[taskId] || 0) + minutes;
}

const planningInput = { ...input, completedMinutesByTaskId };
const result = gate?.enabled
  ? generatePlanForMode(planningInput, {
      mode,
      today,
      now,
      gate,
      startDate,
      endDate: planningEndDate,
      completedMinutesByTaskId,
    })
  : generateStudentPlan(planningInput, startDate, planningEndDate, {
      completedMinutesByTaskId,
    });

    return res.json(result);
  } catch (error) {
    console.error("StudySync plan-generation error:", error);

    return res.status(500).json({
      error: "Could not generate the study plan.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`StudySync backend running at http://localhost:${PORT}`);
});
