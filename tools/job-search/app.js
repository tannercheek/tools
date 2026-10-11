// Job Search: a one-time prep checklist, daily and weekly search rounds,
// and interview problem practice, as three tabs.
import { syncedState } from "../../shared/persist.js";
import { mountInterview } from "./interview.js";

// ── Prepare tab ───────────────────────────────────────
// One-time items. kind "setup" counts toward Ready to apply;
// "optional" doesn't. track: "all" | "swe" | "sec".
const PREPARE = [
  {
    title: "Before you apply",
    kind: "setup",
    groups: [
      {
        label: "Application materials",
        items: [
          {
            id: "general-swe-resume-v2",
            track: "swe",
            label: "Software engineering resume",
            note: "One page, single column, no tables or graphics (ATS-friendly). Lead with projects and stack; quantify impact — users, speed-ups, team size.",
          },
          {
            id: "cybersecurity-forensics-resume-v2",
            track: "sec",
            label: "Cybersecurity resume",
            note: "Lead with hands-on work: labs, CTFs, homelab, tools used (e.g. Nmap, Wireshark, Burp Suite, Splunk). List certs in progress with an expected date.",
          },
          {
            id: "resume-reviewed-and-parse-tested",
            label: "Resume reviewed and parse-tested",
            note: "Have a mentor, peer, or career center review it. Copy text out of the PDF into a plain-text editor — if it comes out garbled, so will the ATS.",
          },
          {
            id: "cover-letter-template",
            label: "Cover letter template",
            note: "Three short paragraphs: why this company, the one most relevant thing you've done, a brief close. Rewrite the first line every time.",
          },
          {
            id: "set-up-a-permanent-professional-email",
            label: "Permanent professional email",
            note: "firstname.lastname@… — not a school or work address that will expire. Use it everywhere below.",
          },
          {
            id: "references-lined-up",
            label: "2–3 references lined up",
            note: "Ask first. Keep their current title, email, phone, and how they know you in one doc.",
          },
          {
            id: "elevator-pitch",
            label: "30-second pitch",
            note: "Who you are, what you've built, what you're looking for. Say it out loud until it sounds natural — it's also your outreach intro.",
          },
        ],
      },
      {
        label: "LinkedIn",
        items: [
          {
            id: "linkedin-headline",
            label: "Headline names the role you want",
            note: "e.g. \"Software Engineer | Full-Stack (React, Python)\" or \"Security Analyst | SOC & Network Security | Security+\". Recruiters search these words.",
          },
          {
            id: "linkedin-photo-url",
            label: "Photo, banner, and custom URL",
            note: "Clear headshot; set linkedin.com/in/firstname-lastname and use that link on your resume.",
          },
          {
            id: "write-and-publish-about-section",
            label: "About section written",
            note: "3–5 sentences: what you do, what you've built, what you're looking for, how to reach you.",
          },
          {
            id: "linkedin-experience-projects",
            label: "Experience and projects match your resume",
            note: "Treat major projects like jobs — role, dates, the same bullets. Mismatches between resume and profile raise questions.",
          },
          {
            id: "linkedin-skills-featured",
            label: "Skills and Featured sections filled in",
            note: "Pin the 3 skills that appear most in your target postings. Feature your best project and your portfolio link.",
          },
          {
            id: "turn-on-open-to-work",
            label: "Open to Work turned on",
            note: "Add every title you'd accept, plus locations and remote. Use \"recruiters only\" if you're currently employed.",
          },
        ],
      },
      {
        label: "GitHub and portfolio",
        items: [
          {
            id: "profile-readme-is-up-to-date",
            label: "GitHub profile README",
            note: "Short bio, current focus, links to portfolio and LinkedIn.",
          },
          {
            id: "pinned-repos-presentable",
            label: "4–6 best repos pinned and presentable",
            note: "Each README says what it is, why it exists, how to run it, and has a screenshot or demo link. Best project first.",
          },
          {
            id: "repos-scrubbed-for-secrets",
            label: "Public repos scrubbed for secrets",
            note: "No API keys, .env files, or credentials — in current code or commit history. Run a scanner like gitleaks or trufflehog to check.",
          },
          {
            id: "swe-flagship-project",
            track: "swe",
            label: "One flagship project deployed",
            note: "Live URL, tests, CI, real data. Be ready to explain every design decision and what you'd change.",
          },
          {
            id: "sec-writeups-homelab",
            track: "sec",
            label: "Security writeups or homelab published",
            note: "Lab/CTF writeups, a homelab repo (SIEM, AD lab, detection rules), or a tool you built. Shows skill better than a tools list. Don't post spoilers for active challenges.",
          },
          {
            id: "portfolio-site-is-live-and-updated",
            label: "Portfolio site live",
            note: "Projects, resume PDF, and a visible contact method. Click every link and check it on your phone.",
          },
          {
            id: "online-presence-audit",
            label: "Online presence audited",
            note: "Search your name. Clean up or make private anything you wouldn't want a hiring manager to see.",
          },
        ],
      },
      {
        label: "Job boards and alerts",
        items: [
          {
            id: "job-alerts-swe",
            track: "swe",
            label: "LinkedIn and Indeed alerts set up",
            note: "Filter to Entry level, Past week, Portland and Remote, then turn on a daily alert for each title below. Many junior roles don't say \"Software Engineer\" in the title.",
            links: [
              { text: "LinkedIn Jobs", href: "https://www.linkedin.com/jobs/" },
              { text: "Indeed", href: "https://www.indeed.com" },
            ],
            chips: [
              "Junior Software Engineer",
              "Associate Software Engineer",
              "New Grad Software Engineer",
              "Software Developer I",
              "Web Developer",
              "Front-End Developer",
              "Full-Stack Developer",
              "Application Developer",
              "Programmer Analyst",
              "QA Engineer",
              "Implementation Engineer",
              "Solutions Engineer",
              "Technical Support Engineer",
            ],
          },
          {
            id: "job-alerts-sec",
            track: "sec",
            label: "Security job alerts set up",
            note: "Same filters, a daily alert for each title below. Also check USAJobs and defense contractors if you can get clearance.",
            chips: [
              "SOC Analyst",
              "Security Analyst",
              "Junior Penetration Tester",
              "IT Security Specialist",
              "GRC Analyst",
            ],
          },
          {
            id: "handshake-set-up",
            label: "Handshake set up",
            note: "Confirm your login still works, then set preferences and alerts: entry level, Portland and remote. Employers there came looking for your school's grads.",
            links: [{ text: "Open Handshake", href: "https://joinhandshake.com" }],
          },
          {
            id: "oregon-jobs-account",
            label: "State of Oregon jobs account created",
            note: "Keep the work history in the profile current, and attach a resume and cover letter.",
            links: [{ text: "State of Oregon jobs", href: "https://www.oregon.gov/jobs" }],
          },
          {
            id: "wellfound-profile",
            label: "Wellfound profile with role and location filters",
            links: [{ text: "Open Wellfound", href: "https://wellfound.com" }],
          },
          {
            id: "newgrad-lists-bookmarked",
            label: "Two freshest new-grad lists bookmarked",
            note: "Search GitHub for these and bookmark the two most recently updated. They go stale fast.",
            links: [
              { text: "Search “New-Grad-2026”", href: "https://github.com/search?q=New-Grad-2026&type=repositories" },
              { text: "Search “New-Grad-2027”", href: "https://github.com/search?q=New-Grad-2027&type=repositories" },
            ],
          },
        ],
      },
      {
        label: "Tracking",
        items: [
          {
            id: "notion-tracker-set-up-with-all-properties",
            label: "Application tracker set up",
            note: "Spreadsheet, Notion, Huntr, etc. Fields: Company, Role, Resume version, Date applied, Source, Status, Contact, Follow-up date, Notes.",
          },
          {
            id: "board-view-configured-grouped-by-status",
            label: "Status pipeline defined",
            note: "Saved → Applied → Screen → Interview → Offer / Rejected / No response. A board view grouped by status makes this easy to scan.",
          },
          {
            id: "target-company-list",
            label: "Target company list (20–30)",
            note: "A mix of reach and realistic, including the big local employers on the Search tab. Note anyone you know at each — referrals get far more responses than cold applications.",
          },
        ],
      },
    ],
  },
  {
    title: "Interview readiness",
    kind: "setup",
    intro: "Start these before the first interview is booked — there's often less than a week of notice.",
    groups: [
      {
        label: "Behavioral",
        items: [
          {
            id: "star-stories",
            label: "5–6 STAR stories written",
            note: "Conflict, failure, leadership, tight deadline, learning something fast, a project you're proud of. Each under 2 minutes; most can be reused across questions.",
          },
          {
            id: "tell-me-about-yourself",
            label: "\"Tell me about yourself\" and \"Why this role?\"",
            note: "Rehearsed, 60–90 seconds each. Tailor the \"why\" to each company.",
          },
          {
            id: "project-deep-dive",
            label: "Project deep-dive ready",
            note: "Walk through your main project: architecture, tradeoffs, hardest bug, what you'd do differently.",
          },
          {
            id: "questions-to-ask",
            label: "Questions to ask interviewers",
            note: "3–5 per stage — about the team, onboarding, what success looks like at 90 days. Never \"no questions.\"",
          },
        ],
      },
      {
        label: "Technical — software engineering",
        items: [
          {
            id: "dsa-patterns",
            track: "swe",
            label: "Core DS&A patterns covered",
            note: "Work through a curated list (NeetCode 150, Blind 75) by pattern: Arrays & Hashing → Two Pointers → Sliding Window → Stack → Binary Search → Linked List → Trees → Graphs → DP basics.",
            links: [{ text: "Open Interview prep", href: "#interview" }],
          },
          {
            id: "interview-language",
            track: "swe",
            label: "One interview language, known cold",
            note: "Its lists, maps, sets, heaps, sorting, and string handling without looking anything up.",
          },
          {
            id: "mock-interviews-swe",
            track: "swe",
            label: "2+ mock coding interviews done",
            note: "Timed, 45 minutes, talking out loud. Peers, a career center, or free mock-interview sites.",
          },
          {
            id: "system-design-basics",
            track: "swe",
            label: "System design basics",
            note: "REST APIs, SQL vs NoSQL, indexing, caching, load balancing, queues. Enough to sketch a simple \"design X\" at junior level.",
          },
        ],
      },
      {
        label: "Technical — cybersecurity",
        items: [
          {
            id: "networking-fundamentals",
            track: "sec",
            label: "Networking fundamentals",
            note: "OSI / TCP-IP, the TCP handshake, DNS, HTTP(S) and TLS, common ports, subnetting.",
          },
          {
            id: "security-fundamentals",
            track: "sec",
            label: "Security fundamentals",
            note: "CIA triad, authentication vs authorization, hashing vs encryption, OWASP Top 10, common attacks (phishing, SQLi, XSS, privilege escalation).",
          },
          {
            id: "incident-response-walkthrough",
            track: "sec",
            label: "Incident response walkthrough",
            note: "Narrate an alert end to end: triage → contain → eradicate → recover → lessons learned (NIST SP 800-61).",
          },
          {
            id: "log-analysis-tools",
            track: "sec",
            label: "Log analysis and tooling",
            note: "Read Windows event logs and Linux auth logs, write basic SIEM queries (Splunk or Elastic), inspect a packet capture in Wireshark.",
          },
          {
            id: "scenario-practice-sec",
            track: "sec",
            label: "Scenario questions practiced out loud",
            note: "\"You see this alert — what do you do?\" \"A user clicked a phishing link — now what?\"",
          },
        ],
      },
      {
        label: "Logistics",
        items: [
          {
            id: "interview-setup",
            label: "Video interview setup tested",
            note: "Quiet space, stable internet, camera at eye level, Zoom / Teams / Meet all installed and tested.",
          },
          {
            id: "salary-research",
            label: "Salary range researched",
            note: "Levels.fyi, Glassdoor, and BLS data for your location and role. Know your number before the first recruiter call.",
          },
        ],
      },
    ],
  },
  {
    title: "Certifications",
    tag: "Optional",
    kind: "optional",
    intro: "Not counted in Ready to apply. Weighted heavily in security hiring; projects usually matter more for SWE.",
    groups: [
      {
        label: "Certifications",
        items: [
          {
            id: "isc2-certified-in-cybersecurity-cc-earned",
            track: "sec",
            label: "ISC2 Certified in Cybersecurity (CC)",
            note: "Entry-level, good first cert. Check ISC2 for current exam fee and annual maintenance fee.",
          },
          {
            id: "comptia-security-sy0-701-earned",
            track: "sec",
            label: "CompTIA Security+",
            note: "The most requested entry-level security cert, and a baseline for many government roles. Check the current exam version before studying.",
          },
          {
            id: "next-sec-cert",
            track: "sec",
            label: "Next cert chosen by direction",
            note: "Blue team: CySA+ or BTL1. Offensive: eJPT or PNPT. Cloud security: an AWS or Azure cert.",
          },
          {
            id: "cloud-cert-swe",
            track: "swe",
            label: "Cloud cert",
            note: "e.g. AWS Cloud Practitioner or Developer Associate, if your target roles mention cloud.",
          },
          {
            id: "certs-updated-everywhere",
            label: "Each new cert updated everywhere",
            note: "Resume, LinkedIn Licenses section, portfolio. Add the credential ID or verify link; remove any \"in progress\" wording.",
          },
        ],
      },
    ],
  },
];

