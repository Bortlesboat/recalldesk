import { decide, replay, revoke } from "../dist/core.js";
import { reviewed, tickets } from "../dist/fixtures.js";
const score = events => tickets.filter(ticket => decide(ticket, events, ticket.chain).route === ticket.expected).length;
console.log(JSON.stringify({
  dataset: "six synthetic held-out wording variants; not a real-world benchmark",
  before: score([]), after: score(reviewed), total: tickets.length,
  memories: reviewed.length, activeRules: replay(reviewed).length,
  revokedExample: decide(tickets[0], [...reviewed, revoke("index-delay", reviewed)], tickets[0].chain),
  integrations: "offline fixtures; Mainnet and Tatum not yet verified",
}, null, 2));
