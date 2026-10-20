import test from "node:test";
import assert from "node:assert/strict";
import {decide} from "../dist/core.js";
import {reviewed, tickets} from "../dist/fixtures.js";
import {evaluate} from "../dist/evaluation.js";
test("negation and unrelated transaction effects cannot activate a lesson", () => {
  assert.equal(decide({...tickets[1], text: "The transaction has not failed"}, reviewed, tickets[1].chain).route, "Human review");
  assert.equal(decide({...tickets[1], digest: "3".repeat(44)}, reviewed, tickets[1].chain).route, "Human review");
  assert.equal(decide({...tickets[1], digest: undefined}, reviewed, tickets[1].chain).route, "Human review");
});
test("all temporal contracts match an equivalently updated knowledge base", () => {
  const {results} = evaluate();
  assert.deepEqual(results.receiptCompleteReplay.rows, results.currentKnowledgeBase.rows);
  assert.equal(results.receiptCompleteReplay.wrongRoutes, 0);
  assert.equal(results.receiptCompleteReplay.unnecessaryAbstentions, 0);
  assert.ok(results.receiptCompleteReplay.abstentions < results.receiptCompleteReplay.total);
  assert.ok(results.fixedKnowledgeBase.wrongRoutes > 0);
  assert.ok(results.staleRetrieval.wrongRoutes > 0);
});
