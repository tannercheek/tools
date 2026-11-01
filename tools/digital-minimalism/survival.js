/* ═══════════════════════════════════════════════════════════
   SURVIVAL DEVICES
   Making the devices you kept useful with no network: offline
   reference, maps, a local AI model and survival PDFs on each.

   Item ids are "sv-<device>-<n>", numbered once in source order.
   New items get the next number for their device — never
   renumber, the ids are the persistence keys.
   ═══════════════════════════════════════════════════════════ */

/* compact reference table for a group's "why"; cells are HTML */
const row = (cells, tag) =>
  `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join("")}</tr>`;
const ref = (head, rows) =>
  `<table class="ref"><thead>${row(head, "th")}</thead>` +
  `<tbody>${rows.map((r) => row(r, "td")).join("")}</tbody></table>`;
const link = (text, href) =>
  `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;

export const SURVIVAL = {
  id: "survival",
  name: "Survival Devices",
  kind: "check",
  collapsedByDefault: true,
  inOverall: false,
  lede:
    "The devices you kept, made to work with no network. Each gets offline reference, maps, a local AI model " +
    "and survival PDFs sized to what it can hold — the MacBook Pro is the master station that downloads and refreshes the rest.",
  groups: [
      {
        id: "sv-iph",
        name: "iPhone 15",
        why:
          "Stays your daily phone and carries a pocket core kit — medical reference, condensed Wikipedia, offline maps, a small AI model and survival PDFs — plus the one thing no other device here has: satellite messaging. " +
          "Nothing gets wiped; everything installs alongside your normal apps, and the MacBook Pro downloads the big files and AirDrops them over. " +
          "Fill the tiers in order and stop while 10–15 GB remains free." +
          ref(
            ["Tier", "Content", "Approx. size"],
            [
              ["1 – Core", "WikiMed with pictures", "2.2 GB"],
              ["1 – Core", "Wikipedia intros only", "14.4 GB"],
              ["1 – Core", "CoMaps + Apple Maps: your state, neighbors, evacuation routes", "2–4 GB"],
              ["1 – Core", "AI model (~2B, or Phi-4 Mini)", "1.5–2.7 GB"],
              ["1 – Core", "Survival PDFs, Translate languages", "~1 GB"],
              ["2 – Upgrade", "Swap intros-only Wikipedia for full Wikipedia without pictures", "52.7 GB"],
              ["2 – Extras", "Wikivoyage, iFixit, Kiwix survival/water/medicine collections", "3–8 GB"],
              ["3 – If space remains", "Full Wikipedia with pictures (512 GB phones only)", "127 GB"],
            ],
          ),
        items: [
          { heading: "Phase 1 – Settings" },
          {
            id: "sv-iph-1",
            text: "Health → Medical ID: fill it in and turn on Show When Locked",
          },
          {
            id: "sv-iph-2",
            text: "Add emergency contacts (needed to receive SMS by satellite)",
          },
          {
            id: "sv-iph-3",
            text: "Settings → Emergency SOS: review Call with Hold and Release, and Call Quietly",
          },
          {
            id: "sv-iph-4",
            text: "Settings → Apps → Messages: confirm iMessage is on",
          },
          {
            id: "sv-iph-5",
            text: "Try the satellite demo: Settings → Emergency SOS → Try Demo",
          },
          {
            id: "sv-iph-6",
            text: "Translate: download the offline languages you'd need",
          },
          { heading: "Phase 2 – Apps" },
          {
            id: "sv-iph-7",
            text: "Install Kiwix, CoMaps, PocketPal AI, KeePassium",
          },
          { id: "sv-iph-8", sev: "opt", text: "Google AI Edge Gallery" },
          { heading: "Phase 3 – Content" },
          {
            id: "sv-iph-9",
            text: "On the Mac, download WikiMed and Wikipedia intros-only; AirDrop them to the iPhone and import in Kiwix",
          },
          {
            id: "sv-iph-10",
            text: "CoMaps: download your state, neighbors and evacuation regions",
          },
          {
            id: "sv-iph-11",
            text: "Apple Maps: Profile → Offline Maps → download the same area",
          },
          {
            id: "sv-iph-12",
            text: "PocketPal: download a ~2B Q4 model; try Phi-4 Mini if it runs well",
          },
          {
            id: "sv-iph-13",
            text: "Save survival PDFs to Files → On My iPhone (not only iCloud)",
          },
          {
            id: "sv-iph-14",
            text: "Copy the KeePassXC database from the Mac's VAULT into KeePassium",
          },
          { id: "sv-iph-15", text: "Add Tier 2 content if space allows" },
          {
            heading: "Phase 4 – Offline drill (every few months, alongside the Mac)",
          },
          { id: "sv-iph-16", text: "Turn on airplane mode, keep Location on" },
          { id: "sv-iph-17", text: "Search Kiwix (WikiMed and Wikipedia)" },
          {
            id: "sv-iph-18",
            text: "Get a GPS fix outdoors and route somewhere in CoMaps",
          },
          { id: "sv-iph-19", text: "Ask the AI a question and note the speed" },
          {
            id: "sv-iph-20",
            text: "Open every survival PDF and the KeePassium database",
          },
          {
            id: "sv-iph-21",
            text: "Outdoors, run the satellite demo again to practice aiming",
          },
          { heading: "Phase 5 – Power" },
          {
            id: "sv-iph-22",
            text: "Carry a USB-C power bank (the iPhone 15 charges over USB-C, same cable as the Pixel and Macs)",
          },
          {
            id: "sv-iph-23",
            text: "Know where Low Power Mode is (Control Center)",
          },
          { heading: "Phase 6 – Maintain" },
          { id: "sv-iph-24", text: "Keep iOS and apps updated" },
          {
            id: "sv-iph-25",
            text: "Every 6–12 months, with the Mac refresh: re-download ZIM files, update maps and the AI model",
          },
          {
            id: "sv-iph-26",
            text: "Before late 2027, check whether Apple's free satellite period is extended again",
          },
          { heading: "Books" },
          {
            id: "sv-iph-27",
            text: "Install Readest (or stick with Apple Books)",
          },
          {
            id: "sv-iph-28",
            text: "Add Project Gutenberg's OPDS catalog in Readest to browse and download in-app",
          },
          {
            id: "sv-iph-29",
            text: "Download classics from Standard Ebooks and Project Gutenberg",
          },
          {
            id: "sv-iph-30",
            text: "Download practical textbooks from OpenStax and LibreTexts (biology, chemistry, anatomy)",
          },
          { id: "sv-iph-31", text: "Get Hesperian's free health guides" },
          {
            id: "sv-iph-32",
            sev: "opt",
            text: "Libby to borrow ebooks with a library card; loans stay inside Libby",
          },
          {
            id: "sv-iph-33",
            text: 'Keep downloaded books "On My iPhone" so they work offline',
          },
        ],
      },
      {
        id: "sv-mbp",
        name: "MacBook Pro M2",
        why:
          "Stays your daily driver and becomes the master station: the most capable offline machine in the kit, and the one that downloads and refreshes content for every other device. " +
          "Don't wipe it and keep macOS updated. The survival library lives on an external SSD split into a public LIBRARY (exFAT) and an encrypted VAULT (APFS), with a ~75 GB core kit kept internal so the Mac still works without the SSD." +
          ref(
            ["Where", "Tier", "Content", "Approx. size"],
            [
              ["Internal", "Core kit", "Wikipedia without pictures", "53 GB"],
              ["Internal", "Core kit", "WikiMed with pictures", "2.2 GB"],
              ["Internal", "Core kit", "gpt-oss 20B", "~14 GB"],
              ["Internal", "Core kit", "CoMaps regions, survival PDFs", "~5 GB"],
              ["SSD LIBRARY", "1 – Core", "Wikipedia with pictures", "127 GB"],
              ["SSD LIBRARY", "1 – Core", "Large AI models (Gemma 4 26B, Qwen3.6 35B)", "~40 GB"],
              ["SSD LIBRARY", "1 – Core", "USGS topo PDFs, OpenStreetMap data for QGIS", "2–5 GB"],
              ["SSD LIBRARY", "1 – Core", "Installer archive: Mac apps, Android apps, Debian and Tails images", "~10 GB"],
              ["SSD VAULT", "1 – Core", "Personal documents, KeePassXC database", "~1 GB"],
              ["SSD LIBRARY", "2 – Extras", "Wikivoyage, Wiktionary, iFixit, Kiwix survival/water/medicine collections", "5–10 GB"],
              ["SSD LIBRARY", "2 – Extras", "Disk images of the USB stick, copies of the phone and Air libraries", "~400 GB"],
              ["SSD LIBRARY", "3 – If space remains", "Project Gutenberg, education ZIMs, other languages, media", "whatever fits"],
            ],
          ),
        items: [
          { heading: "Phase 0 – Prep" },
          {
            id: "sv-mbp-1",
            text: "Check internal free space: Apple menu → System Settings → General → Storage",
          },
          { id: "sv-mbp-2", text: "Confirm FileVault is on" },
          {
            id: "sv-mbp-3",
            text: "Make a Time Machine backup before changing anything",
          },
          {
            id: "sv-mbp-4",
            text: "Buy a 2 TB portable NVMe SSD and a 2–4 TB portable HDD",
          },
          {
            id: "sv-mbp-5",
            text: "In Disk Utility, split the SSD into LIBRARY (exFAT) and VAULT (APFS, encrypted)",
          },
          { heading: "Phase 1 – Apps" },
          {
            id: "sv-mbp-6",
            text: "Install Kiwix, LM Studio, Ollama, CoMaps (or Organic Maps), QGIS, Calibre, KeePassXC, LuLu",
          },
          {
            id: "sv-mbp-7",
            text: "Point Kiwix's library at the LIBRARY volume",
          },
          {
            id: "sv-mbp-8",
            text: "Set LM Studio's models folder and Ollama's <code>OLLAMA_MODELS</code> to the LIBRARY volume (large models only)",
          },
          {
            id: "sv-mbp-9",
            text: "Save every installer to LIBRARY/Installers",
          },
          { heading: "Phase 2 – Core content" },
          {
            id: "sv-mbp-10",
            text: "Internal core kit: Wikipedia without pictures, WikiMed with pictures, <code>ollama pull gpt-oss:20b</code>",
          },
          {
            id: "sv-mbp-11",
            text: "CoMaps: download your state, neighbors and evacuation regions",
          },
          {
            id: "sv-mbp-12",
            text: "SSD: Wikipedia with pictures; use a resumable download (<code>curl -C - -O &lt;link&gt;</code>)",
          },
          {
            id: "sv-mbp-13",
            text: "SSD: pull Gemma 4 26B and Qwen3.6 35B; test each with other apps closed",
          },
          {
            id: "sv-mbp-14",
            text: "SSD: USGS topo PDFs, OpenStreetMap data for QGIS",
          },
          {
            id: "sv-mbp-15",
            text: "VAULT: personal documents and the KeePassXC database",
          },
          { id: "sv-mbp-16", text: "Survival PDFs in both places" },
          { heading: "Phase 3 – Extras" },
          {
            id: "sv-mbp-17",
            text: "Tier 2: Wikivoyage, Wiktionary, iFixit, Kiwix survival/water/medicine collections",
          },
          {
            id: "sv-mbp-18",
            text: "Tier 2: disk image of the USB stick; copies of the phone and Air libraries",
          },
          {
            id: "sv-mbp-19",
            text: "Tier 3: Gutenberg, education ZIMs, media, keeping ~10% free",
          },
          { heading: "Phase 4 – Offline drill (every few months)" },
          { id: "sv-mbp-20", text: "Turn Wi-Fi off and unplug Ethernet" },
          {
            id: "sv-mbp-21",
            text: "Search Kiwix (internal kit and SSD), route somewhere in CoMaps, ask each AI model a question",
          },
          {
            id: "sv-mbp-22",
            text: "Open the VAULT volume and KeePassXC database",
          },
          {
            id: "sv-mbp-23",
            text: "Check LuLu shows no attempted connections from Kiwix, LM Studio or Ollama",
          },
          {
            id: "sv-mbp-24",
            text: "Note how long the battery lasts with a large model loaded",
          },
          {
            id: "sv-mbp-25",
            text: "Keep a 65W+ USB-C PD power bank or solar panel that can charge this Mac",
          },
          { heading: "Phase 5 – Hub for your other devices" },
          {
            id: "sv-mbp-26",
            sev: "opt",
            text: "A small USB-powered travel router so the Mac and phone can share a local network with no internet",
          },
          {
            id: "sv-mbp-27",
            text: "Share the Kiwix library to other devices with Kiwix's built-in hotspot server",
          },
          {
            id: "sv-mbp-28",
            sev: "opt",
            text: "In LM Studio, enable serving on the local network so other devices can use the large models",
          },
          { heading: "Phase 6 – Maintain" },
          {
            id: "sv-mbp-29",
            text: "Keep macOS and apps updated (this is your online machine)",
          },
          {
            id: "sv-mbp-30",
            text: "Every 6–12 months: refresh ZIM files, maps and models, then push updates to the phone, the Air and the USB stick",
          },
          {
            id: "sv-mbp-31",
            text: "Time Machine to the HDD; copy LIBRARY to the HDD after each refresh",
          },
          {
            id: "sv-mbp-32",
            text: "Plug in and check the SSD and HDD at least yearly",
          },
        ],
      },
      {
        id: "sv-px",
        name: "Pixel 4a",
        why:
          'Turns the Pixel 4a (128 GB, 6 GB RAM) into a Google-free offline reference phone running <a href="https://wiki.lineageos.org/devices/sunfish/" target="_blank" rel="noopener">LineageOS</a> 23.2, since GrapheneOS no longer supports it. ' +
          "Plan on roughly 100–105 GB usable after the install; Tier 1 is about 60 GB, and extras stop when about 10 GB is left." +
          ref(
            ["Tier", "Content", "Approx. size"],
            [
              ["1 – Core", "Wikipedia, no pictures (Kiwix)", "53 GB"],
              ["1 – Core", "WikiMed, with pictures (Kiwix)", "2.2 GB"],
              ["1 – Core", "Maps: your state + neighbors (CoMaps)", "2–4 GB"],
              ["1 – Core", "AI model, 1–3B parameters, Q4 (PocketPal)", "1–2.5 GB"],
              ["1 – Core", "Survival and medical PDFs", "~0.5 GB"],
              ["2 – Extras", "Wikivoyage, Wiktionary, iFixit, Kiwix survival/water/medicine collections", "5–10 GB"],
              ["2 – Extras", "OsmAnd topo maps", "1–3 GB"],
              ["3 – If space remains", "Larger AI model, more map regions, Gutenberg books, Briar, Termux", "whatever fits"],
            ],
          ),
        items: [
          { heading: "Phase 0 – Before you wipe" },
          {
            note: "Installing a new OS erases everything on the phone, so save what you want first.",
          },
          { id: "sv-px-1", text: "Back up photos and files you want to keep" },
          {
            id: "sv-px-2",
            text: "Enable Developer options: Settings → About phone → tap Build number 7 times",
          },
          {
            id: "sv-px-3",
            text: "Confirm the OEM unlocking toggle can be switched on (Settings → System → Developer options). If it's grayed out, the phone is carrier-locked: skip Phase 1 and continue on stock Android",
          },
          {
            id: "sv-px-4",
            text: "Install the latest Android 13 update if one is offered",
          },
          {
            id: "sv-px-5",
            text: "On a computer, install Google's platform-tools (adb and fastboot)",
          },
          { id: "sv-px-6", text: "Have a good USB-C data cable ready" },
          { heading: "Phase 1 – Install LineageOS" },
          {
            note: 'Follow the <a href="https://wiki.lineageos.org/devices/sunfish/install/" target="_blank" rel="noopener">official install guide</a> exactly, and stop if any step fails. It requires Android 13 stock firmware first, which you already have.',
          },
          {
            id: "sv-px-7",
            text: "Unlock the bootloader (this wipes the phone)",
          },
          { id: "sv-px-8", text: "Flash LineageOS recovery" },
          { id: "sv-px-9", text: "Sideload the LineageOS zip from recovery" },
          {
            id: "sv-px-10",
            text: "Skip the GApps (Google apps) add-on to keep the phone Google-free",
          },
          {
            id: "sv-px-11",
            text: "Boot and finish setup without a Google account",
          },
          { id: "sv-px-12", text: "Set a PIN and turn on the lock screen" },
          { heading: "Phase 2 – Core apps" },
          {
            note: "Without Google Play, F-Droid is the main app store and Aurora Store covers Play-only apps.",
          },
          {
            id: "sv-px-13",
            text: "In the browser, download and install F-Droid from f-droid.org",
          },
          { id: "sv-px-14", text: "From F-Droid: Kiwix" },
          { id: "sv-px-15", text: "From F-Droid: CoMaps" },
          { id: "sv-px-16", text: "From F-Droid: KOReader (PDFs and ebooks)" },
          { id: "sv-px-17", text: "From F-Droid: Markor (notes)" },
          { id: "sv-px-18", text: "From F-Droid: Aurora Store" },
          {
            id: "sv-px-19",
            text: "PocketPal, via Aurora Store or its GitHub releases page",
          },
          { heading: "Phase 3 – Core content (Tier 1)" },
          {
            note: "Do these over Wi-Fi with the phone plugged in, and check free space after each big download.",
          },
          {
            id: "sv-px-20",
            text: "CoMaps: download your state, neighboring states, and any evacuation-route regions",
          },
          {
            id: "sv-px-21",
            text: "Kiwix: get <code>wikipedia_en_all_nopic</code> (~53 GB). Downloading it on a computer from library.kiwix.org and copying it over USB is more reliable",
          },
          {
            id: "sv-px-22",
            text: "Kiwix: get <code>wikimed_en_all_maxi</code> (~2.2 GB)",
          },
          {
            id: "sv-px-23",
            text: "PocketPal: download a 1–2B model at Q4 (a small Gemma or Qwen); try 3B only if the small one runs comfortably",
          },
          {
            id: "sv-px-24",
            text: "PDFs: U.S. Army Survival Manual and Hesperian's <em>Where There Is No Doctor</em>, opened once in KOReader",
          },
          {
            id: "sv-px-25",
            text: "Personal docs: copies of IDs, insurance, prescriptions, emergency contacts",
          },
          { heading: "Phase 4 – Extras (Tier 2, then Tier 3)" },
          {
            note: "Add these in order and stop when free space drops to about 10 GB.",
          },
          { note: "Tier 2:" },
          { id: "sv-px-26", text: "Kiwix: Wikivoyage, Wiktionary, iFixit" },
          {
            id: "sv-px-27",
            text: "Kiwix: survival, water, and medicine collections from the catalog",
          },
          {
            id: "sv-px-28",
            text: "OsmAnd (F-Droid) with topo/contour maps for your area",
          },
          { note: "Tier 3:" },
          {
            id: "sv-px-29",
            text: "A larger AI model (3B) if the phone handled the small one well",
          },
          { id: "sv-px-30", text: "More map regions" },
          { id: "sv-px-31", text: "A selection of Project Gutenberg books" },
          { id: "sv-px-32", text: "Briar (offline Bluetooth/Wi-Fi messaging)" },
          { id: "sv-px-33", text: "Termux (terminal, for tinkering)" },
          { heading: "Phase 5 – Test, store, maintain" },
          { note: "Test everything in airplane mode before you count on it." },
          { id: "sv-px-34", text: "Airplane mode on, Location on" },
          { id: "sv-px-35", text: "Search Wikipedia and WikiMed in Kiwix" },
          {
            id: "sv-px-36",
            text: "Get a GPS fix outdoors and route somewhere in CoMaps",
          },
          {
            id: "sv-px-37",
            text: "Ask the AI a question and note how fast it responds",
          },
          { id: "sv-px-38", text: "Open every PDF" },
          {
            id: "sv-px-39",
            text: "Time a full battery charge; consider a battery replacement if it's weak",
          },
          {
            id: "sv-px-40",
            text: "Store at 50–60% charge, powered off, with a cable and power bank or solar panel",
          },
          { id: "sv-px-41", text: "Top up the charge every few months" },
          {
            id: "sv-px-42",
            text: "Refresh Kiwix files and maps every 6–12 months",
          },
          {
            note: "Some 4a owners switched to LineageOS to avoid Google's early-2025 battery update, but <a href=\"https://community.iode.tech/t/unofficial-build-for-google-pixel-4a-sunfish/1096/48\" target=\"_blank\" rel=\"noopener\">it's unclear</a> whether switching undoes it.",
          },
          { heading: "Books" },
          {
            note: "Pick one main reader; KOReader is already installed from Phase 2.",
          },
          {
            id: "sv-px-43",
            text: "Choose a main reader (KOReader, or Readest for cross-device sync)",
          },
          {
            id: "sv-px-44",
            text: "Add Project Gutenberg's OPDS catalog in the reader to browse and download in-app",
          },
          {
            id: "sv-px-45",
            text: "Download classics from Standard Ebooks and Project Gutenberg",
          },
          {
            id: "sv-px-46",
            text: "Download practical textbooks from OpenStax and LibreTexts (biology, chemistry, anatomy)",
          },
          { id: "sv-px-47", text: "Get Hesperian's free health guides" },
          {
            id: "sv-px-48",
            sev: "opt",
            text: "Libby (Aurora Store) to borrow ebooks with a library card; loans stay inside Libby",
          },
          {
            id: "sv-px-49",
            sev: "opt",
            text: "Tier 3: Kiwix's Project Gutenberg ZIM for the whole library offline (large; better on the Mac's SSD)",
          },
        ],
      },
      {
        id: "sv-air",
        name: "MacBook Air 2019",
        why:
          "The 2019 Intel Air becomes the home-base machine: full illustrated Wikipedia, a larger AI model, and an installer archive that can rebuild the phone with no internet. " +
          "Stay on macOS Sonoma, the newest it can run, and skip Linux and Project N.O.M.A.D. — the T2 chip breaks Wi-Fi, keyboard and trackpad under stock Linux. " +
          "Tier 1 needs about 140 GB, so plan on a 1 TB USB-C SSD unless the internal drive is 256 GB or larger." +
          ref(
            ["Tier", "Content", "Approx. size"],
            [
              ["1 – Core", "Wikipedia with pictures (SSD), or without pictures if internal-only (~53 GB)", "~127 GB"],
              ["1 – Core", "WikiMed with pictures", "2.2 GB"],
              ["1 – Core", "AI models: one 3–4B, one 7–8B", "~8 GB"],
              ["1 – Core", "USGS topo PDFs + OpenStreetMap data for QGIS", "2–5 GB"],
              ["1 – Core", "Survival/medical PDFs, personal documents", "~1 GB"],
              ["1 – Core", "Installer archive: Mac app installers + Android install files for F-Droid, Kiwix, CoMaps, PocketPal", "~2 GB"],
              ["2 – Extras", "Wikivoyage, Wiktionary, iFixit, Kiwix survival/water/medicine collections", "5–10 GB"],
              ["2 – Extras", "Backup copies of the phone's Kiwix files", "~55 GB"],
              ["3 – If space remains", "Project Gutenberg, Calibre library, music and movies", "whatever fits"],
            ],
          ),
        items: [
          { heading: "Phase 0 – Check the hardware" },
          { id: "sv-air-1", text: "Back up anything you want to keep" },
          {
            id: "sv-air-2",
            text: "Check internal storage: Apple menu → About This Mac → More Info → Storage",
          },
          {
            id: "sv-air-3",
            text: "Check battery cycle count: System Information → Power",
          },
          {
            id: "sv-air-4",
            text: "Update to the latest Sonoma 14.x release (Kiwix needs 14.6 or later)",
          },
          { heading: "Phase 1 – Clean slate (optional)" },
          {
            id: "sv-air-5",
            text: "Reset: System Settings → General → Transfer or Reset → Erase All Content and Settings",
          },
          {
            id: "sv-air-6",
            text: "Set up a local account (Apple ID optional)",
          },
          { id: "sv-air-7", text: "Keep FileVault disk encryption on" },
          { heading: "Phase 2 – Apps" },
          { id: "sv-air-8", text: "Install Kiwix" },
          { id: "sv-air-9", text: "Install Ollama" },
          { id: "sv-air-10", text: "Install QGIS" },
          { id: "sv-air-11", text: "Install Calibre" },
          { id: "sv-air-12", sev: "opt", text: "Install GPT4All" },
          {
            id: "sv-air-13",
            text: 'Copy every installer file to an "Installers" folder on the SSD',
          },
          {
            id: "sv-air-14",
            text: "Add Android install files for F-Droid, Kiwix, CoMaps and PocketPal to the same folder",
          },
          { heading: "Phase 3 – Core content" },
          {
            id: "sv-air-15",
            text: "Kiwix: download Wikipedia (<code>wikipedia_en_all_maxi</code>) and WikiMed from library.kiwix.org to the SSD; use a resumable download such as <code>curl -C - -O &lt;link&gt;</code> in Terminal",
          },
          {
            id: "sv-air-16",
            text: "Open both files in Kiwix and run a search",
          },
          {
            id: "sv-air-17",
            text: "Ollama: <code>ollama pull</code> one 3–4B model and one 7–8B model, then test both",
          },
          {
            id: "sv-air-18",
            text: "Maps: download USGS topo PDFs for your area from the USGS National Map",
          },
          {
            id: "sv-air-19",
            sev: "opt",
            text: "Load OpenStreetMap data for your region into QGIS",
          },
          {
            id: "sv-air-20",
            text: "Save the U.S. Army Survival Manual and <em>Where There Is No Doctor</em>; add the folder to GPT4All LocalDocs if you use it",
          },
          {
            id: "sv-air-21",
            text: "Put personal documents in an encrypted disk image (Disk Utility → File → New Image → Image from Folder, encryption on)",
          },
          { heading: "Phase 4 – Extras" },
          {
            id: "sv-air-22",
            text: "Tier 2: Wikivoyage, Wiktionary, iFixit, Kiwix survival/water/medicine collections",
          },
          {
            id: "sv-air-23",
            text: "Tier 2: copy the phone's Kiwix files to the SSD as a backup",
          },
          {
            id: "sv-air-24",
            text: "Tier 3: Gutenberg, Calibre library, music and movies, keeping ~10% of each drive free",
          },
          { heading: "Phase 5 – Lock down and test" },
          {
            id: "sv-air-25",
            text: "Turn off automatic updates: System Settings → General → Software Update",
          },
          { id: "sv-air-26", text: "Turn Wi-Fi off" },
          {
            id: "sv-air-27",
            text: "With Wi-Fi off, test Kiwix search, both AI models, the maps, every PDF, and the encrypted disk image",
          },
          {
            id: "sv-air-28",
            text: "Store at ~50% charge with the SSD and a 30W+ USB-C power bank",
          },
          {
            id: "sv-air-29",
            text: "Power on every few months; refresh content every 6–12 months",
          },
        ],
      },
      {
        id: "sv-usb",
        name: "Linux USB",
        why:
          "Debian 13 with Xfce, installed directly onto the stick with LUKS full-disk encryption and networking off — without your passphrase the drive is unreadable. " +
          "That protects a lost or stolen stick, not one booted on a compromised computer, so only boot it on machines you trust; on the 2019 Air, bring an external keyboard and mouse. " +
          "Buy two fast 256 GB SSD-style drives so one can be a clone; the OS takes about 6 GB, and content fills in this order:" +
          ref(
            ["Stick size", "What fits"],
            [
              ["8 GB", "OS, WikiMed without pictures (862 MB), Simple English Wikipedia without pictures (1.09 GB), survival PDFs, encrypted personal docs"],
              ["16 GB", "The above, with WikiMed with pictures (2.2 GB) instead, plus a tiny 1B AI model"],
              ["32 GB", "The above, plus English Wikipedia intros-only (14.4 GB), regional maps, a 3B AI model"],
              ["64 GB", "Same as 32 GB, plus Wikivoyage, Wiktionary, iFixit, a second AI model"],
              ["128 GB", "Full English Wikipedia without pictures (52.7 GB) and all core content"],
              ["256 GB", "Full English Wikipedia with pictures (127 GB) and everything else"],
            ],
          ),
        items: [
          { heading: "Phase 0 – Gather" },
          {
            id: "sv-usb-1",
            text: "Target stick (256 GB recommended) plus a backup stick of the same size",
          },
          {
            id: "sv-usb-2",
            text: "Any spare stick of 4 GB+ for the installer",
          },
          {
            id: "sv-usb-3",
            text: "Download the Debian 13 installer image with Xfce on an online computer",
          },
          {
            id: "sv-usb-4",
            text: "Check its SHA256 checksum against the one on debian.org",
          },
          {
            id: "sv-usb-5",
            text: "Write the installer to the spare stick with balenaEtcher",
          },
          { heading: "Phase 1 – Install onto the target stick" },
          {
            id: "sv-usb-6",
            text: "On a laptop, remove or disable the internal drive in the BIOS so you can't overwrite it",
          },
          {
            id: "sv-usb-7",
            text: "Plug in both sticks and boot from the installer stick",
          },
          { id: "sv-usb-8", text: "Choose Expert install" },
          {
            id: "sv-usb-9",
            text: 'Partitioning: "Guided – use entire disk and set up encrypted LVM", selecting the target stick (check its size)',
          },
          {
            id: "sv-usb-10",
            text: "Set a passphrase of six or more random words",
          },
          { id: "sv-usb-11", text: "Desktop: choose Xfce" },
          {
            id: "sv-usb-12",
            text: 'Answer Yes to "Force GRUB installation to the EFI removable media path" so it boots on any PC',
          },
          { heading: "Phase 2 – Set up, then cut it off" },
          {
            id: "sv-usb-13",
            text: "Boot from the new stick and run updates while still online",
          },
          {
            id: "sv-usb-14",
            text: "Install Kiwix, QGIS, KeePassXC, and Ollama or llamafile",
          },
          {
            id: "sv-usb-15",
            text: "Firewall: <code>sudo ufw default deny incoming &amp;&amp; sudo ufw enable</code>",
          },
          {
            id: "sv-usb-16",
            text: "Remove saved Wi-Fi networks, then <code>rfkill block all</code>",
          },
          { heading: "Phase 3 – Load content" },
          {
            id: "sv-usb-17",
            text: "Add content tier by tier using the size table",
          },
          {
            id: "sv-usb-18",
            text: "Put personal documents in a KeePassXC database or encrypted folder",
          },
          { heading: "Phase 4 – Test and back up" },
          {
            id: "sv-usb-19",
            text: "Boot on two different computers and test every app with networking off",
          },
          {
            id: "sv-usb-20",
            text: "Clone to the backup stick: GNOME Disks → Create Disk Image, then Restore Disk Image",
          },
          {
            id: "sv-usb-21",
            text: "Keep the image file on the archive hard drive",
          },
          { heading: "Phase 5 – Maintain" },
          {
            id: "sv-usb-22",
            text: "Every few months, plug in and boot both sticks and open a few files",
          },
          { id: "sv-usb-23", text: "Re-clone after any content update" },
          { heading: "Long-term storage alternatives" },
          {
            note: 'Flash loses data without power: cheap QLC holds data about a year unpowered, TLC up to about three, MLC about five, SLC about ten (<a href="https://boingboing.net/2025/11/28/unpowered-solid-state-drives-could-kill-your-data.html" target="_blank" rel="noopener">via XDA</a>). Hard drives tolerate long storage better but also degrade; <a href="https://petapixel.com/2025/11/25/untouched-ssds-are-not-part-of-a-good-data-backup-strategy/" target="_blank" rel="noopener">plug in and check every drive at least yearly</a>.',
          },
          {
            id: "sv-usb-24",
            text: "Put a <code>sha256sum</code> checksum file on each drive",
          },
          {
            id: "sv-usb-25",
            text: "Twice a year, verify checksums on every drive",
          },
        ],
      },
      {
        id: "sv-kin",
        name: "Kindle (de-Amazon)",
        why:
          "The no-ads 10th-gen Kindle (KT4) can go two ways: Path A cuts off Amazon syncing and sideloads your own books with no jailbreak; Path B jailbreaks it and adds KOReader alongside the Amazon reader. " +
          "Amazon purchases stay DRM-locked either way, and Path B has to happen before the Kindle updates itself, since new firmware can close the current jailbreaks. " +
          'Find your firmware at 3 dots → Settings → Device options → Device info; the <a href="https://kindlemodding.org/jailbreak-wizard.html" target="_blank" rel="noopener">Jailbreak Wizard</a> picks the method and wins over this table.' +
          ref(
            ["Firmware", "Likely method", "Notes"],
            [
              ["5.18.0 or older", link("WinterBreak", "https://kindlemodding.org/jailbreaking/WinterBreak/"), "Needs a computer and cable; doesn't work on 5.18.1+"],
              ["5.16.3 – 5.19.5", link("SpiderCat", "https://kindlemodding.org/jailbreaking/SpiderCat/"), "Newest (September 2026); you just open a special book on the Kindle"],
              ["5.16.4 – 5.18.3", link("Sanctuary", "https://www.mobileread.com/forums/showthread.php?p=4596817"), "Browser-based, no computer needed"],
            ],
          ),
        items: [
          { heading: "Path A – De-Amazon without jailbreaking" },
          {
            id: "sv-kin-1",
            text: "While online, download any Amazon books you want to keep onto the device",
          },
          {
            id: "sv-kin-2",
            text: "Turn off Whispersync, annotation backup and Popular Highlights in Settings → Device options / Reading options",
          },
          {
            id: "sv-kin-3",
            text: "Install Calibre on the Mac and add your DRM-free books (EPUB, PDF)",
          },
          {
            id: "sv-kin-4",
            text: "Send books over USB with Calibre; it converts EPUB to a Kindle format automatically",
          },
          { id: "sv-kin-5", text: "Turn on airplane mode and leave it on" },
          {
            id: "sv-kin-6",
            sev: "opt",
            text: "Deregister the Kindle from your Amazon account (do Path B first if you might jailbreak)",
          },
          { heading: "Path B – Jailbreak, block updates, install KOReader" },
          {
            note: 'Before starting, read the <a href="https://kindlemodding.org/jailbreaking/index.html" target="_blank" rel="noopener">jailbreak overview</a> top to bottom.',
          },
          {
            note: '<b>Stop auto-updates first.</b> Kindles update when they <a href="https://kindlemodding.org/jailbreaking/prevent-auto-update/" target="_blank" rel="noopener">open the store, register, touch Wi-Fi, or reboot online</a>. Filling storage to 50–90 MB free blocks the download.',
          },
          { id: "sv-kin-7", text: "Turn on airplane mode now" },
          {
            id: "sv-kin-8",
            text: "Note your firmware and serial number (Settings → Device options → Device info)",
          },
          {
            id: "sv-kin-9",
            text: "Connect to the Mac and run <a href=\"https://github.com/bastianmarin/Kindle-Filler-Disk/\" target=\"_blank\" rel=\"noopener\"><code>Filler.sh</code></a> from the Kindle's root; your 10th-gen model mounts as a normal USB drive, so the script works",
          },
          { id: "sv-kin-10", text: "Confirm 50–90 MB free on the Kindle" },
          {
            id: "sv-kin-11",
            text: "Delete any <code>update*.bin</code> or <code>update.bin.tmp.partial</code> file in the Kindle's root",
          },
          {
            id: "sv-kin-12",
            text: "Make sure the Kindle is registered to your Amazon account (some jailbreaks need it)",
          },
          {
            id: "sv-kin-13",
            text: 'Run the <a href="https://kindlemodding.org/jailbreak-wizard.html" target="_blank" rel="noopener">Jailbreak Wizard</a> and follow the method it names (likely SpiderCat, Sanctuary or WinterBreak)',
          },
          {
            id: "sv-kin-14",
            text: 'Wait for the script text and restart; ignore "application error" popups',
          },
          {
            id: "sv-kin-15",
            text: 'Delete the filler files and any <code>.bin</code> update files; <a href="https://kindlemodding.org/jailbreaking/SpiderCat/" target="_blank" rel="noopener">updates are now blocked automatically</a>',
          },
          {
            id: "sv-kin-16",
            text: 'Follow <a href="https://kindlemodding.org/jailbreaking/whats-next/getting-koreader/" target="_blank" rel="noopener">Getting KOReader</a> to install KOReader with the package manager the jailbreak installed',
          },
          { id: "sv-kin-17", text: "Turn airplane mode back on" },
          {
            note: "Get stuck? The <a href=\"https://discord.kindlemodding.org/\" target=\"_blank\" rel=\"noopener\">KindleModding Discord</a> and r/kindlejailbreak help. Don't factory reset without asking there first.",
          },
          { heading: "Fill it with books" },
          {
            id: "sv-kin-18",
            text: "Free classics from Project Gutenberg and Standard Ebooks (EPUB)",
          },
          {
            id: "sv-kin-19",
            text: "Your own DRM-free purchases (many indie and technical publishers sell them)",
          },
          {
            id: "sv-kin-20",
            text: "Bonus for the survival kit: copy the U.S. Army Survival Manual and <em>Where There Is No Doctor</em> PDFs; e-ink with airplane mode lasts weeks per charge",
          },
          {
            id: "sv-kin-21",
            text: "Manage the library with Calibre on the Mac; KOReader opens EPUB and PDF directly, no conversion needed",
          },
        ],
      },
  ],
};