// ── Search tab ────────────────────────────────────────
// Rounds reset on their own: "daily" each day, "weekly" each Monday.
const ROUNDS = [
  {
    title: "Today",
    kind: "daily",
    groups: [
      {
        items: [
          {
            id: "daily-alerts",
            label: "New alerts checked, fresh postings applied to",
            note: "LinkedIn, Indeed and Handshake. Apply within 24–48 hours of a posting going live, while few people have applied.",
          },
          {
            id: "daily-coding-problem",
            track: "swe",
            label: "One coding problem",
            note: "The Interview prep tab picks it for you and brings back problems for review.",
            links: [{ text: "Open Interview prep", href: "#interview" }],
          },
        ],
      },
    ],
  },
  {
    title: "Weekly rounds",
    kind: "weekly",
    groups: [
      {
        label: "Find",
        items: [
          {
            id: "weekly-newgrad-lists",
            label: "New-grad lists scanned",
            note: "Every few days. Look for remote and Pacific Northwest roles, and apply to the freshest postings first.",
          },
          {
            id: "weekly-careers-pages",
            label: "Careers pages rechecked",
            note: "The big local employers and Oregon public-sector sites under Where to look. Not everything they post reaches the boards.",
          },
          {
            id: "weekly-referral-asks",
            label: "Ask for a referral at a top target",
            note: "Reach out to someone at the company before (or right after) applying.",
          },
        ],
      },
      {
        label: "Follow through",
        items: [
          {
            id: "weekly-follow-ups",
            label: "Follow-ups sent",
            note: "Anything with no response after 1–2 weeks gets one short, polite check-in.",
          },
          {
            id: "weekly-thank-yous",
            label: "Thank-you notes within 24 hours of each interview",
            note: "Every person you spoke with; mention something specific from the conversation.",
          },
          {
            id: "weekly-tracker-review",
            label: "Tracker reviewed",
            note: "Update statuses, set follow-up dates, and look at which resume and source are getting responses.",
          },
        ],
      },
      {
        label: "Skills",
        items: [
          {
            id: "weekly-labs",
            track: "sec",
            label: "1–2 hands-on labs",
            note: "TryHackMe, Hack The Box, PortSwigger Web Security Academy, LetsDefend, Blue Team Labs Online.",
          },
          {
            id: "weekly-cert-study",
            track: "sec",
            label: "3–5 cert study sessions",
            note: "Video lessons plus practice questions. Doubles as interview prep for fundamentals.",
          },
          {
            id: "weekly-ship-something",
            label: "Ship something visible",
            note: "A project commit, a writeup, or a blog post — keeps your GitHub and portfolio current.",
          },
        ],
      },
      {
        label: "Network",
        items: [
          {
            id: "weekly-conversation",
            label: "One real conversation",
            note: "A 15-minute informational chat, a reply thread, or catching up with a former classmate or coworker.",
          },
          {
            id: "weekly-event",
            label: "Event found or attended",
            note: "Aim for one a month: local meetups, OWASP / ISSA chapters, BSides, career fairs, virtual talks, community Discords.",
          },
        ],
      },
    ],
  },
];

