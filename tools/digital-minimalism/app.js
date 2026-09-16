/* ═══════════════════════════════════════════════════════════
   DIGITAL MINIMALISM
   Merged from the privacy-lockdown and footprint-deletion guides,
   reorganised around attention rather than vendors, and anchored
   to a map of your actual life.

   To add or edit content, edit the LIFE and PHASES arrays below.
   Item ids must stay stable — they're the persistence keys.
   ═══════════════════════════════════════════════════════════ */


/* ── your life, as a tree ──────────────────────────────────
   Every digital surface you keep should attach to a node here.
   Anything that attaches to nothing is a deletion candidate. */

const LIFE = [
  {
    id:'personal', name:'Personal',
    sub:'The life that happens whether or not anyone is watching',
    children:[
      { id:'family', name:'Family',
        note:'The one bucket where being reachable matters more than being undistracted. Optimise for signal from a short list of people.' },
      { id:'health', name:'Health', children:[
        { id:'supplements', name:'Supplements', note:'Tracking should take seconds a day. If an app takes longer, it is the wrong app.' },
        { id:'nutrition',   name:'Nutrition',   note:'Logging tools are the single most common source of low-grade daily guilt. Keep one, or none.' }
      ]},
      { id:'fitness', name:'Fitness', children:[
        { id:'lift',  name:'Lift',  note:'A notes file beats most lifting apps. Be honest about whether you need the social layer.' },
        { id:'run',   name:'Run',   note:'Watch out for platforms that turn training into an audience. Strava is a social network wearing running shoes.' },
        { id:'climb', name:'Climb', note:'Logbooks are genuinely useful here — beta and grade history compound. Worth the exception.' }
      ]},
      { id:'admin', name:'Admin',
        note:'Boring, necessary, and the bucket most improved by automation. Every recurring annoyance here deserves one setup session.' }
    ]
  },
  {
    id:'work', name:'Work',
    sub:'Things with a deadline attached',
    children:[
      { id:'job', name:'Job',
        note:'Keep work tools on work surfaces. The strongest single boundary you can draw is not installing Slack on your phone.' },
      { id:'side', name:'Side Projects',
        sub:'software / app design studio',
        note:'Your own apps, plus commissioned work. This bucket sprawls fastest — every project brings its own service accounts.' },
      { id:'music-co', name:'Music Software Co.',
        sub:'far-out dream, not started',
        note:'Not active yet. Resist provisioning tooling for it now — accounts created for future plans are pure overhead until the plan is real.' }
    ]
  },
  {
    id:'music', name:'Music',
    sub:'Six projects, six audiences, one you',
    children:[
      { id:'indie',    name:'Indie / Slowcore' },
      { id:'academia', name:'Dark Academia Ambient' },
      { id:'dungeon',  name:'Dungeon Synth' },
      { id:'liminal',  name:'Liminal Dark Ambient' },
      { id:'synth',    name:'Synthwave' },
      { id:'lofi',     name:'Lofi Beats' }
    ]
  },
  {
    id:'unsorted', name:'Unsorted',
    sub:'The inbox — empty this',
    note:'Dump every app and account here first, then move each one to the node it actually serves. Whatever is left at the end has no reason to exist. That is the whole exercise.',
    children:[]
  }
];

/* Music projects share a note — applied below to avoid repetition. */
LIFE[2].children.forEach(p => {
  p.note = 'Each project is a brand with its own distribution, socials and analytics. ' +
           'Decide deliberately which projects get a public presence and which stay releases-only — ' +
           'six full social footprints is six attention taxes.';
});


/* ── the work, in phases ─────────────────────────────────── */

