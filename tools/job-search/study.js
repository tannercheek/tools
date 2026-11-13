// Study tab: Security+ (SY0-701), the home lab, and SOC Tier 1 skills, plus
// the exam-date ticket that paces the objectives.
// kind "study" counts in the tab's bar; "later" doesn't; "weekly" resets Mondays.

const o = (id, label, note) => ({ id: `sy0701-${id}`, label: `${id} ${label}`, note, objective: true });

export const STUDY = [
  {
    title: "Security+ (SY0-701)",
    kind: "study",
    intro: "How to study: watch one objective's Messer videos, write a few lines of notes in your own words, then do 10–15 practice questions on it. Check it off when you could explain it to a coworker.",
    groups: [
      {
        label: "Get set up",
        items: [
          {
            id: "secplus-registered",
            label: "Exam booked, 5–6 weeks out",
            note: "Buy the voucher and book through Pearson VUE, at a test center or online. Book SY0-701: it stays open until about mid-2027, and Messer's and Dion's material is all for 701. Then add the date above and to your resumes.",
            links: [{ text: "Pearson VUE: CompTIA", href: "https://home.pearsonvue.com/comptia" }],
          },
          {
            id: "secplus-messer-course",
            label: "Professor Messer's course bookmarked",
            note: "Free videos, one per exam objective, in the same order as the list below. Grab the objectives PDF from the same page.",
            links: [{ text: "Messer SY0-701 course", href: "https://www.professormesser.com/security-plus/sy0-701/sy0-701-video/sy0-701-comptia-security-plus-course/" }],
          },
          {
            id: "secplus-dion-exams",
            label: "Jason Dion's practice exams bought",
            note: "Set 1 on Udemy: 540 timed questions with explanations. Udemy sales put it far below list price.",
            links: [{ text: "Dion Set 1 on Udemy", href: "https://www.udemy.com/course/comptia-security-sy0-701-practice-exams/" }],
          },
        ],
      },
      {
        label: "1. General security concepts",
        tag: "12%",
        items: [
          o("1.1", "Security controls", "Categories (technical, managerial, operational, physical) and types (preventive, deterrent, detective, corrective, compensating, directive)."),
          o("1.2", "Fundamental concepts", "CIA, non-repudiation, AAA, gap analysis, Zero Trust (control and data planes), physical security, deception (honeypots, honeytokens)."),
          o("1.3", "Change management", "Approval, ownership, impact analysis, backout plans, maintenance windows; technical effects like restarts, downtime and dependencies."),
          o("1.4", "Cryptographic solutions", "PKI, symmetric vs asymmetric, hashing, salting, key stretching, digital signatures, certificates, TPM and HSM, obfuscation."),
        ],
      },
      {
        label: "2. Threats, vulnerabilities and mitigations",
        tag: "22%",
        items: [
          o("2.1", "Threat actors and motivations", "Nation-state, unskilled attacker, hacktivist, insider, organized crime, shadow IT; their resources, sophistication and motives."),
          o("2.2", "Threat vectors and attack surfaces", "Email, SMS, removable media, unsupported systems, open ports, default credentials, supply chain, and social engineering (phishing, vishing, pretexting, typosquatting)."),
          o("2.3", "Types of vulnerabilities", "Memory injection, buffer overflow, race conditions, SQL injection, XSS, misconfiguration, zero-day, cloud and mobile (sideloading, jailbreaking)."),
          o("2.4", "Indicators of malicious activity", "Malware types; physical, network, application and password attacks; and the signs: impossible travel, account lockouts, missing logs, resource spikes."),
          o("2.5", "Mitigation techniques", "Segmentation, access control, allow lists, isolation, patching, encryption, monitoring, least privilege, hardening, decommissioning."),
        ],
      },
      {
        label: "3. Security architecture",
        tag: "18%",
        items: [
          o("3.1", "Architecture models", "Cloud and shared responsibility, infrastructure as code, serverless, microservices, on-prem, virtualization, containers, IoT, ICS/SCADA, embedded."),
          o("3.2", "Securing enterprise infrastructure", "Device placement, security zones, fail-open vs fail-closed, firewalls, IDS/IPS, proxies, load balancers, VPN, 802.1X, SD-WAN, SASE."),
          o("3.3", "Protecting data", "Data types and classifications, states (at rest, in transit, in use), sovereignty, encryption, hashing, masking, tokenization."),
          o("3.4", "Resilience and recovery", "High availability, hot, warm and cold sites, capacity planning, testing, backups, power (UPS, generators)."),
        ],
      },
      {
        label: "4. Security operations",
        tag: "28%",
        items: [
          o("4.1", "Securing computing resources", "Secure baselines, hardening, wireless (WPA3, RADIUS), mobile (MDM, BYOD, COPE, CYOD), application security."),
          o("4.2", "Asset management", "Acquisition, ownership, inventory, and disposal (sanitization, destruction, certification, retention)."),
          o("4.3", "Vulnerability management", "Scanning, pen testing, threat feeds, bug bounties, CVE and CVSS, prioritization, patching, exceptions, validation, reporting."),
          o("4.4", "Alerting and monitoring", "Log aggregation, alerting, archiving, alert tuning; SIEM, SCAP, antivirus, DLP, SNMP traps, NetFlow."),
          o("4.5", "Enhancing security", "Firewall rules, IDS/IPS signatures, web and DNS filtering, Group Policy, SELinux, email security (SPF, DKIM, DMARC), FIM, NAC, EDR/XDR."),
          o("4.6", "Identity and access management", "Provisioning, SSO (LDAP, OAuth, SAML), federation, RBAC, ABAC, MAC, DAC, MFA, password managers, privileged access."),
          o("4.7", "Automation and orchestration", "Use cases (provisioning, guard rails, ticketing, escalation), the benefits, and the risks: complexity, cost, technical debt."),
          o("4.8", "Incident response", "Preparation, detection, analysis, containment, eradication, recovery, lessons learned; tabletop tests, root cause analysis, threat hunting, forensics."),
          o("4.9", "Data sources for investigations", "Firewall, application, endpoint, OS, IDS/IPS and network logs, metadata, vulnerability scans, dashboards, packet captures."),
        ],
      },
      {
        label: "5. Program management and oversight",
        tag: "20%",
        items: [
          o("5.1", "Security governance", "Policies (AUP, incident response, BCP), standards, procedures, governance structures, and data roles (owner, controller, processor, custodian)."),
          o("5.2", "Risk management", "Qualitative vs quantitative, SLE, ARO and ALE, risk register, appetite and tolerance, transfer, accept, avoid, mitigate, BIA (RTO, RPO, MTTR, MTBF)."),
          o("5.3", "Third-party risk", "Vendor assessment and selection, agreements (SLA, MOA, MOU, MSA, SOW, NDA, BPA), questionnaires, rules of engagement, monitoring."),
          o("5.4", "Security compliance", "Reporting, consequences of non-compliance, compliance monitoring, privacy (GDPR, data subject rights, right to be forgotten)."),
          o("5.5", "Audits and assessments", "Attestation, internal and external audits, pen tests (known, partially known, unknown environment; physical, offensive, defensive)."),
          o("5.6", "Security awareness", "Phishing campaigns, recognizing anomalous behavior, user training, reporting, and running an awareness program."),
        ],
      },
      {
        label: "Practice and exam",
        items: [
          {
            id: "secplus-baseline-exam",
            label: "First full practice exam, as a baseline",
            note: "Around the halfway point. Sort what you missed by domain; that's your re-study list.",
          },
          {
            id: "secplus-weak-domains",
            label: "Weakest domains re-studied",
            note: "Rewatch those Messer videos and redo the questions you missed until you can say why each wrong answer is wrong.",
          },
          {
            id: "secplus-pbqs",
            label: "Performance-based questions practiced",
            note: "Drag-and-drop and simulation questions come first on the exam. Practice a few, and on exam day flag them and come back after the multiple choice.",
          },
          {
            id: "secplus-85-twice",
            label: "85% or better on two practice exams in a row",
            note: "Dion's exams run harder than the real one, so this is a safe margin. Not there a week out? Reschedule; it costs less than a retake.",
          },
          {
            id: "comptia-security-sy0-701-earned",
            label: "Passed Security+",
          },
          {
            id: "certs-updated-everywhere",
            label: "Resumes, LinkedIn and tannercheek.com updated",
            note: "Swap \"scheduled\" for the credential ID or verify link, and add it to LinkedIn's Licenses section.",
          },
        ],
      },
    ],
  },
  {
    title: "Home lab",
    tag: "Weeks 1–6",
    kind: "study",
    intro: "Windows Server, Active Directory, PowerShell and Splunk: what help desk and SOC postings ask for and your resume doesn't show yet. Apple Silicon Macs can't run Windows Server well, so use a spare PC, a used mini PC, or cloud VMs.",
    groups: [
      {
        label: "Build, attack, detect, write up",
        items: [
          {
            id: "lab-host",
            label: "Lab host and an isolated network",
            note: "A PC or mini PC with 16 GB+ RAM running Proxmox or VirtualBox, or cloud VMs (set a billing alert). Keep lab traffic on its own internal network.",
          },
          {
            id: "lab-windows-ad",
            label: "Windows Server domain controller with Active Directory",
            note: "Microsoft's free evaluation ISOs. Add OUs, users and groups, join a Windows 11 client, set a few Group Policies. Practice help desk basics here: password resets, unlocks, group changes.",
          },
          {
            id: "lab-linux",
            label: "Linux server on the lab network",
            note: "Ubuntu Server with SSH open, so there are Linux auth logs to watch.",
          },
          {
            id: "lab-sysmon",
            label: "Sysmon on the Windows machines",
            note: "Use a community config, such as SwiftOnSecurity's or sysmon-modular.",
          },
          {
            id: "lab-siem",
            label: "Logs flowing into Splunk Free or Wazuh",
            note: "Splunk's Universal Forwarder or the Wazuh agent on every host. Check that Windows Security, Sysmon and Linux auth logs are all searchable.",
          },
          {
            id: "lab-kali-attacks",
            label: "Attacks run from Kali",
            note: "Nmap scans, brute force against SSH and RDP, password spraying, a suspicious PowerShell download, Kerberoasting. Note the time of each so you can find it in the logs.",
          },
          {
            id: "lab-detections",
            label: "A detection for each attack",
            note: "A saved search or rule per attack, mapped to its MITRE ATT&CK technique, with a note on likely false positives.",
          },
          {
            id: "sec-writeups-homelab",
            label: "Write-up published",
            note: "A repo with setup steps, a network diagram, your detection rules and screenshots, plus a post on tannercheek.com. Pin the repo.",
          },
          {
            id: "lab-resume-skills",
            label: "New skills added to your resumes",
            note: "Windows Server, Active Directory, Group Policy, PowerShell, Sysmon, Splunk or Wazuh, Kali. Only what you actually used and can talk about.",
          },
        ],
      },
    ],
  },
  {
    title: "SOC Tier 1 skills",
    tag: "For 2027",
    kind: "later",
    intro: "What SOC interviews expect you to know cold. Security+ covers the theory; these make it hands-on, and most of it builds while you're in IT. Not counted above.",
    groups: [
      {
        label: "Know cold",
        items: [
          {
            id: "security-fundamentals",
            label: "Security fundamentals",
            note: "CIA triad, authentication vs authorization, hashing vs encryption, OWASP Top 10, common attacks (phishing, SQLi, XSS, privilege escalation).",
          },
          {
            id: "phishing-analysis",
            label: "Phishing analysis",
            note: "Read headers (SPF, DKIM, DMARC, Received chain), check links and attachments safely in a sandbox, and write a short verdict with the indicators you found.",
          },
          {
            id: "log-analysis-tools",
            label: "Log analysis and SIEM",
            note: "Read Windows event logs and Linux auth logs, write basic Splunk searches, inspect a packet capture in Wireshark. The home lab is your practice data.",
          },
          {
            id: "incident-response-walkthrough",
            label: "Incident response walkthrough",
            note: "Narrate an alert end to end: triage → contain → eradicate → recover → lessons learned (NIST SP 800-61).",
          },
          {
            id: "scenario-practice-sec",
            label: "Scenario questions practiced out loud",
            note: "\"You see this alert. What do you do?\" \"A user clicked a phishing link. Now what?\"",
          },
        ],
      },
      {
        label: "Every week",
        kind: "weekly",
        items: [
          {
            id: "weekly-labs",
            label: "1–2 hands-on labs",
            note: "TryHackMe's SOC Level 1 path, LetsDefend, Blue Team Labs Online, CyberDefenders. Phishing and SIEM investigations first.",
          },
        ],
      },
      {
        label: "Next cert",
        items: [
          {
            id: "next-sec-cert",
            label: "Next cert chosen",
            note: "After Security+ and some time in IT: CySA+ or BTL1 for SOC work. Ask whether your employer will pay for it.",
          },
        ],
      },
    ],
  },
];