// Where to look, in order of payoff. Items are first-pass tasks and stay checked.
const CHANNELS = [
  {
    id: "contacts",
    title: "Warm contacts",
    tag: "Highest payoff",
    open: true,
    why: "A referral gets your resume read by a person. Start here, and keep it going every week.",
    items: [
      { id: "contacts-inr-recommendation", label: "Ask your Institute for Natural Resources contact for a LinkedIn recommendation" },
      { id: "contacts-inr-hiring", label: "Ask that same contact whether they know anyone who is hiring" },
      { id: "contacts-capstone", label: "Email your capstone advisor and ask who they would introduce you to" },
      { id: "contacts-professors", label: "Email 2–3 PSU professors you did well with" },
      { id: "contacts-alumni", label: "Use LinkedIn's alumni search to find PSU grads at companies on your target list" },
    ],
    routine: "Every week: 3–5 short, specific outreach messages, counted above.",
  },
  {
    id: "psu",
    title: "PSU Career Services and Handshake",
    open: true,
    why: "Employers on Handshake came looking for graduates of your school, so the pool is friendlier than LinkedIn's.",
    links: [{ text: "Open Handshake", href: "https://joinhandshake.com" }],
    items: [
      { id: "psu-counselor", label: "Book a meeting with a PSU career counselor" },
      { id: "psu-local-employers", label: "Ask which local employers hire PSU grads every year" },
    ],
    routine: "Daily: check Handshake alerts with the others.",
  },
  {
    id: "github",
    title: "New-grad lists on GitHub",
    why: "Community-maintained tables of genuinely entry-level roles. They update almost daily, so listings go stale fast.",
    links: [
      { text: "Search “New-Grad-2026”", href: "https://github.com/search?q=New-Grad-2026&type=repositories" },
      { text: "Search “New-Grad-2027”", href: "https://github.com/search?q=New-Grad-2027&type=repositories" },
    ],
    routine: "Every few days: scan your two bookmarked lists for remote and Pacific Northwest roles, and apply to the freshest postings first.",
  },
  {
    id: "oregon",
    title: "Oregon public sector",
    why: "Steady hiring, less fixated on certificates, and often remote or hybrid. Aim for Information Systems Specialist 3–5 (ISS 3–5). Many postings say to apply even if you don't meet every qualification.",
    links: [{ text: "State of Oregon jobs", href: "https://www.oregon.gov/jobs" }],
    items: [
      { id: "oregon-iss-search", label: "Search Information Systems Specialist (ISS) 3, 4 and 5" },
      { id: "oregon-portland-multnomah", label: "Check City of Portland and Multnomah County" },
      { id: "oregon-metro-trimet-pps", label: "Check Metro, TriMet and Portland Public Schools" },
      { id: "oregon-ohsu-psu", label: "Check OHSU and PSU's own IT department" },
    ],
    routine: "Weekly: recheck these with the other careers pages.",
  },
  {
    id: "boards",
    title: "LinkedIn and Indeed, used narrowly",
    why: "Filter hard, set alerts, and apply while few people have applied. Many junior roles don't say “Software Engineer” in the title.",
    links: [
      { text: "LinkedIn Jobs", href: "https://www.linkedin.com/jobs/" },
      { text: "Indeed", href: "https://www.indeed.com" },
    ],
    routine: "Daily: work through new alerts and apply within 24–48 hours. Filters and the title list are under Prepare → Job boards and alerts.",
  },
  {
    id: "wellfound",
    title: "Wellfound for startups",
    why: "Built around startups and lean teams, and it tends to connect you directly with founders and hiring managers.",
    links: [{ text: "Open Wellfound", href: "https://wellfound.com" }],
    items: [
      { id: "wellfound-apply-three", label: "Apply to three startups" },
      { id: "wellfound-message-founder", label: "Message one founder or hiring manager directly" },
    ],
  },
  {
    id: "employers",
    title: "Big local employers",
    why: "Not everything they post reaches the boards, so check their career pages directly.",
    items: [
      ["nike", "Nike"],
      ["intel", "Intel"],
      ["daimler", "Daimler Truck North America"],
      ["providence", "Providence"],
      ["kaiser", "Kaiser Permanente"],
      ["columbia", "Columbia Sportswear"],
      ["tsmc", "TSMC Washington"],
    ].map(([id, name]) => ({ id: `employer-${id}`, label: `Check the ${name} careers page` })),
    routine: "Weekly: recheck these with the other careers pages.",
  },
];