const PHASES = [

  /* ═══════════ REDUCE ═══════════ */
  {
    id:'reduce', name:'Reduce', kind:'check',
    lede:'Privacy is about what companies know. Minimalism is about what gets your attention. ' +
         'This phase is the one missing from most privacy guides, and it is the one you feel immediately.',
    groups:[
      {
        id:'r-declutter', name:'The 30-Day Declutter',
        why:'Cal Newport\'s protocol: remove all optional technology for thirty days, then reintroduce only what earns its place. ' +
            'The point is not the abstinence — it is that reintroduction forces you to state what each tool is actually for.',
        items:[
          {id:'r-d1', sev:'core', text:'<b>Define "optional."</b> A tool is optional if removing it for 30 days causes inconvenience rather than real harm. Write the list before you start — roughly 20–40 apps for most people.'},
          {id:'r-d2', sev:'core', text:'<b>Remove all of them for 30 days.</b> Delete the apps; don\'t just hide them. Keep the accounts alive for now — deletion comes in a later phase, after you know what you actually miss.'},
          {id:'r-d3', sev:'core', text:'<b>Fill the gap deliberately.</b> The declutter fails when you leave a vacuum. Decide in advance what occupies the reclaimed hours — an instrument, a project, a book, climbing.'},
          {id:'r-d4', sev:'core', text:'<b>Reintroduce with a written rule.</b> For each tool you bring back, answer: what does it serve on my map, and what specific rule governs its use? No rule, no reinstall.'},
          {id:'r-d5', sev:'rec', text:'<b>Note what you never missed.</b> Anything you didn\'t think about once in 30 days is a free deletion in the Delete phase.'}
        ]
      },
      {
        id:'r-notif', name:'Notifications & Interruption',
        why:'A notification is a stranger deciding when you stop thinking. Default-on is a business decision made by someone who is not you.',
        items:[
          {id:'r-n1', sev:'core', text:'<b>Turn off every notification, then re-enable individually.</b> iOS: Settings → Notifications → work down the list. The only survivors should be people (calls, messages from a short list) and time-critical logistics.'},
          {id:'r-n2', sev:'core', text:'<b>No badges on anything.</b> Red dots are engineered anxiety with no information content. Settings → Notifications → [app] → Badges off.'},
          {id:'r-n3', sev:'core', text:'<b>Zero notifications from any social, news or shopping app.</b> These have no time-critical content by definition.'},
          {id:'r-n4', sev:'rec', text:'<b>Set up Focus modes per bucket.</b> One each for Work, Music, and Personal — each allowing only the apps and people that bucket needs. iOS: Settings → Focus.'},
          {id:'r-n5', sev:'rec', text:'<b>Schedule a sleep Focus</b> that starts 90 minutes before bed and allows only favourites and repeat calls.'},
          {id:'r-n6', sev:'opt', text:'<b>Turn off "Show Previews" globally</b> so the lock screen stops being a readable feed. Settings → Notifications → Show Previews → Never (or When Unlocked).'}
        ]
      },
      {
        id:'r-phone', name:'Phone Surface Area',
        why:'The home screen is the menu. Anything reachable in one tap will be used far more than anything reachable in three.',
        items:[
          {id:'r-p1', sev:'core', text:'<b>One home screen only.</b> Everything else lives in App Library and is reached by search. This single change removes most idle scrolling.'},
          {id:'r-p2', sev:'core', text:'<b>Nothing on the home screen that has a feed.</b> If it has an infinite scroll, it doesn\'t get a permanent address.'},
          {id:'r-p3', sev:'rec', text:'<b>Greyscale as a default,</b> with a shortcut to toggle colour when you need it. Settings → Accessibility → Display & Text Size → Colour Filters → Greyscale. Triple-click side button to toggle.'},
          {id:'r-p4', sev:'rec', text:'<b>Delete every app you did not deliberately reinstall</b> after the declutter. Not offload — delete.'},
          {id:'r-p5', sev:'rec', text:'<b>Remove the browser from the dock</b> and log out of feed-style sites in mobile Safari. Friction is the whole mechanism.'},
          {id:'r-p6', sev:'opt', text:'<b>Screen Time limits as a backstop,</b> not a primary tool. If you need a limit on an app you deliberately reinstalled, the reinstall decision was wrong.'}
        ]
      },
      {
        id:'r-subs', name:'Subscriptions & Sprawl',
        why:'Subscriptions are the financial shadow of app sprawl. Auditing them surfaces tools you forgot you were carrying.',
        items:[
          {id:'r-s1', sev:'core', text:'<b>List every recurring charge.</b> iOS: Settings → [name] → Subscriptions. Then check your bank statement for the ones billed outside the App Store — that\'s where the forgotten ones hide.'},
          {id:'r-s2', sev:'core', text:'<b>Map each subscription to a node.</b> Anything that doesn\'t attach to a branch of your life map gets cancelled this week.'},
          {id:'r-s3', sev:'rec', text:'<b>Consolidate duplicate-purpose tools.</b> Two note apps, three task managers, four cloud drives. Pick one per job and migrate.'},
          {id:'r-s4', sev:'rec', text:'<b>Audit your music-project tooling specifically.</b> Six projects can quietly mean six distribution accounts, six analytics dashboards and six social schedulers. Decide which projects justify the overhead.'}
        ]
      },
      {
        id:'r-rules', name:'Operating Procedures',
        why:'Minimalism isn\'t abstinence, it\'s intentionality. A tool with a written rule is a tool you control.',
        items:[
          {id:'r-o1', sev:'core', text:'<b>Write one sentence per surviving tool:</b> "I use X for Y, at Z times." Keep the list somewhere you\'ll see it — this doc counts.'},
          {id:'r-o2', sev:'core', text:'<b>Batch the checking.</b> Email and messages at set times rather than continuously. Two or three windows a day handles nearly everything.'},
          {id:'r-o3', sev:'rec', text:'<b>Social platforms on desktop only,</b> if at all. Posting for your music projects doesn\'t require the app on your phone.'},
          {id:'r-o4', sev:'rec', text:'<b>Separate creation from consumption.</b> The device you make music on should not be the device you scroll on — or at minimum, a different Focus mode.'},
          {id:'r-o5', sev:'opt', text:'<b>Schedule one offline block per week.</b> Half a day, phone in a drawer. Treat it as a standing appointment, not a reward.'}
        ]
      }
    ]
  },

  /* ═══════════ DELETE ═══════════ */
  {
    id:'delete', name:'Delete', kind:'check',
    lede:'Removing accounts and records that exist. Work top-down — brokers first, since they aggregate everything else, ' +
         'and deleting a source after a broker has copied it doesn\'t undo the copy.',
    groups:[
      {
        id:'d-brokers', name:'Data Brokers',
        why:'Brokers buy, merge and resell your address history, phone numbers, relatives and income estimates. ' +
            'They are the reason your details resurface after you clean up everywhere else. Removal is not permanent — they re-scrape, so this becomes a recurring task.',
        items:[
          {id:'d-b1', sev:'core', text:'<b>Search yourself first.</b> Look up your name plus city on the major aggregators to see what\'s actually exposed. It calibrates how much effort the rest deserves.'},
          {id:'d-b2', sev:'core', text:'<b>Choose automated or manual.</b> A removal service (~$3–15/mo) handles hundreds of brokers continuously; manual is free but needs a few hours up front and quarterly repeats. Automated is worth it for the first year at minimum.'},
          {id:'d-b3', sev:'core', text:'<b>Opt out of the big four manually regardless:</b> Whitepages, Spokeo, BeenVerified, and Radaris. These carry the most traffic and are worth doing by hand even if you also pay a service.'},
          {id:'d-b4', sev:'rec', text:'<b>Remove yourself from Google\'s "Results about you"</b> tool, which surfaces and requests removal of pages containing your contact details. <a href="https://myactivity.google.com/results-about-you" target="_blank" rel="noopener">results-about-you</a>'},
          {id:'d-b5', sev:'rec', text:'<b>Freeze your credit at all three bureaus.</b> Free, reversible, and blocks the most damaging downstream use of leaked personal data.'},
          {id:'d-b6', sev:'opt', text:'<b>Record which brokers you\'ve cleared and when.</b> You\'ll need it — most re-list within 6–12 months.'}
        ]
      },
      {
        id:'d-accounts', name:'Dormant Accounts',
        why:'Every account is a standing liability — a breach waiting to leak your email, password and details. ' +
            'The ones you forgot about are the dangerous ones, because you won\'t notice the breach.',
        items:[
          {id:'d-a1', sev:'core', text:'<b>Inventory what exists.</b> Search your email for "welcome to", "verify your email" and "confirm your account" — this surfaces accounts you\'ve completely forgotten.'},
          {id:'d-a2', sev:'core', text:'<b>Check your breach exposure</b> at <a href="https://haveibeenpwned.com" target="_blank" rel="noopener">haveibeenpwned.com</a>. Every service listed is one you have an account on, whether you remember it or not.'},
          {id:'d-a3', sev:'core', text:'<b>Delete anything you didn\'t miss during the declutter.</b> Use <a href="https://justdeleteme.xyz" target="_blank" rel="noopener">justdeleteme.xyz</a> for direct deletion links and difficulty ratings.'},
          {id:'d-a4', sev:'core', text:'<b>Revoke all third-party app grants.</b> Go through Google, Apple and Meta connected-apps lists and remove everything you don\'t actively use. Each grant is a live data pipe. <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">Google</a> · <a href="https://appleid.apple.com" target="_blank" rel="noopener">Apple</a>'},
          {id:'d-a5', sev:'rec', text:'<b>Export before deleting</b> anything with content worth keeping — photos, playlists, posts, project files. Most services offer a data export and then a hard delete.'},
          {id:'d-a6', sev:'rec', text:'<b>Consolidate duplicate accounts per platform,</b> especially old Google accounts from school or abandoned projects. Migrate what matters, delete the rest.'}
        ]
      },
      {
        id:'d-social', name:'Social Platforms',
        why:'Your six music projects complicate this: some platforms are genuinely load-bearing for a release, ' +
            'others are pure attention drain. Decide per project, not per platform.',
        items:[
          {id:'d-s1', sev:'core', text:'<b>Decide which music projects need a public presence at all.</b> Releases distribute fine without socials. A project with no audience yet doesn\'t need a Meta account yet.'},
          {id:'d-s2', sev:'core', text:'<b>Delete personal accounts you keep only out of inertia.</b> Facebook in particular — if you haven\'t posted in a year, the account is working for them, not you.'},
          {id:'d-s3', sev:'core', text:'<b>Download your archive before deleting.</b> Facebook, Instagram and X all offer full exports; they take hours to days to generate.'},
          {id:'d-s4', sev:'rec', text:'<b>Delete old posts on accounts you keep.</b> Bulk-deletion tools exist for X and Reddit. Years of old posts are a profile, not a portfolio.'},
          {id:'d-s5', sev:'rec', text:'<b>Consolidate music-project socials</b> where the audiences genuinely overlap — the ambient projects likely share listeners in a way Synthwave and Lofi don\'t.'},
          {id:'d-s6', sev:'opt', text:'<b>Deactivate before deleting</b> if you\'re unsure. Most platforms hold the account for 30 days, which doubles as a useful trial separation.'}
        ]
      },
      {
        id:'d-history', name:'Accumulated History',
        why:'On accounts you\'re keeping, the stored history is often more revealing than anything you post. It can be deleted without deleting the account.',
        items:[
          {id:'d-h1', sev:'core', text:'<b>Delete Google activity history</b> — Web & App Activity, Location History and YouTube History. Then set all three to auto-delete at 3 months. <a href="https://myactivity.google.com" target="_blank" rel="noopener">myactivity.google.com</a>'},
          {id:'d-h2', sev:'core', text:'<b>Clear Meta\'s off-platform activity.</b> Facebook → Settings → Your Activity Off Meta Technologies → clear history and turn off future activity.'},
          {id:'d-h3', sev:'core', text:'<b>Delete Amazon voice recordings and browsing history,</b> and turn off "Save voice recordings" entirely if you use Alexa.'},
          {id:'d-h4', sev:'rec', text:'<b>Delete Microsoft and LinkedIn activity data,</b> including LinkedIn\'s search and ad-interaction history.'},
          {id:'d-h5', sev:'rec', text:'<b>Mass-unsubscribe from mailing lists,</b> then bulk-delete the archived promotional mail. This is usually thousands of messages.'}
        ]
      }
    ]
  },

  /* ═══════════ LOCK DOWN ═══════════ */
  {
    id:'lockdown', name:'Lock Down', kind:'check',
    lede:'Settings work on the accounts and devices you\'re keeping. Do this after deletion — there\'s no point ' +
         'carefully configuring an account you\'re about to remove.',
    groups:[
      {
        id:'l-foundation', name:'Foundation',
        why:'These four things do more than everything else on this page combined. If you stop after this group, you\'ve captured most of the benefit.',
        items:[
          {id:'l-f1', sev:'core', text:'<b>Password manager, no exceptions.</b> Unique generated password for every account. Bitwarden is free and open-source; 1Password is the polished paid option.'},
          {id:'l-f2', sev:'core', text:'<b>Two-factor on everything that offers it,</b> using an authenticator app rather than SMS. SIM-swap attacks make SMS the weakest common option.'},
          {id:'l-f3', sev:'core', text:'<b>Email aliases for new signups.</b> One alias per service means a leak is traceable and disposable. Apple\'s Hide My Email works if you\'re in that ecosystem; SimpleLogin works everywhere.'},
          {id:'l-f4', sev:'core', text:'<b>Stop using "Sign in with Google/Facebook."</b> It hands a permanent identity link to a third party and makes account deletion messy. Use email + password manager, or Sign in with Apple\'s masked relay.'},
          {id:'l-f5', sev:'rec', text:'<b>Back up recovery codes</b> for your 2FA accounts somewhere offline. Losing an authenticator without codes is its own disaster.'}
        ]
      },
      {
        id:'l-device', name:'Devices — iPhone, Watch, Mac',
        why:'Device-level settings apply across every app at once, which makes them unusually high-leverage.',
        items:[
          {id:'l-d1', sev:'core', text:'<b>Turn off App Tracking Transparency globally.</b> Settings → Privacy & Security → Tracking → disable "Allow Apps to Request to Track."'},
          {id:'l-d2', sev:'core', text:'<b>Audit location permissions app by app.</b> Settings → Privacy & Security → Location Services. Almost nothing needs "Always" — set to "While Using" or "Never." Turn off "Precise Location" except for maps.'},
          {id:'l-d3', sev:'core', text:'<b>Turn off Significant Locations.</b> Location Services → System Services → Significant Locations → clear history and disable. This is a running log of everywhere you sleep and work.'},
          {id:'l-d4', sev:'core', text:'<b>Disable personalised ads</b> on Apple, Google and Amazon accounts. Settings → Privacy & Security → Apple Advertising → off.'},
          {id:'l-d5', sev:'core', text:'<b>Enable full-disk encryption</b> — FileVault on Mac, and confirm your iPhone passcode is a 6+ digit code or alphanumeric, not 4 digits.'},
          {id:'l-d6', sev:'rec', text:'<b>Turn on Advanced Data Protection for iCloud,</b> which end-to-end encrypts backups, photos and notes. Requires setting up a recovery contact or key first.'},
          {id:'l-d7', sev:'rec', text:'<b>Audit microphone, camera and contacts permissions.</b> Contacts access is the most over-granted and most abused — it leaks other people\'s data, not just yours.'},
          {id:'l-d8', sev:'rec', text:'<b>Turn off Siri analytics and voice-recording retention</b> on all devices, including the Watch.'},
          {id:'l-d9', sev:'opt', text:'<b>Review Apple Watch health-data sharing.</b> Health data is the most sensitive category you hold; check which apps have read access and revoke anything non-essential.'}
        ]
      },
      {
        id:'l-network', name:'Network & Browser',
        why:'Your ISP sees every domain you visit and DNS queries are a complete activity log. ' +
            'This layer sits underneath every app, so fixing it fixes everything at once.',
        items:[
          {id:'l-n1', sev:'core', text:'<b>Switch to a privacy-respecting browser.</b> Firefox with strict tracking protection, or Safari with cross-site tracking prevention on. Chrome is an ad-company product.'},
          {id:'l-n2', sev:'core', text:'<b>Install uBlock Origin.</b> The single highest-impact browser extension — blocks ads, trackers and a substantial share of malware delivery.'},
          {id:'l-n3', sev:'core', text:'<b>Encrypted DNS with filtering.</b> NextDNS or similar, configured on phone, laptop and router. Router-level covers smart TVs and consoles that can\'t be configured individually.'},
          {id:'l-n4', sev:'rec', text:'<b>A no-log, audited VPN</b> for untrusted networks at minimum. Mullvad is the standard recommendation — no account required, accepts cash.'},
          {id:'l-n5', sev:'rec', text:'<b>Check your browser fingerprint</b> at <a href="https://coveryourtracks.eff.org" target="_blank" rel="noopener">coveryourtracks.eff.org</a> and act on what it tells you.'},
          {id:'l-n6', sev:'rec', text:'<b>Set a privacy-respecting search engine</b> as default — DuckDuckGo, Startpage or Kagi if you\'ll pay for it.'},
          {id:'l-n7', sev:'opt', text:'<b>Container tabs or separate browser profiles</b> per bucket — one for Work, one for Music project admin, one for personal. Sites can\'t correlate across them.'},
          {id:'l-n8', sev:'opt', text:'<b>Auto-clear cookies on browser close,</b> with exceptions for the handful of sites where staying logged in is worth it.'}
        ]
      },
      {
        id:'l-accounts', name:'Surviving Accounts',
        why:'For each platform you decided to keep, there\'s a short list of settings that matter. The rest is noise.',
        items:[
          {id:'l-a1', sev:'core', text:'<b>Google:</b> turn off Web & App Activity, Location History and YouTube History, or set all to 3-month auto-delete. Turn off ad personalisation. Run the Security Checkup and Privacy Checkup.'},
          {id:'l-a2', sev:'core', text:'<b>Meta (if kept):</b> disable off-platform activity tracking, set posts to friends-only, turn off face recognition, and disable "Allow search engines to link to your profile."'},
          {id:'l-a3', sev:'core', text:'<b>Music distribution and streaming accounts:</b> turn off tailored advertising, disconnect linked social accounts, and remove phone numbers where they aren\'t required.'},
          {id:'l-a4', sev:'rec', text:'<b>LinkedIn:</b> turn off profile-viewing broadcasts, disable data sharing with third parties, and switch off ad personalisation. It is unusually aggressive by default.'},
          {id:'l-a5', sev:'rec', text:'<b>Reddit:</b> disable personalisation from your activity and from partner data, and turn off "show up in search results."'},
          {id:'l-a6', sev:'rec', text:'<b>Banking and finance apps:</b> deny location, microphone and contacts. None of them need any of it.'},
          {id:'l-a7', sev:'opt', text:'<b>Set up per-project email aliases</b> for your six music projects so label, distribution and fan mail stay separable — and one leaking doesn\'t expose the others.'}
        ]
      }
    ]
  },

  /* ═══════════ MAINTAIN ═══════════ */
  {
    id:'maintain', name:'Maintain', kind:'check',
    lede:'None of the above holds by itself. Platforms reset preferences during redesigns, brokers re-scrape, ' +
         'and apps accumulate. These are the recurring items — tick them off, then untick and repeat on schedule.',
    groups:[
      {
        id:'m-weekly', name:'Weekly',
        items:[
          {id:'m-w1', cadence:'weekly', text:'<b>Empty the Unsorted node.</b> Every app or account added this week gets mapped to a life node or removed.'},
          {id:'m-w2', cadence:'weekly', text:'<b>Check Screen Time for surprises.</b> You\'re looking for creep, not a number to feel bad about.'},
          {id:'m-w3', cadence:'weekly', text:'<b>Clear the notification permissions of anything installed this week.</b> New apps arrive with everything switched on.'}
        ]
      },
      {
        id:'m-monthly', name:'Monthly',
        items:[
          {id:'m-m1', cadence:'monthly', text:'<b>Review subscriptions</b> against the map. Cancel anything that no longer attaches to a node.'},
          {id:'m-m2', cadence:'monthly', text:'<b>Delete apps unused for 30 days.</b> If you didn\'t open it in a month, the reinstall cost is lower than the carrying cost.'},
          {id:'m-m3', cadence:'monthly', text:'<b>Re-check breach exposure</b> at haveibeenpwned.com and rotate any password that shows up.'},
          {id:'m-m4', cadence:'monthly', text:'<b>Audit third-party app grants</b> on Google, Apple and Meta. New ones accumulate silently.'}
        ]
      },
      {
        id:'m-quarterly', name:'Quarterly',
        items:[
          {id:'m-q1', cadence:'quarterly', text:'<b>Re-run data-broker opt-outs.</b> Most re-list within 6–12 months; quarterly keeps you ahead of it.'},
          {id:'m-q2', cadence:'quarterly', text:'<b>Re-check privacy settings on major platforms.</b> Redesigns quietly reset preferences and introduce new toggles defaulted to on.'},
          {id:'m-q3', cadence:'quarterly', text:'<b>Review the life map itself.</b> Buckets change — a project goes dormant, a new one starts. The map should describe your life now, not last year\'s.'},
          {id:'m-q4', cadence:'quarterly', text:'<b>Revisit your operating procedures.</b> Rules you keep breaking are usually wrong rules, not weak willpower.'}
        ]
      },
      {
        id:'m-annual', name:'Annually',
        items:[
          {id:'m-y1', cadence:'yearly', text:'<b>Full account inventory.</b> Repeat the email search for signup confirmations and delete the new dormant accounts.'},
          {id:'m-y2', cadence:'yearly', text:'<b>Rotate critical passwords</b> — email, password manager, banking, and anything tied to your music distribution income.'},
          {id:'m-y3', cadence:'yearly', text:'<b>Verify backups actually restore.</b> An untested backup is a guess.'},
          {id:'m-y4', cadence:'yearly', text:'<b>Run another 30-day declutter.</b> Annual is about the right cadence — sprawl returns quietly.'}
        ]
      }
    ]
  }
];


