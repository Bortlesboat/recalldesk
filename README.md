# RecallDesk

Support triage that remembers reviewed corrections across sessions, explains each
recommendation, and refuses to silently reuse revoked or incomplete memory.

**Status:** 13 Walrus Mainnet records written and recovered in a fresh process,
including a revocation; real Tatum Sui Mainnet transaction read verified October
20, 2026. The hosted server provides a fixed read-only evidence endpoint. This is
the submitted Total Recall entry, received by the official form on October 20,
2026. Judging and any prize remain unconfirmed.

## Run

Node 22.13+:

```powershell
npm ci --ignore-scripts
npm test
npm run evaluate
npm run prepare:demo
npm run dev
```

Open the printed local URL. Select a synthetic ticket, run triage, save a reviewed
correction, and start a new session. Try revoking a rule and rerunning the same ticket.
Export/import carries a browser session to another browser.

The demo uses a deterministic, explainable rule agent; it does not call an LLM.
The six browser tickets are illustrative fixtures. `npm run evaluate` compares
nine constructed memory-lifecycle cases with a fixed knowledge base, deliberately
stale retrieval, and an equivalently updated knowledge base. It reports wrong
routes and abstentions separately. Complete replay ties the updated knowledge
base; no advantage over a correctly maintained database is claimed. These cases
were authored with the implementation and are not an independent held-out test.

## Integration path

1. Create a dedicated Walrus Memory account and delegate for synthetic demo data.
   Namespace is a logical grouping, not an authorization boundary. Use the official
   [dashboard](https://memory.walrus.xyz/dashboard) and confirm service terms/costs.
2. Create a free Tatum account and obtain a Mainnet API key.
3. Copy `.env.example` to ignored `.env` and fill the values locally. Never put keys
   into the frontend, a public repository, screenshots or a ticket.
4. After confirming the intended Mainnet write, run:

```powershell
$env:CONFIRM_SYNTHETIC_MAINNET_WRITES = "yes"
npm run memory -- publish-fixture
```

The command writes 12 synthetic reviewed memories, waits for storage completion,
saves each accepted job/finished blob receipt immediately, recalls all expected
blobs and reruns the triage decisions from the returned content. An uncertain
write stops resubmission. Preserve `private/memory-receipts.json`.

For a new CLI session, use the same private receipt manifest and `npm run memory -- read`.
`npm run memory -- revoke auth` appends a revocation when the same explicit write
confirmation is set. Pending jobs resume; uncertain submissions stop for reconciliation.
Stable MemWal 0.1.8 does not expose the `listMemories` method documented by newer
web docs. This implementation therefore proves completeness only against the
writer's receipt manifest. Another writer's unknown events are not guaranteed to
be detected. The ledger is intentionally bounded to 50 records; this is a
single-writer demo, not a production concurrent memory system.

For a real, public Sui digest:

```powershell
npm run verify-transaction -- <PUBLIC_SUI_TRANSACTION_DIGEST>
```

This performs a read through Tatum's Sui Mainnet gateway and checks the returned
digest and effects. No wallet signing, transfers or retry transaction is performed.
Transaction success alone does not prove the intended recipient, asset or amount:
the corrected lesson requires human review. Chain-specific lessons also require
the ticket's exact digest. The deterministic matcher sends negated symptoms to
review rather than trying to interpret them; this can over-abstain on real text.

Run both integrations together after at least 10 writes have completed:

```powershell
npm run demo -- <PUBLIC_SUI_TRANSACTION_DIGEST>
```

This command reads the transaction through Tatum, recalls every expected Walrus
record and routes a synthetic balance complaint using those actual returned
values. It ignores the browser fixture's chain status. A failed transaction
cannot activate a success-only lesson; failed RPC or incomplete recall produces
no decision. The before/after result and matched blob receipts are saved in
ignored `private/live-demo.json`. The browser's separate **Check live evidence**
button calls `/api/evidence`: a fixed read-only check with credentials held only
in server secrets. It accepts no account, query or write request from visitors.
Successful evidence may be reused for 60 seconds, labeled with its check time.
Failures return an unavailable result, never a fixture. Configure the regular env
keys plus `MEMWAL_RECEIPT_JSON` and `DEMO_DIGEST` on the server.

Tatum's JSON-RPC endpoint was verified live for this demo. Tatum has announced
JSON-RPC deprecation; a production successor should use its gRPC endpoint. This
prototype does not claim long-term support for the legacy transport.

## What the tests cover

Cross-session replay, correction ordering, revocation, version boundaries,
conflicting rules, untrusted memory shapes, complete recall against receipts,
and Tatum error/mismatched-digest handling.

## Evidence and submission

- Hosted evidence verified October 20: 13 completed Mainnet records, a fresh Tatum
  transaction read, and the stored auth-r3 revocation routing the API case to review.
- [Demo](https://recall-desk.bortles.chatgpt.site/demo/) and
  [build notes](https://recall-desk.bortles.chatgpt.site/demo/blog.html).
- Obtain independent reviewer cases before making any accuracy/generalization claim.
- [2:50 video, English captions and transcript](https://github.com/Bortlesboat/recalldesk/releases/tag/total-recall-demo-v1).
- Submitted October 20, 2026; the official form confirmed receipt. Judging is pending.
- Deadline: November 10, 2026, 17:00 UTC.

## Sources

- [Total Recall](https://tatum.io/hackathon/total-recall)
- [Walrus SDK](https://docs.wal.app/walrus-memory/sdk/api-reference)
- [Tatum Sui gateway](https://tatum.io/chain/sui)

## License

MIT. Synthetic examples contain no customer information.
