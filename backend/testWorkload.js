
import { analyzeWorkload } from "./engine/analyzeWorkload.js";
import { sampleStudent } from "./data/sampleStudent.js";

const report = analyzeWorkload(
  sampleStudent,
  "2026-10-21",
  "2026-11-21"
);

console.table(report);

if (report.length === 0) {
  throw new Error("Test failed: no deadline analysis was produced.");
}

if (!report.some((item) => item.shortageHours > 0)) {
  throw new Error(
    "Expected the overloaded sample data to trigger Reality Check."
  );
}

console.log("\n✅ StudySync Reality Check test passed!");