const COUNTERS = { apps: 10, outreach: 3 }; // low end of each goal
const BADGE = { swe: "SWE", sec: "SEC" };

// ── Dates ─────────────────────────────────────────────
function isoDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
// Monday of the week containing d, local time.
function weekStart(d = new Date()) {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}
const NOW = new Date();
const TODAY = isoDate(NOW);
const MONDAY = weekStart(NOW);
const WEEK = isoDate(MONDAY);
const PREV_WEEK = isoDate(new Date(MONDAY.getFullYear(), MONDAY.getMonth(), MONDAY.getDate() - 7));

function stateKey(id, kind) {
  if (kind === "weekly") return `week:${WEEK}:${id}`;
  if (kind === "daily") return `day:${TODAY}:${id}`;
  if (kind === "plan") return `plan:${id}`;
  return id; // setup / optional: unchanged from the original checklist
}

// ── Rendering ─────────────────────────────────────────
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function linksNode(links) {
  const wrap = el("div", "links");
  for (const l of links) {
    const a = el("a", null, l.text);
    a.href = l.href;
    if (!l.href.startsWith("#")) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    wrap.append(a);
  }
  return wrap;
}

function chipsNode(chips) {
  const wrap = el("div");
  const head = el("div", "chips-head");
  const copy = el("button", "quiet", "Copy titles");
  copy.type = "button";
  copy.addEventListener("click", () => {
    const done = (msg) => {
      copy.textContent = msg;
      setTimeout(() => (copy.textContent = "Copy titles"), 2000);
    };
    try {
      navigator.clipboard.writeText(chips.join("\n")).then(
        () => done("Copied"),
        () => done("Copy blocked: select the text"),
      );
    } catch {
      done("Copy blocked: select the text");
    }
  });
  head.append(el("span", null, "Titles to set alerts for"), copy);
  const ul = el("ul", "chips");
  for (const c of chips) ul.append(el("li", null, c));
  wrap.append(head, ul);
  return wrap;
}