/* ═══════════════════════════════════════════════════════════
   PERSISTENCE
   Uses shared/persist.js when available (cross-device via
   Firestore, passphrase-gated); falls back to localStorage so
   the tool still works standalone or offline.
   ═══════════════════════════════════════════════════════════ */

const DOC_ID = 'digital-minimalism';
const LOCAL_KEY = 'dm_state_v1';

function localStore(){
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch(e){}
  return {
    get: k => cache[k],
    set: (k, v) => {
      cache[k] = v;
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(cache)); } catch(e){}
    }
  };
}

let store = localStore();
let syncMode = 'local';

async function initStore(){
  try{
    const mod = await import('../../shared/persist.js');
    const synced = await mod.syncedState(DOC_ID);
    if (synced && typeof synced.get === 'function' && typeof synced.set === 'function'){
      store = synced;
      syncMode = 'synced';
    }
  }catch(e){
    // no shared module, or it failed — localStorage fallback already active
    syncMode = 'local';
  }
  const el = document.getElementById('sync');
  el.textContent = syncMode === 'synced' ? 'synced' : 'this device';
  el.className = 'sync ' + (syncMode === 'synced' ? 'ok' : '');
}

const isDone  = id => store.get('task:' + id) === true;
const setDone = (id, v) => store.set('task:' + id, v);
const surfaces = nodeId => store.get('map:' + nodeId) || [];
const setSurfaces = (nodeId, arr) => store.set('map:' + nodeId, arr);


