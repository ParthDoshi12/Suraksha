/* ============================================================
   CONTENT — edit the story here. Suraksha Mutual is fictional.
   Product facts reflect UiPath announcements as of Nov 2026.
   This file is loaded ONLY by the presenter (index.html).
   Phones never load it, so answers can't be peeked from source.
   ============================================================ */
(function(){
const ROUNDS = [
{
  id:"discover", stage:"Discover", title:"Nobody knows how motor claims actually run",
  who:"Meera Kulkarni · COO", quote:"Three regions, three versions of the same process. And everyone swears theirs is the right one.",
  facts:["The motor claims SOP was last updated in <b>2019</b>","<b>3 regional teams</b> handle claims <b>3 different ways</b>","About <b>40% of claims</b> hit exceptions nobody wrote down","The board wants automation, but nobody can say <b>what</b> to automate"],
  question:"Where should Meera <span>start</span>?",
  options:{
    A:{l:"6-week consulting workshop + Visio diagrams",s:"Interviews, sticky notes, a 90-slide deck",c:"The map is out of date the day it's printed, and the 40% of exceptions stay in people's heads."},
    B:{l:"UiPath Cartographer",s:"AS-IS and TO-BE maps drafted from documents, systems and people",c:"It drafts the AS-IS map, pulls out business rules and gaps, then a TO-BE map with an automation mode for each step. Every fact keeps its source."},
    C:{l:"Build an AI agent right away",s:"Start building, figure it out as we go",c:"You end up automating the wrong process, just faster."},
    D:{l:"Task Mining on 50 desktops",s:"Record clicks and keystrokes",c:"It shows what people click, not why. The judgment calls stay hidden. Useful later, not first."}
  },
  correct:"B", demo:"assets/cartographer.gif",
  why:["<b>Known vs unknown:</b> when the process isn't understood yet, you discover before you build.","Cartographer keeps a living <b>Map of Work</b> that includes the exceptions and judgment calls.","Once the map is approved, coding agents can build automations straight from it."],
  twist:{p:"Six months later Meera wants claim-turnaround trends across 2 million historical claims in the core system.",a:"Add Process Mining",d:"Cartographer maps how work runs. Process Mining measures how it performs over time from event logs. They work together."},
  pieces:[{n:"Cartographer",s:"Map of Work",L:0},{n:"Process Mining",s:"KPIs over time",L:0,tw:1}],
  notes:"⏱ ~14 min (10:00–24:00). Jeet plays Meera and reads the quote. PD walks through the options. Suggested 2-min DEMO: Cartographer turning an SOP PDF into an AS-IS map. Pitfall to call out: Task Mining is not wrong, just not the first step. On the reveal slide press → once to show the Cartographer GIF while you go through the three reasons; → again moves to the twist."
},
{
  id:"desktop", stage:"Desktop", title:"Priya's 2-hour morning",
  who:"Priya Shah · Senior Underwriter", quote:"Every morning I copy broker emails, portal data and three Excel files into one renewal summary. It's never quite the same twice.",
  facts:["<b>2 hours a day</b> on manual collation","Data spread across <b>Outlook, a policy portal and Excel</b>","The steps <b>change a little every day</b>","Priya is not a developer and has <b>no time to write specs</b>"],
  question:"What's the best fit for <span>Priya</span>?",
  options:{
    A:{l:"Unattended RPA bot",s:"A developer builds it, Orchestrator schedules it",c:"A 6-week build for a task that changes every day. It breaks every time something shifts."},
    B:{l:"UiPath Delegate",s:"A governed AI agent on her own desktop",c:"Priya describes, says or demonstrates the task. Delegate works across her apps with her identity, her permissions and a full audit trail."},
    C:{l:"An Agent Builder agent",s:"A cloud agent with tools and prompts",c:"Overkill. She would need someone to build and publish it, and it still can't see her desktop the way she does."},
    D:{l:"Excel macros",s:"The classic workaround",c:"Macros can't reach Outlook or the portal reliably, and nobody can govern them."}
  },
  correct:"B",
  why:["<b>Who is the user?</b> One person, on their own desktop, with work that keeps changing → a desktop agent.","Delegate runs under the user's own identity and permissions, governed through Automation Ops.","Model calls go through the <b>AI Trust Layer</b>, so the same platform controls and audit trail apply."],
  twist:{p:"Now all 400 underwriters need the same report, in the same format, every day at 7 a.m.",a:"Move it to a shared, scheduled automation",d:"A personal assistant is right for one person's work that changes daily. Identical work at scale belongs in a shared, scheduled automation that runs unattended."},
  pieces:[{n:"Delegate",s:"Desktop agent",L:1},{n:"Unattended automation",s:"Same work at scale",L:1,tw:1}],
  notes:"⏱ ~12 min (24:00–36:00). PD plays Priya this time. Ask the room: 'Who has a Priya on their team?' Show of hands, then laugh. If there's time, show a short Delegate clip."
},
{
  id:"trap", stage:"Curveball", title:"The renewal reminder",
  who:"Meera Kulkarni · COO", quote:"We lose renewals because customers forget. Can AI fix that?",
  facts:["Send SMS + email <b>30, 15 and 7 days</b> before a policy expires","All the data sits in the policy admin system, which has a <b>REST API</b>","The rules are <b>fixed</b> and set by compliance","Volume: about <b>8,000 reminders a day</b>"],
  question:"Which one is the <span>right</span> call?",
  options:{
    A:{l:"An AI agent that decides when to remind",s:"Agent Builder + LLM reasoning",c:"You pay for LLM calls to work out a date rule. That's harder to audit and less predictable than the rule itself."},
    B:{l:"A Maestro process",s:"Full BPMN orchestration",c:"No humans, no long waits, no handoffs. Orchestration overhead for a scheduled job."},
    C:{l:"UiPath Delegate",s:"Someone asks their desktop agent every morning",c:"A person still has to remember to ask it, which is the original problem."},
    D:{l:"A simple scheduled workflow",s:"Integration Service / API calls on a schedule",c:"Fixed rules, an API is available, high volume. That's the cheapest, most reliable and easiest option to audit."}
  },
  correct:"D",
  why:["<b>Not everything needs an agent.</b> Fixed rules + an available API → a plain workflow.","Agents are for judgment calls, not for working out date arithmetic.","The best architects ask what the <b>least</b> intelligent option is that still solves the problem."],
  twist:{p:"Customers start replying: 'I already paid at the branch' or 'Why did my premium go up?'",a:"Send replies to an agent and keep the workflow simple",d:"The free-text replies need judgment, so an agent handles those. The reminder schedule stays a plain workflow."},
  pieces:[{n:"Renewal workflow",s:"API + schedule",L:1},{n:"Reply-handling agent",s:"Free-text judgment",L:1,tw:1}],
  notes:"⏱ ~8 min (36:00–44:00). THE TRAP ROUND. Most of the room will pick A. Let them, then reveal. Jeet: 'We just saved Meera a few lakh a year in LLM calls.' This round earns trust that the talk isn't a sales pitch."
},
{
  id:"brain", stage:"Build", title:"Claims triage needs a brain",
  who:"Meera Kulkarni · COO", quote:"1,800 claims a day. My team spends half their time just deciding which pile each one goes in.",
  facts:["Each first notice of loss arrives with <b>photos, a garage estimate, the policy document and the customer's statement</b>","There are 3 outcomes: <b>fast-track</b> (below ₹50k, clean history), <b>send a surveyor</b>, or <b>flag for review</b>","The decisions need <b>reasons</b> an auditor can read","Policy wording changes every year"],
  question:"How should Suraksha <span>build</span> triage?",
  options:{
    A:{l:"An if-else rules engine in an RPA bot",s:"Hard-code every condition",c:"It can't read a photo or a messy customer statement. The rule list grows forever."},
    B:{l:"An agent built in Agent Builder",s:"Low-code agent + document understanding + policy knowledge + evaluations",c:"It reads the documents, checks them against the policy wording, decides with reasons, and comes with evaluation sets and guardrails."},
    C:{l:"Delegate on each claims handler's desktop",s:"Everyone gets their own assistant",c:"1,800 claims a day is a shared production workload, not one person's productivity."},
    D:{l:"A ChatGPT prompt pasted into a spreadsheet",s:"Quick and cheap",c:"No governance, no audit trail, no evaluations. The CISO will not be pleased."}
  },
  correct:"B",
  why:["<b>Rules or judgment?</b> Unstructured documents + decisions that need reasons → an agent.","Autopilot Agent (preview) can draft the agent's prompts, tools, evaluation sets and guardrails in Studio Web.","Policy wordings are used as context, so the agent cites the clause behind each decision."],
  twist:{p:"Suraksha's digital team are pro-code developers. They live in VS Code and git and want CI/CD for everything.",a:"Build the same agent with coding agents",d:"Low-code and coded UiPath agents can now be built entirely from a coding agent such as Claude Code, Codex or Cursor, working from the terminal."},
  pieces:[{n:"Claims Triage Agent",s:"Agent Builder",L:1},{n:"Coded agents",s:"Via coding agents",L:1,tw:1}],
  notes:"⏱ ~16 min (44:00–60:00). Main DEMO slot (5–6 min): Autopilot Agent drafting a triage agent, or Jeet with Claude Code building it via the CLI. This links back to our earlier UiPath Coding Agents session."
},
{
  id:"orchestrate", stage:"Orchestrate", title:"From first notice to payout",
  who:"Meera Kulkarni · COO", quote:"The triage agent is great. But a claim is a 12-day journey, and it still gets lost between teams.",
  facts:["First notice → <b>triage agent</b> → <b>surveyor visit</b> (a person, about 2 days) → <b>estimate approval</b> (a person, with an SLA) → <b>payout bot</b> → customer update","Each claim runs for <b>days to weeks</b>","Needs <b>SLAs, escalations</b> and a regulator-ready audit trail","Business teams want to <b>see and change</b> the flow themselves"],
  question:"What ties the <span>whole journey</span> together?",
  options:{
    A:{l:"Orchestrator queues + triggers",s:"What we've always done",c:"Fine for bots. But people, agents and SLAs end up stitched together by hand, and nobody sees the whole journey."},
    B:{l:"UiPath Maestro (BPMN)",s:"Long-running process: agents, robots and people",c:"Long-running, people in the loop, SLAs, a BPMN model the business can read. Autopilot for Maestro can draft it from the Cartographer TO-BE document."},
    C:{l:"Maestro Flow",s:"Developer-first orchestration for coding agents",c:"Strong tool, wrong user. This journey is owned by the business and full of human steps. Keep Flow for the twist."},
    D:{l:"Let the triage agent run everything",s:"One agent to rule them all",c:"No SLAs, no escalation path, and one prompt doing everything. Auditors will reject it."}
  },
  correct:"B",
  why:["<b>One task or end-to-end?</b> A multi-day journey with people, agents and bots → Maestro.","The BPMN model is something business and IT can both read.","It closes the loop: the Cartographer TO-BE map → Autopilot for Maestro → a running process."],
  twist:{p:"The digital team wants a chat assistant for policy servicing, built with coding agents and shipped in 2 weeks.",a:"Maestro Flow",d:"Developer-first orchestration built for coding agents, going from prototype to production without a rebuild. Chat agents can be built as a Maestro Flow."},
  pieces:[{n:"Maestro",s:"Claims journey (BPMN)",L:2},{n:"Maestro Flow",s:"Servicing chat assistant",L:2,tw:1}],
  notes:"⏱ ~16 min (60:00–76:00). Take the time here to explain the difference between the two Maestro options. A simple 'who owns it / how long it runs / who builds it' table works well on the whiteboard. Optional: show a Maestro canvas for 2 min."
},
{
  id:"govern", stage:"Govern", title:"The CISO walks in",
  who:"Rajesh Iyer · CISO", quote:"Which model saw policyholder data? Can an agent approve a ₹10 lakh claim on its own? Prove it to me, and to the regulator.",
  facts:["A <b>regulatory audit</b> is scheduled for next quarter","Agents touch <b>personal and health data</b>","There must be a <b>human sign-off</b> above set claim amounts","Every model call needs an <b>audit trail</b>"],
  question:"How does Suraksha <span>prove</span> it's safe?",
  options:{
    A:{l:"Write an AI policy PDF and email it out",s:"Governance by document",c:"A policy nobody enforces is just a wish."},
    B:{l:"AI Trust Layer + Automation Ops policies",s:"Model governance and controls enforced before an agent goes live",c:"Model calls are governed and audited. Before publishing, policies enforce a minimum agent score, temperature limits, human escalation and maximum iterations."},
    C:{l:"Turn off AI until the audit is over",s:"Safety by switching it off",c:"The backlog comes back the next day and the board mandate fails."},
    D:{l:"Trust the model vendor",s:"They said it's safe",c:"The regulator audits Suraksha, not the vendor."}
  },
  correct:"B",
  why:["<b>Can you prove it?</b> Governance has to be enforced by the platform, not written in a PDF.","Agent design policies stop an agent from being published if it doesn't meet the rules.","Human-in-the-loop escalation handles the ₹10 lakh case."],
  twist:{p:"Group IT already has an enterprise agreement for Claude on AWS Bedrock and wants agents to use it.",a:"Bring your own model through the AI Trust Layer",d:"Connect your own model subscription through an LLM configuration in the Trust Layer. You keep your agreement and still get the platform's governance and audit."},
  pieces:[{n:"AI Trust Layer",s:"Model governance",L:3},{n:"Automation Ops policies",s:"Rules enforced before publishing",L:3},{n:"Your own model",s:"Your Bedrock agreement",L:3,tw:1}],
  notes:"⏱ ~12 min (76:00–88:00). Jeet plays Rajesh. Make it dramatic, he walks in mid-story. PD answers from real experience setting up an LLM Gateway configuration for Claude via Bedrock."
},
{
  id:"test", stage:"Test & Scale", title:"The quarterly upgrade",
  who:"Meera Kulkarni · COO", quote:"Last core-system upgrade broke 23 automations. Claims stopped for two days. Never again.",
  facts:["The core policy admin system upgrades <b>every quarter</b>","Last time: <b>23 automations broken</b>, claims stopped for <b>2 days</b>","<b>300 manual test cases</b> live in a spreadsheet","The QA team is <b>4 people</b>"],
  question:"How does Suraksha <span>scale safely</span>?",
  options:{
    A:{l:"Test in production",s:"Users will tell us",c:"Customers find the bugs first, and so does the regulator."},
    B:{l:"Test Cloud + Delegate for Testing",s:"Agentic testing linked to Test Manager",c:"Delegate for Testing runs the manual test cases on a desktop, records a trace of every step, and publishes the results to Test Manager."},
    C:{l:"Hire 10 more testers",s:"Throw people at it",c:"Expensive, slow, and it's the same problem again next quarter."},
    D:{l:"Freeze upgrades",s:"If it isn't broken…",c:"Security patches pile up. Rajesh comes back, and he's not happy."}
  },
  correct:"B",
  why:["Automations are software, so they need testing like any software.","The 300 manual cases become test runs with a step-by-step trace.","Four QA people can now cover an entire upgrade cycle."],
  twist:{p:"The upgrade changed 4 screens that 60 test cases depend on.",a:"Self-healing test automation in Test Cloud",d:"Tests adapt to UI changes instead of failing, so the team fixes real defects instead of broken selectors."},
  pieces:[{n:"Test Cloud",s:"Delegate for Testing",L:3},{n:"Self-healing tests",s:"Handles UI changes",L:3,tw:1}],
  notes:"⏱ ~10 min (88:00–98:00). Fast round, the room will be warmed up by now. Build to the finale: 'Let's look at what YOU built.'"
}
];

const LAYERS=["Discover","Do the work","Orchestrate","Trust & scale"];
const LENS=[
 {q:"Do we actually know how the process runs?",a:"No → discover first: <b>Cartographer</b>. Measuring performance over time → <b>Process Mining</b>."},
 {q:"Who is the user?",a:"One person on their own desktop → <b>Delegate</b>. A shared production workload → an automation or an agent."},
 {q:"Fixed rules, or judgment calls?",a:"Fixed rules + an API → <b>a plain workflow</b>. Unstructured input and decisions that need reasons → <b>an agent</b> (Agent Builder or coding agents)."},
 {q:"One task, or an end-to-end journey?",a:"Long-running, with people and SLAs → <b>Maestro</b>. Developer-first or a chat assistant → <b>Maestro Flow</b>."},
 {q:"Can we prove it's safe?",a:"<b>AI Trust Layer</b>, <b>Automation Ops policies</b>, <b>Test Cloud</b>. Not a policy PDF."}
];

const NOTES={
 title:"⏱ 0:00–3:00. Hand out cards as people walk in. Keep this slide up while people scan the QR, and watch the 📱 counter climb. PD opens: 'Today you are the architects.' Jeet explains the cards. Do a practice vote: 'How many of you have heard of Cartographer?'",
 org:"⏱ 3:00–7:00. Jeet steps into the role of Meera, COO, and stays in it for most rounds. PD is the architect. Set the stakes: a 12-month board mandate.",
 lens:"⏱ 7:00–10:00. Introduce the 5 questions but keep the answers blurred. That creates curiosity for the reveal in the finale. Don't explain them yet.",
 map:"⏱ 98:00–106:00. Let the map animate in silence for a few seconds. Then walk through it layer by layer: 'You didn't pick 7 products. You picked 7 answers to 5 questions.' Call out the room's score.",
 close:"⏱ 106:00–110:00 + Q&A. Show the QR, take a group photo with the cards up. If there's time left, run a bonus round from the audience: someone shares their own company's problem and the room votes."
};
NOTES.leaders="⏱ ~2 min. Read the top 3 nicknames slowly, drumroll from Jeet. Hand out goodies if you have them. Then move to the closing slide.";

window.SURAKSHA={ROUNDS,LAYERS,LENS,NOTES,EVENT:{name:"UiPath Mumbai Community · Year-End Meet-Up",date:"5 Dec 2026",speakers:"Parth Doshi &amp; Jeet Doshi"}};
})();