function itemNode(item, kind) {
  const track = item.track || "all";
  const li = el("li");
  li.dataset.track = track;

  const label = el("label", "item");
  const box = el("input");
  box.type = "checkbox";
  box.disabled = true; // enabled once saved state has loaded
  box.dataset.key = stateKey(item.id, kind);
  box.dataset.kind = kind;

  const text = el("span", "item-text");
  const name = el("span", "item-label", item.label);
  if (BADGE[track]) name.append(el("span", `badge badge-${track}`, BADGE[track]));
  text.append(name);
  if (item.note) text.append(el("span", "item-note", item.note));
  label.append(box, text);
  li.append(label);

  if (item.links || item.chips) {
    const extras = el("div", "extras");
    if (item.links) extras.append(linksNode(item.links));
    if (item.chips) extras.append(chipsNode(item.chips));
    li.append(extras);
  }
  return li;
}

function listNode(items, kind) {
  const ul = el("ul", "items");
  for (const item of items) ul.append(itemNode(item, kind));
  return ul;
}

function summaryNode(title, tag) {
  const summary = el("summary");
  const left = el("span", "sum-left");
  const chev = el("span", "chev");
  chev.setAttribute("aria-hidden", "true");
  const name = el("span", "sum-title");
  name.append(el("h3", null, title));
  if (tag) name.append(el("span", "tag", tag));
  left.append(chev, name);
  summary.append(left, el("span", "sec-count"));
  return summary;
}

