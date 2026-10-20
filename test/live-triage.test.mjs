import test from "node:test";
import assert from "node:assert/strict";
import { completedBlobs, triageWithServices } from "../lib/live-triage.mjs";
import { reviewed, tickets } from "../demo/fixtures.js";

const receipt = {
  network: "mainnet", accountId: "test-account", namespace: "test-namespace",
  records: Object.fromEntries(reviewed.map((event, i) => [
    event.id, {state: "done", blob_id: `fixture-blob-${i}`},
  ])),
};
const client = {recall: async () => ({
  results: reviewed.map((event, i) => ({blob_id: `fixture-blob-${i}`, text: JSON.stringify(event)})),
})};
const digest = "1".repeat(44);
const fixtureRpc = status => async () => ({
  ok: true, json: async () => ({result: {digest, effects: {status: {status}}}}),
});
const args = {
  client, receipt, accountId: receipt.accountId, namespace: receipt.namespace,
  ticket: tickets[0], digest, apiKey: "test-only-key",
};

test("combined triage uses recovered memory and the provider's effects", async () => {
  const result = await triageWithServices({...args, fetcher: fixtureRpc("success")});
  assert.equal(result.beforeMemory.route, "Human review");
  assert.equal(result.decision.route, "Human review");
  assert.match(result.decision.reason, /do not infer a wallet display fault/);
  assert.equal(result.memory.completedRecords, 12);
  assert.deepEqual(result.memory.matched, [{id: "index-delay-r2", blobId: "fixture-blob-6"}]);
  assert.equal(result.chain.digest, digest);
});

test("synthetic success cannot override a provider failure", async () => {
  assert.equal(args.ticket.chain.status, "success");
  const result = await triageWithServices({...args, fetcher: fixtureRpc("failure")});
  assert.equal(result.chain.status, "failure");
  assert.equal(result.decision.route, "Human review");
});

test("unverified transaction and incomplete remote memory produce no decision", async () => {
  await assert.rejects(triageWithServices({...args, fetcher: async () => ({ok: false, status: 503})}), /failed/);
  await assert.rejects(triageWithServices({
    ...args, fetcher: fixtureRpc("success"), client: {recall: async () => ({results: []})},
  }), /omitted/);
});

test("receipt validation rejects foreign scope, pending writes and repeated blobs", () => {
  assert.throws(() => completedBlobs({...receipt, network: "testnet"}, args.accountId, args.namespace), /scope/);
  assert.throws(() => completedBlobs(receipt, "another-account", args.namespace), /scope/);
  assert.throws(() => completedBlobs({...receipt, records: {one: {state: "accepted"}}}, args.accountId, args.namespace), /unfinished/);
  assert.throws(() => completedBlobs({...receipt, records: {
    one: {state: "done", blob_id: "same"}, two: {state: "done", blob_id: "same"},
  }}, args.accountId, args.namespace), /duplicate/);
});
