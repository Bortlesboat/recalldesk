import { MemWal } from "@mysten-incubation/memwal";
import { readFile, writeFile } from "node:fs/promises";
import { tickets } from "../demo/fixtures.js";
import { completedBlobs, triageWithServices } from "../lib/live-triage.mjs";

const {
  MEMWAL_KEY: key, MEMWAL_ACCOUNT_ID: accountId,
  MEMWAL_NAMESPACE: namespace, TATUM_API_KEY: apiKey,
} = process.env;
if (!key || !accountId || !namespace || !apiKey) {
  throw new Error("Set MEMWAL_KEY, MEMWAL_ACCOUNT_ID, MEMWAL_NAMESPACE and TATUM_API_KEY in ignored .env");
}
const digest = process.argv[2];
if (!digest) throw new Error("Usage: npm run demo -- <PUBLIC_SUI_TRANSACTION_DIGEST>");
const receipt = JSON.parse(await readFile("private/memory-receipts.json", "utf8"));
if (completedBlobs(receipt, accountId, namespace).length < 10) {
  throw new Error("The contest demo requires at least 10 completed Mainnet memories");
}
const client = MemWal.create({key, accountId, namespace, serverUrl: "https://relayer.memory.walrus.xyz"});
const result = await triageWithServices({
  client, accountId, namespace, receipt, digest, apiKey,
  ticket: {...tickets[0], digest},
});
const output = {
  ...result,
  caseType: "Synthetic support ticket paired with a real public transaction read",
  limitations: [
    "A transaction status does not prove the intended asset or recipient.",
    "Completeness is relative to this single writer's receipt manifest.",
    "The browser sample remains separate from this live CLI execution.",
  ],
};
await writeFile("private/live-demo.json", JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
