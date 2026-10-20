export async function verifyTransaction(digest, apiKey, fetcher = fetch) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(digest)) throw new Error("Invalid Sui transaction digest");
  if (!apiKey) throw new Error("TATUM_API_KEY is required; verification was not performed");
  const response = await fetcher("https://sui-mainnet.gateway.tatum.io", {
    method: "POST", headers: {"content-type": "application/json", "x-api-key": apiKey},
    body: JSON.stringify({jsonrpc: "2.0", id: 1, method: "sui_getTransactionBlock", params: [digest, {showEffects: true}]}),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Tatum read failed (${response.status})`);
  const body = await response.json();
  if (body.error) throw new Error("Tatum returned an RPC error; transaction remains unverified");
  const result = body.result;
  const status = result?.effects?.status?.status;
  if (result?.digest !== digest || !["success", "failure"].includes(status)) {
    throw new Error("Incomplete or mismatched chain evidence");
  }
  return {status, digest, checkpoint: result.checkpoint ?? null, source: "Tatum Sui Mainnet RPC", checkedAt: new Date().toISOString()};
}

// Stable SDK 0.1.8 lacks the listMemories method shown in newer web docs.
// Reconcile against the writer's portable receipt manifest instead. This proves
// completeness for that manifest, not for unknown writes from another writer.
export async function readCompleteLedger(client, namespace, expectedBlobs) {
  if (!Array.isArray(expectedBlobs) || !expectedBlobs.length ||
      expectedBlobs.some(blob => typeof blob !== "string" || !blob)) {
    throw new Error("A nonempty completed-write receipt manifest is required");
  }
  const expected = new Set(expectedBlobs);
  if (expected.size !== expectedBlobs.length || expected.size > 50) throw new Error("Invalid or oversized receipt manifest");
  const recall = await client.recall({query: "RecallDesk reviewed support lesson correction revision revoke", namespace, limit: 100});
  const content = new Map(recall.results.map(row => [row.blob_id, row.text]));
  const events = [];
  for (const blob of expected) {
    if (!content.has(blob)) throw new Error("Recall omitted a ledger blob; refusing an incomplete memory state");
    events.push(JSON.parse(content.get(blob)));
  }
  if ([...content.keys()].some(blob => !expected.has(blob))) throw new Error("Ledger changed during read; retry with a consistent snapshot");
  return {events, blobs: [...expected]};
}
