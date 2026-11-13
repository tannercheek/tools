// Prepare and Search tab content. Saved progress is keyed by item id, so an
// id is only reused while its meaning holds; changed work gets a new id.
// track: "it" | "sec" | "swe", or an array of them; omitted means everyone.

// ── Prepare tab ───────────────────────────────────────
// kind "setup" counts toward Ready to apply; "optional" doesn't.
export const PREPARE = [
  {
    title: "Before you apply",
    kind: "setup",
    groups: [
      {
        label: "Resumes",
        items: [
          {
            id: "resume-it-final",
            track: "it",
            label: "IT support resume final",
            note: "Leads with 11 years as a customer-facing shift lead and the CS degree. Skills: Windows, macOS, Microsoft 365, TCP/IP, DNS, DHCP, ticketing. List only what you can talk through.",
          },
          {
            id: "resume-sec-final",
            track: "sec",
            label: "Security resume final",
            note: "Aimed at SOC Tier 1: Security+ as scheduled, the home lab under Projects once it exists, and only tools you've actually used.",
          },
          {
            id: "resume-swe-final",
            track: "swe",
            label: "Software resume final",
            note: "For web, agency and adjacent roles: lead with the capstone and shipped code, with the stack in every project line.",
          },
          {
            id: "resume-capstone-bullets",
            label: "Capstone bullets rewritten",
            note: "Stack, hosting, database, a metric or two, the live URL and the repo link.",
          },
          {
            id: "resume-probuilt-numbers",
            label: "Numbers added to ProBuilt",
            note: "How many, how often, how fast: whatever's true and countable.",
          },
          {
            id: "resume-projects-certs-sections",
            label: "Projects and Certifications sections on each",
            note: "Once you're booked: \"CompTIA Security+ (SY0-701), exam scheduled <month year>\".",
          },
          {
            id: "resume-swe-sec-distinct",
            track: ["sec", "swe"],
            label: "Software and security resumes clearly different",
            note: "They're about 90% identical now. Each should lead with the summary, skills and projects its own postings ask for.",
          },
          {
            id: "resume-one-page",
            label: "One page each",
          },
          {
            id: "resumes-reviewed-parse-tested",
            label: "All three reviewed and parse-tested",
            note: "Have a mentor, peer, or PSU career services review them. Copy text out of each PDF into a plain-text editor. If it comes out garbled, so will the ATS.",
          },
        ],
      },
      {
        label: "Other materials",
        items: [
          {
            id: "cover-letter-template",
            label: "Cover letter template",
            note: "Three short paragraphs: why this company, the one most relevant thing you've done, a brief close. Rewrite the first line every time.",
          },
          {
            id: "set-up-a-permanent-professional-email",
            label: "Permanent professional email",
            note: "firstname.lastname@…, not a school or work address that will expire. Use it everywhere below.",
          },
          {
            id: "references-lined-up",
            label: "2–3 references lined up",
            note: "Ask first. A past manager who saw you run a shift is gold for help desk. Keep their title, email, phone, and how they know you in one doc.",
          },
          {
            id: "elevator-pitch",
            label: "30-second pitch",
            note: "Who you are, what you've done, what you're looking for. For IT: 11 years keeping customers happy as a shift lead, a CS degree, and Security+ underway. It's also your outreach intro.",
          },
        ],
      },
      {
        label: "LinkedIn",
        items: [
          {
            id: "linkedin-headline",
            label: "Headline names the role you want",
            note: "e.g. \"IT Support | Help Desk | CS Graduate | Security+ (scheduled)\". Recruiters search these words.",
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
            note: "Treat major projects like jobs: role, dates, the same bullets. Mismatches between resume and profile raise questions.",
          },
          {
            id: "linkedin-skills-featured",
            label: "Skills and Featured sections filled in",
            note: "Pin the 3 skills that appear most in help desk postings. Feature your best project and tannercheek.com.",
          },
          {
            id: "turn-on-open-to-work",
            label: "Open to Work turned on",
            note: "Help Desk Technician, IT Support Specialist, Service Desk Analyst, Desktop Support Technician, plus Portland and remote.",
          },
        ],
      },
      {
        label: "GitHub and portfolio",
        items: [
          {
            id: "profile-readme-is-up-to-date",
            label: "GitHub profile README",
            note: "github.com/tannercheek: short bio, current focus (IT and security), links to tannercheek.com and LinkedIn.",
          },
          {
            id: "pinned-repos-presentable",
            label: "3 best repos pinned and presentable",
            note: "Capstone first; swap in the home lab and the TypeScript app as they ship. Each README says what it is, why it exists, how to run it, and has a screenshot or demo link.",
          },
          {
            id: "repos-scrubbed-for-secrets",
            label: "Public repos scrubbed for secrets",
            note: "No API keys, .env files, or credentials in current code or commit history. Run a scanner like gitleaks or trufflehog to check.",
          },
          {
            id: "portfolio-site-is-live-and-updated",
            label: "tannercheek.com live and current",
            note: "Projects, a resume PDF, and a visible contact method. Click every link and check it on your phone.",
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
            id: "job-alerts-it",
            track: "it",
            label: "IT support alerts set up",
            note: "LinkedIn and Indeed: filter to Entry level, Past week, Portland and Remote, then turn on a daily alert for each title. The same job goes by many names.",
            links: [
              { text: "LinkedIn Jobs", href: "https://www.linkedin.com/jobs/" },
              { text: "Indeed", href: "https://www.indeed.com" },
            ],
            chips: [
              "Help Desk Technician",
              "Service Desk Analyst",
              "IT Support Specialist",
              "Desktop Support Technician",
              "Technical Support Specialist",
              "IT Technician",
              "Computer Support Specialist",
              "IT Support Analyst",
            ],
          },
          {
            id: "job-alerts-sec",
            track: "sec",
            label: "Security job alerts set up",
            note: "Not to apply yet: most want 1–3 years of IT first. Watch which tools and certs keep coming up, and steer the home lab toward them.",
            chips: [
              "SOC Analyst",
              "Security Analyst",
              "Cybersecurity Analyst",
              "Information Security Analyst",
              "IT Security Specialist",
            ],
          },
          {
            id: "job-alerts-swe",
            track: "swe",
            label: "Developer and adjacent alerts set up",
            note: "Web and Webflow roles, adjacent titles that value a CS degree, and junior roles at small and mid-size non-tech companies.",
            chips: [
              "Webflow Developer",
              "Web Developer",
              "Technical Support Engineer",
              "Implementation Engineer",
              "Solutions Engineer",
              "QA Engineer",
              "Test Automation Engineer",
              "Junior Data Analyst",
              "Junior Software Engineer",
              "Software Developer I",
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
            note: "Keep the work history in the profile current, and attach the IT resume and a cover letter.",
            links: [{ text: "State of Oregon jobs", href: "https://www.oregon.gov/jobs" }],
          },
        ],
      },
      {
        label: "Tracking",
        items: [
          {
            id: "notion-tracker-set-up-with-all-properties",
            label: "Application tracker set up",
            note: "Spreadsheet, Notion, Huntr, etc. Fields: Company, Role, Resume version (IT, security, software), Date applied, Source, Status, Contact, Follow-up date, Notes.",
          },
          {
            id: "board-view-configured-grouped-by-status",
            label: "Status pipeline defined",
            note: "Saved → Applied → Screen → Interview → Offer / Rejected / No response. A board view grouped by status makes this easy to scan.",
          },
          {
            id: "target-company-list",
            label: "Target company list (20–30)",
            note: "Agencies, public employers and the big local employers on the Search tab. Note anyone you know at each; referrals get far more responses than cold applications.",
          },
        ],
      },
    ],
  },
  {
    title: "Interview readiness",
    kind: "setup",
    intro: "Start these before the first interview is booked. There's often less than a week of notice.",
    groups: [
      {
        label: "Behavioral",
        items: [
          {
            id: "star-stories",
            label: "5–6 STAR stories written",
            note: "Shift-lead stories count: an upset customer you turned around, training a new hire, a rush you kept running, a mistake you owned. Plus a project you're proud of. Each under 2 minutes.",
          },
          {
            id: "tell-me-about-yourself",
            label: "\"Tell me about yourself\" and \"Why this role?\"",
            note: "Rehearsed, 60–90 seconds each. For IT: customer service plus technical depth, and why support is the start you want. Tailor the \"why\" to each company.",
          },
          {
            id: "gap-answer",
            label: "An answer for the 2022–2026 gap",
            note: "Two or three calm sentences: what you were doing, then what you've built since (capstone, home lab). Say it out loud until it's easy.",
          },
          {
            id: "project-deep-dive",
            label: "Project deep-dive ready",
            note: "The capstone now, the home lab once it's built: architecture, tradeoffs, hardest problem, what you'd do differently.",
          },
          {
            id: "questions-to-ask",
            label: "Questions to ask interviewers",
            note: "3–5 per stage: about the team, onboarding, what success looks like at 90 days, and whether there's a path into security. Never \"no questions.\"",
          },
        ],
      },
      {
        label: "Technical: IT support",
        items: [
          {
            id: "it-troubleshooting-walkthroughs",
            track: "it",
            label: "Troubleshooting walkthroughs, out loud",
            note: "\"A user can't get online / can't print / Outlook won't open / is locked out.\" Gather info, reproduce, check the simple things, isolate, fix, document, follow up.",
          },
          {
            id: "networking-fundamentals",
            track: ["it", "sec"],
            label: "Networking fundamentals",
            note: "OSI / TCP-IP, DNS, DHCP, the TCP handshake, HTTP(S) and TLS, common ports, subnetting, plus ipconfig, ping, nslookup and tracert.",
          },
          {
            id: "it-windows-ad-m365",
            track: "it",
            label: "Windows, Active Directory and Microsoft 365 basics",
            note: "Reset a password and unlock an account in AD, map a drive, fix an Outlook profile, assign an M365 license, set up MFA. The home lab gives you real practice.",
          },
          {
            id: "it-powershell-basics",
            track: "it",
            label: "Basic PowerShell",
            note: "Get-ADUser, Unlock-ADAccount, Get-Service, Get-EventLog, Test-NetConnection. Run them in the home lab until you don't need to look them up.",
          },
          {
            id: "it-ticketing-hands-on",
            track: "it",
            label: "A ticketing system, hands-on",
            note: "ServiceNow's free Personal Developer Instance: open, assign, update and resolve a few incidents so you can talk about it.",
            links: [{ text: "ServiceNow Developer", href: "https://developer.servicenow.com" }],
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
            note: "Portland help desk runs about $22–30/hr, desktop support about $60–78k, some junior IT roles $75–95k. Check Glassdoor and BLS for each title, and know your number before the first recruiter call.",
          },
        ],
      },
    ],
  },
  {
    title: "Keep software engineering open",
    tag: "Not counted",
    kind: "optional",
    intro: "Junior software roles are scarce right now, so this is the side path: one project in weeks 1–6, then light practice so it's still open after a few years in IT.",
    groups: [
      {
        label: "Project: full-stack TypeScript app",
        items: [
          {
            id: "swe-app-stack",
            track: "swe",
            label: "TypeScript app with Postgres and auth",
          },
          {
            id: "swe-app-tests-ci",
            track: "swe",
            label: "Tests and GitHub Actions CI",
          },
          {
            id: "swe-app-llm-feature",
            track: "swe",
            label: "One LLM feature",
            note: "RAG over your own data, or a tool-calling agent. Small and working beats ambitious and half-done.",
          },
          {
            id: "swe-app-deployed",
            track: "swe",
            label: "Deployed with a live URL",
          },
          {
            id: "swe-app-readme",
            track: "swe",
            label: "README covers how you used AI tools",
            note: "What you used them for, what you checked by hand, what you'd do differently. Employers ask.",
          },
        ],
      },
      {
        label: "Coding interviews",
        items: [
          {
            id: "dsa-patterns",
            track: "swe",
            label: "Core DS&A patterns covered",
            note: "LeetCode easy and medium, 45 minutes a day, by pattern: Arrays & Hashing → Two Pointers → Sliding Window → Stack → Binary Search → Linked List → Trees → Graphs → DP basics.",
            links: [{ text: "Open Interview prep", href: "#interview" }],
          },
          {
            id: "interview-language",
            track: "swe",
            label: "One interview language, known cold",
            note: "Its lists, maps, sets, heaps, sorting, and string handling without looking anything up.",
          },
          {
            id: "capstone-architecture-whiteboard",
            track: "swe",
            label: "Capstone architecture whiteboarded",
            note: "Draw it from memory: client, server, database, hosting, auth. Explain each choice and what you'd change.",
          },
          {
            id: "mock-interviews-swe",
            track: "swe",
            label: "2+ mock coding interviews done",
            note: "Timed, 45 minutes, talking out loud. Peers, PSU career services, or free mock-interview sites.",
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
        label: "Certification",
        items: [
          {
            id: "cloud-cert-swe",
            track: "swe",
            label: "Cloud cert",
            note: "e.g. AWS Cloud Practitioner, if your target roles mention cloud. Azure fits better if you end up in a Microsoft shop.",
          },
        ],
      },
    ],
  },
];

// ── Search tab ────────────────────────────────────────
// Rounds reset on their own: "daily" each day, "weekly" each Monday.
export const ROUNDS = [
  {
    title: "Today",
    kind: "daily",
    groups: [
      {
        items: [
          {
            id: "daily-alerts",
            label: "New alerts checked, fresh postings applied to",
            note: "LinkedIn, Indeed and Handshake, plus the SimplifyJobs list for software roles. Apply within 24–48 hours of a posting going live, while few people have applied.",
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
            id: "weekly-careers-pages",
            label: "Careers pages rechecked",
            note: "Government and institution sites and the big local employers under Where to look. Not everything they post reaches the boards.",
          },
          {
            id: "weekly-agency-checkin",
            track: "it",
            label: "Staffing recruiters checked in with",
            note: "Anyone you haven't heard from in two weeks gets a short note: still looking, here's what's new (Security+ date, lab progress).",
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
        label: "Show your work",
        items: [
          {
            id: "weekly-ship-something",
            label: "Ship something visible",
            note: "A home lab step, a write-up, or a project commit. Keeps GitHub and tannercheek.com current.",
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
            note: "Aim for one a month: OWASP Portland, BSides PDX, PSU events, local meetups, a CTF.",
          },
        ],
      },
    ],
  },
];

// Where to look, in the plan's order of odds. Items are first-pass tasks and
// stay checked. A channel's track applies to its items.
export const CHANNELS = [
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
      { id: "contacts-alumni", label: "Use LinkedIn's alumni search to find PSU CS grads at companies on your target list" },
    ],
    routine: "Every week: 5 short, specific messages, mostly to PSU CS alumni, counted above.",
  },
  {
    id: "agencies",
    title: "IT staffing agencies",
    tag: "Best odds now",
    track: "it",
    open: true,
    why: "Many Portland help desk and desktop support jobs are filled through these agencies, often contract-to-hire. A recruiter in the Portland office who knows you gets you placed faster than applying to their listings online.",
    links: [
      { text: "TEKsystems", href: "https://www.teksystems.com" },
      { text: "Robert Half", href: "https://www.roberthalf.com" },
      { text: "Kforce", href: "https://www.kforce.com" },
      { text: "Insight Global", href: "https://insightglobal.com" },
      { text: "WorkSource Oregon", href: "https://worksourceoregon.org/jobseekers" },
    ],
    items: [
      { id: "agency-teksystems", label: "Call or email the TEKsystems Portland office and get on a recruiter's list" },
      { id: "agency-robert-half", label: "Do the same with Robert Half" },
      { id: "agency-kforce", label: "Do the same with Kforce" },
      { id: "agency-insight-global", label: "Do the same with Insight Global" },
      { id: "worksource-oregon", label: "Register with WorkSource Oregon and fill in your iMatchSkills profile" },
    ],
    routine: "Weekly: check in with any recruiter you haven't heard from in two weeks.",
  },
  {
    id: "oregon",
    title: "Government and institutions",
    open: true,
    why: "Steady hiring, published pay ranges, good benefits, and plenty of help desk and desktop support work. State IT roles are titled Information Systems Specialist (ISS); the low numbers are the entry levels. Many postings say to apply even if you don't meet every qualification.",
    links: [{ text: "State of Oregon jobs", href: "https://www.oregon.gov/jobs" }],
    items: [
      { id: "oregon-iss-search", label: "Search State of Oregon postings for Information Systems Specialist (ISS)" },
      { id: "oregon-portland-multnomah", label: "Check City of Portland and Multnomah County" },
      { id: "oregon-ohsu-psu", label: "Check OHSU and PSU's own IT department" },
      { id: "oregon-pcc", label: "Check Portland Community College" },
      { id: "oregon-metro-trimet-pps", label: "Check Metro, TriMet and Portland Public Schools" },
    ],
    routine: "Weekly: recheck these with the other careers pages.",
  },
  {
    id: "employers",
    title: "Big local employers",
    why: "Large IT departments with their own service desks. Not everything they post reaches the boards, so check their career pages directly.",
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
  {
    id: "psu",
    title: "PSU Career Services and Handshake",
    why: "Career services still helps alumni, and employers on Handshake came looking for your school's grads, so the pool is friendlier than LinkedIn's.",
    links: [{ text: "Open Handshake", href: "https://joinhandshake.com" }],
    items: [
      { id: "psu-counselor", label: "Book a meeting with a PSU career counselor" },
      { id: "psu-local-employers", label: "Ask which local employers hire PSU grads every year" },
    ],
    routine: "Daily: check Handshake alerts with the others.",
  },
  {
    id: "boards",
    title: "LinkedIn and Indeed, used narrowly",
    why: "Filter hard, set alerts, and apply while few people have applied. Help desk roles hide under many titles: service desk, desktop support, technical support.",
    links: [
      { text: "LinkedIn Jobs", href: "https://www.linkedin.com/jobs/" },
      { text: "Indeed", href: "https://www.indeed.com" },
    ],
    routine: "Daily: work through new alerts and apply within 24–48 hours. Filters and the title lists are under Prepare → Job boards and alerts.",
  },
  {
    id: "security-community",
    title: "Portland security community",
    tag: "For the SOC move",
    track: "sec",
    why: "Where Portland security people meet. Showing up regularly while you're in IT is how a SOC lead knows your name before a posting opens.",
    items: [
      { id: "community-owasp-pdx", label: "Go to an OWASP Portland chapter meeting" },
      { id: "community-bsides-pdx", label: "Find BSides PDX's next date and plan to go (or volunteer)" },
      { id: "community-slack-discord", label: "Join a Portland tech Slack or Discord and introduce yourself" },
      { id: "community-ctf-team", label: "Join a CTF team" },
    ],
    routine: "Monthly: one event, logged in your weekly rounds.",
  },
  {
    id: "webflow",
    title: "Webflow and web agencies",
    track: "swe",
    why: "Freelance Webflow brings in income and keeps your shipping record current, and agency developer roles are the likeliest software jobs for you right now.",
    items: [
      { id: "webflow-freelance-restart", label: "Restart freelance Webflow: refresh your profile and tell past clients you're taking work" },
      { id: "webflow-agency-list", label: "List 10 Portland web or Webflow agencies and check their openings" },
    ],
  },
  {
    id: "github",
    title: "SimplifyJobs new-grad list",
    track: "swe",
    why: "A community-maintained table of genuinely entry-level software roles, updated almost daily. Look for Portland, Pacific Northwest and remote, freshest first.",
    links: [{ text: "SimplifyJobs New-Grad-Positions", href: "https://github.com/SimplifyJobs/New-Grad-Positions" }],
    routine: "Daily, with your alerts.",
  },
];