// Prepare: a heading per phase, an accordion per group.
const preparePanel = document.getElementById("panel-prepare");
for (const phase of PREPARE) {
  const section = el("section", "phase");
  section.dataset.phase = "";
  const head = el("div", "phase-head");
  const title = el("div", "phase-title");
  title.append(el("h2", null, phase.title));
  if (phase.tag) title.append(el("span", "tag", phase.tag));
  head.append(title);
  section.append(head);
  if (phase.intro) section.append(el("p", "phase-intro", phase.intro));

  for (const group of phase.groups) {
    const details = el("details");
    details.open = true;
    details.dataset.group = "";
    details.dataset.countable = "";
    const body = el("div", "body");
    body.append(listNode(group.items, phase.kind));
    details.append(summaryNode(group.label), body);
    section.append(details);
  }
  preparePanel.append(section);
}

// Search: today + weekly rounds as plain grouped lists.
const roundsHost = document.getElementById("rounds");
const dayLabel = NOW.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const weekLabel = MONDAY.toLocaleDateString(undefined, { month: "short", day: "numeric" });
document.getElementById("week-meta").textContent = `Week of ${weekLabel} · resets Monday`;

for (const round of ROUNDS) {
  const section = el("section", "phase");
  section.dataset.countable = "";
  const head = el("div", "phase-head");
  head.append(el("h2", null, round.title));
  const meta = el("span", "meta");
  meta.append(
    el("span", null, round.kind === "daily" ? `${dayLabel} · ` : "Resets Monday · "),
    el("span", "sec-count"),
  );
  head.append(meta);
  section.append(head);
  for (const group of round.groups) {
    const wrap = el("div");
    wrap.dataset.group = "";
    if (group.label) wrap.append(el("h3", "group-label", group.label));
    wrap.append(listNode(group.items, round.kind));
    section.append(wrap);
  }
  const empty = el("p", "empty", round.kind === "daily" ? "All done for today." : "All done for this week.");
  empty.hidden = true;
  section.append(empty);
  roundsHost.append(section);
}