/* ═══════════════════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════════════════ */

const VIEWS = [
  { id:'map',   name:'Map' },
  { id:'guide', name:'Guide' },
  ...PHASES.map(p => ({ id:p.id, name:p.name, phase:p }))
];

let current = 'map';
const view    = document.getElementById('view');
const tabsEl  = document.getElementById('tabs');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ── counting ───────────────────────────────────────── */

function phaseTally(phase){
  let done = 0, total = 0;
  phase.groups.forEach(g => g.items.forEach(it => {
    total++; if (isDone(it.id)) done++;
  }));
  return [done, total];
}

function allTally(){
  let done = 0, total = 0;
  PHASES.forEach(p => { const [d,t] = phaseTally(p); done += d; total += t; });
  return [done, total];
}

function flatNodes(nodes = LIFE, out = [], trail = []){
  nodes.forEach(n => {
    out.push({ ...n, trail });
    if (n.children) flatNodes(n.children, out, [...trail, n.name]);
  });
  return out;
}

/* ── tabs ───────────────────────────────────────────── */

function renderTabs(){
  tabsEl.innerHTML = '';
  VIEWS.forEach(v => {
    const b = document.createElement('button');
    b.className = 'tab';
    b.setAttribute('aria-selected', current === v.id);
    let tally = '';
    if (v.phase){
      const [d,t] = phaseTally(v.phase);
      tally = `<span class="tally">${d}/${t}</span>`;
    }
    b.innerHTML = esc(v.name) + tally;
    b.onclick = () => { current = v.id; render(); window.scrollTo(0,0); };
    tabsEl.appendChild(b);
  });
}

