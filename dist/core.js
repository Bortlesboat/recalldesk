// The same replay and decision code runs in the browser and the CLI.
export const routes = ["Developer support", "Wallet UI", "Protocol engineering", "Account support", "Human review"];
const types = ["lesson", "revoke"];
const norm = text => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function validateEvent(event) {
  if (!event || event.schema !== "recalldesk/1" || !types.includes(event.type) ||
      !/^[a-z0-9-]{1,60}$/.test(event.id ?? "") ||
      !/^[a-z0-9-]{1,60}$/.test(event.ruleId ?? "") ||
      !Number.isSafeInteger(event.revision) || event.revision < 1) {
    throw new Error("Invalid memory envelope");
  }
  if (event.type === "lesson" && (
      !routes.includes(event.route) || !["normal", "urgent"].includes(event.priority) ||
      !Array.isArray(event.match) || !event.match.length || event.match.length > 8 ||
      !event.match.every(word => typeof word === "string" && word.length > 1 && word.length < 50) ||
      typeof event.reason !== "string" || !event.reason.trim() || event.reason.length > 500 ||
      !["any", "success", "failure"].includes(event.chainStatus) ||
      !["1", "2", "any"].includes(event.version))) throw new Error("Invalid lesson");
  return event;
}

export function replay(events) {
  const ids = new Map(), rules = new Map(), revisions = new Map();
  for (const event of events) {
    validateEvent(event);
    const encoded = JSON.stringify(event);
    if (ids.has(event.id)) {
      if (ids.get(event.id) !== encoded) throw new Error("Conflicting memory ID");
      continue;
    }
    ids.set(event.id, encoded);
    const key = `${event.ruleId}:${event.revision}`;
    if (revisions.has(key)) throw new Error("Conflicting rule revision");
    revisions.set(key, event.id);
    const previous = rules.get(event.ruleId);
    if (!previous || event.revision > previous.revision) rules.set(event.ruleId, event);
  }
  return [...rules.values()].filter(event => event.type === "lesson");
}

export function decide(ticket, events, chain = { status: "unverified" }) {
  if (!ticket || typeof ticket.text !== "string" || !["1", "2"].includes(ticket.version)) {
    throw new Error("Ticket text and supported version are required");
  }
  const text = norm(ticket.text);
  // This deterministic prototype does not interpret negation reliably. Route
  // ambiguous language for review rather than treating a negated symptom as fact.
  if (/\b(no|not|never|isn t|wasn t|doesn t|don t|didn t|isnt|wasnt|doesnt|dont|didnt)\b/.test(text)) return {
    route: "Human review", priority: "normal", matched: [],
    reason: "This ticket contains negation; confirm the symptom before applying a keyword lesson.",
  };
  const matches = replay(events).filter(rule =>
    (rule.version === "any" || rule.version === ticket.version) &&
    (rule.chainStatus === "any" || (rule.chainStatus === chain.status &&
      typeof ticket.digest === "string" && ticket.digest === chain.digest)) &&
    rule.match.every(word => (` ${text} `).includes(` ${norm(word)} `))
  );
  if (!matches.length) return {
    route: "Human review", priority: "normal", matched: [],
    reason: "No applicable reviewed memory. Ask for a reproducible example.",
  };
  const signatures = new Set(matches.map(rule => `${rule.route}/${rule.priority}`));
  if (signatures.size > 1) return {
    route: "Human review", priority: "urgent", matched: matches.map(rule => rule.id),
    reason: "Reviewed memories conflict. A person must resolve the disagreement.",
  };
  matches.sort((a, b) => b.match.length - a.match.length || a.id.localeCompare(b.id));
  return {
    route: matches[0].route, priority: matches[0].priority,
    reason: matches[0].reason, matched: matches.map(rule => rule.id),
  };
}

export function correction(rule, events) {
  const revisions = events.filter(event => event.ruleId === rule.ruleId).map(event => event.revision);
  const revision = Math.max(0, ...revisions) + 1;
  return validateEvent({
    ...rule, schema: "recalldesk/1", type: "lesson", revision,
    id: `${rule.ruleId}-r${revision}`,
  });
}

export function revoke(ruleId, events) {
  const revision = Math.max(0, ...events.filter(event => event.ruleId === ruleId).map(event => event.revision)) + 1;
  return validateEvent({schema: "recalldesk/1", type: "revoke", id: `${ruleId}-r${revision}`, ruleId, revision});
}