// Search: where to look.
const channelsHost = document.getElementById("channels");
for (const ch of CHANNELS) {
  const details = el("details");
  details.open = !!ch.open;
  details.dataset.channel = ch.id;
  if (ch.items) details.dataset.countable = "";
  const body = el("div", "body");
  body.append(el("p", "why", ch.why));
  if (ch.links) body.append(linksNode(ch.links));
  if (ch.items) body.append(listNode(ch.items, "plan"));
  if (ch.routine) body.append(el("p", "routine", ch.routine));
  details.append(summaryNode(ch.title, ch.tag), body);
  channelsHost.append(details);
}

// ── Behavior ──────────────────────────────────────────
const boxes = [...document.querySelectorAll("main ul.items input[type=checkbox]")];
const trackButtons = [...document.querySelectorAll("#track-picker button")];
const hideDoneInput = document.getElementById("hide-done");
const controls = document.getElementById("controls");
const tabs = [...document.querySelectorAll("[role=tab]")];
const TABS = tabs.map((t) => t.dataset.tab);
let track = "all";
let tab = "prepare";
let interview = null; // set once its saved state has loaded

const onTrack = (li) => track === "all" || li.dataset.track === "all" || li.dataset.track === track;

function applyVisibility() {
  const hideDone = hideDoneInput.checked;
  for (const box of boxes) {
    const li = box.closest("li");
    const on = onTrack(li);
    li.dataset.on = on ? "1" : "";
    li.hidden = !on || (hideDone && box.checked);
    li.querySelector(".badge")?.toggleAttribute("hidden", track !== "all");
  }
  // Hide groups and phases with nothing left to show.
  for (const g of document.querySelectorAll("[data-group]")) {
    g.hidden = !g.querySelector("li:not([hidden])");
  }
  for (const p of document.querySelectorAll("[data-phase]")) {
    p.hidden = !p.querySelector("[data-group]:not([hidden])");
  }
  // Channels keep their context; only the finished list disappears.
  for (const ul of document.querySelectorAll("[data-channel] ul.items")) {
    ul.hidden = !ul.querySelector("li:not([hidden])");
  }
  trackButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.track === track)));
}

function tally(scope) {
  const list = [...scope.querySelectorAll("li[data-on='1'] input")];
  return { done: list.filter((b) => b.checked).length, total: list.length };
}

function updateCounts() {
  for (const scope of document.querySelectorAll("[data-countable]")) {
    const { done, total } = tally(scope);
    const count = scope.querySelector(".sec-count");
    count.textContent = total ? `${done} of ${total}` : "";
    count.classList.toggle("done", total > 0 && done === total);
    const empty = scope.querySelector(":scope > .empty");
    if (empty) empty.hidden = !(total > 0 && done === total && hideDoneInput.checked);
  }

  let label, done, total;
  if (tab === "interview") {
    const p = interview ? interview.progress() : { done: 0, total: 0, due: 0 };
    label = p.due ? `Problems attempted · ${p.due} due for review` : "Problems attempted";
    ({ done, total } = p);
  } else {
    const kind = tab === "prepare" ? "setup" : "weekly";
    const list = boxes.filter((b) => b.dataset.kind === kind && b.closest("li").dataset.on === "1");
    label = tab === "prepare" ? "Ready to apply" : "Weekly rounds";
    done = list.filter((b) => b.checked).length;
    total = list.length;
  }
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("bar-label").textContent = label;
  document.getElementById("bar-count").textContent = `${done} of ${total}`;
  document.getElementById("fill").style.width = pct + "%";
  document.getElementById("meter").setAttribute("aria-valuenow", String(pct));
}