function renderOverall(){
  const [d,t] = allTally();
  document.getElementById('overall-num').textContent = `${d}/${t}`;
  document.getElementById('overall-fill').style.width = t ? (d/t*100) + '%' : '0%';
}

/* ── map view ───────────────────────────────────────── */

function nodeMarkup(node, depth = 0){
  const n = surfaces(node.id).length;
  const kids = (node.children || []).map(c => nodeMarkup(c, depth + 1)).join('');
  return `
    <div class="branch">
      <button class="node" data-node="${esc(node.id)}">
        <span>${esc(node.name)}</span>
        <span class="leader"></span>
        <span class="n ${n ? 'has' : ''}">${n || '·'}</span>
      </button>
      ${kids ? `<div class="kids">${kids}</div>` : ''}
    </div>`;
}

function bucketMarkup(b){
  return `
    <section class="bucket">
      <div class="bucket-name">${esc(b.name)}</div>
      ${b.sub ? `<div class="bucket-sub">${esc(b.sub)}</div>` : ''}
      <button class="node" data-node="${esc(b.id)}">
        <span>${esc(b.name)} — direct</span>
        <span class="leader"></span>
        <span class="n ${surfaces(b.id).length ? 'has' : ''}">${surfaces(b.id).length || '·'}</span>
      </button>
      <div class="kids">
        ${(b.children || []).map(c => nodeMarkup(c)).join('')}
      </div>
    </section>`;
}

