import assert from "node:assert/strict";
import { buildWorkItems } from "./engine/buildWorkItems.js";

const input = { settings: {}, subjects: [{ id: "os", name: "Operating Systems", difficulty: 2 }], assignments: [{ id: "a1", title: "OS internal", subject: "Operating Systems", dueDate: "2026-10-27", hours: 2, addedDate: "2026-10-19" }] };
for (const startDate of ["2026-06-29", "2026-10-19"]) {
  const item = buildWorkItems(input, startDate, "2026-11-21")[0];
  assert.equal(item.eligibleFrom, "2026-10-19");
  assert.equal(item.scheduleByDate, "2026-10-25");
}
const lateAdded = buildWorkItems({ ...input, assignments: [{ ...input.assignments[0], addedDate: "2026-10-26" }] }, "2026-06-29", "2026-11-21")[0];
assert.equal(lateAdded.eligibleFrom, "2026-10-26");
assert.equal(lateAdded.scheduleByDate, "2026-10-26");
console.log("Adaptive assignment window tests passed.");
