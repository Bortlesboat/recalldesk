import { decide, replay } from "../dist/core.js";
import { readCompleteLedger, verifyTransaction } from "./integrations.mjs";

export function completedBlobs(receipt, accountId, namespace) {
  if (receipt?.network !== "mainnet" || receipt.accountId !== accountId ||
      receipt.namespace !== namespace) throw new Error("Mainnet receipt scope mismatch");
  const records = Object.values(receipt.records ?? {});
  if (!records.length || records.some(record =>
    record?.state !== "done" || typeof record.blob_id !== "string" || !record.blob_id)) {
    throw new Error("Receipt manifest contains missing or unfinished writes");
  }
  const blobs = records.map(record => record.blob_id);
  if (new Set(blobs).size !== blobs.length || blobs.length > 50) {
    throw new Error("Invalid receipt manifest size or duplicate blob");
  }
  return blobs;
}

export async function triageWithServices({
  client, accountId, namespace, receipt, ticket, digest, apiKey, fetcher = fetch,
}) {
  const expected = completedBlobs(receipt, accountId, namespace);
  // No local fixture can substitute for a missing provider result.
  const chain = await verifyTransaction(digest, apiKey, fetcher);
  const ledger = await readCompleteLedger(client, namespace, expected);
  replay(ledger.events);
  const decision = decide(ticket, ledger.events, chain);
  return {
    schema: "recalldesk-live-triage/1",
    checkedAt: new Date().toISOString(),
    ticket: {id: ticket.id, text: ticket.text, version: ticket.version},
    chain,
    memory: {
      provider: "Walrus Memory", network: "mainnet",
      completedRecords: ledger.blobs.length,
      matched: decision.matched.map(id => {
        const index = ledger.events.findIndex(event => event.id === id);
        return {id, blobId: ledger.blobs[index]};
      }),
    },
    beforeMemory: decide(ticket, [], chain),
    decision,
  };
}