function renderMap(){
  const all = flatNodes();
  const mapped = all.reduce((sum, n) => sum + (n.id === 'unsorted' ? 0 : surfaces(n.id).length), 0);
  const unsorted = surfaces('unsorted').length;
  const empty = all.filter(n => !n.children?.length && !surfaces(n.id).length && n.id !== 'unsorted').length;
  const mainBuckets = LIFE.filter(b => b.id !== 'unsorted');
  const unsortedBucket = LIFE.find(b => b.id === 'unsorted');

  view.innerHTML = `
    <p class="lede">Every app, account and service you keep should attach to a branch below.
    <strong>Anything that attaches to nothing is a deletion candidate.</strong>
    Start by dumping everything into Unsorted, then move each one to the node it genuinely serves.</p>

    <div class="map-top">
      <div class="map-summary">
        <div class="stat"><span class="stat-n">${mapped}</span><span class="stat-l">mapped to a node</span></div>
        <div class="stat ${unsorted ? 'flag' : ''}"><span class="stat-n">${unsorted}</span><span class="stat-l">still unsorted</span></div>
        <div class="stat"><span class="stat-n">${empty}</span><span class="stat-l">nodes with nothing attached</span></div>
      </div>
      ${bucketMarkup(unsortedBucket)}
    </div>

    <div class="map">
      ${mainBuckets.map(bucketMarkup).join('')}
    </div>`;

  view.querySelectorAll('[data-node]').forEach(btn => {
    btn.onclick = () => openDrawer(btn.dataset.node);
  });
}