// ── Exam ticket ───────────────────────────────────────
const DAY = 86400000;
const BUFFER_DAYS = 7; // finish objectives a week out, for practice exams

function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

// Wires the exam date input and fills in days left and the objective pace.
// Returns paint(), to call whenever a checkbox changes.
export function mountExam(root, state, today) {
  const input = root.querySelector("#exam-date");
  const leftEl = root.querySelector("#exam-left");
  const paceEl = root.querySelector("#exam-pace");
  const objectives = [...root.querySelectorAll("input[data-objective]")];
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  input.value = state.get("secplusExamDate") || "";
  input.disabled = false;
  input.addEventListener("change", () => {
    state.set("secplusExamDate", input.value || null);
    paint();
  });

  function paint() {
    const total = objectives.length;
    const left = objectives.filter((b) => !b.checked).length;
    const exam = parseDate(input.value);

    if (!exam) {
      leftEl.textContent = "Not booked yet";
      paceEl.textContent = `${total - left} of ${total} objectives covered. Book the exam 5–6 weeks out, then add the date here to see your pace.`;
      return;
    }
    const days = Math.round((exam - midnight) / DAY);
    leftEl.textContent =
      days > 1 ? `${days} days to go` : days === 1 ? "Tomorrow" : days === 0 ? "Today" : "Date has passed";

    if (days < 0) {
      paceEl.textContent = "Passed? Check it off below. Rescheduled? Set the new date.";
    } else if (left === 0) {
      paceEl.textContent = `All ${total} objectives covered. Practice exams until you score 85% or better twice in a row.`;
    } else {
      const toTarget = days - BUFFER_DAYS;
      const head = `${left} of ${total} objectives left`;
      if (toTarget >= 7) {
        const perWeek = Math.ceil(left / (toTarget / 7));
        paceEl.textContent = `${head}: about ${perWeek} a week to finish with a week to spare for practice exams.`;
      } else if (toTarget > 0) {
        const perDay = Math.ceil(left / toTarget);
        paceEl.textContent = `${head}: about ${perDay} a day to finish with a week to spare for practice exams.`;
      } else {
        paceEl.textContent = `${head} and under a week of buffer. Cover Security operations (28%) and Threats (22%) first.`;
      }
    }
  }
  paint();
  return paint;
}
