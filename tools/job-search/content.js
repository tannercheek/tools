// Prepare and Search tab content for one goal: a help desk / IT support job.
// Saved progress is keyed by item id, so an id is only reused while its
// meaning holds; changed work gets a new id.

// ── Prepare tab ───────────────────────────────────────
// Everything here counts toward Ready to apply.
export const PREPARE = [
  {
    title: "Before you apply",
    kind: "setup",
    groups: [
      {
        label: "Resumes",
        items: [
          {
            id: "resume-helpdesk-final",
            label: "IT & Security resume final",
            note: "The one resume, used for help desk. Skills list only what you can talk through: macOS, Windows, Linux command line, Google Workspace, Microsoft Word & Excel, GitHub, Burp Suite, Nmap. Add Windows Server, Active Directory and Group Policy once the lab is done.",
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
            id: "resume-one-page",
            label: "One page",
          },
          {
            id: "resumes-reviewed-parse-tested",
            label: "Reviewed and parse-tested",
            note: "Have a mentor, peer, or PSU career services review it. Copy the text out of the PDF into a plain-text editor. If it comes out garbled, so will the ATS.",
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
            note: "Who you are, what you've done, what you're looking for. For help desk: 11 years keeping customers happy as a shift lead, a CS degree, and a Windows Server lab you built. It's also your outreach intro.",
          },
        ],
      },
      {
        label: "LinkedIn",
        items: [
          {
            id: "linkedin-headline",
            label: "Headline names the role you want",
            note: "e.g. \"IT Support | Help Desk | CS Graduate\". Recruiters search these words.",
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
            note: "github.com/tannercheek: short bio, current focus (help desk and IT support), links to tannercheek.com and LinkedIn.",
          },
          {
            id: "pinned-repos-presentable",
            label: "3 best repos pinned and presentable",
            note: "Capstone first, then the Windows lab write-up when it's done. Each README says what it is, why it exists, how to run it, and has a screenshot or demo link.",
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
            id: "handshake-set-up",
            label: "Handshake set up",
            note: "Confirm your login still works, then set preferences and alerts: entry level, Portland and remote. Employers there came looking for your school's grads.",
            links: [{ text: "Open Handshake", href: "https://joinhandshake.com" }],
          },
          {
            id: "oregon-jobs-account",
            label: "State of Oregon jobs account created",
            note: "Keep the work history in the profile current, and attach your resume and a cover letter.",
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
            note: "Spreadsheet, Notion, Huntr, etc. Fields: Company, Role, Date applied, Source, Status, Contact, Follow-up date, Notes.",
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
            note: "Your help desk and IT support searches on LinkedIn, Indeed and Handshake. Apply within 24–48 hours of a posting going live, while few people have applied.",
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
            label: "Staffing recruiters checked in with",
            note: "Anyone you haven't heard from in two weeks gets a short note: still looking, here's what's new (lab progress, new skills).",
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
            note: "Update statuses, set follow-up dates, and look at which sources are getting responses.",
          },
        ],
      },
      {
        label: "Show your work",
        items: [
          {
            id: "weekly-ship-lab-progress",
            label: "Share something you learned",
            note: "A step of the Windows lab write-up on GitHub or tannercheek.com, or a short LinkedIn post about what you built or figured out that week.",
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
            note: "Aim for one a month: PSU career events, job fairs, local tech meetups.",
          },
        ],
      },
    ],
  },
];

// Where to look, in the plan's order of odds. Items are first-pass tasks and
// stay checked.
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
    tag: "Best odds",
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
];
