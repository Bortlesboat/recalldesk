import {env} from "cloudflare:workers";
import {liveEvidence} from "../../../lib/live-evidence.mjs";
export async function GET() {
  try {
    const result=await liveEvidence(env);
    return Response.json(result,{headers:{"Cache-Control":"no-store"}});
  } catch {
    // Never return SDK errors: they can include private request/account details.
    return Response.json({error:"Live evidence is unavailable. No fixture was substituted."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
