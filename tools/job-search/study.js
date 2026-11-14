// Study tab: the skills help desk interviews ask about (networking, a Windows
// Server lab, Microsoft and help desk basics), then interview readiness.
// Every item counts in the tab's bar. Saved progress is keyed by item id.

export const STUDY = [
  {
    title: "Help desk foundations",
    kind: "study",
    intro: "Help desk postings ask for networking, Windows, Active Directory and Microsoft 365 basics. Coddy's networking path on weekdays, the Windows lab on weekends. Everything here is free.",
    groups: [
      {
        label: "Networking (Coddy)",
        items: [
          {
            id: "hd-coddy-networking-started",
            label: "Coddy Computer Networking path started",
            note: "OSI model, IP addressing and subnetting, terminal tools, LAN labs. Free, in the browser.",
            links: [{ text: "Coddy", href: "https://coddy.tech" }],
          },
          {
            id: "hd-coddy-networking-finished",
            label: "Coddy Computer Networking path finished",
          },
          {
            id: "hd-networking-explain",
            label: "Can explain it out loud",
            note: "What happens when you type a URL, DNS, DHCP, IP vs MAC, common ports, and ipconfig / ping / nslookup / tracert.",
          },
        ],
      },
      {
        label: "Windows lab (Active Directory)",
        items: [
          {
            id: "hd-lab-virtualbox",
            label: "VirtualBox installed on the Intel MacBook Air",
            note: "Check RAM first. With 8 GB, give the server 2 GB and the client 3–4 GB, and close other apps. 16 GB runs both comfortably.",
            links: [{ text: "VirtualBox downloads", href: "https://www.virtualbox.org/wiki/Downloads" }],
          },
          {
            id: "hd-lab-eval-isos",
            label: "Windows Server 2025 and Windows 11 Enterprise downloaded",
            note: "Free evaluations from the Microsoft Evaluation Center: 180 days for Server, 90 for Windows 11.",
            links: [{ text: "Microsoft Evaluation Center", href: "https://www.microsoft.com/en-us/evalcenter" }],
          },
          {
            id: "hd-lab-domain-joined",
            label: "Domain controller built, Windows 11 joined to the domain",
            note: "Josh Madakor's free \"Active Directory home lab\" video on YouTube is a good guide for the first build.",
          },
          {
            id: "hd-lab-helpdesk-tasks",
            label: "Help desk tasks practiced",
            note: "Create users, reset passwords, unlock accounts, add users to groups, give a group access to a shared folder.",
          },
          {
            id: "hd-lab-group-policy",
            label: "Group Policy practiced",
            note: "Set a wallpaper, block USB drives, map a drive.",
          },
          {
            id: "hd-lab-break-fix-network",
            label: "Broke and fixed the client's network settings",
            note: "Set a wrong DNS server, then a wrong IP, on purpose. Find each problem with ipconfig and nslookup.",
          },
          {
            id: "it-powershell-basics",
            label: "Basic PowerShell in the lab",
            note: "Get-ADUser, Unlock-ADAccount, Get-Service, Test-NetConnection. Run them until you don't need to look them up.",
          },
          {
            id: "hd-lab-writeup",
            label: "Lab write-up, resume and LinkedIn line",
            note: "Screenshots on GitHub or tannercheek.com. Resume line: \"Built a Windows Server Active Directory lab: user and group management, password resets, Group Policy, file share permissions.\"",
          },
        ],
      },
      {
        label: "Microsoft and help desk basics",
        items: [
          {
            id: "hd-learn-reference",
            label: "Microsoft Learn used as a reference",
            note: "Free. Look things up there while building the lab. Skip certification paths for now.",
            links: [{ text: "Microsoft Learn training", href: "https://learn.microsoft.com/training" }],
          },
          {
            id: "hd-m365-admin-basics",
            label: "Microsoft 365 admin basics",
            note: "Assigning licenses, resetting MFA, fixing an Outlook profile, from Microsoft Learn and YouTube. The free Microsoft 365 developer sandbox usually rejects personal accounts, so learn this by reading and watching.",
          },
          {
            id: "it-ticketing-hands-on",
            label: "A ticketing system, hands-on",
            note: "ServiceNow's free Personal Developer Instance: open, assign, update and resolve a few incidents so you can talk about it.",
            links: [{ text: "ServiceNow Developer", href: "https://developer.servicenow.com" }],
          },
          {
            id: "it-troubleshooting-walkthroughs",
            label: "Troubleshooting walkthroughs, out loud",
            note: "\"A user can't get online / can't print / Outlook won't open / is locked out.\" Gather info, reproduce, check the simple things, isolate, fix, document, follow up.",
          },
        ],
      },
    ],
  },
  {
    title: "Interview readiness",
    kind: "study",
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
            note: "Rehearsed, 60–90 seconds each. For help desk: customer service plus technical depth, and why support is the work you want. Tailor the \"why\" to each company.",
          },
          {
            id: "gap-answer",
            label: "An answer for the 2022–2026 gap",
            note: "Two or three calm sentences: what you were doing, then what you've built since (capstone, Windows lab). Say it out loud until it's easy.",
          },
          {
            id: "project-deep-dive-lab",
            label: "Project deep-dive ready",
            note: "The Windows lab and the capstone: what you built and why, the hardest problem, and what you'd do differently.",
          },
          {
            id: "helpdesk-questions-out-loud",
            label: "Common help desk questions practiced out loud",
            note: "How do you handle a frustrated user? Walk me through a user who can't log in. What would you do if you didn't know the answer? Tell me about a time you explained something technical to a non-technical person.",
          },
          {
            id: "questions-to-ask",
            label: "Questions to ask interviewers",
            note: "3–5 per stage: about the team, the ticket queue and tools, onboarding, and what success looks like at 90 days. Never \"no questions.\"",
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
];