/* ── guide view ─────────────────────────────────────── */

function renderGuide(){
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

    <h2>The map is the decision engine</h2>
    <p>Most decluttering advice fails because it asks "do I need this?" in isolation, and the answer is
    always a defensible maybe. The map replaces that with a harder, more answerable question.</p>

    <div class="test">
      <strong>The test, for any app or account:</strong>
      <ol>
        <li><strong>Which node does it serve?</strong> Name one specific branch of the map. Not "productivity" — a node.</li>
        <li><strong>Is it the best tool for that node,</strong> or just the one you happened to install first?</li>
        <li><strong>What is the rule for using it?</strong> One sentence: what for, and when.</li>
        <li><strong>What breaks if it's gone?</strong> If the honest answer is "nothing, but I'd feel weird" — that's a deletion.</li>
      </ol>
    </div>

    <p>Anything that can't answer question one goes. That single filter usually removes 30–40% of a phone
    on first pass, without any agonising.</p>

    <h3>Why three buckets works</h3>
    <p>Personal, Work and Music are genuinely different modes with different tools, different people and
    different hours. The failure mode is leakage — work notifications during music time, music-project
    analytics during family dinner. Most of the Reduce phase is really about enforcing the boundaries the
    map already implies.</p>
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
      <li><strong>Maintain forever,</strong> because none of this holds on its own.</li>
    </ul>

    <h2>What to expect</h2>
    <p>The Foundation group in Lock Down — password manager, two-factor, email aliases, no social sign-in —
    accounts for the majority of the real security benefit. If you do nothing else on that page, do those four.</p>
    <p>Data brokers are the most tedious and least satisfying work here, because removal isn't permanent.
    They re-scrape. Budget for it as a recurring quarterly chore or pay a service to handle it.</p>
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

function renderPhase(phase){
  const [d,t] = phaseTally(phase);

  view.innerHTML = `
    <div class="phase">
    <p class="lede">${phase.lede}</p>
    ${phase.groups.map(g => {
      const gd = g.items.filter(i => isDone(i.id)).length;
      return `
      <section class="group" id="g-${esc(g.id)}">
        <button class="group-head">
          <span class="chev">▾</span>
          <span class="group-name">${esc(g.name)}</span>
          <span class="group-tally ${gd === g.items.length ? 'done' : ''}">${gd}/${g.items.length}</span>
        </button>
        <div class="group-body">
          ${g.why ? `<p class="why">${g.why}</p>` : ''}
          ${g.items.map(it => `
            <div class="item ${isDone(it.id) ? 'done' : ''}" data-item="${esc(it.id)}">
              <input type="checkbox" id="cb-${esc(it.id)}" ${isDone(it.id) ? 'checked' : ''}>
              ${it.sev ? `<span class="sev sev-${it.sev === 'core' ? 'core' : it.sev === 'rec' ? 'rec' : 'opt'}">${it.sev === 'rec' ? 'advised' : it.sev}</span>` : ''}
              ${it.cadence ? `<span class="cadence">${esc(it.cadence)}</span>` : ''}
              <span class="item-body"><label for="cb-${esc(it.id)}">${it.text}</label></span>
            </div>`).join('')}
        </div>
      </section>`;
    }).join('')}

    <div class="foot">
      <button class="reset" id="reset">reset this phase</button>
      <span class="foot-note">${d} of ${t} complete</span>
    </div>
    </div>`;

  view.querySelectorAll('.group-head').forEach(h => {
    h.onclick = () => h.closest('.group').classList.toggle('collapsed');
  });

  view.querySelectorAll('.item input').forEach(cb => {
    cb.onchange = () => {
      const id = cb.closest('.item').dataset.item;
      setDone(id, cb.checked);
      cb.closest('.item').classList.toggle('done', cb.checked);
      refreshTallies(phase);
    };
  });

  document.getElementById('reset').onclick = () => {
    if (!confirm(`Reset all ${t} items in ${phase.name}?`)) return;
    phase.groups.forEach(g => g.items.forEach(it => setDone(it.id, false)));
    render();
  };
}

function refreshTallies(phase){
  phase.groups.forEach(g => {
    const el = document.querySelector(`#g-${CSS.escape(g.id)} .group-tally`);
    if (!el) return;
    const gd = g.items.filter(i => isDone(i.id)).length;
    el.textContent = `${gd}/${g.items.length}`;
    el.classList.toggle('done', gd === g.items.length);
  });
  const [d,t] = phaseTally(phase);
  const note = document.querySelector('.foot-note');
  if (note) note.textContent = `${d} of ${t} complete`;
  renderTabs();
  renderOverall();
}

/* ── drawer ─────────────────────────────────────────── */

let drawerNode = null;
const drawer = document.getElementById('drawer');
const scrim  = document.getElementById('scrim');

function openDrawer(nodeId){
  const node = flatNodes().find(n => n.id === nodeId);
  if (!node) return;
  drawerNode = node;

  document.getElementById('drawer-path').textContent =
    node.trail.length ? node.trail.join('  ›  ') : 'top level';
  document.getElementById('drawer-title').textContent = node.name;
  document.getElementById('drawer-note').textContent =
    node.note || 'List every app, account or service that serves this part of your life.';

  drawer.hidden = false;
  scrim.hidden = false;
  renderSurfaces();
  document.getElementById('surface-input').focus();
}

function closeDrawer(){
  drawer.hidden = true;
  scrim.hidden = true;
  drawerNode = null;
  if (current === 'map') renderMap();
}

function renderSurfaces(){
  const list = document.getElementById('surface-list');
  const items = surfaces(drawerNode.id);
  list.innerHTML = items.length
    ? items.map((s,i) => `
        <li><span>${esc(s)}</span>
        <button class="del" data-i="${i}" title="Remove">×</button></li>`).join('')
    : '<li class="surface-empty">Nothing here yet.</li>';

  list.querySelectorAll('.del').forEach(b => {
    b.onclick = () => {
      const arr = surfaces(drawerNode.id).slice();
      arr.splice(+b.dataset.i, 1);
      setSurfaces(drawerNode.id, arr);
      renderSurfaces();
    };
  });
}

document.getElementById('surface-add').onsubmit = e => {
  e.preventDefault();
  const input = document.getElementById('surface-input');
  const val = input.value.trim();
  if (!val || !drawerNode) return;
  setSurfaces(drawerNode.id, [...surfaces(drawerNode.id), val]);
  input.value = '';
  renderSurfaces();
};

document.getElementById('drawer-close').onclick = closeDrawer;
scrim.onclick = closeDrawer;
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !drawer.hidden) closeDrawer();
});

/* ── main render ────────────────────────────────────── */

function render(){
  renderTabs();
  renderOverall();
  if (current === 'map') return renderMap();
  if (current === 'guide') return renderGuide();
  const phase = PHASES.find(p => p.id === current);
  if (phase) renderPhase(phase);
}

await initStore();
render();
