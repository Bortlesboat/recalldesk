import { correction, decide, replay, revoke } from "./core.js";
import { reviewed, tickets, training } from "./fixtures.js";

// Constructed contract cases, authored with the implementation: NOT held out.
const authRevoked = [...reviewed, revoke("auth", reviewed)];
export const cases = [
  {name: "Unchanged API lesson", ticket: tickets[2], events: reviewed, expected: "Developer support"},
  {name: "Success-only inference corrected", ticket: tickets[0], events: reviewed, expected: "Human review"},
  {name: "Revoked API lesson stays revoked", ticket: tickets[2], events: authRevoked, expected: "Human review"},
  {name: "Unrelated revocation preserves useful recall", ticket: tickets[2], events: [...reviewed, revoke("login", reviewed)], expected: "Developer support"},
  {name: "Wrong version does not inherit a lesson", ticket: {...tickets[3], version: "1"}, events: reviewed, expected: "Human review"},
  {name: "Negated symptom is not positive evidence", ticket: {...tickets[1], text: "The transaction has not failed."}, events: reviewed, expected: "Human review"},
  {name: "Another transaction is not this ticket's evidence", ticket: {...tickets[1], digest: "3".repeat(44)}, events: reviewed, expected: "Human review"},
  {name: "Conflicting reviewed routes require resolution", ticket: tickets[2], events: [...reviewed,
    correction({...training[2], ruleId: "alternate-auth", route: "Account support"}, [])], expected: "Human review"},
  {name: "Fresh session retains failed-transaction lesson", ticket: tickets[1], events: JSON.parse(JSON.stringify(reviewed)), expected: "Protocol engineering"},
];

export function evaluate() {
  const strategies = {
    fixedKnowledgeBase: () => training,
    staleRetrieval: c => c.events.filter(e => e.type === "lesson" && e.revision === 1),
    receiptCompleteReplay: c => c.events,
    currentKnowledgeBase: c => replay(c.events),
  };
  const results = Object.fromEntries(Object.entries(strategies).map(([name, select]) => {
    const rows = cases.map(c => {
      const decision = decide(c.ticket, select(c), c.ticket.chain);
      return {case: c.name, expected: c.expected, route: decision.route,
        correct: c.expected === decision.route, abstained: decision.route === "Human review"};
    });
    return [name, {correct: rows.filter(r => r.correct).length,
      wrongRoutes: rows.filter(r => !r.correct && !r.abstained).length,
      unnecessaryAbstentions: rows.filter(r => !r.correct && r.abstained).length,
      abstentions: rows.filter(r => r.abstained).length, total: rows.length, rows}];
  }));
  return {dataset: "Nine constructed memory-lifecycle contract cases; not an independent or held-out benchmark",
    claim: "Complete revision replay matches an equivalently updated knowledge base. No superiority over a correctly maintained database is claimed.",
    limitations: ["Stale retrieval is a controlled omitted-update failure, not measured Walrus recall performance.",
      "Abstentions are reported, including correct required reviews. Natural-language understanding is not evaluated.",
      "Negation handling is conservative keyword detection and can cause unnecessary review on real tickets."],
    results};
}
