import { verifyTransaction } from "../lib/integrations.mjs";
console.log(JSON.stringify(await verifyTransaction(process.argv[2] ?? "", process.env.TATUM_API_KEY), null, 2));
