import {MemWal} from "@mysten-incubation/memwal";
import {triageWithServices} from "./live-triage.mjs";
import {tickets} from "../demo/fixtures.js";
import {decide} from "../demo/core.js";
import {readCompleteLedger} from "./integrations.mjs";

// Public demo has no write path and accepts no user-selected account or query.
// Cache only successful evidence for 60 seconds, coalescing simultaneous reads.
let cached, pending;
export async function liveEvidence(config) {
  if(cached && Date.now()-cached.at<60_000) return {...cached.value,cache:"within-60-seconds"};
  if(pending) return pending;
  pending=(async()=>{
    if(!config.MEMWAL_KEY || !config.MEMWAL_ACCOUNT_ID || !config.TATUM_API_KEY ||
      !config.MEMWAL_RECEIPT_JSON || !config.DEMO_DIGEST) throw new Error("Demo credentials incomplete");
    const receipt=JSON.parse(config.MEMWAL_RECEIPT_JSON);
    const client=MemWal.create({key:config.MEMWAL_KEY,accountId:config.MEMWAL_ACCOUNT_ID,
      namespace:config.MEMWAL_NAMESPACE,serverUrl:"https://relayer.memory.walrus.xyz"});
    const result=await triageWithServices({client,receipt,accountId:config.MEMWAL_ACCOUNT_ID,
      namespace:config.MEMWAL_NAMESPACE,digest:config.DEMO_DIGEST,apiKey:config.TATUM_API_KEY,
      ticket:{...tickets[0],digest:config.DEMO_DIGEST}});
    // The same complete ledger checks a real Mainnet revocation in a fresh read.
    const ledger=await readCompleteLedger(client,config.MEMWAL_NAMESPACE,Object.values(receipt.records).map(r=>r.blob_id));
    const revoked=ledger.events.find(e=>e.type==="revoke" && e.ruleId==="auth");
    const value={...result,caseType:"Synthetic complaint; live public transaction and Mainnet memory reads",
      revocation:{present:Boolean(revoked),eventId:revoked?.id ?? null,decision:decide(tickets[2],ledger.events,tickets[2].chain)},
      cache:"fresh",limitations:["Success does not prove the intended recipient, asset or amount.",
        "This demo uses synthetic tickets and a deterministic policy matcher, not an LLM.",
        "Completeness is relative to the single writer's receipt manifest."]};
    cached={at:Date.now(),value};return value;
  })();
  try{return await pending;}finally{pending=undefined;}
}
