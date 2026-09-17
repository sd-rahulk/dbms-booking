import { strict as assert } from "node:assert";
import { calculateFare } from "../lib/fare";
import { canTransition } from "../lib/state-machine";

assert.equal(calculateFare(65, 15, 11.4).toString(), "236");
assert.equal(canTransition("REQUESTED", "ASSIGNED"), true);
assert.equal(canTransition("COMPLETED", "IN_PROGRESS"), false);
assert.equal(canTransition("ASSIGNED", "COMPLETED"), false);
console.log("AERIDE domain checks passed");
