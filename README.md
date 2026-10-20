# RecallDesk

Support triage that remembers reviewed corrections across sessions, explains each
recommendation, and refuses to silently reuse revoked or incomplete memory.

**Status:** working browser-local demo and tested integration adapters. Walrus
Mainnet writes and live Tatum reads are not yet verified. This is not a completed
Total Recall submission.

## Run

Node 22+:

```powershell
npm ci --ignore-scripts
npm test
npm run evaluate
python -m http.server 5189 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:5189`. Select a synthetic ticket, run triage, save a reviewed
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
ignored `private/live-demo.json`. This is a CLI integration; the hosted browser
sample continues to identify itself as browser-local until connected separately.

## What the tests cover

Cross-session replay, correction ordering, revocation, version boundaries,
conflicting rules, untrusted memory shapes, complete recall against receipts,
and Tatum error/mismatched-digest handling.

## Submission work remaining

- Verify real account access, 12 Mainnet writes and a real Tatum transaction read.
- Connect the hosted demo to the authenticated integrations or clearly demonstrate
  the integrated CLI alongside it.
- Obtain independent reviewer cases before making any accuracy/generalization claim.
- Publish the repo and an honest blog with actual integration receipts.
- Record a 2–3 minute demo, complete the required entry fields and submit once.
- Deadline: November 10, 2026, 17:00 UTC.

## Sources

- [Total Recall](https://tatum.io/hackathon/total-recall)
- [Walrus SDK](https://docs.wal.app/walrus-memory/sdk/api-reference)
- [Tatum Sui gateway](https://tatum.io/chain/sui)

## License

MIT. Synthetic examples contain no customer information.
