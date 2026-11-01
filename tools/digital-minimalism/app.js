/* ═══════════════════════════════════════════════════════════
   DIGITAL MINIMALISM
   Merged from the privacy-lockdown and footprint-deletion guides,
   reorganised around attention rather than vendors.

   To add or edit content, edit the PHASES array below
   (Survival Devices lives in survival.js).
   Item ids must stay stable — they're the persistence keys.
   ═══════════════════════════════════════════════════════════ */

import { SURVIVAL } from "./survival.js";

/* ── the work, in phases ─────────────────────────────────── */

const PHASES = [
  /* ═══════════ REDUCE ═══════════ */
  {
    id: "reduce",
    name: "Reduce",
    kind: "check",
    lede:
      "Privacy is about what companies know. Minimalism is about what gets your attention. " +
      "This phase is the one missing from most privacy guides, and it is the one you feel immediately.",
    groups: [
      {
        id: "r-declutter",
        name: "The 30-Day Declutter",
        why:
          "Cal Newport's protocol: remove all optional technology for thirty days, then reintroduce only what earns its place. " +
          "The point is not the abstinence — it is that reintroduction forces you to state what each tool is actually for.",
        items: [
          {
            id: "r-d1",
            sev: "core",
            text: '<b>Define "optional."</b> A tool is optional if removing it for 30 days causes inconvenience rather than real harm. Write the list before you start — roughly 20–40 apps for most people.',
          },
          {
            id: "r-d2",
            sev: "core",
            text: "<b>Remove all of them for 30 days.</b> Delete the apps; don't just hide them. Keep the accounts alive for now — deletion comes in a later phase, after you know what you actually miss.",
          },
          {
            id: "r-d3",
            sev: "core",
            text: "<b>Fill the gap deliberately.</b> The declutter fails when you leave a vacuum. Decide in advance what occupies the reclaimed hours — an instrument, a project, a book, climbing.",
          },
          {
            id: "r-d4",
            sev: "core",
            text: "<b>Reintroduce with a written rule.</b> For each tool you bring back, answer: what part of my life does it serve, and what specific rule governs its use? No rule, no reinstall.",
          },
          {
            id: "r-d5",
            sev: "rec",
            text: "<b>Note what you never missed.</b> Anything you didn't think about once in 30 days is a free deletion in the Delete phase.",
          },
        ],
      },
      {
        id: "r-notif",
        name: "Notifications & Interruption",
        why: "A notification is a stranger deciding when you stop thinking. Default-on is a business decision made by someone who is not you.",
        items: [
          {
            id: "r-n1",
            sev: "core",
            text: "<b>Turn off every notification, then re-enable individually.</b> iOS: Settings → Notifications → work down the list. The only survivors should be people (calls, messages from a short list) and time-critical logistics.",
          },
          {
            id: "r-n2",
            sev: "core",
            text: "<b>No badges on anything.</b> Red dots are engineered anxiety with no information content. Settings → Notifications → [app] → Badges off.",
          },
          {
            id: "r-n3",
            sev: "core",
            text: "<b>Zero notifications from any social, news or shopping app.</b> These have no time-critical content by definition.",
          },
          {
            id: "r-n4",
            sev: "rec",
            text: "<b>Set up Focus modes per bucket.</b> One each for Work, Music, and Personal — each allowing only the apps and people that bucket needs. iOS: Settings → Focus.",
          },
          {
            id: "r-n5",
            sev: "rec",
            text: "<b>Schedule a sleep Focus</b> that starts 90 minutes before bed and allows only favourites and repeat calls.",
          },
          {
            id: "r-n6",
            sev: "opt",
            text: '<b>Turn off "Show Previews" globally</b> so the lock screen stops being a readable feed. Settings → Notifications → Show Previews → Never (or When Unlocked).',
          },
        ],
      },
      {
        id: "r-phone",
        name: "Phone Surface Area",
        why: "The home screen is the menu. Anything reachable in one tap will be used far more than anything reachable in three.",
        items: [
          {
            id: "r-p1",
            sev: "core",
            text: "<b>One home screen only.</b> Everything else lives in App Library and is reached by search. This single change removes most idle scrolling.",
          },
          {
            id: "r-p2",
            sev: "core",
            text: "<b>Nothing on the home screen that has a feed.</b> If it has an infinite scroll, it doesn't get a permanent address.",
          },
          {
            id: "r-p3",
            sev: "rec",
            text: "<b>Greyscale as a default,</b> with a shortcut to toggle colour when you need it. Settings → Accessibility → Display & Text Size → Colour Filters → Greyscale. Triple-click side button to toggle.",
          },
          {
            id: "r-p4",
            sev: "rec",
            text: "<b>Delete every app you did not deliberately reinstall</b> after the declutter. Not offload — delete.",
          },
          {
            id: "r-p5",
            sev: "rec",
            text: "<b>Remove the browser from the dock</b> and log out of feed-style sites in mobile Safari. Friction is the whole mechanism.",
          },
          {
            id: "r-p6",
            sev: "opt",
            text: "<b>Screen Time limits as a backstop,</b> not a primary tool. If you need a limit on an app you deliberately reinstalled, the reinstall decision was wrong.",
          },
        ],
      },
      {
        id: "r-subs",
        name: "Subscriptions & Sprawl",
        why: "Subscriptions are the financial shadow of app sprawl. Auditing them surfaces tools you forgot you were carrying.",
        items: [
          {
            id: "r-s1",
            sev: "core",
            text: "<b>List every recurring charge.</b> iOS: Settings → [name] → Subscriptions. Then check your bank statement for the ones billed outside the App Store — that's where the forgotten ones hide.",
          },
          {
            id: "r-s2",
            sev: "core",
            text: "<b>Name what each subscription is for.</b> Anything you can't tie to a specific, active part of your life gets cancelled this week.",
          },
          {
            id: "r-s3",
            sev: "rec",
            text: "<b>Consolidate duplicate-purpose tools.</b> Two note apps, three task managers, four cloud drives. Pick one per job and migrate.",
          },
          {
            id: "r-s4",
            sev: "rec",
            text: "<b>Audit your music-project tooling specifically.</b> Six projects can quietly mean six distribution accounts, six analytics dashboards and six social schedulers. Decide which projects justify the overhead.",
          },
        ],
      },
      {
        id: "r-rules",
        name: "Operating Procedures",
        why: "Minimalism isn't abstinence, it's intentionality. A tool with a written rule is a tool you control.",
        items: [
          {
            id: "r-o1",
            sev: "core",
            text: '<b>Write one sentence per surviving tool:</b> "I use X for Y, at Z times." Keep the list somewhere you\'ll see it — this doc counts.',
          },
          {
            id: "r-o2",
            sev: "core",
            text: "<b>Batch the checking.</b> Email and messages at set times rather than continuously. Two or three windows a day handles nearly everything.",
          },
          {
            id: "r-o3",
            sev: "rec",
            text: "<b>Social platforms on desktop only,</b> if at all. Posting for your music projects doesn't require the app on your phone.",
          },
          {
            id: "r-o4",
            sev: "rec",
            text: "<b>Separate creation from consumption.</b> The device you make music on should not be the device you scroll on — or at minimum, a different Focus mode.",
          },
          {
            id: "r-o5",
            sev: "opt",
            text: "<b>Schedule one offline block per week.</b> Half a day, phone in a drawer. Treat it as a standing appointment, not a reward.",
          },
        ],
      },
    ],
  },

  /* ═══════════ DELETE ═══════════ */
  {
    id: "delete",
    name: "Delete",
    kind: "check",
    lede:
      "Removing accounts and records that exist. Work top-down — brokers first, since they aggregate everything else, " +
      "and deleting a source after a broker has copied it doesn't undo the copy.",
    groups: [
      {
        id: "d-brokers",
        name: "Data Brokers",
        why:
          "Brokers buy, merge and resell your address history, phone numbers, relatives and income estimates. " +
          "They are the reason your details resurface after you clean up everywhere else. Removal is not permanent — they re-scrape, so this becomes a recurring task.",
        items: [
          {
            id: "d-b1",
            sev: "core",
            text: "<b>Search yourself first.</b> Look up your name plus city on the major aggregators to see what's actually exposed. It calibrates how much effort the rest deserves.",
          },
          {
            id: "d-b2",
            sev: "core",
            text: "<b>Choose automated or manual.</b> A removal service (~$3–15/mo) handles hundreds of brokers continuously; manual is free but needs a few hours up front and quarterly repeats. Automated is worth it for the first year at minimum.",
          },
          {
            id: "d-b3",
            sev: "core",
            text: "<b>Opt out of the big four manually regardless:</b> Whitepages, Spokeo, BeenVerified, and Radaris. These carry the most traffic and are worth doing by hand even if you also pay a service.",
          },
          {
            id: "d-b4",
            sev: "rec",
            text: '<b>Remove yourself from Google\'s "Results about you"</b> tool, which surfaces and requests removal of pages containing your contact details. <a href="https://myactivity.google.com/results-about-you" target="_blank" rel="noopener">results-about-you</a>',
          },
          {
            id: "d-b5",
            sev: "rec",
            text: '<b>Freeze your credit at all three bureaus.</b> Free, reversible, and blocks the most damaging downstream use of leaked personal data. <a href="https://www.equifax.com/personal/credit-report-services/credit-freeze/" target="_blank" rel="noopener">Equifax</a> · <a href="https://www.experian.com/freeze/center.html" target="_blank" rel="noopener">Experian</a> · <a href="https://www.transunion.com/credit-freeze" target="_blank" rel="noopener">TransUnion</a>',
          },
          {
            id: "d-b6",
            sev: "opt",
            text: "<b>Record which brokers you've cleared and when.</b> You'll need it — most re-list within 6–12 months.",
          },
          {
            id: "d-b7",
            sev: "rec",
            text: '<b>Freeze the two bureaus most people miss:</b> Innovis, and ChexSystems, which blocks fraudulent bank accounts. Keep every bureau\'s PIN with your recovery codes. A thaw is free and quick when you need to apply for credit. <a href="https://www.innovis.com/personal/securityFreeze" target="_blank" rel="noopener">Innovis</a> · <a href="https://www.chexsystems.com/security-freeze" target="_blank" rel="noopener">ChexSystems</a>',
          },
          {
            id: "d-b8",
            sev: "opt",
            text: '<b>Opt out of the next tier of people-search sites</b> if a removal service isn\'t already covering them: <a href="https://www.intelius.com/opt-out" target="_blank" rel="noopener">Intelius</a> · <a href="https://www.truepeoplesearch.com/removal" target="_blank" rel="noopener">TruePeopleSearch</a> · <a href="https://www.fastpeoplesearch.com/removal" target="_blank" rel="noopener">FastPeopleSearch</a> · <a href="https://www.usphonebook.com/opt-out" target="_blank" rel="noopener">USPhonebook</a> · <a href="https://thatsthem.com/optout" target="_blank" rel="noopener">ThatsThem</a> · <a href="https://www.peoplefinder.com/optout" target="_blank" rel="noopener">PeopleFinder</a> · <a href="https://www.mylife.com/privacy-policy#opt-out" target="_blank" rel="noopener">MyLife</a> · <a href="https://nuwber.com/removal/link" target="_blank" rel="noopener">Nuwber</a> · <a href="https://clustrmaps.com/bl/opt-out" target="_blank" rel="noopener">ClustrMaps</a>. MyLife also publishes a public "reputation score". Get that removed too.',
          },
        ],
      },
      {
        id: "d-wholesale",
        name: "Wholesale Data Brokers",
        why:
          "People-search sites are the retail end. These companies are the wholesale end: they buy court, utility, employer, insurance and DMV records " +
          "and sell full profiles to banks, insurers, landlords, employers and investigators. " +
          "Clearing Spokeo does nothing here, so you have to opt out of both layers. Their opt-out pages are deliberately hard to find.",
        items: [
          {
            id: "d-w1",
            sev: "core",
            text: '<b>LexisNexis and Thomson Reuters CLEAR.</b> The two giants. CLEAR is the one investigators use, and LexisNexis holds your insurance-claims (CLUE) history. <a href="https://optout.lexisnexis.com/" target="_blank" rel="noopener">LexisNexis</a> · <a href="https://legalsolutions.thomsonreuters.com/law-products/clear/consumer-privacy-form" target="_blank" rel="noopener">CLEAR</a>',
          },
          {
            id: "d-w2",
            sev: "rec",
            text: '<b>The Work Number.</b> Your employer reports your pay to it every pay period, and Equifax sells it to landlords, lenders and background checkers. Request a data freeze. <a href="https://www.equifax.com/personal/help/workforce-solutions-contact/" target="_blank" rel="noopener">The Work Number</a>',
          },
          {
            id: "d-w3",
            sev: "rec",
            text: '<b>CoreLogic and Verisk.</b> CoreLogic feeds tenant screening and property records. Verisk\'s ClaimSearch holds every home and auto insurance claim you\'ve filed. <a href="https://www.corelogic.com/privacy/consumer-data-privacy-request/" target="_blank" rel="noopener">CoreLogic</a> · <a href="https://www.verisk.com/privacy-notice/" target="_blank" rel="noopener">Verisk</a>',
          },
          {
            id: "d-w4",
            sev: "opt",
            text: '<b>Skip tracers and list sellers:</b> TransUnion TLO (separate from your credit file), Tracers, Merlin (utility hook-ups reveal when you moved in) and Data Axle (mailing and phone lists). <a href="https://www.transunion.com/consumer-privacy" target="_blank" rel="noopener">TransUnion TLO</a> · <a href="https://www.tracersinfo.com/consumer-privacy/" target="_blank" rel="noopener">Tracers</a> · <a href="https://merlindata.com/consumer-opt-out/" target="_blank" rel="noopener">Merlin</a> · <a href="https://www.data.com/consumer-access/" target="_blank" rel="noopener">Data Axle</a>',
          },
          {
            id: "d-w5",
            sev: "opt",
            text: '<b>Request your Sift score.</b> Sift rates whether you look like a fraudster, based on your behaviour across every site that uses it. <a href="https://sift.com/resources/how-to-get-your-sift-score" target="_blank" rel="noopener">Sift</a>',
          },
        ],
      },
      {
        id: "d-adloc",
        name: "Ad & Location Brokers",
        why:
          "People-search brokers sell who you are. Ad brokers sell what you do, and location brokers sell where you go: " +
          'where you sleep, work, worship and see a doctor. "Anonymised" location data rarely is. One home-to-work path identifies one person.',
        items: [
          {
            id: "d-l1",
            sev: "core",
            text: '<b>Opt out of the big identity graphs:</b> Acxiom, LiveRamp (which ties your offline identity to your online activity), Epsilon and Lotame. <a href="https://isapps.acxiom.com/optout/optout.aspx" target="_blank" rel="noopener">Acxiom</a> · <a href="https://liveramp.com/opt_out/" target="_blank" rel="noopener">LiveRamp</a> · <a href="https://www.epsilon.com/us/consumer-information" target="_blank" rel="noopener">Epsilon</a> · <a href="https://www.lotame.com/about-lotame/privacy/lotames-products-services-privacy-policy/" target="_blank" rel="noopener">Lotame</a>',
          },
          {
            id: "d-l2",
            sev: "opt",
            text: '<b>Run the industry-wide ad opt-outs:</b> NAI and DAA WebChoices cover 100+ ad networks at once. They\'re stored as cookies, so clearing cookies wipes them. Redo them per browser, or lean on the Lock Down network settings instead. <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener">NAI</a> · <a href="https://optout.aboutads.info/" target="_blank" rel="noopener">DAA</a>',
          },
          {
            id: "d-l3",
            sev: "rec",
            text: '<b>Opt out of the location brokers:</b> SafeGraph (privacy@safegraph.com), Placer.ai (privacy@placer.ai), Outlogic (formerly X-Mode), and Gravy Analytics (privacy@gravyanalytics.com). Gravy was breached in 2025, and its subsidiary Venntel sold phone location data to federal agencies. <a href="https://www.safegraph.com/privacy-policy" target="_blank" rel="noopener">SafeGraph</a> · <a href="https://www.placer.ai/privacy" target="_blank" rel="noopener">Placer.ai</a> · <a href="https://xmode.io/opt-out/" target="_blank" rel="noopener">Outlogic</a> · <a href="https://gravyanalytics.com/privacy/" target="_blank" rel="noopener">Gravy Analytics</a>',
          },
        ],
      },
      {
        id: "d-letters",
        name: "When There's No Opt-Out",
        why:
          "No web form doesn't mean no obligation to delete. It's a bet that you won't write a letter. " +
          "Ignored requests still count: they're the paper trail regulators use to build enforcement cases.",
        items: [
          {
            id: "d-r1",
            sev: "rec",
            text: '<b>California residents: file one DROP request.</b> The state\'s Delete Request and Opt-out Platform sends a single deletion request to every registered data broker (600+), and brokers have had to process it since August 2026. <a href="https://privacy.ca.gov/drop/" target="_blank" rel="noopener">DROP</a>',
          },
          {
            id: "d-r2",
            sev: "rec",
            text: '<b>Send a formal deletion request</b> to any broker without a form. datarequests.org generates a ready-to-send letter. Send it by email and certified mail, and note the date you sent it. <a href="https://www.datarequests.org/generator/" target="_blank" rel="noopener">datarequests.org</a>',
          },
          {
            id: "d-r3",
            sev: "opt",
            text: '<b>Escalate the ones that ignore you.</b> File with your state attorney general and the FTC; California residents can also file with the CPPA. Each complaint is a data point in someone\'s next case. <a href="https://reportfraud.ftc.gov/" target="_blank" rel="noopener">FTC</a> · <a href="https://cppa.ca.gov/complaints/" target="_blank" rel="noopener">CPPA</a>',
          },
        ],
      },
      {
        id: "d-accounts",
        name: "Dormant Accounts",
        why:
          "Every account is a standing liability — a breach waiting to leak your email, password and details. " +
          "The ones you forgot about are the dangerous ones, because you won't notice the breach.",
        items: [
          {
            id: "d-a1",
            sev: "core",
            text: '<b>Inventory what exists.</b> Search your email for "welcome to", "verify your email" and "confirm your account" — this surfaces accounts you\'ve completely forgotten.',
          },
          {
            id: "d-a2",
            sev: "core",
            text: '<b>Check your breach exposure</b> at <a href="https://haveibeenpwned.com" target="_blank" rel="noopener">haveibeenpwned.com</a>. Every service listed is one you have an account on, whether you remember it or not.',
          },
          {
            id: "d-a3",
            sev: "core",
            text: '<b>Delete anything you didn\'t miss during the declutter.</b> Use <a href="https://justdeleteme.xyz" target="_blank" rel="noopener">justdeleteme.xyz</a> for direct deletion links and difficulty ratings.',
          },
          {
            id: "d-a4",
            sev: "core",
            text: '<b>Revoke all third-party app grants.</b> Go through Google, Apple and Meta connected-apps lists and remove everything you don\'t actively use. Each grant is a live data pipe. <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">Google</a> · <a href="https://appleid.apple.com" target="_blank" rel="noopener">Apple</a>',
          },
          {
            id: "d-a5",
            sev: "rec",
            text: "<b>Export before deleting</b> anything with content worth keeping — photos, playlists, posts, project files. Most services offer a data export and then a hard delete.",
          },
          {
            id: "d-a6",
            sev: "rec",
            text: "<b>Consolidate duplicate accounts per platform,</b> especially old Google accounts from school or abandoned projects. Migrate what matters, delete the rest.",
          },
        ],
      },
      {
        id: "d-social",
        name: "Social Platforms",
        why:
          "Your six music projects complicate this: some platforms are genuinely load-bearing for a release, " +
          "others are pure attention drain. Decide per project, not per platform.",
        items: [
          {
            id: "d-s1",
            sev: "core",
            text: "<b>Decide which music projects need a public presence at all.</b> Releases distribute fine without socials. A project with no audience yet doesn't need a Meta account yet.",
          },
          {
            id: "d-s2",
            sev: "core",
            text: "<b>Delete personal accounts you keep only out of inertia.</b> Facebook in particular — if you haven't posted in a year, the account is working for them, not you.",
          },
          {
            id: "d-s3",
            sev: "core",
            text: "<b>Download your archive before deleting.</b> Facebook, Instagram and X all offer full exports; they take hours to days to generate.",
          },
          {
            id: "d-s4",
            sev: "rec",
            text: "<b>Delete old posts on accounts you keep.</b> Bulk-deletion tools exist for X and Reddit. Years of old posts are a profile, not a portfolio.",
          },
          {
            id: "d-s5",
            sev: "rec",
            text: "<b>Consolidate music-project socials</b> where the audiences genuinely overlap — the ambient projects likely share listeners in a way Synthwave and Lofi don't.",
          },
          {
            id: "d-s6",
            sev: "opt",
            text: "<b>Deactivate before deleting</b> if you're unsure. Most platforms hold the account for 30 days, which doubles as a useful trial separation.",
          },
        ],
      },
      {
        id: "d-history",
        name: "Accumulated History",
        why: "On accounts you're keeping, the stored history is often more revealing than anything you post. It can be deleted without deleting the account.",
        items: [
          {
            id: "d-h1",
            sev: "core",
            text: '<b>Delete Google activity history</b> — Web & App Activity, Location History and YouTube History. Then set all three to auto-delete at 3 months. <a href="https://myactivity.google.com" target="_blank" rel="noopener">myactivity.google.com</a>',
          },
          {
            id: "d-h2",
            sev: "core",
            text: "<b>Clear Meta's off-platform activity.</b> Facebook → Settings → Your Activity Off Meta Technologies → clear history and turn off future activity.",
          },
          {
            id: "d-h3",
            sev: "core",
            text: '<b>Delete Amazon voice recordings and browsing history,</b> and turn off "Save voice recordings" entirely if you use Alexa.',
          },
          {
            id: "d-h4",
            sev: "rec",
            text: "<b>Delete Microsoft and LinkedIn activity data,</b> including LinkedIn's search and ad-interaction history.",
          },
          {
            id: "d-h5",
            sev: "rec",
            text: "<b>Mass-unsubscribe from mailing lists,</b> then bulk-delete the archived promotional mail. This is usually thousands of messages.",
          },
        ],
      },
    ],
  },

  /* ═══════════ LOCK DOWN ═══════════ */
  {
    id: "lockdown",
    name: "Lock Down",
    kind: "check",
    lede:
      "Settings work on the accounts and devices you're keeping. Do this after deletion — there's no point " +
      "carefully configuring an account you're about to remove.",
    groups: [
      {
        id: "l-foundation",
        name: "Foundation",
        why: "These four things do more than everything else on this page combined. If you stop after this group, you've captured most of the benefit.",
        items: [
          {
            id: "l-f1",
            sev: "core",
            text: "<b>Password manager, no exceptions.</b> Unique generated password for every account. Bitwarden is free and open-source; 1Password is the polished paid option.",
          },
          {
            id: "l-f2",
            sev: "core",
            text: "<b>Two-factor on everything that offers it,</b> using an authenticator app rather than SMS. SIM-swap attacks make SMS the weakest common option.",
          },
          {
            id: "l-f3",
            sev: "core",
            text: "<b>Email aliases for new signups.</b> One alias per service means a leak is traceable and disposable. Apple's Hide My Email works if you're in that ecosystem; SimpleLogin works everywhere.",
          },
          {
            id: "l-f4",
            sev: "core",
            text: '<b>Stop using "Sign in with Google/Facebook."</b> It hands a permanent identity link to a third party and makes account deletion messy. Use email + password manager, or Sign in with Apple\'s masked relay.',
          },
          {
            id: "l-f5",
            sev: "rec",
            text: "<b>Print your recovery codes and store them off-device</b>, not on your phone and not in your cloud. Write down where each set lives. If you can't say where they are, they don't exist.",
          },
          {
            id: "l-f6",
            sev: "core",
            text: '<b>Run your password manager\'s health report</b> and change every breached or reused password, email and anything that holds money first. <a href="https://my.1password.com/watchtower" target="_blank" rel="noopener">1Password Watchtower</a> · <a href="https://vault.bitwarden.com/#/reports/exposed-passwords" target="_blank" rel="noopener">Bitwarden Exposed Passwords</a> · iCloud Keychain: System Settings → Passwords → Security Recommendations · Firefox: about:logins → Alerts.',
          },
          {
            id: "l-f7",
            sev: "rec",
            text: '<b>Use a passphrase for the few passwords you type from memory:</b> Mac login, password manager, primary email. Four or more random words beats any "complex" password, and you\'ll remember it. Your password manager can generate one. Everything else gets a generated 20+ character string. Check your Mac login password against known breaches at <a href="https://haveibeenpwned.com/Passwords" target="_blank" rel="noopener">haveibeenpwned.com/Passwords</a>.',
          },
        ],
      },
      {
        id: "l-recovery",
        name: "Account Recovery",
        why:
          "Most account takeovers don't crack the password. They walk through the recovery path. " +
          "The test: if you lost your phone tomorrow, could you get back into your email without SMS and without calling anyone?",
        items: [
          {
            id: "l-r1",
            sev: "core",
            text: '<b>Map the recovery chain on your critical accounts.</b> Start "Forgot password" on email, Apple ID, Google and banking, note each step, and stop before the final reset. You\'re mapping the path, not walking it. Look for any step a stranger could pass. <a href="https://myaccount.google.com/security" target="_blank" rel="noopener">Google</a> · <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener">Apple</a>',
          },
          {
            id: "l-r2",
            sev: "core",
            text: "<b>Remove SMS as the only way back in</b> on email, financial accounts, Apple ID and Google. A SIM swap defeats an SMS code.",
          },
          {
            id: "l-r3",
            sev: "core",
            text: "<b>Add a second recovery path that doesn't depend on your phone:</b> a recovery email with a different provider, a hardware key, or a trusted recovery contact.",
          },
          {
            id: "l-r4",
            sev: "rec",
            text: "<b>Set up a backup authenticator on an old phone.</b> Scan each critical account's 2FA QR code on both phones. It works without a SIM or signal. Keep the old phone powered off and stored safely, and turn it on only to recover. If 2FA is already set up, turn it off and on again to get a fresh QR code.",
          },
          {
            id: "l-r5",
            sev: "rec",
            text: "<b>Do the phone-loss drill.</b> Describe, out loud, how you'd get into your primary email if your phone and laptop were both gone. If you can't finish the sentence, something above isn't done.",
          },
        ],
      },
      {
        id: "l-device",
        name: "Devices — iPhone, Watch, Mac",
        why: "Device-level settings apply across every app at once, which makes them unusually high-leverage.",
        items: [
          {
            id: "l-d1",
            sev: "core",
            text: '<b>Turn off App Tracking Transparency globally.</b> Settings → Privacy & Security → Tracking → disable "Allow Apps to Request to Track."',
          },
          {
            id: "l-d2",
            sev: "core",
            text: '<b>Audit location permissions app by app.</b> Settings → Privacy & Security → Location Services. Almost nothing needs "Always" — set to "While Using" or "Never." Turn off "Precise Location" except for maps.',
          },
          {
            id: "l-d3",
            sev: "core",
            text: "<b>Turn off Significant Locations.</b> Location Services → System Services → Significant Locations → clear history and disable. This is a running log of everywhere you sleep and work.",
          },
          {
            id: "l-d4",
            sev: "core",
            text: "<b>Disable personalised ads</b> on Apple, Google and Amazon accounts. Settings → Privacy & Security → Apple Advertising → off.",
          },
          {
            id: "l-d5",
            sev: "core",
            text: "<b>Enable full-disk encryption</b> — FileVault on Mac, and confirm your iPhone passcode is a 6+ digit code or alphanumeric, not 4 digits.",
          },
          {
            id: "l-d6",
            sev: "rec",
            text: "<b>Turn on Advanced Data Protection for iCloud,</b> which end-to-end encrypts backups, photos and notes. Requires setting up a recovery contact or key first.",
          },
          {
            id: "l-d7",
            sev: "rec",
            text: "<b>Audit microphone, camera and contacts permissions.</b> Contacts access is the most over-granted and most abused — it leaks other people's data, not just yours.",
          },
          {
            id: "l-d8",
            sev: "rec",
            text: "<b>Turn off Siri analytics and voice-recording retention</b> on all devices, including the Watch.",
          },
          {
            id: "l-d9",
            sev: "opt",
            text: "<b>Review Apple Watch health-data sharing.</b> Health data is the most sensitive category you hold; check which apps have read access and revoke anything non-essential.",
          },
        ],
      },
      {
        id: "l-network",
        name: "Network & Browser",
        why:
          "Your ISP sees every domain you visit and DNS queries are a complete activity log. " +
          "This layer sits underneath every app, so fixing it fixes everything at once.",
        items: [
          {
            id: "l-n1",
            sev: "core",
            text: "<b>Switch to a privacy-respecting browser.</b> Firefox with strict tracking protection, or Safari with cross-site tracking prevention on. Chrome is an ad-company product.",
          },
          {
            id: "l-n2",
            sev: "core",
            text: "<b>Install uBlock Origin.</b> The single highest-impact browser extension — blocks ads, trackers and a substantial share of malware delivery.",
          },
          {
            id: "l-n3",
            sev: "core",
            text: "<b>Encrypted DNS with filtering.</b> NextDNS or similar, configured on phone, laptop and router. Router-level covers smart TVs and consoles that can't be configured individually.",
          },
          {
            id: "l-n4",
            sev: "rec",
            text: "<b>A no-log, audited VPN</b> for untrusted networks at minimum. Mullvad is the standard recommendation — no account required, accepts cash.",
          },
          {
            id: "l-n5",
            sev: "rec",
            text: '<b>Check your browser fingerprint</b> at <a href="https://coveryourtracks.eff.org" target="_blank" rel="noopener">coveryourtracks.eff.org</a> and act on what it tells you.',
          },
          {
            id: "l-n6",
            sev: "rec",
            text: "<b>Set a privacy-respecting search engine</b> as default — DuckDuckGo, Startpage or Kagi if you'll pay for it.",
          },
          {
            id: "l-n7",
            sev: "opt",
            text: "<b>Container tabs or separate browser profiles</b> per bucket — one for Work, one for Music project admin, one for personal. Sites can't correlate across them.",
          },
          {
            id: "l-n8",
            sev: "opt",
            text: "<b>Auto-clear cookies on browser close,</b> with exceptions for the handful of sites where staying logged in is worth it.",
          },
          {
            id: "l-n9",
            sev: "rec",
            text: '<b>Turn on Global Privacy Control.</b> Firefox: Settings → Privacy & Security → "Tell websites not to sell or share my data." In several US states, including California, sites must treat it as an opt-out of selling your data.',
          },
        ],
      },
      {
        id: "l-accounts",
        name: "Surviving Accounts",
        why: "For each platform you decided to keep, there's a short list of settings that matter. The rest is noise.",
        items: [
          {
            id: "l-a1",
            sev: "core",
            text: "<b>Google:</b> turn off Web & App Activity, Location History and YouTube History, or set all to 3-month auto-delete. Turn off ad personalisation. Run the Security Checkup and Privacy Checkup.",
          },
          {
            id: "l-a2",
            sev: "core",
            text: '<b>Meta (if kept):</b> disable off-platform activity tracking, set posts to friends-only, turn off face recognition, and disable "Allow search engines to link to your profile."',
          },
          {
            id: "l-a3",
            sev: "core",
            text: "<b>Music distribution and streaming accounts:</b> turn off tailored advertising, disconnect linked social accounts, and remove phone numbers where they aren't required.",
          },
          {
            id: "l-a4",
            sev: "rec",
            text: "<b>LinkedIn:</b> turn off profile-viewing broadcasts, disable data sharing with third parties, and switch off ad personalisation. It is unusually aggressive by default.",
          },
          {
            id: "l-a5",
            sev: "rec",
            text: '<b>Reddit:</b> disable personalisation from your activity and from partner data, and turn off "show up in search results."',
          },
          {
            id: "l-a6",
            sev: "rec",
            text: "<b>Banking and finance apps:</b> deny location, microphone and contacts. None of them need any of it.",
          },
          {
            id: "l-a7",
            sev: "opt",
            text: "<b>Set up per-project email aliases</b> for your six music projects so label, distribution and fan mail stay separable — and one leaking doesn't expose the others.",
          },
          {
            id: "l-a8",
            sev: "rec",
            text: "<b>Review active sessions and login history</b> on email, Apple ID, Google, social and messaging accounts. Sign out any device you don't recognise or no longer own.",
          },
          {
            id: "l-a9",
            sev: "rec",
            text: "<b>Turn on transaction alerts</b> for every bank, card and payment app (PayPal, Venmo, Cash App), so a drained account tells you within minutes.",
          },
          {
            id: "l-a10",
            sev: "rec",
            text: "<b>Lock your messengers.</b> Signal: Settings → Account → Registration Lock. WhatsApp: Settings → Account → Two-step verification. Both stop someone who steals your number from taking over the account.",
          },
          {
            id: "l-a11",
            sev: "rec",
            text: '<b>Check what strangers can see</b> on every platform you kept: profile, email, phone, and friends or connections list. Venmo makes transactions public by default, so set them to private. Facebook shows your friends list, LinkedIn shows your connections, and X lets people find you by email or phone. <a href="https://venmo.com/account/settings/privacy" target="_blank" rel="noopener">Venmo</a> · <a href="https://twitter.com/settings/audience_and_tagging" target="_blank" rel="noopener">X</a>',
          },
          {
            id: "l-a12",
            sev: "opt",
            text: '<b>Audit cloud share links</b> in iCloud Drive, Google Drive and Dropbox. Old "anyone with the link" shares on tax returns or ID scans are an open door. Remove sync from any device you no longer own.',
          },
        ],
      },
      {
        id: "l-identity",
        name: "Legal Identity",
        why:
          "Your SSN and driver's licence can't be changed like a password, and copies sit with every service that ever asked you to " +
          '"verify your identity". The defence is layering checks on top, so a stolen ID isn\'t enough on its own.',
        items: [
          {
            id: "l-g1",
            sev: "core",
            text: '<b>Get an IRS Identity Protection PIN.</b> It stops anyone filing a tax return in your name, even with your SSN. A new one is issued every year. <a href="https://www.irs.gov/identity-theft-fraud-scams/get-an-identity-protection-pin" target="_blank" rel="noopener">IRS IP PIN</a>',
          },
          {
            id: "l-g2",
            sev: "core",
            text: '<b>Claim your my Social Security and IRS online accounts</b> before someone else does. An unregistered account is one an identity thief can register in your name. <a href="https://www.ssa.gov/myaccount/" target="_blank" rel="noopener">my Social Security</a> · <a href="https://www.irs.gov/payments/your-online-account" target="_blank" rel="noopener">IRS</a>',
          },
          {
            id: "l-g3",
            sev: "rec",
            text: '<b>Pull your credit reports</b> from all three bureaus and look for accounts you didn\'t open. <a href="https://www.annualcreditreport.com/" target="_blank" rel="noopener">AnnualCreditReport.com</a>',
          },
          {
            id: "l-g4",
            sev: "rec",
            text: "<b>List who holds a copy of your ID:</b> banks, employers, landlords, car rental, gig and rideshare apps, crypto exchanges and brokerages, social and dating verification, telehealth, insurers, hotels, background-check firms, ID-verification services (ID.me, Jumio, Persona…), and TSA PreCheck or Global Entry. Close any account on that list you no longer use. Each one is a breach waiting to leak your licence.",
          },
          {
            id: "l-g5",
            sev: "opt",
            text: '<b>If your ID shows up in a breach:</b> confirm your freezes are still on, file at IdentityTheft.gov for a recovery plan, and ask your state DMV about a fraud flag on your licence. <a href="https://www.identitytheft.gov/" target="_blank" rel="noopener">IdentityTheft.gov</a>',
          },
        ],
      },
      {
        id: "l-scams",
        name: "Scams & Callbacks",
        why:
          "The attack that beats good settings is a person on the phone. Genuine alerts are usually calm and factual. " +
          "Fakes add a deadline, a link, and a request for something only you should know.",
        items: [
          {
            id: "l-x1",
            sev: "core",
            text: "<b>Adopt a callback rule.</b> Never act on an incoming call, text or email about your accounts. Hang up and contact the company yourself, using the number on your card or bill or an address you type in. Caller ID can be spoofed.",
          },
          {
            id: "l-x2",
            sev: "core",
            text: "<b>Never read a verification code to anyone.</b> No real company asks for one. A code you didn't request means someone is trying to reset your account right now.",
          },
          {
            id: "l-x3",
            sev: "rec",
            text: "<b>Check the domain, not the display name.</b> Read what comes after the @, and hover over (or long-press) links before tapping. If the domain doesn't match the company, don't click.",
          },
          {
            id: "l-x4",
            sev: "opt",
            text: '<b>Check a suspicious link without opening it</b> by pasting it into VirusTotal or urlscan.io. A WHOIS lookup shows whether the domain was registered last week. <a href="https://www.virustotal.com/gui/home/url" target="_blank" rel="noopener">VirusTotal</a> · <a href="https://urlscan.io/" target="_blank" rel="noopener">urlscan.io</a> · <a href="https://www.whois.com/whois/" target="_blank" rel="noopener">WHOIS</a>',
          },
        ],
      },
      {
        id: "l-travel",
        name: "Border Crossings",
        why:
          "At some borders your phone can be searched, and everything signed in on it is visible. " +
          "The defence is a clean travel device, with your real accounts signed out and recoverable once you're through. " +
          "Only worth doing for international trips where that matters to you.",
        items: [
          {
            id: "l-t1",
            sev: "opt",
            text: "<b>Create a travel recovery email</b> with a separate provider such as Proton, unlinked to your name or number, with a memorised password. Add it as a backup recovery address on your real accounts before you leave.",
          },
          {
            id: "l-t2",
            sev: "opt",
            text: "<b>Sign out of every real account on the travel device</b> and remove their apps, saved passwords and browser history.",
          },
          {
            id: "l-t3",
            sev: "opt",
            text: "<b>Clean the trail:</b> no password-reset emails in the travel inbox (empty sent and trash too), no SMS codes, no screenshots of QR or recovery codes, no notes with passwords, and a password manager with nothing real in it, or none at all.",
          },
          {
            id: "l-t4",
            sev: "opt",
            text: "<b>Write the recovery plan before you go:</b> step by step, how you'll get back into your real email once you're through. Keep your real recovery codes off the device.",
          },
        ],
      },
    ],
  },

  /* ═══════════ SURVIVAL DEVICES — see survival.js ═══════════ */
  SURVIVAL,

  /* ═══════════ MAINTAIN ═══════════ */
  {
    id: "maintain",
    name: "Maintain",
    kind: "check",
    lede:
      "None of the above holds by itself. Platforms reset preferences during redesigns, brokers re-scrape, " +
      "and apps accumulate. These are the recurring items — tick them off, then untick and repeat on schedule.",
    groups: [
      {
        id: "m-weekly",
        name: "Weekly",
        items: [
          {
            id: "m-w1",
            cadence: "weekly",
            text: "<b>Review anything added this week.</b> Every new app or account either earns a specific place in your life or gets removed.",
          },
          {
            id: "m-w2",
            cadence: "weekly",
            text: "<b>Check Screen Time for surprises.</b> You're looking for creep, not a number to feel bad about.",
          },
          {
            id: "m-w3",
            cadence: "weekly",
            text: "<b>Clear the notification permissions of anything installed this week.</b> New apps arrive with everything switched on.",
          },
        ],
      },
      {
        id: "m-monthly",
        name: "Monthly",
        items: [
          {
            id: "m-m1",
            cadence: "monthly",
            text: "<b>Review subscriptions.</b> Cancel anything that no longer ties to an active part of your life.",
          },
          {
            id: "m-m2",
            cadence: "monthly",
            text: "<b>Delete apps unused for 30 days.</b> If you didn't open it in a month, the reinstall cost is lower than the carrying cost.",
          },
          {
            id: "m-m3",
            cadence: "monthly",
            text: "<b>Re-check breach exposure</b> at haveibeenpwned.com and rotate any password that shows up.",
          },
          {
            id: "m-m4",
            cadence: "monthly",
            text: "<b>Audit third-party app grants</b> on Google, Apple and Meta. New ones accumulate silently.",
          },
          {
            id: "m-m5",
            cadence: "monthly",
            text: "<b>Review active sessions</b> on email, Apple ID and Google, and sign out anything unfamiliar.",
          },
        ],
      },
      {
        id: "m-quarterly",
        name: "Quarterly",
        items: [
          {
            id: "m-q1",
            cadence: "quarterly",
            text: "<b>Re-run data-broker opt-outs.</b> Most re-list within 6–12 months; quarterly keeps you ahead of it.",
          },
          {
            id: "m-q2",
            cadence: "quarterly",
            text: "<b>Re-check privacy settings on major platforms.</b> Redesigns quietly reset preferences and introduce new toggles defaulted to on.",
          },
          {
            id: "m-q3",
            cadence: "quarterly",
            text: "<b>Review your buckets themselves.</b> Life changes — a project goes dormant, a new one starts. Make sure Personal, Work and Music still describe your life now, not last year's.",
          },
          {
            id: "m-q4",
            cadence: "quarterly",
            text: "<b>Revisit your operating procedures.</b> Rules you keep breaking are usually wrong rules, not weak willpower.",
          },
          {
            id: "m-q5",
            cadence: "quarterly",
            text: "<b>Follow up on deletion letters.</b> Anything past 45 days with no reply gets a complaint. See Delete → When There's No Opt-Out.",
          },
        ],
      },
      {
        id: "m-annual",
        name: "Annually",
        items: [
          {
            id: "m-y1",
            cadence: "yearly",
            text: "<b>Full account inventory.</b> Repeat the email search for signup confirmations and delete the new dormant accounts.",
          },
          {
            id: "m-y2",
            cadence: "yearly",
            text: "<b>Rotate critical passwords</b> — email, password manager, banking, and anything tied to your music distribution income.",
          },
          {
            id: "m-y3",
            cadence: "yearly",
            text: "<b>Verify backups actually restore.</b> An untested backup is a guess.",
          },
          {
            id: "m-y4",
            cadence: "yearly",
            text: "<b>Run another 30-day declutter.</b> Annual is about the right cadence — sprawl returns quietly.",
          },
          {
            id: "m-y5",
            cadence: "yearly",
            text: "<b>Run the phone-loss drill again,</b> and power up the backup authenticator phone to confirm every critical account is still on it.",
          },
          {
            id: "m-y6",
            cadence: "yearly",
            text: "<b>Pull your credit reports, confirm all five freezes are still on,</b> and get this year's IRS IP PIN before tax season.",
          },
        ],
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   PERSISTENCE
   Uses shared/persist.js when available (cross-device via
   Firestore, passphrase-gated); falls back to localStorage so
   the tool still works standalone or offline.
   ═══════════════════════════════════════════════════════════ */

const DOC_ID = "digital-minimalism";
const LOCAL_KEY = "dm_state_v1";

function localStore() {
  let cache = {};
  try {
    cache = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
  } catch (e) {}
  return {
    get: (k) => cache[k],
    set: (k, v) => {
      cache[k] = v;
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(cache));
      } catch (e) {}
    },
  };
}

let store = localStore();
let syncMode = "local";

async function initStore() {
  try {
    const mod = await import("../../shared/persist.js");
    const synced = await mod.syncedState(DOC_ID);
    if (
      synced &&
      typeof synced.get === "function" &&
      typeof synced.set === "function"
    ) {
      store = synced;
      syncMode = "synced";
    }
  } catch (e) {
    // no shared module, or it failed — localStorage fallback already active
    syncMode = "local";
  }
  const el = document.getElementById("sync");
  el.textContent = syncMode === "synced" ? "synced" : "this device";
  el.className = "sync " + (syncMode === "synced" ? "ok" : "");
}

const isDone = (id) => store.get("task:" + id) === true;
const setDone = (id, v) => store.set("task:" + id, v);

/* ═══════════════════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════════════════ */

const VIEWS = [
  { id: "guide", name: "Guide" },
  ...PHASES.map((p) => ({ id: p.id, name: p.name, phase: p })),
];

let current = "guide";
const view = document.getElementById("view");
const tabsEl = document.getElementById("tabs");
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

/* ── counting ───────────────────────────────────────── */

// a group's items array can hold { heading } and { note } entries; only entries with an id are tasks
const tasks = (g) => g.items.filter((it) => it.id);

function phaseTally(phase) {
  let done = 0,
    total = 0;
  phase.groups.forEach((g) =>
    tasks(g).forEach((it) => {
      total++;
      if (isDone(it.id)) done++;
    }),
  );
  return [done, total];
}

function allTally() {
  let done = 0,
    total = 0;
  PHASES.filter((p) => p.inOverall !== false).forEach((p) => {
    const [d, t] = phaseTally(p);
    done += d;
    total += t;
  });
  return [done, total];
}

/* ── tabs ───────────────────────────────────────────── */

function renderTabs() {
  tabsEl.innerHTML = "";
  VIEWS.forEach((v) => {
    const b = document.createElement("button");
    b.className = "tab";
    b.setAttribute("aria-selected", current === v.id);
    let tally = "";
    if (v.phase) {
      const [d, t] = phaseTally(v.phase);
      tally = `<span class="tally">${d}/${t}</span>`;
    }
    b.innerHTML = esc(v.name) + tally;
    b.onclick = () => {
      current = v.id;
      render();
      window.scrollTo(0, 0);
    };
    tabsEl.appendChild(b);
  });
}

function renderOverall() {
  const [d, t] = allTally();
  document.getElementById("overall-num").textContent = `${d}/${t}`;
  document.getElementById("overall-fill").style.width = t
    ? (d / t) * 100 + "%"
    : "0%";
}

/* ── guide view ─────────────────────────────────────── */

function renderGuide() {
  view.innerHTML = `
  <div class="prose">
    <p class="lede">Two ideas do most of the work here. <strong>Privacy</strong> is about limiting what
    organisations know about you. <strong>Minimalism</strong> is about limiting what gets to interrupt you.
    They overlap — but you can be perfectly private and still lose four hours a day.</p>

    <h2>The core idea</h2>
    <p>Digital minimalism isn't using less technology for its own sake. It's deciding, deliberately and in
    advance, what each tool is <em>for</em> — and then letting go of everything that doesn't clear that bar.
    The default state of a phone is a collection of things other people decided you should look at. The goal
    is to replace that with a collection of things you decided you needed.</p>

    <blockquote>A tool earns a place when it serves something you actually value, and serves it better than
    the alternatives. Not when it's merely useful — almost everything is merely useful.</blockquote>

    <h2>Name what it's for</h2>
    <p>Most decluttering advice fails because it asks "do I need this?" in isolation, and the answer is
    always a defensible maybe. Naming a specific part of your life it serves replaces that with a harder,
    more answerable question.</p>

    <div class="test">
      <strong>The test, for any app or account:</strong>
      <ol>
        <li><strong>What part of your life does it serve?</strong> Name something specific. Not "productivity" — a person, project or activity.</li>
        <li><strong>Is it the best tool for that,</strong> or just the one you happened to install first?</li>
        <li><strong>What is the rule for using it?</strong> One sentence: what for, and when.</li>
        <li><strong>What breaks if it's gone?</strong> If the honest answer is "nothing, but I'd feel weird" — that's a deletion.</li>
      </ol>
    </div>

    <p>Anything that can't answer question one goes. That single filter usually removes 30–40% of a phone
    on first pass, without any agonising.</p>

    <h3>Why three buckets works</h3>
    <p>Personal, Work and Music are genuinely different modes with different tools, different people and
    different hours. The failure mode is leakage — work notifications during music time, music-project
    analytics during family dinner. Most of the Reduce phase is really about enforcing those boundaries.</p>
    <p>Your Music bucket deserves particular scrutiny. Six projects can quietly mean six distribution
    dashboards, six sets of socials and six analytics habits. The overhead scales linearly while the
    attention available doesn't. Deciding that some projects are releases-only — no public presence at all —
    is a legitimate and underrated option.</p>

    <h2>The order matters</h2>
    <p>The phases are sequenced for a reason, and doing them out of order wastes effort:</p>
    <ul>
      <li><strong>Reduce first,</strong> because 30 days without a tool tells you far more than any amount of reasoning about it. It also tells you what to delete.</li>
      <li><strong>Delete second,</strong> because there's no sense carefully configuring privacy settings on an account you're about to remove.</li>
      <li><strong>Lock down third,</strong> on the smaller set of things that survived.</li>
      <li><strong>Survival Devices,</strong> making the devices you kept work offline.</li>
      <li><strong>Maintain forever,</strong> because none of this holds on its own.</li>
    </ul>

    <h2>What to expect</h2>
    <p>The Foundation group in Lock Down — password manager, two-factor, email aliases, no social sign-in —
    accounts for the majority of the real security benefit. If you do nothing else on that page, do those four.</p>
    <p>Account Recovery is the other half of that. Most takeovers don't crack
    a password; they walk through a reset that ends in an SMS code. If you
    could lose your phone tomorrow and still get into your email without
    calling anyone, you're ahead of nearly everyone.</p>
    <p>Data brokers are the most tedious and least satisfying work here, because removal isn't permanent.
    They re-scrape. Budget for it as a recurring quarterly chore or pay a service to handle it.
    There are also two layers: people-search sites are the retail end and wholesale aggregators are the
    source, so clearing one doesn't touch the other.</p>
    <p>The Reduce phase is the one that changes your daily experience. The others reduce risk; this one
    gives you hours back.</p>

    <h2>A note on scope</h2>
    <p>You will not finish this. That's fine — it isn't a project with an end state, it's a posture.
    The checklists are deliberately longer than any reasonable person completes, so that the
    <span class="sev sev-core" style="display:inline-block;vertical-align:baseline">core</span> items
    can be done first and the rest treated as an optional backlog. Progress bars are for orientation,
    not obligation.</p>
  </div>`;
}

/* ── checklist views ────────────────────────────────── */

function renderPhase(phase) {
  const [d, t] = phaseTally(phase);

  view.innerHTML = `
    <div class="phase">
    <p class="lede">${phase.lede}</p>
    ${phase.groups
      .map((g) => {
        const gt = tasks(g);
        const gd = gt.filter((i) => isDone(i.id)).length;
        return `
      <section class="group ${phase.collapsedByDefault ? "collapsed" : ""}" id="g-${esc(g.id)}">
        <button class="group-head">
          <span class="chev">▾</span>
          <span class="group-name">${esc(g.name)}</span>
          <span class="group-tally ${gd === gt.length ? "done" : ""}">${gd}/${gt.length}</span>
        </button>
        <div class="group-body">
          ${g.why ? `<div class="why">${g.why}</div>` : ""}
          ${g.items
            .map((it) =>
              it.heading
                ? `
            <h3 class="subhead">${esc(it.heading)}</h3>`
                : it.note
                  ? `
            <p class="note">${it.note}</p>`
                  : `
            <div class="item ${isDone(it.id) ? "done" : ""}" data-item="${esc(it.id)}">
              <input type="checkbox" id="cb-${esc(it.id)}" ${isDone(it.id) ? "checked" : ""}>
              ${it.sev ? `<span class="sev sev-${it.sev === "core" ? "core" : it.sev === "rec" ? "rec" : "opt"}">${it.sev === "rec" ? "advised" : it.sev}</span>` : ""}
              ${it.cadence ? `<span class="cadence">${esc(it.cadence)}</span>` : ""}
              <span class="item-body"><label for="cb-${esc(it.id)}">${it.text}</label></span>
            </div>`,
            )
            .join("")}
        </div>
      </section>`;
      })
      .join("")}

    <div class="foot">
      <button class="reset" id="reset">reset this phase</button>
      <span class="foot-note">${d} of ${t} complete</span>
    </div>
    </div>`;

  view.querySelectorAll(".group-head").forEach((h) => {
    h.onclick = () => h.closest(".group").classList.toggle("collapsed");
  });

  view.querySelectorAll(".item input").forEach((cb) => {
    cb.onchange = () => {
      const id = cb.closest(".item").dataset.item;
      setDone(id, cb.checked);
      cb.closest(".item").classList.toggle("done", cb.checked);
      refreshTallies(phase);
    };
  });

  document.getElementById("reset").onclick = () => {
    if (!confirm(`Reset all ${t} items in ${phase.name}?`)) return;
    phase.groups.forEach((g) => tasks(g).forEach((it) => setDone(it.id, false)));
    render();
  };
}

function refreshTallies(phase) {
  phase.groups.forEach((g) => {
    const el = document.querySelector(`#g-${CSS.escape(g.id)} .group-tally`);
    if (!el) return;
    const gt = tasks(g);
    const gd = gt.filter((i) => isDone(i.id)).length;
    el.textContent = `${gd}/${gt.length}`;
    el.classList.toggle("done", gd === gt.length);
  });
  const [d, t] = phaseTally(phase);
  const note = document.querySelector(".foot-note");
  if (note) note.textContent = `${d} of ${t} complete`;
  renderTabs();
  renderOverall();
}

/* ── main render ────────────────────────────────────── */

function render() {
  renderTabs();
  renderOverall();
  if (current === "guide") return renderGuide();
  const phase = PHASES.find((p) => p.id === current);
  if (phase) renderPhase(phase);
}

await initStore();
render();