function refresh() {
  applyVisibility();
  updateCounts();
}

// Tabs: #prepare / #search / #interview in the URL, last one remembered per browser.
function showTab(name) {
  tab = TABS.includes(name) ? name : "prepare";
  for (const t of tabs) {
    const selected = t.dataset.tab === tab;
    t.setAttribute("aria-selected", String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
  }
  // Track and hide-completed only apply to the checklists.
  controls.hidden = tab === "interview";
  try {
    localStorage.setItem("jobSearchPlan:tab", tab);
  } catch {
    // storage unavailable — the tab just won't be remembered
  }
  updateCounts();
}

function selectTab(name, focus) {
  showTab(name);
  history.replaceState(null, "", "#" + tab);
  if (focus) document.getElementById("tab-" + tab).focus();
}

tabs.forEach((t, i) => {
  t.addEventListener("click", () => selectTab(t.dataset.tab));
  t.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    selectTab(next.dataset.tab, true);
  });
});
window.addEventListener("hashchange", () => {
  showTab(location.hash.slice(1));
  window.scrollTo({ top: 0 });
});

let savedTab = null;
try {
  savedTab = localStorage.getItem("jobSearchPlan:tab");
} catch {
  // ignore
}
showTab(location.hash.slice(1) || savedTab || "prepare");
refresh();

// ── Saved state ───────────────────────────────────────
// The checklists and the problem list keep the documents they had as
// separate tools, so no saved progress needed migrating.
const [state, prepState] = await Promise.all([
  syncedState("job-search-checklist"),
  syncedState("interview-prep"),
]);

const statusEl = document.getElementById("sync");
const STATUS_TEXT = {
  synced: "Synced across devices",
  "saved-locally": "Saved on this device, syncing when reachable",
  offline: "Offline. Changes are saved on this device.",
};
const statuses = {};
function showStatus(doc, status) {
  statuses[doc] = status;
  const all = Object.values(statuses);
  const worst = ["offline", "saved-locally", "synced"].find((s) => all.includes(s));
  statusEl.textContent = STATUS_TEXT[worst] || "";
  statusEl.classList.toggle("is-error", worst === "offline");
}
state.onStatus((s) => showStatus("plan", s));
prepState.onStatus((s) => showStatus("prep", s));

for (const box of boxes) {
  box.checked = !!state.get(box.dataset.key);
  box.disabled = false;
  box.addEventListener("change", () => {
    state.set(box.dataset.key, box.checked);
    refresh();
  });
}

function renderCounters() {
  for (const [name, goal] of Object.entries(COUNTERS)) {
    const n = state.get(`week:${WEEK}:count:${name}`) || 0;
    const count = document.getElementById("count-" + name);
    count.textContent = n;
    count.classList.toggle("met", n >= goal);
    const prev = state.get(`week:${PREV_WEEK}:count:${name}`);
    document.getElementById("last-" + name).textContent = prev != null ? `Last week: ${prev}` : "";
  }
}
for (const btn of document.querySelectorAll(".step")) {
  btn.disabled = false;
  btn.addEventListener("click", () => {
    const key = `week:${WEEK}:count:${btn.dataset.counter}`;
    state.set(key, Math.max(0, (state.get(key) || 0) + Number(btn.dataset.delta)));
    renderCounters();
  });
}
renderCounters();

track = ["all", "swe", "sec"].includes(state.get("track")) ? state.get("track") : "all";
hideDoneInput.checked = !!state.get("hideDone");
trackButtons.forEach((b) =>
  b.addEventListener("click", () => {
    track = b.dataset.track;
    state.set("track", track);
    refresh();
  }),
);
hideDoneInput.addEventListener("change", () => {
  state.set("hideDone", hideDoneInput.checked);
  refresh();
});
refresh();

// Finished Prepare groups start collapsed; open the rest.
for (const details of preparePanel.querySelectorAll("details")) {
  const { done, total } = tally(details);
  details.open = !(total > 0 && done === total);
}

interview = mountInterview(document.getElementById("panel-interview"), prepState, updateCounts);
updateCounts();
