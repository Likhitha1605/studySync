
import { generateStudentPlan } from "./engine/generateStudentPlan.js";
import { sampleStudent } from "./data/sampleStudent.js";

const result = generateStudentPlan(
  sampleStudent,
  "2026-10-21",
  "2026-11-21"
);

console.log("Status:", result.status);
console.log("Can use as final plan:", result.canUseAsFinalPlan);
console.log("Scheduled sessions:", result.plan.summary.totalSessions);
console.log("Unscheduled tasks:", result.plan.summary.unscheduledTasks);

console.log("\nReality Check:");
console.table(result.realityCheck);

if (result.status !== "needs-adjustment") {
  throw new Error("Expected overloaded sample data to require adjustment.");
}

if (result.canUseAsFinalPlan !== false) {
  throw new Error("An overloaded plan must not be marked as final.");
}

console.log("\n✅ Plan-generation integration test passed!");
