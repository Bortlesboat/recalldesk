import { correction } from "./core.js";

// Synthetic reviewed examples, not organizer data or measured real-world performance.
const lessons = [
  ["index-delay", ["balance", "missing"], "Wallet UI", "normal", "success", "any",
    "The transaction succeeded. Investigate the displayed balance before suggesting another transfer."],
  ["failed-tx", ["transaction", "failed"], "Protocol engineering", "urgent", "failure", "any",
    "Chain effects confirm failure. Preserve the digest and error for protocol triage."],
  ["auth", ["api", "401"], "Developer support", "normal", "any", "any",
    "Check the API host and authentication header. Never request a key in a public ticket."],
  ["pagination", ["cursor", "empty"], "Developer support", "normal", "any", "2",
    "Synthetic app v2 uses filtered pagination. Continue while has_more is true, including empty pages."],
  ["memory", ["memory", "old"], "Developer support", "normal", "any", "any",
    "Recall can omit newer corrections. Load the complete bounded ledger before applying revisions."],
  ["login", ["login", "loop"], "Account support", "normal", "any", "any",
    "Ask for the browser and redirect path. Escalate through account support without collecting credentials."],
];

export const training = lessons.map(([ruleId, match, route, priority, chainStatus, version, reason]) =>
  correction({ruleId, match, route, priority, chainStatus, version, reason}, []));

// Six second-review corrections add explicit operational detail: 12 meaningful events.
export const reviewed = [
  ...training,
  ...training.map((rule, index) => correction({
    ...rule,
    ...(index === 0 ? {route: "Human review"} : {}),
    reason: rule.reason + [
      " CORRECTION: do not infer a wallet display fault. Confirm the recipient, asset and amount; success alone does not prove the intended transfer.",
      " Do not automatically retry a failed transaction.",
      " A 401 alone does not prove the key was revoked.",
      " Stop and restart a snapshot if the service requests resynchronization.",
      " Revoked rules must remain revoked after a new session.",
      " Use the official recovery flow; never ask for a seed phrase.",
    ][index],
  }, training)),
];

export const tickets = [
  {id: "RD-201", title: "Transaction succeeded, balance still missing", text: "My balance is missing after yesterday's transfer.", version: "2", digest: "1".repeat(44), chain: {status: "success", digest: "1".repeat(44), source: "synthetic fixture"}, expected: "Human review"},
  {id: "RD-202", title: "A failed transaction", text: "The transaction failed when I confirmed it.", version: "2", digest: "2".repeat(44), chain: {status: "failure", digest: "2".repeat(44), source: "synthetic fixture"}, expected: "Protocol engineering"},
  {id: "RD-203", title: "SDK returns 401", text: "My API request gets a 401 in the new SDK.", version: "2", chain: {status: "unverified"}, expected: "Developer support"},
  {id: "RD-204", title: "An empty page with a cursor", text: "The cursor points to an empty response in version 2.", version: "2", chain: {status: "unverified"}, expected: "Developer support"},
  {id: "RD-205", title: "Yesterday's correction disappeared", text: "The memory answer keeps returning the old instruction.", version: "2", chain: {status: "unverified"}, expected: "Developer support"},
  {id: "RD-206", title: "Sign-in repeats", text: "Login sends me into a redirect loop.", version: "1", chain: {status: "unverified"}, expected: "Account support"},
];
