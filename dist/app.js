import {decide, replay, revoke} from "./core.js";
import {reviewed, tickets} from "./fixtures.js";
import {evaluate} from "./evaluation.js";

const $ = id => document.getElementById(id);
const key = "recalldesk-synthetic-ledger-v2";
let events = [], selected = 0, session = 1;
try { events = JSON.parse(localStorage.getItem(key) ?? "[]"); replay(events); }
catch { events = []; }
function notify(message) { $("toast").textContent = message; clearTimeout(notify.timer); notify.timer = setTimeout(() => $("toast").textContent = "", 4500); }
function persist() {
  try { localStorage.setItem(key, JSON.stringify(events)); }
  catch { notify("Browser storage is unavailable. Export this session to keep it."); }
}
function element(tag, text, className) {
  const node = document.createElement(tag); node.textContent = text;
  if (className) node.className = className; return node;
}
function render() {
  $("tickets").replaceChildren(...tickets.map((ticket, index) => {
    const button = element("button", "", "ticket");
    button.setAttribute("aria-current", String(index === selected));
    button.append(element("small", ticket.id), element("span", ticket.title));
    button.onclick = () => {selected = index; render();};
    return button;
  }));
  const ticket = tickets[selected], lesson = reviewed[selected + 6];
  $("ticket-id").textContent = ticket.id;
  $("version").textContent = `Sample app v${ticket.version}`;
  $("ticket-title").textContent = ticket.title;
  $("ticket-text").textContent = ticket.text;
  $("chain").textContent = ticket.chain.status === "unverified"
    ? "CHAIN EVIDENCE / No transaction supplied"
    : `CHAIN EVIDENCE / ${ticket.chain.status.toUpperCase()} · synthetic sample, not a live RPC read`;
  $("review-route").textContent = lesson.route;
  $("review-reason").textContent = lesson.reason;
  $("decision").replaceChildren(element("p", "Run triage to see which reviewed memories apply.", "muted"));
  $("event-count").textContent = String(events.length);
  const active = replay(events);
  $("ledger").replaceChildren(...(active.length ? active.map(rule => {
    const row = element("div", "", "ledgerrow");
    const button = element("button", "Revoke rule");
    button.setAttribute("aria-label", `Revoke ${rule.ruleId}`);
    button.onclick = () => {events.push(revoke(rule.ruleId, events)); persist(); render(); notify("Rule revoked. Its history is preserved.");};
    row.append(element("strong", rule.ruleId.replaceAll("-", " ")), element("small", `Revision ${rule.revision} · ${rule.route}`), button);
    return row;
  }) : [element("p", "No reviewed memories yet. Learn a correction to start the ledger.", "muted")]));
  $("score").textContent = `${tickets.filter(ticket => decide(ticket, events, ticket.chain).route === ticket.expected).length} / 6`;
  $("session-label").textContent = `Session ${String(session).padStart(2, "0")}`;
}
$("triage").onclick = () => {
  const ticket = tickets[selected], result = decide(ticket, events, ticket.chain);
  $("decision").replaceChildren(
    element("span", result.priority === "urgent" ? "Needs attention" : "Suggested routing", `badge ${result.priority}`),
    element("h3", result.route), element("p", result.reason),
    element("small", result.matched.length ? `Memory receipts: ${result.matched.join(", ")}` : "No applicable memory receipt"),
  );
};
function learn(items) {
  // Do not silently overwrite an explicit revocation when loading old examples.
  const ids = new Set(events.map(event => event.id));
  const additions = items.filter(event => !ids.has(event.id));
  const candidate = [...events, ...additions]; replay(candidate); events = candidate;
  persist(); render(); notify(`${additions.length} reviewed memories added.`);
}
$("learn-all").onclick = () => learn(reviewed);
$("learn-one").onclick = () => learn([reviewed[selected], reviewed[selected + 6]]);
$("new-session").onclick = () => {session += 1; selected = 0; render(); notify("Fresh session. Reviewed memory carried forward.");};
$("clear").onclick = () => {events = []; persist(); render(); notify("Synthetic sample reset.");};
$("evaluate").onclick = () => {
  const report = evaluate();
  const names = {fixedKnowledgeBase: "Original knowledge base", staleRetrieval: "Stale retrieval",
    receiptCompleteReplay: "Complete memory replay", currentKnowledgeBase: "Updated knowledge base"};
  $("comparisons").replaceChildren(...Object.entries(report.results).map(([name,result]) => {
    const box = element("div", "");
    box.append(element("strong", names[name]), element("p", `${result.correct}/${result.total} contract cases; ${result.wrongRoutes} wrong routes; ${result.abstentions} human reviews; ${result.unnecessaryAbstentions} unnecessary reviews.`));
    return box;
  }), element("p", "Nine constructed cases, authored with the code. Complete replay ties a correctly updated knowledge base. This tests memory lifecycle behavior, not real-world support accuracy."));
  notify("Comparison includes correct human reviews. Stale retrieval is an injected failure, not a measured provider result.");
};
$("export").onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({schema: "recalldesk-export/1", mode: "browser-demo", events}, null, 2)], {type: "application/json"}));
  const link = document.createElement("a"); link.href = url; link.download = "recalldesk-session.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("import").onchange = async event => {
  try {
    const file = event.target.files[0];
    if (!file || file.size > 200000) throw new Error("Choose a session smaller than 200 KB");
    const data = JSON.parse(await file.text());
    if (data.schema !== "recalldesk-export/1" || data.mode !== "browser-demo" || !Array.isArray(data.events) || data.events.length > 100) {
      throw new Error("Choose a RecallDesk browser session");
    }
    replay(data.events); events = data.events; persist(); session += 1; render(); notify("Session imported. All memory revisions validated.");
  } catch (error) { notify(error.message); }
  event.target.value = "";
};
render();
