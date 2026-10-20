import { MemWal } from "@mysten-incubation/memwal";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { reviewed, tickets } from "../demo/fixtures.js";
import { decide, replay, revoke } from "../demo/core.js";
import { readCompleteLedger } from "../lib/integrations.mjs";

const {MEMWAL_KEY: key, MEMWAL_ACCOUNT_ID: accountId, MEMWAL_NAMESPACE: namespace} = process.env;
if (!key || !accountId || !namespace) throw new Error("Set the three MEMWAL variables in your ignored .env file");
const client = MemWal.create({key, accountId, namespace, serverUrl: "https://relayer.memory.walrus.xyz"});
const command = process.argv[2] ?? "read";
if (!["read", "publish-fixture", "revoke"].includes(command)) throw new Error("Use read, publish-fixture or revoke <rule-id>");
await mkdir("private", {recursive: true});
const receiptPath = "private/memory-receipts.json";
async function save(receipt) {
  await writeFile(receiptPath + ".tmp", JSON.stringify(receipt, null, 2));
  await rename(receiptPath + ".tmp", receiptPath);
}

if (command !== "read") {
  if (process.env.CONFIRM_SYNTHETIC_MAINNET_WRITES !== "yes") {
    throw new Error("This writes synthetic records to Walrus Mainnet. Set CONFIRM_SYNTHETIC_MAINNET_WRITES=yes only after account setup and cost confirmation.");
  }
  let receipt;
  try { receipt = JSON.parse(await readFile(receiptPath, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  receipt ??= {accountId, namespace, network: "mainnet", records: {}};
  if (receipt.accountId !== accountId || receipt.namespace !== namespace) throw new Error("Receipt belongs to another account or namespace");
  let writes = reviewed;
  if (command === "revoke") {
    const ruleId = process.argv[3];
    // A pending revocation resumes its recorded job. Never submit it twice.
    const pending = Object.entries(receipt.records).find(([,record]) => record.intent?.type === "revoke" && record.intent.ruleId === ruleId && record.state !== "done");
    if (pending) writes = [pending[1].intent];
    else {
      if (Object.values(receipt.records).some(record => record.state !== "done")) throw new Error("Finish existing writes before revoking");
      const ledger = await readCompleteLedger(client, namespace, Object.values(receipt.records).map(record => record.blob_id));
      if (!replay(ledger.events).some(rule => rule.ruleId === ruleId)) throw new Error("Rule is unknown or already revoked");
      writes = [revoke(ruleId, ledger.events)];
    }
  }
  for (const event of writes) {
    let record = receipt.records[event.id];
    if (record?.blob_id) continue;
    if (record?.state === "submission-unknown") throw new Error(`Uncertain prior write ${event.id}; reconcile before retrying`);
    if (!record) {
      receipt.records[event.id] = {state: "submission-unknown", intent: event};
      await save(receipt);
      const accepted = await client.remember(JSON.stringify(event));
      record = receipt.records[event.id] = {state: "accepted", job_id: accepted.job_id, intent: event};
      await save(receipt);
    }
    const completed = await client.waitForRememberJob(record.job_id);
    receipt.records[event.id] = {state: "done", job_id: completed.job_id, blob_id: completed.blob_id};
    await save(receipt);
    console.log(`Stored ${event.id}`);
  }
}
const saved = JSON.parse(await readFile(receiptPath, "utf8"));
if (saved.accountId !== accountId || saved.namespace !== namespace) throw new Error("Receipt scope mismatch");
if (Object.values(saved.records).some(record => record.state !== "done" || !record.blob_id)) {
  throw new Error("Unfinished write in receipt manifest");
}
const ledger = await readCompleteLedger(client, namespace, Object.values(saved.records).map(record => record.blob_id));
replay(ledger.events);
const output = {
  network: "mainnet", namespace, checkedAt: new Date().toISOString(),
  events: ledger.events, blobs: ledger.blobs,
  decisions: tickets.map(ticket => ({ticket: ticket.id, ...decide(ticket, ledger.events, ticket.chain)})),
  chainEvidence: "Ticket chain facts remain synthetic; use verify-transaction for a real digest.",
};
await writeFile("private/recalled-ledger.json", JSON.stringify(output, null, 2));
console.log(JSON.stringify({memories: ledger.blobs.length, decisions: output.decisions, receipt: "private/recalled-ledger.json"}, null, 2));
