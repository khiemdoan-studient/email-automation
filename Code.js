// ============================================
// CONFIGURATION
// ============================================
var CONFIG = {
  ROOT_FOLDER_NAME: "Bruna and Mark's Schools - Weekly Report",
  ROOT_FOLDER_ID: "1cDnSQ2P8EmmvC1bb4CuRPIdG9XNfozgR",  // Bulletproof fallback: direct folder ID

  // v2.15.0: click-tracking web app /exec URL. This is the DEFAULT; the Script
  // Property TRACKING_WEBAPP_URL (if set) overrides it. Keep this pointed at the
  // SAME deployment id you re-version after each `clasp push` (re-version, don't
  // create a brand-new deployment, or the /exec id changes and this goes stale).
  // Empty string here = tracking off / fail-open.
  TRACKING_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbzxwauuhinj9htVMrlgPBTDCQxSGaOgLPZO8a9mRNNKBx8d9R_SeDTMBl0bh6r2IBg/exec",

  // v2.18.0: GitHub Pages shim that fetches the /exec endpoint COOKIE-LESSLY
  // (credentials:'omit'), dodging Google's multi-account /macros/u/N routing
  // which kills browser navigations to /exec before doGet runs. Generated links
  // point here with the token in the URL FRAGMENT (#e=...), which never reaches
  // GitHub's servers. Script Property TRACKING_SHIM_URL overrides. Empty string
  // = link straight to /exec (old behavior).
  TRACKING_SHIM_URL: "https://khiemdoan-studient.github.io/email-automation/r.html",
  CONFIG_SHEET_NAME: "Config",
  MAPPING_SHEET_NAME: "School-IM Mapping",
  ROSTER_SHEET_NAME: "Teacher Emails",
  ALL_METRICS_SHEET_NAME: "All Teacher Metrics",
  WINNERS_SHEET_NAME: "Student Winners",
  READING_TEACHERS_SHEET_NAME: "Reading Teachers",
  AVAILABLE_WEEKS_SHEET_NAME: "Available Weeks",
  // v2.6.5: year-cumulative tabs for the SC Final Email template (parent v3.41.4).
  YEAR_TOTALS_SHEET_NAME: "Year Teacher Totals",
  STUDENT_HIGHLIGHTS_SHEET_NAME: "Student Year Highlights",
  // v2.8.0: Spring 2026 MAP Scores tab for the new live-data MAP template.
  MAP_SCORES_SHEET_NAME: "Spring 2026 MAP Scores",
  // v2.22.0: manager-editable 26-27 templates. The shared "26_27 Implementation
  // Emails" Doc is the authoring surface; Email Tools > "Templates: Sync from
  // 26-27 Doc" parses it into the Template Content tab, which draft generation
  // reads (hardcoded WEEK_SPECS_2627 is the fallback when no synced row exists).
  TEMPLATE_DOC_ID: "1pKkcEnP-Ljt6MtZ7ukdLzsfxSrbG8nqEz4__xMyqohw",
  TEMPLATE_CONTENT_TAB: "Template Content",

  // v2.10.0: Summer School Week 1+2 template reads THREE EXTERNAL sources
  // (NOT the active spreadsheet): a Summer Performance Dashboard, the MAP
  // Master Roster, and a nested "Public School Summer Camp" Drive tree
  // (Camp -> School -> Teacher -> two weekly XP-report PDFs). See the
  // SUMMER SCHOOL WEEK 1+2 section near the end of this file.
  SUMMER_SCHOOL: {
    DATA_ID: "1pbVCjxsn3t6r-jej0Kp00Y8avfxNW6G-mmICoR3Nrtw",   // "Summer Performance Dashboard"
    DATA_GID: 1749344035,                                       // user-linked tab (hint; tab resolved by header signature)
    ROSTER_ID: "1scEay0a8OR6vU3uJuxbHKWCEx_RVgSsRXF9naJh3XYw",  // "MAP Master Roster for Public School SW Sales"
    ROSTER_GID: 1317754525,                                     // Summer School roster tab
    PDF_CAMP_FOLDER_ID: "1wY4sMo0YgHy3Q85FU1UIdrEhtgdSvM5y",    // "Public School Summer Camp" (inside ROOT_FOLDER_ID)
    WEEK_STARTS: ["2026-06-01", "2026-06-08"],                  // the two weeks shown (6/1-6/14)
    WEEK_LABELS: ["Week 1 (6/1-6/7)", "Week 2 (6/8-6/14)"],     // data-table row labels, paired with WEEK_STARTS
    CONSOLIDATE_CAMPUSES: ["JRHS - Ridgeland Secondary Academy of Excellence"], // campuses where ALL groups go in ONE email (one teacher runs them all)
    // v2.13.0: Jasper County campuses (jcsd.net). _summerDistrict returns 'jasper'
    // for these, else 'allendale' -> picks the per-district body/subject (Week 3).
    JASPER_CAMPUSES: [
      "JHMS - Hardeeville Junior Senior High School",
      "JHES - Hardeeville Elementary School",
      "JRHS - Ridgeland Secondary Academy of Excellence",
      "JRES - Ridgeland Elementary School"
    ],
    SUBJECT: "Studient: Week 2: Keep the Momentum Going"        // default (Week 1+2); per-template subjects live in summerConfig
  },

  // Column indices in Teacher Emails sheet (0-indexed)
  CAMPUS_COL: 2,           // Column C: Campus
  TEACHER_FIRST_COL: 24,   // Column Y: Teacher 1 First Name
  TEACHER_LAST_COL: 25,    // Column Z: Teacher 1 Last Name
  TEACHER_EMAIL_COL: 26,   // Column AA: Teacher 1 Email

  // v2.6.0: Color-band thresholds for the metrics table cell shading.
  // Tweak here if content team adjusts the green/yellow/red bands.
  THRESHOLDS: {
    ACTIVE_DAYS_GREEN: 3.95,   // >= → green; tightened from 4 to capture 3.95+ teachers
    ACTIVE_DAYS_YELLOW: 2.95,  // >= → yellow (else red)
    AVG_MINS_GREEN: 99.5,      // >= → green; ~100 min/wk benchmark
    AVG_MINS_YELLOW: 79.5      // >= → yellow (else red)
  },

  // v2.6.0: Operational limits.
  LIMITS: {
    ERROR_LOG_MAX_ROWS: 500,        // Target row count after a trim
    ERROR_LOG_TRIM_TRIGGER: 600,    // Hysteresis trigger (avoids O(n) deleteRows on every call past 500)
    ERROR_MSG_TRUNCATE: 1500        // Max chars in error string shown in completion alert (Apps Script alert cap is 4096)
  },

  // v2.6.0: Smoke test fixture — 1-2 teachers per district for "Test Mode: Generate Smoke Test".
  // Picks ~6-8 teachers across districts; smoke test generates drafts to current user
  // (not real teachers) for visual verification that all template elements render.
  // Names lowercased to match metrics-tab keys.
  SMOKE_TEST_TEACHERS: [
    'avlen edwards',          // JHMS — Jasper district
    'muntasir hamid',         // JHMS — Jasper district
    'anton haughton',         // AFMS — Allendale district (note: BQ name, alias maps Aston→Anton)
    'bertha folk',            // AFMS — Allendale district
    'kim bell',               // Reading Community (note: 1 of 11 upstream gaps as of 2026-04-20 — verify before relying)
    'vipul singhal',          // Metro Schools — multi-grade 9+10, 13 students (most Metro data; v2.6.1 swap from Faith Armstrong whose PDF wasn't being generated upstream)
    'verenice rivera',        // Metro Schools
    'rebecca reynolds'        // JHES — Jasper district
  ]
};

// ============================================
// TEMPLATE REGISTRY
// ============================================
// Each template: { subject, buildBody(teacher, metrics, winners, dot) }
// Templates that don't use winners pass null for winnersArray
var TEMPLATES = {
  // v2.21.0: SY26-27 Weeks 1-9. Listed first so the current school year leads
  // the dropdown. Copy + links come from the shared Google Doc "26_27
  // Implementation Emails"; specs live in WEEK_SPECS_2627 near the bottom of
  // this file. Standard weekly path: metrics table + PDF attachment.
  '26-27 Week 1: Growth Mindset Culture': {
    subject: 'Studient: Week 1: Let\'s Launch!',
    buildBody: generate2627Week1Body
  },
  '26-27 Week 2: Clarity Builds Mastery': {
    subject: 'Studient: Teach It. Check It. Repeat It.',
    buildBody: generate2627Week2Body
  },
  '26-27 Week 3: Persistence': {
    subject: 'Studient: Persistence Starts with Presence',
    buildBody: generate2627Week3Body
  },
  '26-27 Week 4: Reflection & Ownership': {
    subject: 'Studient: Cultivating the "Yet"',
    buildBody: generate2627Week4Body
  },
  '26-27 Week 5: Learning Narratives': {
    subject: 'Studient: Changing the Learning Narrative',
    buildBody: generate2627Week5Body
  },
  '26-27 Week 6: Persistent Engagement': {
    subject: 'Studient: How to make "struggling" the best part of your class.',
    buildBody: generate2627Week6Body
  },
  '26-27 Week 7: Actionable Feedback': {
    subject: 'Studient: Build Curious, Unstoppable Problem-Solvers',
    buildBody: generate2627Week7Body
  },
  '26-27 Week 8: Misses as Roadmaps': {
    subject: 'Studient: Turn a "miss" into a roadmap.',
    buildBody: generate2627Week8Body
  },
  '26-27 Week 9: Confidence Through Evidence': {
    subject: 'Studient: Stop hoping for confidence. Start building it.',
    buildBody: generate2627Week9Body
  },
  'Week 0: Data': {
    subject: 'Data Delivery: Try to Contain Your Excitement -- MAP Scores Are In!',
    buildBody: generateWeek0Body
  },
  // v2.5.3: [DRAFT] suffix added — template body has unfilled `_____` blanks
  // in the challenge/reflection prompts. IMs should avoid until content is filled.
  'Week 1: Goals & Monitoring [DRAFT]': {
    subject: 'Your data is served (with a side order of goals and monitoring reminders!)',
    buildBody: generateWeek1Body
  },
  'Week 2: Tech Hygiene': {
    subject: 'Attached: Your Data (+ 3 things you actually need to read about tech hygiene and student data ownership.)',
    buildBody: generateWeek2Body
  },
  // v2.5.3: [DRAFT] suffix — template body has unfilled `_____` blanks.
  'Week 3: Micro-Coaching [DRAFT]': {
    subject: 'Your Motivention Data (+ 3 Micro-coaching moves to keep students moving.)',
    buildBody: generateWeek3Body
  },
  // v2.5.3: [DRAFT] suffix — template body has unfilled `_____` blanks.
  'Week 4: Diagnosing Habits [DRAFT]': {
    subject: 'Your weekly Motivention numbers (Now with data graphs to see at a glance)',
    buildBody: generateWeek4Body
  },
  'Week 5: Re-Engagement': {
    subject: 'Freshly pressed data (+ 3 insights that aren\'t just noise about Re-Engagement & Resets)',
    buildBody: generateWeek5Body
  },
  'Week 6: Culture & Shoutouts': {
    subject: 'Data drop: A 2-minute summary of everything that matters about culture, shoutouts, & Rewards',
    buildBody: generateWeek6Body
  },
  'Week 7: I\'m Stuck Protocol': {
    subject: 'Data crunch complete: (+ 3 non-boring updates using the I\'m Stuck protocol)',
    buildBody: generateWeek7Body
  },
  'Week 8: Growth Mindset': {
    subject: 'Attached: Your Data (+ 3 things you actually need to read about Mindset Reframing)',
    buildBody: generateWeek8Body
  },
  // v2.5.3: [DRAFT] suffix — template body still contains literal "[PLACEHOLDER:
  // Wrap Up focus content -- paste from Google Doc]" instead of real content.
  'Wrap Up: Celebrate Wins [DRAFT]': {
    subject: 'Data drop: Celebrating your students\' wins and hard work',
    buildBody: generateWrapUpBody
  },
  '4/20 Jasper: Finishing Strong': {
    subject: 'Data drop: What\'s changing this week (and why it matters)',
    buildBody: generateJasperFinishingStrongBody
  },
  '4/20 Math+ELA: Finishing Strong': {
    subject: 'Data drop: What\'s changing this week (and why it matters)',
    buildBody: generateMathElaFinishingStrongBody
  },
  '4/27: Last Week of Motivention': {
    subject: 'Data crunch & point calculation complete: (+ 3 non-boring updates to finish strong)',
    buildBody: generateLastWeekFinishLineBody
  },
  // v2.6.5: SC Final Email — year-cumulative end-of-year summary with student spotlights.
  // Reads new tabs Year Teacher Totals + Student Year Highlights (populated by parent v3.41.4).
  'SC Final Email: Growth & Hardwork = Results': {
    subject: 'Motivention Store Closing Friday (+ Impressive Results)',
    buildBody: generateScFinalEmailBody
  },
  // v2.8.0: Spring 2026 MAP Scores. Live-data template (refreshes when parent
  // pipeline writes the Spring 2026 MAP Scores tab). Reads MAP RIT scores by
  // (student, subject); skips teachers with zero MAP students via partition.
  'Spring 2026 MAP Scores': {
    subject: 'Spring 2026 MAP Scores: Your students\' Winter and Spring results',
    buildBody: generateSpring2026MapBody,
    // v2.8.1: MAP template carries its own data table in the body. No weekly PDF
    // attachment is needed or expected; skip the PDF lookup entirely so missing
    // PDFs don't surface as errors for this template.
    requiresPdf: false
  },
  // v2.11.0: Summer School Week 1+2. Runs on a SEPARATE external-source path
  // (Summer Performance Dashboard + MAP Master Roster + the nested "Public
  // School Summer Camp" Drive tree), scoped to the IM's School-IM Mapping
  // schools. The summerSchool flag routes generateDraftsForCurrentUser to
  // _runSummerSchoolCore instead of the normal metrics/PDF loop; buildBody is
  // the summer body builder (invoked by the core, not the normal loop).
  'Summer School Week 1+2': {
    subject: 'Studient: Week 2: Keep the Momentum Going',
    buildBody: generateSummerSchoolWeek12Body,
    summerSchool: true,
    requiresPdf: false,
    summerConfig: {
      weekStarts: ['2026-06-01', '2026-06-08'],
      weekLabels: ['Week 1 (6/1-6/7)', 'Week 2 (6/8-6/14)'],
      byDistrict: false,
      variant: { subject: 'Studient: Week 2: Keep the Momentum Going', copy: _summerBodyCopySections }
    }
  },
  // v2.13.0: Summer School Week 3 -- per-district. Jasper schools get the "Finish
  // Strong" body/subject; Allendale schools get "Push Through the Slump". Single
  // week (6/15-6/21). Same external-source flow; _runSummerSchoolCore reads
  // summerConfig for the week window + per-district subject + copy.
  'Summer School Week 3': {
    subject: 'Studient - Week 3: Push Through the Slump',
    buildBody: generateSummerSchoolWeek12Body,
    summerSchool: true,
    requiresPdf: false,
    summerConfig: {
      weekStarts: ['2026-06-15'],
      weekLabels: ['Week of 6/15 (6/15-6/21)'],
      byDistrict: true,
      variants: {
        jasper: { subject: 'Studient - Week 4: Finish Strong', copy: _summerWeek3JasperCopy },
        allendale: { subject: 'Studient - Week 3: Push Through the Slump', copy: _summerWeek3AllendaleCopy }
      }
    }
  },
  // v2.14.0: Summer School Final Week - "You Made It" wrap-up for ALL summer
  // campuses (Jasper + Allendale). Single week 6/22; no campus restriction.
  // Adds a per-teacher (and per-campus, for consolidated JRHS) Student
  // Achievement Awards section sourced from the live Summer Fidelity helper tabs.
  'Summer School Final Week': {
    subject: 'Studient - Final Week: You Made It',
    buildBody: generateSummerSchoolWeek12Body,
    summerSchool: true,
    requiresPdf: false,
    summerConfig: {
      weekStarts: ['2026-06-22'],
      weekLabels: ['Week of 6/22 (6/22-6/28)'],
      byDistrict: false,
      showStudentAwards: true,
      variant: { subject: 'Studient - Final Week: You Made It', copy: _summerFinalWeekCopy }
    }
  }
};

// Template names list for dropdown validation.
// Derived from TEMPLATES so TEMPLATE_NAMES can never drift out of sync with the registry.
// V8 Object.keys preserves insertion order for string keys, so the dropdown order matches
// the order entries appear in the TEMPLATES literal above.
var TEMPLATE_NAMES = Object.keys(TEMPLATES);

// ============================================
// v2.22.0 — MANAGER-EDITABLE 26-27 TEMPLATES (resolver layer)
// ============================================
// The 26-27 weekly templates resolve their content through _getSpec2627_:
// a synced row in the Template Content tab (written by syncTemplatesFromDoc,
// authored by managers in the shared 26_27 Doc) wins; the hardcoded
// WEEK_SPECS_2627 entry is the fail-soft fallback. Resolution keys off the
// WEEK NUMBER parsed from the template name, so a manager renaming a week's
// focus title never breaks an already-selected dropdown value.

var _syncedSpecs2627Cache = null;

/** Read synced specs from the Template Content tab. Fail-soft: {} on any error. */
function _getSyncedSpecs_() {
  if (_syncedSpecs2627Cache !== null) return _syncedSpecs2627Cache;
  var out = {};
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.TEMPLATE_CONTENT_TAB);
    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var r = data[i];
        var week = Number(r[0]);
        var spec = {
          templateName: String(r[1] || '').trim(),
          subject: String(r[2] || '').trim(),
          focusTitle: String(r[3] || '').trim(),
          action: String(r[4] || '').trim(),
          actionDetail: String(r[5] || '').trim(),
          dataLine: String(r[6] || '').trim(),
          videoText: String(r[7] || '').trim(),
          videoUrl: String(r[8] || '').trim(),
          infographicText: String(r[9] || '').trim(),
          infographicUrl: String(r[10] || '').trim(),
          aimUrl: String(r[11] || '').trim(),
          aimMaterials: String(r[12] || '').trim()
        };
        // Minimal row sanity; a broken row silently falls back to the hardcoded spec.
        if (week >= 1 && spec.subject && spec.videoUrl && spec.infographicUrl) out[week] = spec;
      }
    }
  } catch (e) {
    out = {};
  }
  _syncedSpecs2627Cache = out;
  return out;
}

/** Spec for a 26-27 week: synced row first, hardcoded fallback, else null. */
function _getSpec2627_(week) {
  return _getSyncedSpecs_()[week] || WEEK_SPECS_2627[week] || null;
}

/**
 * Resolve a template name to its {subject, buildBody, ...} entry.
 * 26-27 names resolve by week number through the spec layer (synced content
 * wins); everything else falls through to the static TEMPLATES registry.
 * ALL runtime template lookups go through here, never TEMPLATES[name] directly.
 */
function resolveTemplate_(name) {
  var m = /^26-27 Week (\d+)\b/.exec(String(name || ''));
  if (m) {
    var spec = _getSpec2627_(Number(m[1]));
    if (!spec) return null;
    return {
      subject: spec.subject,
      buildBody: function (teacher, metricsArray) {
        return _build2627BodyFromSpec(teacher, metricsArray, spec);
      }
    };
  }
  return TEMPLATES[name] || null;
}

/**
 * Dropdown name list: 26-27 weeks first (synced names win over static keys,
 * numeric week order; a synced Week 10+ auto-appears with zero code), then
 * every non-26-27 static template in registry order.
 */
function getTemplateNames_() {
  var synced = _getSyncedSpecs_();
  var staticByWeek = {};
  TEMPLATE_NAMES.forEach(function (n) {
    var m = /^26-27 Week (\d+)\b/.exec(n);
    if (m) staticByWeek[Number(m[1])] = n;
  });
  var weekSet = {};
  Object.keys(synced).forEach(function (w) { weekSet[w] = true; });
  Object.keys(staticByWeek).forEach(function (w) { weekSet[w] = true; });
  var names = Object.keys(weekSet).map(Number).sort(function (a, b) { return a - b; })
    .map(function (w) {
      var s = synced[w];
      return (s && s.templateName)
        || (s && ('26-27 Week ' + w + ': ' + (s.focusTitle || 'Weekly Email')))
        || staticByWeek[w];
    });
  TEMPLATE_NAMES.forEach(function (n) { if (!/^26-27 /.test(n)) names.push(n); });
  return names;
}

// Manual aliases for teachers whose names differ between roster and BigQuery metrics.
// KEEP THIS LIST IN SYNC with scripts/check_email_data.py NAME_ALIASES.
//
// Each entry maps the LOWERCASED roster spelling to the LOWERCASED metrics-tab spelling.
// Used by lookupByName() as a final fallback when direct match + last-name search fail.
//
// v2.5.2 additions:
//   - 'aston haughton' → 'anton haughton': BQ data has a one-letter typo (Anton vs
//     Aston) for the AFMS teacher. SIS source-of-truth uses Aston (matches Drive
//     folder + email haughtona@). REMOVE THIS ENTRY once the SIS / BQ data is corrected.
//   - 'lakieshie jennings' → 'lakieshie roberts-jennings': JHES teacher whose roster
//     stores the un-hyphenated short name; metrics tab has the full hyphenated form.
//     Permanent unless the roster is updated to match.
//
// To find new aliases needed: run `python scripts/check_email_data.py --week YYYY-MM-DD`.
var NAME_ALIASES = {
  'lisa kloesz': 'lisa kloetz',
  'aston haughton': 'anton haughton',                  // v2.5.2: BQ typo (AFMS) — remove once fixed upstream
  'lakieshie jennings': 'lakieshie roberts-jennings'   // v2.5.2: hyphenated last name (JHES)
};

// ============================================
// MENU
// ============================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Email Tools')
    .addItem('Generate My Email Drafts', 'generateDraftsForCurrentUser')
    .addItem('Retry Last Run\'s Failed Teachers', 'retryLastRunFailed')
    .addSeparator()
    .addItem('Test Mode: Generate Smoke Test (drafts to me)', 'generateSmokeTest')
    .addSeparator()
    .addItem('Summer School: Smoke Test (to me)', 'generateSummerSchoolSmokeTest')
    .addSeparator()
    .addItem('Debug: Check Teacher Names (roster vs metrics)', 'checkTeacherNames')
    .addItem('Debug: Check Teacher Folders', 'checkTeacherFolders')
    .addItem('Debug: Validate All PDFs (Config week)', 'validateAllPdfs')
    .addItem('Debug: Drive Access', 'debugDriveAccess')
    .addItem('Debug: Drive Auth (run if "Service error: Drive")', 'diagnoseDriveAuth')
    .addItem('View Error Log', 'viewErrorLog')
    .addItem('Clear Error Log', 'clearErrorLog')
    .addSeparator()
    .addItem('Engagement: Rebuild Click Dashboard', 'rebuildEngagementDashboard')
    .addItem('Engagement: Set Up Report Links Folder', 'setupReportLinksFolder')
    .addItem('Run Unit Tests', 'runUnitTests')
    .addSeparator()
    .addItem('Set Date Range', 'setDateRange')
    .addItem('Set Template', 'setTemplate')
    .addItem('Refresh Template Dropdown', 'setupTemplateDropdown')
    .addSeparator()
    .addItem('Templates: Sync from 26-27 Doc', 'syncTemplatesFromDoc')
    .addToUi();
}

/**
 * v2.4.2: Minimal Drive auth probe. Run this FIRST when "Service error: Drive"
 * appears. Tests three Drive operations in isolation with named try/catch:
 *   1. getRootFolder() — your default Drive root (lightweight)
 *   2. getFolderById(ROOT_FOLDER_ID) — direct ID access (works even for shared-with-me)
 *   3. parentFolder.getFolders() — child folder iteration (fails for shared-with-me users
 *      who lack explicit parent-folder membership)
 *
 * If #1 + #2 succeed but #3 fails: this is the "shared with me" Drive permission
 * pattern. Fix: have the folder owner add you as an explicit Editor on the
 * parent folder ("Bruna and Mark's Schools - Weekly Report"). Once added, child
 * iteration works. Until then, v2.4.2's try/catch wrapping prevents crashes but
 * cannot list folders that getFolders() can't see.
 */
function diagnoseDriveAuth() {
  var ui = SpreadsheetApp.getUi();
  var lines = [];
  lines.push('<h2>Drive Auth Diagnostic (v2.4.2)</h2>');
  lines.push('<p><b>User:</b> ' + Session.getActiveUser().getEmail() + '</p>');

  // 1. DriveApp.getRootFolder()
  try {
    var myRoot = DriveApp.getRootFolder();
    lines.push('<p style="color:green;">✓ DriveApp.getRootFolder() works (your "My Drive" is reachable)</p>');
  } catch (e) {
    lines.push('<p style="color:red;">✗ DriveApp.getRootFolder() failed: ' + (e.message || e) + '</p>');
    lines.push('<p><b>This means the script does NOT have Drive scope authorized for your account.</b></p>');
    lines.push('<p><u>Fix:</u> Open <b>Extensions → Apps Script</b> → Run any function (e.g. <code>onOpen</code>) → click <b>Review Permissions</b> → choose your account → click <b>Allow</b>.</p>');
    var html1 = HtmlService.createHtmlOutput(lines.join('')).setWidth(700).setHeight(450);
    ui.showModalDialog(html1, 'Drive Auth Diagnostic');
    return;
  }

  // 2. getFolderById on the project's root
  try {
    var byId = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
    lines.push('<p style="color:green;">✓ DriveApp.getFolderById("' + CONFIG.ROOT_FOLDER_ID + '") works → name: <b>' + byId.getName() + '</b></p>');
  } catch (e) {
    lines.push('<p style="color:red;">✗ DriveApp.getFolderById failed: ' + (e.message || e) + '</p>');
    lines.push('<p><b>This means the project root folder ID is invalid or you have no access at all.</b></p>');
    lines.push('<p><u>Fix:</u> Ensure the root folder is shared with your account (any access level), then re-run this diagnostic.</p>');
    var html2 = HtmlService.createHtmlOutput(lines.join('')).setWidth(700).setHeight(450);
    ui.showModalDialog(html2, 'Drive Auth Diagnostic');
    return;
  }

  // 3. parentFolder.getFolders() — the smoking gun
  try {
    var rootFolder = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
    var iter = rootFolder.getFolders();
    var count = 0;
    while (iter.hasNext() && count < 5) { iter.next(); count++; }
    lines.push('<p style="color:green;">✓ rootFolder.getFolders() works (listed ' + count + '+ child folders) — full Drive permissions confirmed.</p>');
    lines.push('<p>If "Generate My Email Drafts" still fails, the cause is per-teacher (specific PDF / quota / rate limit). Run <b>Debug: Drive Access</b> for per-teacher detail.</p>');
  } catch (e) {
    lines.push('<p style="color:red;">✗ rootFolder.getFolders() failed: ' + (e.message || e) + '</p>');
    lines.push('<p><b>ROOT CAUSE FOUND.</b> You have <i>direct access</i> to the root folder (via "Shared with me") but NOT explicit list permission. Drive\'s child-listing API (<code>getFolders</code>) requires you to be an explicit Editor/Viewer on the parent — not just a recipient of a share link.</p>');
    lines.push('<p><u>Fix:</u> Have the folder OWNER (likely <code>mark.katigbak</code>) add you as <b>Editor</b> directly on "<b>Bruna and Mark\'s Schools - Weekly Report</b>". Once added, child iteration works. v2.4.2\'s try/catch wrapping prevents crashes but does NOT grant permissions you lack — only the owner can do that.</p>');
    lines.push('<p><u>Workaround:</u> Until permissions are fixed, the script will use exact-name search (<code>getFoldersByName</code>) which works for shared-with-me users. The School-IM Mapping must use the EXACT folder name (with spaces, e.g. "JRES - Ridgeland Elementary School") in the displayName column for this to find the folder in one call.</p>');
  }

  var html = HtmlService.createHtmlOutput(lines.join('')).setWidth(800).setHeight(550);
  ui.showModalDialog(html, 'Drive Auth Diagnostic');
}

/**
 * Rebuilds the Template dropdown on the Config tab so it reflects the
 * current TEMPLATE_NAMES list. Run this after adding/removing templates
 * in Code.gs so IMs see the new options.
 *
 * Writes a ONE_OF_LIST data validation rule to whichever row in Config
 * has "Template" in column A.
 */
function setupTemplateDropdown() {
  var ui = SpreadsheetApp.getUi();
  var configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.CONFIG_SHEET_NAME);
  if (!configSheet) {
    ui.alert('Error', 'Config sheet not found.', ui.ButtonSet.OK);
    return;
  }

  var data = configSheet.getDataRange().getValues();
  var templateRow = -1;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === 'template') {
      templateRow = i + 1; // 1-indexed for getRange
      break;
    }
  }
  if (templateRow === -1) {
    ui.alert('Error', 'No "Template" row found on Config tab. Add a row with "Template" in column A first.', ui.ButtonSet.OK);
    return;
  }

  // v2.22.0: getTemplateNames_ merges synced 26-27 names with the static registry.
  var names = getTemplateNames_();
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(names, true)
    .setAllowInvalid(false)
    .setHelpText('Select a template. Managers edit 26-27 content in the shared Doc, then run Templates: Sync from 26-27 Doc.')
    .build();
  configSheet.getRange(templateRow, 2).setDataValidation(rule);

  ui.alert('Done',
    'Template dropdown refreshed with ' + names.length + ' options:\n\n'
      + names.join('\n'),
    ui.ButtonSet.OK);
}

/**
 * Returns the root folder, using folder ID first (bulletproof),
 * then falling back to name lookup.
 */
function getRootFolder() {
  if (CONFIG.ROOT_FOLDER_ID) {
    try {
      return DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
    } catch (e) {
      // ID didn't work (deleted, no access, etc.) — fall through to name lookup
    }
  }
  return findFolderByName(CONFIG.ROOT_FOLDER_NAME);
}

function setDateRange() {
  var ui = SpreadsheetApp.getUi();
  // Show available weeks from helper tab
  var weeks = getAvailableWeeks();
  var msg = 'Enter the date range folder name (e.g., 2026-03-09_to_2026-03-15):';
  if (weeks.length > 0) {
    msg += '\n\nAvailable weeks:\n' + weeks.slice(0, 10).join('\n');
  }
  var response = ui.prompt('Set Date Range', msg, ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() === ui.Button.OK) {
    var dateRange = response.getResponseText().trim();
    setConfigValue('Date Range', dateRange);
    ui.alert('Date range set to: ' + dateRange);
  }
}

function setTemplate() {
  var ui = SpreadsheetApp.getUi();
  var names = getTemplateNames_();
  var msg = 'Enter the template name:\n\n' + names.join('\n');
  var response = ui.prompt('Set Template', msg, ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() === ui.Button.OK) {
    var template = response.getResponseText().trim();
    if (!resolveTemplate_(template)) {
      ui.alert('Error', 'Unknown template: ' + template + '\n\nValid options:\n' + names.join('\n'), ui.ButtonSet.OK);
      return;
    }
    setConfigValue('Template', template);
    ui.alert('Template set to: ' + template);
  }
}

// ============================================
// v2.6.0 — SMOKE TEST FIXTURE (Phase C of audit follow-up)
// ============================================
//
// Generates ~6-8 sample drafts to the current user's Gmail (NOT teacher emails)
// for visual verification that all template elements (metrics table, winners,
// trend alert, PDF attachment) render correctly across districts. Uses the
// same generation pipeline as the bulk run, so it catches regressions in the
// full path (search-API lookup, name resolution, alias handling, etc.).
//
// Teachers are listed in CONFIG.SMOKE_TEST_TEACHERS (1-2 per district).

/**
 * v2.6.0: Find a teacher by full lowercased name across BOTH the Teacher Emails
 * tab AND the Reading Teachers tab. Returns the same teacher object shape as
 * getTeachersForSchools. Returns null if not found.
 *
 * Used by smoke test (which needs to access teachers regardless of which IM
 * runs the test). Production callers should use getTeachersForSchools instead.
 */
function findTeacherByName(nameLower) {
  if (!nameLower) return null;
  var target = nameLower.toLowerCase().trim();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Pass 1: Teacher Emails tab (regular schools)
  var data = ss.getSheetByName(CONFIG.ROSTER_SHEET_NAME).getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var first = String(data[i][CONFIG.TEACHER_FIRST_COL] || '').trim();
    var last = String(data[i][CONFIG.TEACHER_LAST_COL] || '').trim();
    if (!first || !last) continue;
    if ((first + ' ' + last).toLowerCase() === target) {
      var emailVal = String(data[i][CONFIG.TEACHER_EMAIL_COL] || '').trim();
      var campus = String(data[i][CONFIG.CAMPUS_COL] || '').trim();
      return {
        firstName: first.split(' ')[0],
        lastName: last,
        name: first + ' ' + last,
        folderName: (first + '_' + last).replace(/ /g, '_'),
        email: emailVal,
        campus: campus
      };
    }
  }

  // Pass 2: Reading Teachers tab
  var rs = ss.getSheetByName(CONFIG.READING_TEACHERS_SHEET_NAME);
  if (rs) {
    var rdata = rs.getDataRange().getValues();
    for (var r = 1; r < rdata.length; r++) {
      var fn = String(rdata[r][0] || '').trim();
      var ln = String(rdata[r][1] || '').trim();
      if (!fn || !ln) continue;
      if ((fn + ' ' + ln).toLowerCase() === target) {
        return {
          firstName: fn.split(' ')[0],
          lastName: ln,
          name: fn + ' ' + ln,
          folderName: (fn + '_' + ln).replace(/ /g, '_'),
          email: String(rdata[r][2] || '').trim(),
          campus: 'Reading Community City School District'
        };
      }
    }
  }

  return null;
}

/**
 * v2.6.0: Generate smoke test drafts. Creates ~6-8 drafts in the current
 * user's Gmail (overrides teacher.email) using the teachers listed in
 * CONFIG.SMOKE_TEST_TEACHERS. Uses currently-selected Config Date Range +
 * Template. Result: visual inspection batch in IM's own Drafts folder.
 */
function generateSmokeTest() {
  var ui = SpreadsheetApp.getUi();
  // v2.11.0: if Config Template is the Summer School one, the regular smoke path
  // (weekly metrics + ROOT_FOLDER PDFs) does not apply. Redirect to the summer
  // smoke test (it takes its own lock) BEFORE locking here.
  var _smokeTpl = getConfigValue('Template');
  var _smokeEntry = _smokeTpl && resolveTemplate_(_smokeTpl);
  if (_smokeEntry && _smokeEntry.summerSchool) {
    generateSummerSchoolSmokeTest();
    return;
  }
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(0)) {
    ui.alert('Already Running',
      'Email generation is in progress. Wait for the current run to finish before starting a smoke test.',
      ui.ButtonSet.OK);
    return;
  }

  try {
    _runIdCache = null;
    // v2.6.5: reset year-cumulative caches so each run reads fresh from the sheet.
    _yearTotalsCache = null;
    _studentHighlightsCache = null;
    // v2.8.0: reset MAP-scores cache.
    _mapScoresCache = null;
    var currentUserEmail = Session.getActiveUser().getEmail();
    var dateRange = getConfigValue('Date Range');
    if (!dateRange) {
      ui.alert('Error', 'Please set Date Range first.', ui.ButtonSet.OK);
      return;
    }
    var templateName = getConfigValue('Template') || '4/27: Last Week of Motivention';
    var template = resolveTemplate_(templateName);
    if (!template) {
      ui.alert('Error', 'Unknown template: ' + templateName, ui.ButtonSet.OK);
      return;
    }

    // Resolve smoke test teachers from CONFIG list
    var smokeNames = CONFIG.SMOKE_TEST_TEACHERS || [];
    var resolved = [];
    var missing = [];
    for (var n = 0; n < smokeNames.length; n++) {
      var t = findTeacherByName(smokeNames[n]);
      if (t) resolved.push(t);
      else missing.push(smokeNames[n]);
    }

    if (resolved.length === 0) {
      ui.alert('No smoke test teachers found',
        'CONFIG.SMOKE_TEST_TEACHERS contains: ' + smokeNames.join(', ') +
        '\n\nNone matched the roster. Edit CONFIG.SMOKE_TEST_TEACHERS in Code.gs.',
        ui.ButtonSet.OK);
      return;
    }

    var rootFolder = getRootFolder();
    if (!rootFolder) {
      ui.alert('Error', 'Could not find root folder. Run Debug: Drive Access.', ui.ButtonSet.OK);
      return;
    }

    // Build cache for the smoke test schools
    var seen = {};
    var smokeSchools = [];
    for (var i = 0; i < resolved.length; i++) {
      var c = resolved[i].campus;
      if (!seen[c] && c) {
        seen[c] = true;
        smokeSchools.push({ displayName: c, folderName: c.replace(/ /g, '_') });
      }
    }
    var schoolFolderCache = buildSchoolFolderCache(smokeSchools, rootFolder);
    var schoolFolderMap = {};
    for (var s = 0; s < smokeSchools.length; s++) {
      schoolFolderMap[smokeSchools[s].displayName] = smokeSchools[s].folderName;
    }

    // Confirm
    var msg = 'About to generate ' + resolved.length + ' SMOKE TEST drafts to YOUR Gmail (' + currentUserEmail + '):\n\n';
    for (var r2 = 0; r2 < resolved.length; r2++) {
      msg += '  - ' + resolved[r2].name + ' (' + resolved[r2].campus + ')\n';
    }
    if (missing.length > 0) {
      msg += '\nNot found in roster (will skip): ' + missing.join(', ') + '\n';
    }
    msg += '\nDate Range: ' + dateRange + '\nTemplate: ' + templateName + '\n\nProceed?';
    if (ui.alert('Smoke Test', msg, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

    // Load metrics + winners
    var weekStart = dateRange.split('_to_')[0];
    var allMetrics = getTeacherMetricsForWeek(weekStart);
    var allWinners = getStudentWinners();

    // Generate
    var success = 0, fail = 0;
    var errors = [];
    for (var t2 = 0; t2 < resolved.length; t2++) {
      var teacher = resolved[t2];
      // Override email to current user
      var smokeTeacher = {
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        name: teacher.name,
        folderName: teacher.folderName,
        campus: teacher.campus,
        email: currentUserEmail  // <-- key override
      };
      var metrics = lookupByName(allMetrics, teacher.firstName, teacher.lastName, teacher.name);
      var winners = lookupByName(allWinners, teacher.firstName, teacher.lastName, teacher.name) || [];
      try {
        var result = createDraftForTeacher(smokeTeacher, rootFolder, dateRange, metrics, winners, schoolFolderMap, template, schoolFolderCache);
        if (result.success) success++;
        else { fail++; errors.push(teacher.name + ': ' + result.error); }
      } catch (e) {
        fail++;
        errors.push(teacher.name + ': ' + (e.message || e));
      }
    }

    var done = 'Smoke Test Complete: ' + success + ' drafts created in YOUR Gmail, ' + fail + ' failed.\n\n';
    if (errors.length > 0) done += 'Errors:\n' + errors.join('\n') + '\n\n';
    done += 'Open Gmail Drafts to verify all template elements render correctly.';
    ui.alert('Smoke Test Complete', done, ui.ButtonSet.OK);
  } finally {
    lock.releaseLock();
  }
}

// ============================================
// v2.6.0 — RETRY LAST RUN'S FAILED TEACHERS (Phase D of audit follow-up)
// ============================================
//
// After a bulk Generate run, IM can run "Retry Last Run's Failed Teachers"
// from the menu. The function reads the Error Log tab, identifies the most
// recent run_id's ERROR rows, and shows a modal with checkboxes (one per
// failed teacher). IM picks which to retry; existing drafts are deleted
// (with confirmation skipped — the regenerate intent implies replacement)
// before generating fresh ones.
//
// Persistence: state lives in the Error Log tab via run_id. Survives page
// reloads. Multi-session retries supported.

function retryLastRunFailed() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var errorSheet = ss.getSheetByName(ERROR_LOG_TAB);
  if (!errorSheet) {
    ui.alert('No Error Log',
      'Run "Generate My Email Drafts" first \u2014 the Error Log is created on the first failure.',
      ui.ButtonSet.OK);
    return;
  }
  var data = errorSheet.getDataRange().getValues();
  if (data.length < 2) {
    ui.alert('No Errors', 'Error Log is empty.', ui.ButtonSet.OK);
    return;
  }

  // Find the most recent run_id by walking from the bottom.
  var lastRunId = null;
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][1]) { lastRunId = String(data[i][1]); break; }
  }
  if (!lastRunId) {
    ui.alert('No Run Found', 'Error Log has no run_id entries.', ui.ButtonSet.OK);
    return;
  }

  // Collect ERROR rows from createDraftForTeacher in that run.
  var failedTeachers = [];
  var seen = {};
  for (var j = 1; j < data.length; j++) {
    if (String(data[j][1]) !== lastRunId) continue;
    if (String(data[j][2]) !== 'ERROR') continue;
    if (String(data[j][3]) !== 'createDraftForTeacher') continue;
    var teacherStr = String(data[j][4] || '').trim();
    if (!teacherStr || seen[teacherStr]) continue;
    seen[teacherStr] = true;
    failedTeachers.push(teacherStr);
  }

  if (failedTeachers.length === 0) {
    ui.alert('No Failures',
      'No createDraftForTeacher errors found for run ' + lastRunId + '.\n\n' +
      'If a different run had failures, manually inspect the Error Log tab.',
      ui.ButtonSet.OK);
    return;
  }

  // Show modal with checkboxes
  var html = _buildRetryDialogHtml(failedTeachers, lastRunId);
  var output = HtmlService.createHtmlOutput(html).setWidth(640).setHeight(560);
  ui.showModalDialog(output, 'Retry Failed Teachers');
}

/** Pure helper: builds the retry dialog HTML. Testable. */
function _buildRetryDialogHtml(failedTeachers, runId) {
  var html = '<h2 style="margin-top:0;">Retry Failed Teachers</h2>';
  html += '<p><b>Run:</b> <code>' + String(runId).replace(/[<>"]/g, '') + '</code></p>';
  html += '<p>' + failedTeachers.length + ' teacher(s) failed. Pick which to retry. ';
  html += 'Existing drafts to those teachers will be DELETED before regenerating.</p>';
  html += '<form id="rf">';
  for (var i = 0; i < failedTeachers.length; i++) {
    var safeStr = String(failedTeachers[i]).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html += '<div style="margin:6px 0;"><label>'
      + '<input type="checkbox" name="t" value="' + safeStr + '" checked> '
      + safeStr + '</label></div>';
  }
  html += '<div style="margin-top:15px;">';
  html += '<button type="button" onclick="submitForm()" style="padding:8px 16px;font-size:14px;">Retry Selected</button> ';
  html += '<button type="button" onclick="google.script.host.close()" style="padding:8px 16px;font-size:14px;">Cancel</button>';
  html += '</div>';
  html += '</form>';
  html += '<div id="result" style="margin-top:15px;font-family:monospace;font-size:12px;white-space:pre-wrap;"></div>';
  html += '<script>';
  html += 'function submitForm(){';
  html += '  var checks=document.querySelectorAll("input[name=t]:checked");';
  html += '  var sel=Array.prototype.map.call(checks,function(c){return c.value;});';
  html += '  if(sel.length===0){document.getElementById("result").textContent="Pick at least one teacher.";return;}';
  html += '  document.getElementById("result").textContent="Working... please wait...";';
  html += '  google.script.run';
  html += '    .withSuccessHandler(function(r){document.getElementById("result").innerHTML=r;})';
  html += '    .withFailureHandler(function(e){document.getElementById("result").textContent="Error: "+e;})';
  html += '    .processRetry(sel);';
  html += '}';
  html += '</script>';
  return html;
}

/**
 * Server-side handler called by the retry modal. Receives an array of
 * teacher strings (formatted "Name <email>"), deletes existing drafts,
 * regenerates fresh ones. Returns HTML summary for the modal.
 */
function processRetry(selectedTeacherStrs) {
  if (!Array.isArray(selectedTeacherStrs) || selectedTeacherStrs.length === 0) {
    return '<span style="color:#c62828;">No teachers selected.</span>';
  }
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(0)) {
    return '<span style="color:#c62828;">Another generation is in progress. Wait and try again.</span>';
  }
  try {
    _runIdCache = null;
    // Reset cross-template caches so processRetry reads fresh sheet data,
    // not values cached by a prior generateDraftsForCurrentUser call in the
    // same warm Apps Script V8 process. Mirrors generateDraftsForCurrentUser
    // lines 803-807 and generateSmokeTest lines 472-477.
    _yearTotalsCache = null;
    _studentHighlightsCache = null;
    _mapScoresCache = null;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var currentUserEmail = Session.getActiveUser().getEmail().toLowerCase();
    var mySchools = getMySchools(currentUserEmail);
    var allTeachers = getTeachersForSchools(mySchools.map(function(s) { return s.displayName; }));
    var emailToTeacher = {};
    for (var i = 0; i < allTeachers.length; i++) {
      emailToTeacher[allTeachers[i].email.toLowerCase()] = allTeachers[i];
    }

    var dateRange = getConfigValue('Date Range');
    if (!dateRange) return '<span style="color:#c62828;">Date Range not set in Config. Pick a week, then retry.</span>';
    var templateName = getConfigValue('Template') || '4/27: Last Week of Motivention';
    var template = resolveTemplate_(templateName);
    if (!template) return '<span style="color:#c62828;">Unknown template: ' + templateName + '</span>';
    var weekStart = dateRange.split('_to_')[0];
    var allMetrics = getTeacherMetricsForWeek(weekStart);
    var allWinners = getStudentWinners();
    var rootFolder = getRootFolder();
    if (!rootFolder) return '<span style="color:#c62828;">Root folder not found.</span>';
    var schoolFolderCache = buildSchoolFolderCache(mySchools, rootFolder);
    var schoolFolderMap = {};
    for (var s2 = 0; s2 < mySchools.length; s2++) {
      schoolFolderMap[mySchools[s2].displayName] = mySchools[s2].folderName;
    }

    var success = 0, fail = 0;
    var report = [];
    for (var k = 0; k < selectedTeacherStrs.length; k++) {
      var teacherStr = selectedTeacherStrs[k];
      var em = teacherStr.match(/<([^>]+)>$/);
      if (!em) {
        fail++;
        report.push('\u2717 Could not parse email from: ' + teacherStr);
        continue;
      }
      var email = em[1].toLowerCase();
      var teacher = emailToTeacher[email];
      if (!teacher) {
        fail++;
        report.push('\u2717 Teacher not found in roster: ' + email);
        continue;
      }
      // Delete existing draft
      try { deleteExistingDraft(teacher.email, template.subject); }
      catch (e) { /* ignore — will create new anyway */ }
      var metrics = lookupByName(allMetrics, teacher.firstName, teacher.lastName, teacher.name);
      var winners = lookupByName(allWinners, teacher.firstName, teacher.lastName, teacher.name) || [];
      try {
        var result = createDraftForTeacher(teacher, rootFolder, dateRange, metrics, winners, schoolFolderMap, template, schoolFolderCache);
        if (result.success) { success++; report.push('\u2713 ' + teacher.name); }
        else { fail++; report.push('\u2717 ' + teacher.name + ': ' + result.error); }
      } catch (e) {
        fail++;
        report.push('\u2717 ' + teacher.name + ': ' + (e.message || e));
      }
    }
    return '<b>' + success + ' retried successfully, ' + fail + ' failed.</b><br><br>' + report.join('<br>');
  } finally {
    lock.releaseLock();
  }
}

/**
 * v2.6.0: Delete any existing draft to a given recipient with a matching subject.
 * Returns count of drafts deleted. Used by processRetry before regenerating.
 */
function deleteExistingDraft(teacherEmail, subject) {
  if (!teacherEmail || !subject) return 0;
  var emailLower = teacherEmail.toLowerCase();
  var drafts = GmailApp.getDrafts();
  var deleted = 0;
  for (var i = 0; i < drafts.length; i++) {
    try {
      var msg = drafts[i].getMessage();
      if (msg.getSubject() === subject &&
          msg.getTo().toLowerCase().indexOf(emailLower) !== -1) {
        drafts[i].deleteDraft();
        deleted++;
      }
    } catch (e) {
      // Draft may have been deleted by user mid-iteration; skip and continue.
    }
  }
  return deleted;
}

// ============================================
// MAIN GENERATION FLOW
// ============================================
function generateDraftsForCurrentUser() {
  var ui = SpreadsheetApp.getUi();

  // Re-entrancy guard: prevent duplicate Gmail drafts if the menu item fires twice
  // (double-click, accidental re-run while a previous run is still going).
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(0)) {
    ui.alert('Already Running',
      'Email generation is already in progress. Please wait for the current run to finish before starting another.',
      ui.ButtonSet.OK);
    return;
  }

  try {
  // v2.5.1: reset run_id cache so Error Log entries from this invocation are
  // grouped under a fresh run_id. Apps Script V8 isolates can persist module
  // globals across consecutive runs in the same warm process, which would
  // otherwise share one run_id across two distinct user invocations.
  _runIdCache = null;
  // v2.6.5 + v2.8.0: reset cross-template caches so each run reads fresh.
  _yearTotalsCache = null;
  _studentHighlightsCache = null;
  _mapScoresCache = null;

  var currentUserEmail = Session.getActiveUser().getEmail().toLowerCase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Read Config defaults
  var dateRange = getConfigValue('Date Range');
  if (!dateRange) return ui.alert('Error', 'Please set the Date Range first (Config tab or Email Tools menu).', ui.ButtonSet.OK);

  // Default template tracks the current end-of-year context. Update at each cycle handoff.
  var templateName = getConfigValue('Template') || '4/27: Last Week of Motivention';
  var resolvedTemplate = resolveTemplate_(templateName);
  if (!resolvedTemplate) {
    return ui.alert('Error', 'Unknown template: ' + templateName + '\n\nSet a valid template in Config or use Email Tools > Set Template.', ui.ButtonSet.OK);
  }

  // Get IM's assigned schools (v2.6.0: extracted to getMySchools helper).
  var mappingData = ss.getSheetByName(CONFIG.MAPPING_SHEET_NAME).getDataRange().getValues();
  var mySchools = getMySchools(currentUserEmail, mappingData);

  if (mySchools.length === 0) return ui.alert('Error', 'Your email is not assigned to any schools.', ui.ButtonSet.OK);

  // v2.11.0: Summer School Week 1+2 short-circuits to the external-source path,
  // scoped to THIS IM's assigned schools. It does not use All Teacher Metrics or
  // the weekly PDF tree. (Date Range is read above but unused here; IMs always
  // have one set.) The lock is held + _runIdCache reset above, so call the core.
  if (resolvedTemplate.summerSchool) {
    var ssAllowed = {};
    for (var si = 0; si < mySchools.length; si++) ssAllowed[normalizeFolderName(mySchools[si].displayName)] = true;
    _runSummerSchoolCore({ smokeMode: false, allowedCampuses: ssAllowed, templateName: templateName });
    return;
  }

  var teachers = getTeachersForSchools(mySchools.map(function(s) { return s.displayName; }));
  if (teachers.length === 0) return ui.alert('Error', 'No teachers found for your schools.\n\nRun Email Tools > Debug: Check Teacher Names for a diagnostic that explains why (most commonly: upstream source spreadsheet has empty Campus column for your school).', ui.ButtonSet.OK);

  // Validate Drive folder exists for this date range
  // Primary: use ROOT_FOLDER_ID (bulletproof). Fallback: name lookup.
  var rootFolder = getRootFolder();
  if (!rootFolder) return ui.alert('Error', 'Could not find root folder: tried ID "' + CONFIG.ROOT_FOLDER_ID + '" and name "' + CONFIG.ROOT_FOLDER_NAME + '". Run Email Tools > Debug: Drive Access to diagnose.', ui.ButtonSet.OK);

  // Pre-resolve school folders ONCE, keyed by displayName.
  // v2.4.2: try displayName FIRST. School-IM Mapping col A historically uses underscores
  // (`JRES_-_Ridgeland_Elementary_School`) but actual Drive folder names use spaces.
  // The exact-match path (getFoldersByName) misses on underscored names, forcing the
  // slow normalized iteration via parentFolder.getFolders() — which threw
  // "Service error: Drive" for at least one user account (likely a Drive list-permission
  // gap on the parent that doesn't affect direct child-folder access). Trying displayName
  // (with spaces) first means most lookups exact-match in one Drive call and avoid the
  // failure surface entirely. folderName is kept as a backstop for any sheet rows that
  // only have it populated.
  // v2.6.0: cache build extracted to buildSchoolFolderCache helper. Cache is
  // dual-keyed by both displayName AND folderName (per v2.5.1 fix) — see helper
  // doc-comment for rationale.
  var schoolFolderCache = buildSchoolFolderCache(mySchools, rootFolder);

  // v2.5.3: pre-flight `checkDriveFolderExists` removed. After the v2.5.0
  // search-API pivot, that pre-flight was wasted work — it failed-open on
  // iteration errors (so never actually blocked anyone in practice), and
  // missing PDFs already surface as per-teacher errors in the Error Log tab.
  // To check folder structure proactively, IMs can run "Debug: Check Teacher Folders".

  // Validate metrics data exists for selected week
  var weekStart = dateRange.split('_to_')[0];
  // v2.7.0: Load data BEFORE the confirmation dialog so we can show accurate
  // draft-vs-skip counts. Previously metrics were loaded post-confirmation +
  // looked up inside the per-teacher loop, which meant the dialog couldn't
  // distinguish "22 teachers in roster" from "12 of those will get drafts".
  // getTeacherMetricsForWeek returns {} when the sheet is absent or has no
  // matching rows, so one read is sufficient — no need for a separate
  // checkMetricsExistForWeek pre-flight that reads the same tab.
  var teacherMetrics = getTeacherMetricsForWeek(weekStart);
  var metricsExist = Object.keys(teacherMetrics).length > 0;
  var allWinners = getStudentWinners();

  // v2.7.0 + v2.8.0: Branch on template. SC Final Email uses year-cumulative
  // metrics (Year Teacher Totals); Spring 2026 MAP uses the MAP Scores tab;
  // everything else uses weekly metrics. Filter pulls the right dict per
  // template so the partition skip-without-data logic is template-aware.
  var isFinalEmail = templateName.indexOf('SC Final Email') === 0;
  var isMapScores = templateName.indexOf('Spring 2026 MAP') === 0;
  var yearTotalsForFilter = isFinalEmail ? getYearTeacherTotals() : null;
  var mapScoresForFilter = isMapScores ? getMapScoresForTeacher() : null;

  // v2.7.0: Partition teachers into (a) has data for this template + (b)
  // would render a "No metrics rows found" placeholder. Skip (b) entirely.
  // Only applied when metricsExist=true OR template is year-cumulative /
  // MAP. If no metrics at all for the week AND template is a weekly one,
  // fall through to "send to all" with the WARNING shown below (preserves
  // pre-v2.7.0 behavior for the case where IM explicitly wants placeholder
  // drafts).
  var hasDataFn = isFinalEmail
    ? function(t) {
        var hit = lookupByName(yearTotalsForFilter, t.firstName, t.lastName, t.name);
        return hit !== null && hit !== undefined;
      }
    : isMapScores
    ? function(t) {
        var hit = lookupByName(mapScoresForFilter, t.firstName, t.lastName, t.name);
        return hit !== null && hit !== undefined;
      }
    : function(t) {
        var hit = lookupByName(teacherMetrics, t.firstName, t.lastName, t.name);
        return hit !== null && hit !== undefined;
      };
  var teachersWithData = teachers;
  var teachersSkipped = [];
  if (metricsExist || isFinalEmail || isMapScores) {
    var partitioned = partitionTeachersByDataAvailability(teachers, hasDataFn);
    teachersWithData = partitioned.withData;
    teachersSkipped = partitioned.skipped;
  }

  // Show confirmation dialog
  var dialogMsg = 'Ready to generate email drafts.\n\n'
    + 'Date Range: ' + dateRange + '\n'
    + 'Template: ' + templateName + '\n'
    + 'Teachers in roster: ' + teachers.length + '\n'
    + 'Drafts to generate: ' + teachersWithData.length + '\n';

  if (teachersSkipped.length > 0) {
    dialogMsg += 'Skipped (no metrics this week): ' + teachersSkipped.length + '\n';
  }

  dialogMsg += 'Metrics data: ' + (metricsExist ? 'Available' : 'NOT FOUND') + '\n';

  if (!metricsExist && !isFinalEmail && !isMapScores) {
    dialogMsg += '\nWARNING: No metrics data found for week ' + weekStart + '.\n'
      + 'Emails will be generated WITHOUT metrics tables.\n';
  }

  dialogMsg += '\nProceed?';
  var confirm = ui.alert('Confirm Generation', dialogMsg, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  var successCount = 0, errorCount = 0;
  var errors = [];

  // Build school folder name lookup once
  var schoolFolderMap = {};
  for (var m = 1; m < mappingData.length; m++) {
    schoolFolderMap[mappingData[m][1]] = mappingData[m][0];
  }

  var template = resolvedTemplate;

  for (var t = 0; t < teachersWithData.length; t++) {
    var teacher = teachersWithData[t];
    try {
      var metrics = lookupByName(teacherMetrics, teacher.firstName, teacher.lastName, teacher.name);
      var winners = lookupByName(allWinners, teacher.firstName, teacher.lastName, teacher.name) || [];
      var result = createDraftForTeacher(teacher, rootFolder, dateRange, metrics, winners, schoolFolderMap, template, schoolFolderCache);
      if (result.success) successCount++;
      else { errorCount++; errors.push(teacher.name + ': ' + result.error); }
    } catch (e) {
      errorCount++; errors.push(teacher.name + ': ' + e.message);
    }
  }

  var msg = 'Created ' + successCount + ' drafts. ' + errorCount + ' errors.';
  if (errorCount > 0) {
    // Cap error string at ~1500 chars to stay well under Apps Script's 4096-char alert limit.
    var errStr = errors.join(' | ');
    if (errStr.length > CONFIG.LIMITS.ERROR_MSG_TRUNCATE) {
      errStr = errStr.substring(0, CONFIG.LIMITS.ERROR_MSG_TRUNCATE) + '... (' + (errors.length) + ' total errors -- see logs for full list)';
      console.log('Full error list:\n' + errors.join('\n'));
    }
    msg += ' | ERRORS: ' + errStr;
  }
  // v2.7.0: surface skip list so IM can verify which teachers were intentionally
  // not drafted (most commonly: teacher has no metrics row for this week).
  if (teachersSkipped.length > 0) {
    var skipNames = teachersSkipped.map(function(t) { return t.name; });
    var displayList = skipNames.slice(0, 10).join(', ');
    if (skipNames.length > 10) displayList += ', ... (' + skipNames.length + ' total, full list in logs)';
    msg += ' | Skipped ' + teachersSkipped.length + ' teachers (no metrics this week): ' + displayList;
    console.log('Full skipped list:\n' + skipNames.join('\n'));
  }
  msg += ' | Check your Gmail Drafts!';
  ui.alert('Complete', msg, ui.ButtonSet.OK);
  } finally {
    // Always release the lock, even if an unexpected exception bubbled up.
    lock.releaseLock();
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// ─────────────────────────────────────────────────────────────────────
// v2.6.0: Shared helpers extracted from 4+ callers (DRY cleanup per audit M-6).
// Each helper has a unit test; behavior is byte-equivalent to the inline code
// it replaced (verified via scanner before/after diff).
// ─────────────────────────────────────────────────────────────────────

/**
 * v2.6.0: Get the IM's assigned schools by reading the School-IM Mapping tab.
 * Filters by IM email; returns array of {folderName, displayName} objects.
 *
 * @param {string} currentUserEmail   IM's email (lowercased + trimmed by caller)
 * @param {Array<Array>=} mappingData Optional: pre-loaded mapping data (saves a
 *     Sheets API call when caller already has it). If omitted, loaded internally.
 * @return {Array<{folderName: string, displayName: string}>}
 */
function getMySchools(currentUserEmail, mappingData) {
  if (!mappingData) {
    mappingData = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.MAPPING_SHEET_NAME).getDataRange().getValues();
  }
  var mySchools = [];
  for (var i = 1; i < mappingData.length; i++) {
    if (String(mappingData[i][2]).toLowerCase().trim() === currentUserEmail) {
      mySchools.push({ folderName: mappingData[i][0], displayName: mappingData[i][1] });
    }
  }
  return mySchools;
}

/**
 * v2.6.0: Look up a single school's Drive folder. Tries displayName first
 * (search-API path that works for shared-with-me users), falls back to
 * folderName (underscored form).
 *
 * @param {{displayName: string, folderName: string}} school
 * @param {Folder} rootFolder
 * @return {Folder|null}
 */
function findSchoolFolder(school, rootFolder) {
  if (!school) return null;
  var folder = school.displayName ? findFolderByName(school.displayName, rootFolder) : null;
  if (!folder && school.folderName) folder = findFolderByName(school.folderName, rootFolder);
  return folder;
}

/**
 * v2.6.0: Build the school-folder cache used by createDraftForTeacher's PDF
 * lookup path. Cache is dual-keyed by both displayName AND folderName (per
 * v2.5.1 fix) so reads via either key hit. Calls findSchoolFolder for each.
 *
 * @param {Array<{displayName, folderName}>} mySchools
 * @param {Folder} rootFolder
 * @return {Object<string, Folder>}
 */
function buildSchoolFolderCache(mySchools, rootFolder) {
  var cache = {};
  for (var i = 0; i < mySchools.length; i++) {
    var sch = mySchools[i];
    var folder = findSchoolFolder(sch, rootFolder);
    if (folder) {
      if (sch.displayName) cache[sch.displayName] = folder;
      if (sch.folderName && sch.folderName !== sch.displayName) {
        cache[sch.folderName] = folder;
      }
    }
  }
  return cache;
}

/**
 * v2.6.0: Convert a sheet cell value (Date object OR string) to ISO date
 * string "YYYY-MM-DD". Used for week_start columns where the Sheets API may
 * return either type depending on the cell format.
 *
 * @param {any} val
 * @return {string}
 */
function cellToDateString(val) {
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = ('0' + (val.getMonth() + 1)).slice(-2);
    var d = ('0' + val.getDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }
  return String(val == null ? '' : val).trim();
}

/**
 * Looks up a teacher in a name-keyed object, trying multiple name formats.
 *
 * KNOWN LIMITATION (v2.5.3 audit M-1): the last-name fallback uses
 * `firstName.split(' ')[0]` as the comparison token. For roster entries with
 * multi-token first names (e.g. "Mary Lou"), this could in theory match a
 * different teacher whose first name starts with the same token (e.g. metrics
 * tab has "Mary Anderson Smith"). Not currently exercised by any teacher in
 * the production roster. If a real cross-leak appears, tighten the comparison
 * to use the full lowercased+trimmed firstName instead of the first token.
 */
function lookupByName(obj, firstName, lastName, fullName) {
  if (!obj) return null;
  // Defensive null guards — malformed roster rows or edge cases shouldn't crash the per-teacher loop.
  if (!fullName || !firstName || !lastName) return null;
  var full = fullName.toLowerCase().trim();
  if (obj[full]) return obj[full];
  var first = firstName.toLowerCase().trim().split(' ')[0];
  var last = lastName.toLowerCase().trim();
  var shortKey = first + ' ' + last;
  if (obj[shortKey]) return obj[shortKey];
  // Last-name fallback: only accept a unique match if the first-name section of the
  // metrics key EXACTLY equals our lookup first name OR starts with "lookup-name + space"
  // (handles middle names like "lisa marie smith"). Prevents cross-teacher data leak
  // when two teachers share a last name (e.g., looking up "Lisa Smith" must NOT match
  // "liam smith" just because both start with 'L').
  var lastMatches = [];
  for (var k in obj) {
    if (!k.endsWith(' ' + last)) continue;
    var beforeLast = k.substring(0, k.length - last.length - 1);
    if (beforeLast === first || beforeLast.startsWith(first + ' ')) lastMatches.push(k);
  }
  if (lastMatches.length === 1) return obj[lastMatches[0]];
  if (NAME_ALIASES[full] && obj[NAME_ALIASES[full]]) return obj[NAME_ALIASES[full]];
  if (NAME_ALIASES[shortKey] && obj[NAME_ALIASES[shortKey]]) return obj[NAME_ALIASES[shortKey]];
  return null;
}

function getConfigValue(key) {
  var data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.CONFIG_SHEET_NAME).getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) return String(data[i][1] || '').trim();
  }
  return null;
}

function setConfigValue(key, value) {
  var configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.CONFIG_SHEET_NAME);
  var data = configSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      configSheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  configSheet.appendRow([key, value]);
}

function getAvailableWeeks() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.AVAILABLE_WEEKS_SHEET_NAME);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var weeks = [];
  for (var i = 1; i < data.length; i++) {
    var dateRange = String(data[i][1] || '').trim();
    if (dateRange) weeks.push(dateRange);
  }
  return weeks;
}

/**
 * Check if "All Teacher Metrics" tab has data for a given week_start.
 */
function checkMetricsExistForWeek(weekStart) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ALL_METRICS_SHEET_NAME);
  if (!sheet) return false;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    // v2.6.0: extracted to cellToDateString helper.
    if (cellToDateString(data[i][0]) === weekStart) return true;
  }
  return false;
}

/**
 * Convert a Config date range string to the PDF filename date pattern.
 *   Input:  "2026-04-06_to_2026-04-12"
 *   Output: "2026-04-06 - 2026-04-12"
 *
 * PDFs are named like "Rebecca Reynolds - 2026-04-06 - 2026-04-12.pdf",
 * so we check for the start-end pattern with " - " separator.
 */
function dateRangeToPdfPattern(dateRange) {
  var parts = dateRange.split('_to_');
  if (parts.length !== 2) return dateRange;
  return parts[0] + ' - ' + parts[1];
}

// v2.5.3: checkDriveFolderExists() removed. After the v2.5.0 search-API pivot
// for PDF lookup, this pre-flight became wasted work — it failed-open on
// iteration errors (so never blocked anyone in practice), and the per-teacher
// path already surfaces specific PDF-missing errors via the Error Log tab.
// Removed in audit v2.5.3 per user approval. Run "Debug: Check Teacher Folders"
// for proactive folder-presence inspection (uses dual-name-match per v2.5.2).

/**
 * Reads "All Teacher Metrics" tab and returns metrics for a specific week.
 * Filters by week_start (column A), returns teacher-keyed object.
 */
function getTeacherMetricsForWeek(weekStart) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ALL_METRICS_SHEET_NAME);
  if (!sheet) return {};
  var data = sheet.getDataRange().getValues();
  var metrics = {};

  for (var i = 1; i < data.length; i++) {
    // Column A: week_start (v2.6.0: extracted to cellToDateString helper).
    var wsVal = cellToDateString(data[i][0]);
    if (wsVal !== weekStart) continue;

    // Column B: Teacher, C: Grade, D-L: metrics
    // Guard against null/undefined teacher cell (would otherwise become literal 'undefined' string).
    if (data[i][1] == null) continue;
    var teacherName = String(data[i][1]).trim().toLowerCase();
    var grade = String(data[i][2]).trim();
    if (!teacherName || teacherName === '' || teacherName === 'undefined') continue;

    if (!metrics[teacherName]) metrics[teacherName] = [];
    metrics[teacherName].push({
      grade: grade,
      numStudents: parseFloat(data[i][3]) || 0,
      activeDays: parseFloat(data[i][4]) || 0,
      pctLoggedIn: parseFloat(data[i][5]) || 0,
      pctEveryday: parseFloat(data[i][6]) || 0,
      avgMins: parseFloat(data[i][7]) || 0,
      testsMastered: parseFloat(data[i][8]) || 0,
      avgTests: parseFloat(data[i][9]) || 0,
      lessonsMastered: parseFloat(data[i][10]) || 0,
      avgLessons: parseFloat(data[i][11]) || 0
    });
  }
  return metrics;
}

function getTeachersForSchools(schoolDisplayNames) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = ss.getSheetByName(CONFIG.ROSTER_SHEET_NAME).getDataRange().getValues();
  var teacherMap = new Map();

  // v2.6.9: precompute normalized Reading sentinel so we don't recompute per row.
  var readingNormalized = normalizeFolderName('Reading Community City School District');

  for (var i = 1; i < data.length; i++) {
    var campus = String(data[i][CONFIG.CAMPUS_COL] || '').trim();
    // v2.6.9: normalized comparison (was exact-match indexOf). The old filter
    // silently dropped rows when Teacher Emails Column C drifted in case /
    // whitespace / separator from School-IM Mapping displayName -- the JRES
    // Column-A-E wipe bug class manifests upstream as empty Campus, but any
    // future cosmetic-format drift is now tolerated automatically.
    if (!campusMatchesAnyDisplay(campus, schoolDisplayNames)) continue;
    if (normalizeFolderName(campus) === readingNormalized) continue;

    var firstName = String(data[i][CONFIG.TEACHER_FIRST_COL] || '').trim();
    var lastName = String(data[i][CONFIG.TEACHER_LAST_COL] || '').trim();
    var email = String(data[i][CONFIG.TEACHER_EMAIL_COL] || '').trim();

    if (firstName && lastName && email) {
      var folderName = (firstName + '_' + lastName).replace(/ /g, '_');
      var key = folderName.toLowerCase();
      if (!teacherMap.has(key)) {
        teacherMap.set(key, { firstName: firstName.split(' ')[0], lastName: lastName, name: firstName + ' ' + lastName, folderName: folderName, email: email, campus: campus });
      }
    }
  }

  // Reading Community: dedicated tab (v2.6.9: normalized match for consistency).
  if (campusMatchesAnyDisplay('Reading Community City School District', schoolDisplayNames)) {
    var readingSheet = ss.getSheetByName(CONFIG.READING_TEACHERS_SHEET_NAME);
    if (readingSheet) {
      var readingData = readingSheet.getDataRange().getValues();
      for (var r = 1; r < readingData.length; r++) {
        var fn = String(readingData[r][0] || '').trim();
        var ln = String(readingData[r][1] || '').trim();
        var em = String(readingData[r][2] || '').trim();
        if (fn && ln && em) {
          var fName = (fn + '_' + ln).replace(/ /g, '_');
          var fKey = fName.toLowerCase();
          if (!teacherMap.has(fKey)) {
            teacherMap.set(fKey, { firstName: fn.split(' ')[0], lastName: ln, name: fn + ' ' + ln, folderName: fName, email: em, campus: 'Reading Community City School District' });
          }
        }
      }
    }
  }

  return Array.from(teacherMap.values());
}

/**
 * v2.6.5: Read the "Year Teacher Totals" tab into a teacher-keyed object.
 * Returns { teacherNameLower: { numStudents, totalMinutes, totalLessons,
 *   totalGradeLevels, avgLessons, avgGradeLevels, campus } }.
 *
 * Module-level cache (`_yearTotalsCache`). Reset at run-start in
 * generateDraftsForCurrentUser + generateSmokeTest.
 */
function getYearTeacherTotals() {
  if (_yearTotalsCache !== null) return _yearTotalsCache;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.YEAR_TOTALS_SHEET_NAME);
  if (!sheet) {
    _yearTotalsCache = {};
    return _yearTotalsCache;
  }
  var data = sheet.getDataRange().getValues();
  var totals = {};
  // Schema: campus_name | teacher_name | num_students | total_minutes |
  //         total_lessons | total_grade_levels | avg_lessons_per_student |
  //         avg_grade_levels_per_student
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == null) continue;
    var teacherName = String(data[i][1]).trim().toLowerCase();
    if (!teacherName || teacherName === 'null' || teacherName === 'undefined') continue;
    totals[teacherName] = {
      campus: String(data[i][0] || '').trim(),
      numStudents: parseFloat(data[i][2]) || 0,
      totalMinutes: parseFloat(data[i][3]) || 0,
      totalLessons: parseFloat(data[i][4]) || 0,
      totalGradeLevels: parseFloat(data[i][5]) || 0,
      avgLessons: parseFloat(data[i][6]) || 0,
      avgGradeLevels: parseFloat(data[i][7]) || 0
    };
  }
  _yearTotalsCache = totals;
  return totals;
}

/**
 * v2.6.5: Read the "Student Year Highlights" tab into a teacher-keyed object.
 * Returns { teacherNameLower: [{ rank, studentName, cumulativeLessons,
 *   cumulativeGradeLevels, topSubject, leadingMetric }] }.
 *
 * Each teacher gets up to 2 entries (rank 1 + rank 2), sorted by rank.
 * Module-level cache (`_studentHighlightsCache`).
 */
function getStudentYearHighlights() {
  if (_studentHighlightsCache !== null) return _studentHighlightsCache;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.STUDENT_HIGHLIGHTS_SHEET_NAME);
  if (!sheet) {
    _studentHighlightsCache = {};
    return _studentHighlightsCache;
  }
  var data = sheet.getDataRange().getValues();
  var highlights = {};
  // Schema: campus_name | teacher_name | rank | student_name |
  //         cumulative_lessons | cumulative_grade_levels | top_subject | leading_metric
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == null) continue;
    var teacherName = String(data[i][1]).trim().toLowerCase();
    if (!teacherName || teacherName === 'null' || teacherName === 'undefined') continue;
    if (!highlights[teacherName]) highlights[teacherName] = [];
    highlights[teacherName].push({
      rank: parseInt(data[i][2], 10) || 0,
      studentName: String(data[i][3] || '').trim(),
      cumulativeLessons: parseFloat(data[i][4]) || 0,
      cumulativeGradeLevels: parseFloat(data[i][5]) || 0,
      topSubject: String(data[i][6] || '').trim(),
      leadingMetric: String(data[i][7] || '').trim().toLowerCase()
    });
  }
  // Sort each teacher's array by rank (rank 1 first).
  for (var k in highlights) {
    if (highlights.hasOwnProperty(k)) {
      highlights[k].sort(function(a, b) { return a.rank - b.rank; });
    }
  }
  _studentHighlightsCache = highlights;
  return highlights;
}

/**
 * v2.8.0: Read the "Spring 2026 MAP Scores" tab into a teacher-keyed object.
 * Returns { teacherNameLower: [{ studentName, subject, winterRit, springRit }] }.
 *
 * Module-level cache (`_mapScoresCache`). Reset in generateDraftsForCurrentUser
 * + generateSmokeTest so each run reads fresh from the live tab.
 *
 * Schema (column order): campus_name | teacher_name | student_name |
 *   subject | winter_rit | spring_rit. Empty / null scores are preserved
 *   as-is (the table helper renders them as "--").
 */
function getMapScoresForTeacher() {
  if (_mapScoresCache !== null) return _mapScoresCache;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.MAP_SCORES_SHEET_NAME);
  if (!sheet) {
    _mapScoresCache = {};
    return _mapScoresCache;
  }
  var data = sheet.getDataRange().getValues();
  var scores = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == null) continue;
    var teacherName = String(data[i][1]).trim().toLowerCase();
    if (!teacherName || teacherName === 'null' || teacherName === 'undefined') continue;
    if (!scores[teacherName]) scores[teacherName] = [];
    scores[teacherName].push({
      studentName: String(data[i][2] || '').trim(),
      subject: String(data[i][3] || '').trim(),
      winterRit: data[i][4],
      springRit: data[i][5],
      // v2.9.0: parent emit added winter_to_spring projected + observed growth.
      // buildMapScoresTable computes X Growth client-side from these.
      projectedGrowth: data[i][6],
      observedGrowth: data[i][7]
    });
  }
  _mapScoresCache = scores;
  return scores;
}

function getStudentWinners() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.WINNERS_SHEET_NAME);
  if (!sheet) return {};
  var data = sheet.getDataRange().getValues();
  var winners = {};

  for (var i = 1; i < data.length; i++) {
    // v2.5.3: null guard parity with getTeacherMetricsForWeek — String(null) returns
    // 'null' (not ''), so the prior `String(...).trim()` would silently key a row
    // under the literal string 'null'. Skip explicitly.
    if (data[i][1] == null) continue;
    var teacherName = String(data[i][1]).trim().toLowerCase();
    if (!teacherName || teacherName === 'null' || teacherName === 'undefined') continue;
    if (!winners[teacherName]) winners[teacherName] = [];
    winners[teacherName].push({
      category: String(data[i][2]).trim(),
      sortOrder: parseInt(data[i][3], 10) || 0,    // v2.5.3: explicit radix
      frequency: String(data[i][4]).trim(),
      studentNames: String(data[i][5]).trim(),
      studentCount: parseInt(data[i][6], 10) || 0  // v2.5.3: explicit radix
    });
  }
  return winners;
}

/**
 * Find a folder by name. Tries exact match first, then falls back to a
 * normalized comparison (case-insensitive, treats underscores and spaces
 * as equivalent) by iterating the parent's folders.
 *
 * Handles the case where Drive folders may be named with either spaces
 * ("Reading Community City School District", "Kim Bell") or underscores
 * ("Reading_Community_City_School_District", "Kim_Bell").
 */
function findFolderByName(folderName, parentFolder) {
  if (!folderName) return null;

  // v2.4.2: wrap every Drive call in this function to prevent "Service error: Drive"
  // from propagating up the stack. Failures here mean the calling code can't find
  // the folder — but the caller (cache build, checkDriveFolderExists, createDraftForTeacher)
  // has its own fallback / error path. Returning null here lets those run instead of
  // crashing the whole orchestrator.

  // 1. Try exact match first (fast path)
  try {
    var folders = parentFolder ? parentFolder.getFoldersByName(folderName) : DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) return folders.next();
  } catch (e) {
    // Drive transient error or permission gap on parent's getFoldersByName.
    // Don't propagate — fall through to normalized fallback (which may also fail; both wrapped).
    console.log('findFolderByName: getFoldersByName("' + folderName + '") failed: ' + (e.message || e));
  }

  // 2. Fallback: normalize and iterate (only works inside a parent)
  if (!parentFolder) return null;

  // v2.4.2: this iteration was the failure surface in the stack trace user reported
  // (Code:614 -> "Service error: Drive"). Likely cause: Khiem's account has direct-
  // link access to specific child folders but NOT explicit list permission on the
  // parent — so getFolders() throws while individual folder access works fine.
  // Wrapping prevents the crash; the caller will see null and emit a clean error.
  try {
    var target = normalizeFolderName(folderName);
    var it = parentFolder.getFolders();
    while (it.hasNext()) {
      var f = it.next();
      if (normalizeFolderName(f.getName()) === target) return f;
    }
  } catch (e) {
    console.log('findFolderByName: getFolders() iteration for "' + folderName + '" failed: ' + (e.message || e));
    // Returning null here is the SAFE behavior — the caller handles the missing folder gracefully.
  }
  return null;
}

/**
 * Normalize a folder name for flexible matching:
 * - lowercase
 * - trim whitespace
 * - replace underscores with spaces
 * - collapse multiple whitespace to one
 * - normalize apostrophe variants (straight ', curly ', curly ')
 * - strip trailing punctuation
 */
function normalizeFolderName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u0060\u00B4]/g, "'")  // curly + backticks to straight '
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * v2.6.9: Returns true iff `rosterCampus` normalizes to the same string as ANY
 * of the given `displayNames`. Pure helper extracted from getTeachersForSchools
 * for unit-testability + to replace the previous exact-match `indexOf` filter
 * (which silently produced zero matches when Teacher Emails Column C drifted in
 * case / whitespace / separator from School-IM Mapping displayName).
 *
 * Empty / null rosterCampus returns false (an unaffiliated row).
 */
function campusMatchesAnyDisplay(rosterCampus, displayNames) {
  var target = normalizeFolderName(rosterCampus);
  if (!target) return false;
  for (var i = 0; i < displayNames.length; i++) {
    if (normalizeFolderName(displayNames[i]) === target) return true;
  }
  return false;
}

/**
 * v2.7.0: Split a teacher list into (a) teachers with metrics data and (b)
 * teachers without. Used by generateDraftsForCurrentUser to skip wasted
 * drafts for teachers who would otherwise get a "No metrics rows found"
 * placeholder. Pure function for unit-testability.
 *
 * @param {Array} teachers   each item passed to hasDataFn
 * @param {Function} hasDataFn   takes a teacher, returns true if has data
 * @return {{withData: Array, skipped: Array}}
 */
function partitionTeachersByDataAvailability(teachers, hasDataFn) {
  var withData = [];
  var skipped = [];
  for (var i = 0; i < teachers.length; i++) {
    if (hasDataFn(teachers[i])) withData.push(teachers[i]);
    else skipped.push(teachers[i]);
  }
  return { withData: withData, skipped: skipped };
}

/**
 * v2.4.1 / v2.5.3: Wraps a Gmail call with retry-once on transient errors.
 * Apps Script's Gmail API occasionally returns 5xx blips or rate-limit surges.
 * One retry after a 2s sleep clears most transient cases without raising real
 * failures.
 *
 * v2.5.3: renamed from `withDriveRetry` to reflect actual usage. The function
 * is only invoked once in this codebase — wrapping `GmailApp.createDraft` in
 * `createDraftForTeacher`. Drive lookup paths (search-API + traversal fallback)
 * are wrapped at each iterator step instead, not via this helper.
 */
function withGmailRetry(fn) {
  try {
    return fn();
  } catch (e) {
    var msg = String(e && e.message || e);
    if (/Service error|Rate Limit|Internal error|Backend Error|temporarily/i.test(msg)) {
      Utilities.sleep(2000);
      return fn();  // retry once; if this throws again, let it propagate
    }
    throw e;
  }
}

// ============================================
// v2.5.0 — STRUCTURED ERROR LOGGING + SEARCH-API PDF LOOKUP
// ============================================
//
// PIVOT FROM v2.4.x: instead of iterating Drive folders to find each teacher's
// weekly PDF (which throws "Service error: Drive" for shared-with-me users
// because Drive's children-list API requires explicit parent-folder Editor
// membership), we use Drive's **search API** (`getFilesByName`) — which works
// for any file the user can SEE, regardless of parent-folder permissions.
// This eliminates the entire "Service error: Drive" failure surface from the
// happy path. The folder-iteration logic is kept as a safety-net fallback for
// filename anomalies, but if iteration ALSO fails for permission reasons, we
// log + skip (no crash, no blocking the whole run).

var ERROR_LOG_TAB = 'Error Log';
var ERROR_LOG_HEADERS = ['timestamp', 'run_id', 'severity', 'function', 'teacher', 'message', 'stack'];
// v2.6.0: ERROR_LOG_MAX_ROWS + ERROR_LOG_TRIM_TRIGGER moved to CONFIG.LIMITS.
var _runIdCache = null;
// v2.6.5: module-level caches for the SC Final Email template's year-cumulative
// data. Reset to null at the top of generateDraftsForCurrentUser and
// generateSmokeTest to prevent stale-data bleed across runs.
var _yearTotalsCache = null;
var _studentHighlightsCache = null;
// v2.8.0: cache for the Spring 2026 MAP Scores reader. Reset same as the
// year-cumulative caches so each run reads fresh from the live tab.
var _mapScoresCache = null;

/**
 * Returns a stable run-id string used to group all log entries from the
 * current execution. Cached at module scope so all log calls within one
 * run share the same id; reset when the script reloads.
 */
function _getRunId() {
  if (!_runIdCache) {
    _runIdCache = 'run-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
  }
  return _runIdCache;
}

// ============================================
// v2.15.0 — CLICK-THROUGH TRACKING (web app redirect + engagement log)
// ============================================
//
// Adds a lightweight click tracker so IMs can see, centrally, which teachers
// clicked into their weekly email and the click-through rate on the weekly
// PDF report. Mechanism:
//
//   1. Every <a href> in the email body (plus the weekly PDF, now delivered as
//      a LINK instead of an attachment) is rewritten to point at this project's
//      own web-app /exec URL with a signed token carrying:
//        week | teacher email | campus | linkType | destination URL
//   2. doGet() verifies the HMAC signature, appends a row to the "Engagement
//      Log" tab, then bounces the browser to the real destination.
//   3. createDraftForTeacher logs a "send" row to "Send Log" (the denominator:
//      who was emailed this week) so we can list teachers who never clicked and
//      compute PDF CTR = distinct PDF-clickers / teachers sent.
//
// SETUP (one-time, see docs/CLASP_SETUP.md + IMPLEMENTATION_NOTES.md):
//   - Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
//   - Copy the /exec URL into Script Property TRACKING_WEBAPP_URL.
//   - A random TRACKING_HMAC_SECRET is auto-generated on first use if unset.
// Until TRACKING_WEBAPP_URL is set, buildTrackedUrl() fails OPEN (returns the
// raw destination) so emails keep working before the deploy step lands.

var ENGAGEMENT_LOG_TAB = 'Engagement Log';
var ENGAGEMENT_LOG_HEADERS = ['timestamp', 'event', 'week', 'teacher', 'email', 'campus', 'link_type', 'destination'];
var SEND_LOG_TAB = 'Send Log';
var SEND_LOG_HEADERS = ['timestamp', 'week', 'teacher', 'email', 'campus', 'template'];
var ENGAGEMENT_DASHBOARD_TAB = 'Engagement Dashboard';
var _trackingSecretCache = null;
var _trackingUrlCache = null;

/**
 * Return the tracking web-app /exec URL, or '' if not yet deployed/configured.
 * Cached at module scope. Empty string => buildTrackedUrl fails open.
 */
function _trackingWebAppUrl() {
  if (_trackingUrlCache === null) {
    _trackingUrlCache = PropertiesService.getScriptProperties()
      .getProperty('TRACKING_WEBAPP_URL') || CONFIG.TRACKING_WEBAPP_URL || '';
  }
  return _trackingUrlCache;
}

/**
 * Return the HMAC secret, generating + persisting a random one on first use.
 */
function _trackingSecret() {
  if (_trackingSecretCache) return _trackingSecretCache;
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty('TRACKING_HMAC_SECRET');
  if (!s) {
    s = Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
        String(new Date().getTime()) + '|' + Math.random() + '|' + Utilities.getUuid()));
    props.setProperty('TRACKING_HMAC_SECRET', s);
  }
  _trackingSecretCache = s;
  return s;
}

/** base64url-encode a UTF-8 string. */
function _b64u(str) {
  return Utilities.base64EncodeWebSafe(Utilities.newBlob(str).getBytes());
}
/** base64url-decode back to a UTF-8 string. */
function _b64uDecode(b64) {
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(b64)).getDataAsString();
}

/** HMAC-SHA256(payload) as a base64url string, keyed by the tracking secret. */
function _signPayload(payloadB64) {
  var raw = Utilities.computeHmacSha256Signature(payloadB64, _trackingSecret());
  return Utilities.base64EncodeWebSafe(raw);
}

/**
 * Build a signed tracking token. meta = {week, email, campus, linkType, dest}.
 * Token shape: "<payloadB64>.<sigB64>".
 */
function signToken(meta) {
  // v2.20.0: `t` (teacher name) added so clicks attribute per-teacher even when
  // several teachers share one recipient email (smoke tests: ALL drafts go to
  // the operator). Old tokens without `t` still verify; teacher decodes as ''.
  var payload = JSON.stringify({
    w: meta.week || '', e: meta.email || '', c: meta.campus || '',
    l: meta.linkType || 'other', d: meta.dest || '', t: meta.teacher || ''
  });
  var payloadB64 = _b64u(payload);
  return payloadB64 + '.' + _signPayload(payloadB64);
}

/**
 * Verify + decode a token. Returns {week,email,campus,linkType,dest} on a valid
 * signature, or null on any tampering / malformed input.
 */
function verifyToken(token) {
  try {
    if (!token || token.indexOf('.') < 0) return null;
    var parts = token.split('.');
    var payloadB64 = parts[0], sig = parts[1];
    if (_signPayload(payloadB64) !== sig) return null;  // signature mismatch
    var o = JSON.parse(_b64uDecode(payloadB64));
    return {
      week: o.w || '', email: o.e || '', campus: o.c || '',
      linkType: o.l || 'other', dest: o.d || '', teacher: o.t || ''
    };
  } catch (e) {
    return null;
  }
}

/**
 * Wrap a destination URL in a tracked redirect. Fails OPEN (returns dest
 * unchanged) when the web app isn't deployed yet or dest isn't trackable.
 * @param {string} dest      real destination URL
 * @param {object} meta      {week, email, campus, linkType}
 */
function buildTrackedUrl(dest, meta) {
  var base = _trackingWebAppUrl();
  if (!base || !dest) return dest;
  if (!/^https?:\/\//i.test(dest)) return dest;      // skip mailto:, tel:, #anchors
  if (dest.indexOf(base) === 0) return dest;         // already tracked
  var shim = _trackingShimUrl();
  if (shim && dest.indexOf(shim) === 0) return dest; // already tracked (shim form)
  var token = signToken({
    week: meta.week, email: meta.email, campus: meta.campus,
    linkType: meta.linkType, dest: dest, teacher: meta.teacher
  });
  // v2.18.0: prefer the cookie-less GitHub Pages shim; token rides the fragment
  // so it never reaches GitHub. Fall back to the direct /exec form if no shim.
  if (shim) return shim + '#e=' + encodeURIComponent(token);
  return base + '?e=' + encodeURIComponent(token);
}

/** Return the GitHub Pages shim URL ('' = disabled, link straight to /exec). */
var _trackingShimCache = null;
function _trackingShimUrl() {
  if (_trackingShimCache === null) {
    var prop = PropertiesService.getScriptProperties().getProperty('TRACKING_SHIM_URL');
    _trackingShimCache = (prop !== null && prop !== undefined && prop !== '')
      ? prop : (CONFIG.TRACKING_SHIM_URL || '');
  }
  return _trackingShimCache;
}

/**
 * Infer a coarse link_type label from a destination URL, so the dashboard can
 * break clicks down (pdf vs portal vs sheet vs canva vs other). The PDF link is
 * tagged explicitly at injection time; this classifies the pre-existing body
 * links picked up by rewriteBodyLinks_.
 */
function classifyLink_(url) {
  var u = String(url || '').toLowerCase();
  if (/customer-portal|studient\.com/.test(u)) return 'portal';
  if (/docs\.google\.com\/spreadsheets/.test(u)) return 'sheet';
  if (/canva\./.test(u)) return 'canva';
  if (/drive\.google\.com|docs\.google\.com\/document/.test(u)) return 'resource';
  return 'other';
}

/**
 * Rewrite every trackable <a href> in an assembled HTML body to route through
 * the tracking redirect. Visible link text is untouched. Idempotent + fail-open.
 * @param {string} html   assembled email body
 * @param {object} meta   {week, email, campus}
 */
function rewriteBodyLinks_(html, meta) {
  if (!html || !_trackingWebAppUrl()) return html;
  return html.replace(/(<a\b[^>]*\bhref=")([^"]+)(")/gi, function(m, pre, href, post) {
    var tracked = buildTrackedUrl(href, {
      week: meta.week, email: meta.email, campus: meta.campus,
      teacher: meta.teacher, linkType: classifyLink_(href)
    });
    return pre + tracked + post;
  });
}

/** A prominent "View your weekly report" CTA button linking to a tracked URL. */
function buildPdfCtaHtml_(trackedUrl) {
  return '<div style="margin:16px 0;">'
    + '<a href="' + trackedUrl + '" style="display:inline-block;background-color:#1a73e8;'
    + 'color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;'
    + 'font-weight:bold;font-size:14px;">&#128196; View your weekly report (PDF)</a>'
    + '</div>';
}

/**
 * Insert the PDF CTA into a body: right after the greeting paragraph if there
 * is one, otherwise at the very top.
 */
function _injectPdfCta(html, ctaHtml) {
  if (!ctaHtml) return html;
  var idx = html.indexOf('</p>');
  if (idx >= 0) return html.slice(0, idx + 4) + ctaHtml + html.slice(idx + 4);
  return ctaHtml + html;
}

// ============================================
// v2.16.0 — PUBLIC PDF COPIES (so tracked links actually open)
// ============================================
//
// The weekly + summer PDFs live in a Drive tree this account does NOT own
// (shared-with-me), so setSharing() on the original throws and the file stays
// private -> teachers hit "request access" / "unable to open the file". Fix:
// COPY each PDF into a folder THIS account owns ("Email Report Links"), set the
// COPY to anyone-with-link (which works, because we own it), and link to the
// copy. Idempotent: a copy named "{Teacher} - {week}.pdf" is reused if present.
// Fail-soft: any failure returns null and the caller falls back to attaching
// the original PDF, so a teacher is never left without their report.

var _reportLinksFolderCache = null;

/**
 * Return the id of the "Email Report Links" folder this account owns, creating
 * it (My Drive, anyone-with-link) + persisting the id on first use. The Script
 * Property REPORT_LINKS_FOLDER_ID overrides / pins it. Returns '' on failure.
 */
function _ensureReportLinksFolder() {
  if (_reportLinksFolderCache) return _reportLinksFolderCache;
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('REPORT_LINKS_FOLDER_ID') || '';
  if (id) {
    try {
      var existing = DriveApp.getFolderById(id);
      existing.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      _reportLinksFolderCache = id;
      return id;
    } catch (e) {
      // stored id is stale/inaccessible -> fall through and make a fresh one
    }
  }
  try {
    var folder = DriveApp.createFolder('Email Report Links');
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    _reportLinksFolderCache = folder.getId();
    props.setProperty('REPORT_LINKS_FOLDER_ID', _reportLinksFolderCache);
    return _reportLinksFolderCache;
  } catch (e2) {
    logError('WARN', '_ensureReportLinksFolder',
      null, 'could not create/ share Email Report Links folder: ' + (e2.message || e2), '');
    return '';
  }
}

/**
 * Publish a public, owned copy of a source PDF and return its File (or null on
 * failure -> caller attaches the original instead). Idempotent by copyName.
 * @param {File} sourcePdf  the shared-with-me original
 * @param {string} copyName deterministic name, e.g. "Jane Doe - 2026-04-20_to_2026-04-26.pdf"
 */
function _publishPublicPdfCopy(sourcePdf, copyName) {
  try {
    var folderId = _ensureReportLinksFolder();
    if (!folderId) return null;
    var folder = DriveApp.getFolderById(folderId);
    // Reuse an existing copy if one is already there (idempotent re-runs).
    var it = folder.getFilesByName(copyName);
    var copy = it.hasNext() ? it.next() : sourcePdf.makeCopy(copyName, folder);
    copy.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return copy;
  } catch (e) {
    return null;
  }
}

/**
 * Menu helper: (re)create the Email Report Links folder + report its URL. Lets
 * the IM confirm the public-copies folder exists without generating drafts.
 */
function setupReportLinksFolder() {
  var ui = SpreadsheetApp.getUi();
  var id = _ensureReportLinksFolder();
  if (!id) {
    ui.alert('Could not set up folder',
      'Failed to create the Email Report Links folder. Check the Error Log.', ui.ButtonSet.OK);
    return;
  }
  var url = 'https://drive.google.com/drive/folders/' + id;
  ui.alert('Email Report Links folder ready',
    'Public (anyone-with-link) copies of each teacher PDF land here so tracked '
    + 'links open for everyone.\n\nFolder: ' + url, ui.ButtonSet.OK);
}

/**
 * Lazily create a log tab with a bold frozen header row. Mirrors the Error Log
 * bootstrap in logError. Returns the Sheet.
 */
function _ensureTab(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
  }
  return sheet;
}

/** Append one row to the Engagement Log. Best-effort (never throws). */
function logEngagementEvent(ev) {
  try {
    var sheet = _ensureTab(ENGAGEMENT_LOG_TAB, ENGAGEMENT_LOG_HEADERS);
    sheet.appendRow([
      new Date().toISOString(), ev.event || 'click', ev.week || '',
      ev.teacher || '', ev.email || '', ev.campus || '',
      ev.linkType || 'other', String(ev.dest || '').substring(0, 500)
    ]);
  } catch (e) {
    console.log('logEngagementEvent failed: ' + (e.message || e));
  }
}

/** Append one "send" row (the CTR denominator). Best-effort (never throws). */
function logSendEvent(teacher, week, templateName) {
  try {
    var sheet = _ensureTab(SEND_LOG_TAB, SEND_LOG_HEADERS);
    sheet.appendRow([
      new Date().toISOString(), week || '',
      String((teacher && teacher.name) || ''),
      String((teacher && teacher.email) || ''),
      String((teacher && teacher.campus) || ''),
      String(templateName || '')
    ]);
  } catch (e) {
    console.log('logSendEvent failed: ' + (e.message || e));
  }
}

/**
 * Convert a Drive file/view URL to the direct-content URL that reliably serves
 * the file (the /view preview page persistently errors on freshly-copied PDFs).
 * Handles `/file/d/<id>/view` and `?id=<id>` forms; other URLs pass through.
 */
function _driveDirectUrl(url) {
  var s = String(url || '');
  var m = s.match(/\/file\/d\/([-\w]+)/) || s.match(/[?&]id=([-\w]+)/);
  if (m && /drive\.google\.com|docs\.google\.com/.test(s)) {
    return 'https://drive.google.com/uc?export=download&id=' + m[1];
  }
  return url;
}

/**
 * Extract the Drive file id from a Drive URL, or '' if it isn't one.
 * Same patterns as _driveDirectUrl.
 */
function _driveFileId(url) {
  var s = String(url || '');
  if (!/drive\.google\.com|docs\.google\.com/.test(s)) return '';
  var m = s.match(/\/file\/d\/([-\w]+)/) || s.match(/[?&]id=([-\w]+)/);
  return m ? m[1] : '';
}

// v2.17.0: max bytes doGet will inline-serve as base64. Weekly PDFs are ~100KB;
// XP reports low MB. Base64 inflates ~33%; HtmlOutput handles this comfortably.
var PDF_SERVE_MAX_BYTES = 15 * 1024 * 1024;

/**
 * v2.17.0: serve the PDF bytes DIRECTLY from the web app - Drive's browser
 * front-end (/view preview AND the uc download flow) kept erroring "unable to
 * open the file at this time" for recipients even though the bytes were
 * provably fetchable. The web app runs as the owner, so it reads the file
 * server-side (works on shared-with-me originals too - no sharing needed) and
 * hands the browser a download page: base64 -> Blob -> auto-download, plus a
 * visible button fallback. Returns HtmlOutput, or null -> caller falls back to
 * the redirect path.
 */
function _servePdfPage(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    var size = file.getSize();
    if (size > PDF_SERVE_MAX_BYTES) return null;
    var blob = file.getBlob();
    var b64 = Utilities.base64Encode(blob.getBytes());
    var name = String(file.getName() || 'report.pdf');
    if (!/\.pdf$/i.test(name)) name += '.pdf';
    var jsName = JSON.stringify(name).replace(/</g, '\\u003c');
    return HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>'
      + '<body style="font-family:Arial,sans-serif;text-align:center;padding-top:40px;">'
      + '<p id="msg">Preparing your report&hellip;</p>'
      + '<p><a id="dl" href="#" style="display:inline-block;background-color:#1a73e8;color:#ffffff;'
      + 'padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">'
      + 'Download your report (PDF)</a></p>'
      + '<script>\n'
      + 'var B64="' + b64 + '";\n'
      + 'var NAME=' + jsName + ';\n'
      + 'function toBlob(){var bin=atob(B64);var len=bin.length;var arr=new Uint8Array(len);'
      + 'for(var i=0;i<len;i++){arr[i]=bin.charCodeAt(i);}return new Blob([arr],{type:"application/pdf"});}\n'
      + 'var url=URL.createObjectURL(toBlob());\n'
      + 'var a=document.getElementById("dl");a.href=url;a.download=NAME;\n'
      + 'try{a.click();document.getElementById("msg").textContent='
      + '"Your report is downloading. If it did not start, use the button below.";}'
      + 'catch(err){document.getElementById("msg").textContent="Click the button to download your report.";}\n'
      + '</script></body></html>')
      .setTitle(name)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (e) {
    return null;  // unreadable / deleted / oversized -> caller redirects instead
  }
}

/** JSON response helper for the shim's fmt=json mode. */
function _jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Web-app entry point. Verifies the signed token, logs the click, then bounces
 * the browser to the real destination. An unsigned / tampered / missing token
 * is NOT redirected (prevents this endpoint being abused as an open redirect).
 */
function doGet(e) {
  var token = (e && e.parameter && e.parameter.e) || '';
  var wantJson = ((e && e.parameter && e.parameter.fmt) || '') === 'json';
  var meta = verifyToken(token);
  if (!meta || !/^https?:\/\//i.test(meta.dest)) {
    if (wantJson) return _jsonOut({ kind: 'invalid' });
    return HtmlService.createHtmlOutput(
      '<p style="font-family:Arial,sans-serif;">This link has expired or is invalid. '
      + 'Please open the email again.</p>')
      .setTitle('Link unavailable');
  }
  logEngagementEvent({
    event: 'click', week: meta.week, email: meta.email, campus: meta.campus,
    teacher: meta.teacher, linkType: meta.linkType, dest: meta.dest
  });
  // v2.18.0: JSON mode for the GitHub Pages shim (cookie-less fetch). Google's
  // multi-account front-end (/macros/u/N routing) kills BROWSER navigations to
  // /exec before doGet even runs, while cookie-less requests always work. The
  // shim fetches this endpoint with {credentials:'omit'} - no cookies, no /u/N
  // routing possible - and downloads the returned bytes client-side.
  if (wantJson) {
    var fid = _driveFileId(meta.dest);
    if (fid) {
      try {
        var jf = DriveApp.getFileById(fid);
        if (jf.getSize() <= PDF_SERVE_MAX_BYTES) {
          var jname = String(jf.getName() || 'report.pdf');
          if (!/\.pdf$/i.test(jname)) jname += '.pdf';
          return _jsonOut({
            kind: 'pdf', name: jname,
            b64: Utilities.base64Encode(jf.getBlob().getBytes())
          });
        }
      } catch (jErr) { /* unreadable -> fall through to redirect */ }
      return _jsonOut({ kind: 'redirect', url: _driveDirectUrl(meta.dest) });
    }
    return _jsonOut({ kind: 'redirect', url: meta.dest });
  }
  // v2.17.0: for Drive-file destinations, serve the PDF bytes OURSELVES instead
  // of bouncing to Drive's browser front-end (which kept erroring "unable to
  // open the file at this time" across /view AND the uc download flow, even on
  // provably-public files). Server-side read works on shared-with-me originals
  // too, so no sharing/copying is needed. Done here so links ALREADY in sent
  // inboxes are fixed by a redeploy. Fail-soft: null -> old redirect below.
  var pdfFileId = _driveFileId(meta.dest);
  if (pdfFileId) {
    var served = _servePdfPage(pdfFileId);
    if (served) return served;
  }
  // v2.16.1: fallback - redirect to Drive's direct-content URL (not /view).
  var realDest = _driveDirectUrl(meta.dest);
  // v2.15.1: Apps Script serves doGet HTML inside a sandboxed iframe, so
  // window.location only navigates the iframe - the real destination (Drive,
  // etc.) then loads FRAMED and errors. Redirect the TOP window instead
  // (window.top.location, allowed cross-origin for navigation) and make the
  // fallback link target _top. JSON.stringify escapes the URL as a JS string
  // literal; also escape "<" so a signed dest can't break out of the <script>.
  var jsDest = JSON.stringify(realDest).replace(/</g, '\\u003c');
  var safeDest = realDest.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head>'
    + '<script>window.top.location.href=' + jsDest + ';</script>'
    + '</head><body style="font-family:Arial,sans-serif;">'
    + 'Redirecting&hellip; if nothing happens, '
    + '<a href="' + safeDest + '" target="_top">click here</a>.'
    + '</body></html>')
    .setTitle('Redirecting')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Rebuild the Engagement Dashboard tab: one section per week showing which
 * teachers were sent, whether they clicked anything, whether they clicked the
 * PDF, and the per-week PDF click-through rate. Formula-driven off Send Log +
 * Engagement Log so it stays live between rebuilds.
 */
function rebuildEngagementDashboard() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sendSheet = ss.getSheetByName(SEND_LOG_TAB);
  if (!sendSheet || sendSheet.getLastRow() < 2) {
    ui.alert('No sends logged yet',
      'Generate drafts first — the Send Log is written as drafts are created.',
      ui.ButtonSet.OK);
    return;
  }
  var send = sendSheet.getDataRange().getValues();  // [ts, week, teacher, email, campus, template]
  var eng = [];
  var engSheet = ss.getSheetByName(ENGAGEMENT_LOG_TAB);
  if (engSheet && engSheet.getLastRow() > 1) eng = engSheet.getDataRange().getValues();

  // v2.20.0: clicks + sends key on email||week||teacher so several teachers
  // sharing one recipient email (smoke tests: ALL drafts go to the operator) no
  // longer collapse into one row. Legacy clicks (pre-v2.20.0 tokens carry no
  // teacher) go into a per-(email, week) pool and are attributed ONLY when that
  // (email, week) has exactly one send row - never guessed.
  function _clickRec() { return { any: false, pdf: false, count: 0, first: '' }; }
  function _addClick(rec, r) {
    rec.any = true;
    rec.count++;
    if (String(r[6] || '') === 'pdf') rec.pdf = true;
    if (!rec.first || String(r[0]) < rec.first) rec.first = String(r[0]);
    return rec;
  }
  var clicks = {};       // email||week||teacherLower -> rec
  var legacyClicks = {}; // email||week -> rec (blank-teacher tokens)
  for (var i = 1; i < eng.length; i++) {
    var r = eng[i];
    if ((r[1] || 'click') !== 'click') continue;
    var emwk = String(r[4] || '').toLowerCase() + '||' + String(r[2] || '');
    var tch = String(r[3] || '').toLowerCase();
    if (tch) clicks[emwk + '||' + tch] = _addClick(clicks[emwk + '||' + tch] || _clickRec(), r);
    else legacyClicks[emwk] = _addClick(legacyClicks[emwk] || _clickRec(), r);
  }

  // De-dupe sends to one row per (email, week, teacher), newest template wins.
  var sentMap = {}, orderList = [];
  var sendsPerEmailWeek = {};  // email||week -> count of DISTINCT teacher rows
  for (var j = 1; j < send.length; j++) {
    var s = send[j];
    var wk = String(s[1] || ''), em = String(s[3] || ''), tn = String(s[2] || '');
    var sk = em.toLowerCase() + '||' + wk + '||' + tn.toLowerCase();
    if (!sentMap[sk]) {
      orderList.push(sk);
      var ewk = em.toLowerCase() + '||' + wk;
      sendsPerEmailWeek[ewk] = (sendsPerEmailWeek[ewk] || 0) + 1;
    }
    sentMap[sk] = { week: wk, teacher: tn, email: em, campus: String(s[4] || '') };
  }
  // Merge legacy (blank-teacher) clicks into the row IFF unambiguous.
  for (var lk in legacyClicks) {
    if (sendsPerEmailWeek[lk] === 1) {
      for (var sk2 = 0; sk2 < orderList.length; sk2++) {
        if (orderList[sk2].indexOf(lk + '||') === 0) {
          var tgt = clicks[orderList[sk2]] || _clickRec();
          var leg = legacyClicks[lk];
          tgt.any = tgt.any || leg.any;
          tgt.pdf = tgt.pdf || leg.pdf;
          tgt.count += leg.count;
          if (!tgt.first || (leg.first && leg.first < tgt.first)) tgt.first = leg.first;
          clicks[orderList[sk2]] = tgt;
          break;
        }
      }
    }
    // ambiguous (2+ teachers share the email that week): dropped from
    // per-teacher attribution on purpose - never guess.
  }
  var order = orderList;

  var perWeek = {};    // week -> {sent, pdfClickers}
  var perTeacher = {}; // email -> {teacher, campus, weeksSent, pdfClicked, totalClicks}
  var detail = [];     // per-(teacher, week) rows
  order.sort(function(a, b) {
    return (sentMap[b].week + sentMap[b].teacher).localeCompare(sentMap[a].week + sentMap[a].teacher);
  });
  for (var k = 0; k < order.length; k++) {
    var m = sentMap[order[k]];
    // v2.20.0: order[k] IS the click key (email||week||teacherLower).
    var c = clicks[order[k]] || _clickRec();
    detail.push([m.week, m.teacher, m.email, m.campus, 'Y',
      c.any ? 'Y' : 'N', c.pdf ? 'Y' : 'N', c.count, c.first]);
    var pw = perWeek[m.week] || { sent: 0, pdf: 0 };
    pw.sent++;
    if (c.pdf) pw.pdf++;
    perWeek[m.week] = pw;
    // v2.19.0 aggregate; v2.20.0 keyed by (email, teacher) so teachers sharing
    // one recipient email get their own fidelity rows.
    var ptKey = m.email.toLowerCase() + '||' + m.teacher.toLowerCase();
    var pt = perTeacher[ptKey] || { teacher: m.teacher, campus: m.campus, weeksSent: 0, pdfClicked: 0, totalClicks: 0, email: m.email };
    pt.weeksSent++;
    if (c.pdf) pt.pdfClicked++;
    pt.totalClicks += c.count;
    if (m.teacher) pt.teacher = m.teacher;  // keep a non-blank name if any send row had one
    perTeacher[ptKey] = pt;
  }

  // v2.19.0: SECTION 1 - Teacher Fidelity (% of report PDFs clicked, all weeks).
  var fidelity = [['TEACHER FIDELITY - % of report PDFs clicked'],
                  ['Teacher', 'Email', 'Campus', 'Reports sent', 'PDFs clicked', 'Total clicks', 'Fidelity %']];
  var tKeys = Object.keys(perTeacher);
  tKeys.sort(function(a, b) {
    var fa = perTeacher[a].pdfClicked / perTeacher[a].weeksSent;
    var fb = perTeacher[b].pdfClicked / perTeacher[b].weeksSent;
    if (fb !== fa) return fb - fa;                                   // fidelity desc
    return perTeacher[a].teacher.localeCompare(perTeacher[b].teacher); // then name
  });
  var fidelityPcts = [];  // parallel array for color banding
  for (var t = 0; t < tKeys.length; t++) {
    var pt2 = perTeacher[tKeys[t]];
    var pct = pt2.weeksSent ? (pt2.pdfClicked / pt2.weeksSent) : 0;
    fidelityPcts.push(pct);
    fidelity.push([pt2.teacher, pt2.email, pt2.campus, pt2.weeksSent, pt2.pdfClicked,
      pt2.totalClicks, Math.round(pct * 1000) / 10 + '%']);
  }

  // SECTION 2 - per-(teacher, week) detail.
  var rows = [['Week', 'Teacher', 'Email', 'Campus', 'Sent', 'Clicked any', 'Clicked PDF', '# clicks', 'First click']];
  for (var d = 0; d < detail.length; d++) rows.push(detail[d]);

  // SECTION 3 - PDF CTR by week.
  var summary = [['PDF click-through rate by week'], ['Week', 'Teachers sent', 'PDF clickers', 'PDF CTR']];
  var weeks = Object.keys(perWeek).sort().reverse();
  for (var w = 0; w < weeks.length; w++) {
    var pw2 = perWeek[weeks[w]];
    var ctr = pw2.sent ? (pw2.pdf / pw2.sent) : 0;
    summary.push([weeks[w], pw2.sent, pw2.pdf, Math.round(ctr * 1000) / 10 + '%']);
  }

  var sheet = _ensureTab(ENGAGEMENT_DASHBOARD_TAB, fidelity[1]);
  sheet.clear();

  // Write Section 1 (fidelity). Row 1 = section title, row 2 = header.
  sheet.getRange(1, 1, 1, 1).setValue(fidelity[0][0]).setFontWeight('bold');
  sheet.getRange(2, 1, 1, fidelity[1].length).setValues([fidelity[1]])
    .setFontWeight('bold').setBackground('#f3f3f3');
  if (tKeys.length) {
    sheet.getRange(3, 1, tKeys.length, fidelity[1].length)
      .setValues(fidelity.slice(2));
    // Color-band the Fidelity % column (col 7): green >= 80%, yellow >= 40%, red below.
    for (var fb2 = 0; fb2 < fidelityPcts.length; fb2++) {
      var color = fidelityPcts[fb2] >= 0.8 ? '#d9ead3' : (fidelityPcts[fb2] >= 0.4 ? '#fff2cc' : '#f4cccc');
      sheet.getRange(3 + fb2, 7).setBackground(color);
    }
  }

  // Write Section 2 (detail) below with a blank spacer row.
  var detailStart = 2 + tKeys.length + 2;
  sheet.getRange(detailStart, 1, rows.length, rows[0].length).setValues(rows);
  sheet.getRange(detailStart, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#f3f3f3');

  // Write Section 3 (CTR by week) below that.
  var startRow = detailStart + rows.length + 1;
  for (var sRow = 0; sRow < summary.length; sRow++) {
    if (summary[sRow].length) {
      sheet.getRange(startRow + sRow, 1, 1, summary[sRow].length).setValues([summary[sRow]]);
    }
  }
  sheet.getRange(startRow, 1, 2, 4).setFontWeight('bold');
  sheet.setFrozenRows(2);
  ss.setActiveSheet(sheet);
  ui.alert('Engagement Dashboard rebuilt',
    tKeys.length + ' teachers, ' + order.length + ' teacher-week rows across '
    + weeks.length + ' week(s).', ui.ButtonSet.OK);
}

/**
 * Append a structured row to the "Error Log" tab. Best-effort — failures in
 * logging itself fall back to console.log (never crash the caller).
 *
 * @param {string} severity   'INFO' | 'WARN' | 'ERROR'
 * @param {string} fnName     calling function name (for filtering)
 * @param {object|null} teacherObj  teacher dict (name, email) or null
 * @param {string} message    one-line error description
 * @param {string} stack      optional full stack/trace for debugging
 */
function logError(severity, fnName, teacherObj, message, stack) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(ERROR_LOG_TAB);
    if (!sheet) {
      sheet = ss.insertSheet(ERROR_LOG_TAB);
      sheet.appendRow(ERROR_LOG_HEADERS);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, ERROR_LOG_HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#f3f3f3');
    }
    var teacherStr = '';
    if (teacherObj) {
      teacherStr = String(teacherObj.name || '');
      if (teacherObj.email) teacherStr += ' <' + teacherObj.email + '>';
    }
    sheet.appendRow([
      new Date().toISOString(),
      _getRunId(),
      severity,
      fnName,
      teacherStr,
      String(message || '').substring(0, 500),
      String(stack || '').substring(0, 500)
    ]);

    // v2.5.1: Trim with hysteresis. v2.6.0: thresholds moved to CONFIG.LIMITS.
    // Only trigger trim when count exceeds CONFIG.LIMITS.ERROR_LOG_TRIM_TRIGGER (600);
    // then trim down to CONFIG.LIMITS.ERROR_LOG_MAX_ROWS (500). Avoids O(n) deleteRows
    // on every call past 500.
    var lastRow = sheet.getLastRow();
    if (lastRow > CONFIG.LIMITS.ERROR_LOG_TRIM_TRIGGER + 1) {
      sheet.deleteRows(2, lastRow - CONFIG.LIMITS.ERROR_LOG_MAX_ROWS - 1);
    }
  } catch (logErr) {
    console.log('logError itself failed: ' + (logErr.message || logErr));
    console.log('Original log: [' + severity + '] ' + fnName + ': ' + message);
  }
}

/**
 * Activate the "Error Log" tab so the user can scan recent failures.
 * Triggered from the Email Tools menu.
 */
function viewErrorLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ERROR_LOG_TAB);
  if (!sheet) {
    SpreadsheetApp.getUi().alert(
      'No error log yet',
      'Run "Generate My Email Drafts" first — the log is created on the first error.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  ss.setActiveSheet(sheet);
  sheet.setActiveRange(sheet.getRange(1, 1));
}

/**
 * Wipe the Error Log tab (keeps the header row). Triggered from the Email
 * Tools menu — useful before a fresh run when you want to see only this
 * run's errors.
 */
function clearErrorLog() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ERROR_LOG_TAB);
  if (!sheet) {
    ui.alert('Nothing to clear', 'No Error Log tab exists yet.', ui.ButtonSet.OK);
    return;
  }
  var resp = ui.alert(
    'Clear Error Log?',
    'Delete all entries from the Error Log tab? (Header row is preserved.)',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;
  sheet.clear();
  sheet.appendRow(ERROR_LOG_HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, ERROR_LOG_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#f3f3f3');
}

/**
 * Build the list of candidate exact filenames a teacher's weekly PDF could
 * be saved as. The PDF naming convention has settled on
 *   "{Teacher Name} - {YYYY-MM-DD} - {YYYY-MM-DD}.pdf"
 * but the "Teacher Name" portion can vary slightly across school folders
 * (with-space, underscored, or first+last spelled differently). We try the
 * common variations exactly, then dedupe.
 *
 * @param {object} teacher    teacher dict with name, firstName, lastName, folderName
 * @param {string} dateRange  Config Date Range, e.g. "2026-04-20_to_2026-04-26"
 * @return {string[]} unique candidate exact filenames
 */
function buildPdfCandidateFilenames(teacher, dateRange) {
  var pdfPattern = dateRangeToPdfPattern(dateRange); // "2026-04-20 - 2026-04-26"
  var raw = [];
  if (teacher.name) raw.push(teacher.name + ' - ' + pdfPattern + '.pdf');
  if (teacher.firstName && teacher.lastName) {
    raw.push(teacher.firstName + ' ' + teacher.lastName + ' - ' + pdfPattern + '.pdf');
  }
  if (teacher.folderName) raw.push(teacher.folderName + ' - ' + pdfPattern + '.pdf');
  // Dedupe (preserve order)
  var seen = {};
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    if (!seen[raw[i]]) { seen[raw[i]] = true; out.push(raw[i]); }
  }
  return out;
}

/**
 * v2.5.1 PURE HELPER: do these two school folders match?
 *   - If `expectedId` is provided, exact ID equality wins (cheap + authoritative).
 *   - Else if `expectedName` is provided, normalized name equality (case/underscore-tolerant).
 *   - Else: caller didn't give us anything to match — return false (vacuously
 *     not-equal). The caller (`_verifyFileInSchool`) handles the "no expected
 *     info" policy decision before calling here.
 *
 * Pure function — testable without Drive mocks.
 */
function _schoolFolderMatches(actualId, actualName, expectedId, expectedName) {
  if (expectedId) return actualId === expectedId;
  if (expectedName && actualName) {
    return normalizeFolderName(actualName) === normalizeFolderName(expectedName);
  }
  return false;
}

/**
 * v2.5.1: Verify a Drive file lives inside the teacher's expected school
 * folder. Defends against cross-school filename collisions (two "John Smith"
 * teachers in different schools).
 *
 * Walk up the parent chain: file → teacher folder → school folder. Compare
 * the school folder to the cache entry for `teacher.campus`. Returns true on
 * match, false on mismatch or `getParents()` failure (FAIL-CLOSED).
 *
 * Note: in `findTeacherPdfBySearch` we ONLY call this helper when there are
 * 2+ search hits for the same filename (collision detected). Single-hit
 * results are accepted without verification, so this helper's FAIL-CLOSED
 * behavior cannot regress the common case (which v2.5.0 already handled).
 */
function _verifyFileInSchool(file, schoolFolderCache, teacher) {
  var expectedFolder = (schoolFolderCache && teacher) ? schoolFolderCache[teacher.campus] : null;
  var expectedId = null;
  if (expectedFolder) {
    try { expectedId = expectedFolder.getId(); } catch (e) { /* stale cache; expectedId stays null */ }
  }
  var expectedName = teacher ? teacher.campus : null;

  // Without ANY expected info, can't verify — caller shouldn't have called us.
  if (!expectedId && !expectedName) return false;

  try {
    var parentIter = file.getParents();
    if (!parentIter.hasNext()) return false; // file at root — suspicious
    var teacherFolder = parentIter.next();

    var grandIter = teacherFolder.getParents();
    if (!grandIter.hasNext()) return false;
    var schoolFolder = grandIter.next();

    var actualId, actualName;
    try { actualId = schoolFolder.getId(); } catch (e) { actualId = null; }
    try { actualName = schoolFolder.getName(); } catch (e) { actualName = null; }

    return _schoolFolderMatches(actualId, actualName, expectedId, expectedName);
  } catch (e) {
    logError('WARN', '_verifyFileInSchool', teacher,
      'getParents() chain failed: ' + (e.message || e), '');
    // FAIL-CLOSED on permission errors — better to skip a possibly-correct
    // file than risk attaching a wrong-school PDF.
    return false;
  }
}

/**
 * v2.5.0/v2.5.1 PRIMARY PDF LOOKUP. Uses Drive's search API to find a
 * teacher's weekly PDF by exact filename — works for shared-with-me users
 * (unlike folder iteration). Returns the File or null.
 *
 * v2.5.0: introduced search-API path.
 * v2.5.1: cross-school collision defense. If the search returns:
 *   - 0 PDFs: try next candidate filename
 *   - 1 PDF:  accept without parent verification (no ambiguity → no regression
 *             risk vs v2.5.0; verification could fail for shared-with-me users
 *             whose getParents() also throws "Service error: Drive")
 *   - 2+ PDFs: walk file→teacherFolder→schoolFolder for each, accept the one
 *             whose school folder ID matches `schoolFolderCache[teacher.campus]`
 *             (or normalized name match as fallback). Skip mismatches; if all
 *             mismatch, log + try next candidate.
 *
 * Why this works: `DriveApp.getFilesByName(name)` queries Drive's search
 * index for files visible to the caller, regardless of parent-folder
 * permissions. Shared-with-me users CAN see files they have direct access
 * to via search, even when they cannot list the parent folder's children.
 * This is the same mechanism that makes `getFoldersByName` work for
 * shared-with-me users in v2.4.2's school-folder cache.
 */
function findTeacherPdfBySearch(teacher, dateRange, schoolFolderCache) {
  if (!teacher || !dateRange) return null;
  var candidates = buildPdfCandidateFilenames(teacher, dateRange);
  for (var c = 0; c < candidates.length; c++) {
    var fname = candidates[c];
    var pdfMatches = [];
    try {
      var iter = DriveApp.getFilesByName(fname);
      while (true) {
        var hasMore;
        try { hasMore = iter.hasNext(); }
        catch (e) {
          logError('WARN', 'findTeacherPdfBySearch', teacher,
            'iter.hasNext() failed for "' + fname + '": ' + (e.message || e), '');
          break;
        }
        if (!hasMore) break;
        var file;
        try { file = iter.next(); }
        catch (e) {
          logError('WARN', 'findTeacherPdfBySearch', teacher,
            'iter.next() failed for "' + fname + '": ' + (e.message || e), '');
          break;
        }
        // Filter to actual PDFs (defensive — search returns by name; a non-PDF
        // with the same name could theoretically exist).
        try {
          if (file.getName().toUpperCase().indexOf('.PDF') !== -1) {
            pdfMatches.push(file);
          }
        } catch (e) {
          logError('WARN', 'findTeacherPdfBySearch', teacher,
            'file.getName() failed: ' + (e.message || e), '');
        }
      }
    } catch (e) {
      logError('WARN', 'findTeacherPdfBySearch', teacher,
        'DriveApp.getFilesByName("' + fname + '") threw: ' + (e.message || e),
        e.stack || '');
      continue; // next candidate
    }

    if (pdfMatches.length === 0) continue;

    // 1 match: no ambiguity, accept without verification (v2.5.0 behavior preserved).
    if (pdfMatches.length === 1) return pdfMatches[0];

    // 2+ matches: collision detected, verify parent chain to disambiguate.
    for (var p = 0; p < pdfMatches.length; p++) {
      if (_verifyFileInSchool(pdfMatches[p], schoolFolderCache, teacher)) {
        return pdfMatches[p];
      }
    }
    logError('WARN', 'findTeacherPdfBySearch', teacher,
      pdfMatches.length + ' matches for "' + fname + '" but none verified to school "'
      + (teacher.campus || '?') + '" — trying next candidate.', '');
  }
  return null;
}

/**
 * v2.5.0 FALLBACK PDF LOOKUP. The pre-v2.5 folder-iteration logic, kept as
 * a safety net for filename anomalies that the search API can't match by
 * exact name. Returns the File or null. If iteration fails for permission
 * reasons (shared-with-me parent), log + return null instead of throwing.
 */
function findTeacherPdfByTraversal(teacher, dateRange, rootFolder, schoolFolderMap, schoolFolderCache) {
  var schoolFolderName = (schoolFolderMap && schoolFolderMap[teacher.campus]) || '';

  // School folder lookup with cache + stale check.
  var schoolFolder = null;
  if (schoolFolderCache && schoolFolderCache[teacher.campus]) {
    try {
      schoolFolderCache[teacher.campus].getId();
      schoolFolder = schoolFolderCache[teacher.campus];
    } catch (cacheErr) {
      delete schoolFolderCache[teacher.campus];
    }
  }
  if (!schoolFolder) {
    try {
      schoolFolder = findFolderByName(schoolFolderName, rootFolder);
      if (!schoolFolder) schoolFolder = findFolderByName(teacher.campus, rootFolder);
    } catch (e) {
      logError('WARN', 'findTeacherPdfByTraversal', teacher,
        'school folder lookup failed: ' + (e.message || e), '');
      return null;
    }
  }
  if (!schoolFolder) return null;

  // Teacher folder lookup.
  var teacherFolder = null;
  try {
    teacherFolder = findFolderByName(teacher.folderName, schoolFolder);
    if (!teacherFolder) teacherFolder = findFolderByName(teacher.name, schoolFolder);
  } catch (e) {
    logError('WARN', 'findTeacherPdfByTraversal', teacher,
      'teacher folder lookup failed: ' + (e.message || e), '');
    return null;
  }
  if (!teacherFolder) return null;

  // PDF iteration inside teacher folder. Wrap every iterator step.
  var pdfPattern = dateRangeToPdfPattern(dateRange);
  try {
    var files = teacherFolder.getFiles();
    while (true) {
      var hasMore;
      try { hasMore = files.hasNext(); }
      catch (e) {
        logError('WARN', 'findTeacherPdfByTraversal', teacher,
          'files.hasNext() failed: ' + (e.message || e), '');
        break;
      }
      if (!hasMore) break;
      try {
        var file = files.next();
        var fileName = file.getName();
        if (fileName.indexOf(pdfPattern) !== -1 && fileName.toUpperCase().indexOf('.PDF') !== -1) {
          return file;
        }
      } catch (e) {
        logError('WARN', 'findTeacherPdfByTraversal', teacher,
          'file iteration step failed: ' + (e.message || e), '');
      }
    }
    // Backward compat: old structure (date subfolder + 00_SUMMARY.PDF).
    // v2.5.1: every iterator step wrapped (same pattern as the new-format
    // iteration above). Pre-v2.5.1 these were unwrapped — same class of bug
    // the v2.4.x series spent 4 attempts on, but in this rarely-exercised
    // legacy path. Audit found by post-v2.5.0 review.
    var dateFolder = null;
    try { dateFolder = findFolderByName(dateRange, teacherFolder); }
    catch (e) {
      logError('WARN', 'findTeacherPdfByTraversal', teacher,
        'backward-compat dateFolder lookup failed: ' + (e.message || e), '');
    }
    if (dateFolder) {
      try {
        var oldFiles = dateFolder.getFiles();
        while (true) {
          var oldHasMore;
          try { oldHasMore = oldFiles.hasNext(); }
          catch (e) {
            logError('WARN', 'findTeacherPdfByTraversal', teacher,
              'oldFiles.hasNext() failed (backward-compat): ' + (e.message || e), '');
            break;
          }
          if (!oldHasMore) break;
          try {
            var f = oldFiles.next();
            var name = f.getName().toUpperCase();
            if (name.indexOf('00') === 0 && name.indexOf('SUMMARY') !== -1 && name.endsWith('.PDF')) {
              return f;
            }
          } catch (e) {
            logError('WARN', 'findTeacherPdfByTraversal', teacher,
              'oldFiles iteration step failed: ' + (e.message || e), '');
          }
        }
      } catch (e) {
        logError('WARN', 'findTeacherPdfByTraversal', teacher,
          'dateFolder.getFiles() failed: ' + (e.message || e), '');
      }
    }
  } catch (e) {
    logError('WARN', 'findTeacherPdfByTraversal', teacher,
      'PDF iteration failed: ' + (e.message || e), '');
  }
  return null;
}

// ============================================
// v2.5.0 — UNIT TEST HARNESS
// ============================================
//
// Run via Email Tools > Run Unit Tests. Tests pure functions (lookupByName,
// normalizeFolderName, dateRangeToPdfPattern, buildPdfCandidateFilenames).
// These are the functions most likely to silently regress on edits, and the
// only ones safe to test without Drive/Sheets I/O.

function _testAssertEq(results, name, actual, expected) {
  var actualJson = JSON.stringify(actual);
  var expectedJson = JSON.stringify(expected);
  if (actualJson === expectedJson) {
    results.push({ pass: true, name: name });
  } else {
    results.push({ pass: false, name: name, actual: actualJson, expected: expectedJson });
  }
}

function runUnitTests() {
  var results = [];

  // --- lookupByName ---
  var teachers = { 'avlen edwards': 'EDWARDS', 'jane doe': 'JANE' };
  _testAssertEq(results, 'lookupByName: exact match',
    lookupByName(teachers, 'Avlen', 'Edwards', 'Avlen Edwards'), 'EDWARDS');
  _testAssertEq(results, 'lookupByName: no match returns null',
    lookupByName(teachers, 'John', 'Smith', 'John Smith'), null);
  _testAssertEq(results, 'lookupByName: null fullName returns null',
    lookupByName(teachers, 'Avlen', 'Edwards', null), null);
  _testAssertEq(results, 'lookupByName: empty obj returns null',
    lookupByName({}, 'A', 'B', 'A B'), null);
  _testAssertEq(results, 'lookupByName: null obj returns null',
    lookupByName(null, 'A', 'B', 'A B'), null);

  // Last-name fallback: must NOT cross-leak between teachers sharing a last name
  var lastNameTest = { 'liam smith': 'LIAM', 'lisa smith': 'LISA' };
  _testAssertEq(results, 'lookupByName: last-name same-first finds match',
    lookupByName(lastNameTest, 'Lisa', 'Smith', 'Lisa Smith'), 'LISA');
  _testAssertEq(results, 'lookupByName: last-name different-first returns null',
    lookupByName(lastNameTest, 'Larry', 'Smith', 'Larry Smith'), null);

  // --- normalizeFolderName ---
  _testAssertEq(results, 'normalizeFolderName: underscores -> spaces',
    normalizeFolderName('JRES_-_Ridgeland'), 'jres - ridgeland');
  _testAssertEq(results, 'normalizeFolderName: curly apostrophe -> straight',
    normalizeFolderName('Bruna and Mark\u2019s'), "bruna and mark's");
  _testAssertEq(results, 'normalizeFolderName: trim + collapse whitespace',
    normalizeFolderName('  Foo   Bar  '), 'foo bar');
  _testAssertEq(results, 'normalizeFolderName: null safe',
    normalizeFolderName(null), '');

  // v2.6.9: full-school-name normalization (the JRES regression class).
  _testAssertEq(results, 'normalizeFolderName: full school name spaced',
    normalizeFolderName('JRES - Ridgeland Elementary School'), 'jres - ridgeland elementary school');
  _testAssertEq(results, 'normalizeFolderName: full school name underscored',
    normalizeFolderName('JRES_-_Ridgeland_Elementary_School'), 'jres - ridgeland elementary school');
  _testAssertEq(results, 'normalizeFolderName: full school name uppercase',
    normalizeFolderName('JRES - RIDGELAND ELEMENTARY SCHOOL'), 'jres - ridgeland elementary school');
  _testAssertEq(results, 'normalizeFolderName: spaced vs underscored cross-equivalence',
    normalizeFolderName('JRES_-_Ridgeland_Elementary_School'),
    normalizeFolderName('JRES - Ridgeland Elementary School'));

  // --- v2.6.9: campusMatchesAnyDisplay (pure helper for getTeachersForSchools) ---
  _testAssertEq(results, 'campusMatchesAnyDisplay: exact match',
    campusMatchesAnyDisplay('JRES - Ridgeland Elementary School',
      ['JRES - Ridgeland Elementary School']), true);
  _testAssertEq(results, 'campusMatchesAnyDisplay: underscored campus matches spaced display',
    campusMatchesAnyDisplay('JRES_-_Ridgeland_Elementary_School',
      ['JRES - Ridgeland Elementary School']), true);
  _testAssertEq(results, 'campusMatchesAnyDisplay: uppercase campus matches mixed-case display',
    campusMatchesAnyDisplay('JRES - RIDGELAND ELEMENTARY SCHOOL',
      ['JRES - Ridgeland Elementary School']), true);
  _testAssertEq(results, 'campusMatchesAnyDisplay: empty campus returns false',
    campusMatchesAnyDisplay('', ['JRES - Ridgeland Elementary School']), false);
  _testAssertEq(results, 'campusMatchesAnyDisplay: non-matching campus returns false',
    campusMatchesAnyDisplay('Some Other School', ['JRES - Ridgeland Elementary School']), false);
  _testAssertEq(results, 'campusMatchesAnyDisplay: empty displayNames list returns false',
    campusMatchesAnyDisplay('JRES - Ridgeland Elementary School', []), false);

  // --- v2.7.0: partitionTeachersByDataAvailability (drives the skip-without-data filter) ---
  var fakeTeachers = [
    { name: 'Lasonnya Chisolm-Priester', firstName: 'Lasonnya', lastName: 'Chisolm-Priester' },
    { name: 'Kelly Thornton', firstName: 'Kelly', lastName: 'Thornton' },
    { name: 'Alfreda Harris', firstName: 'Alfreda', lastName: 'Harris' },
    { name: 'Genesis Temonio', firstName: 'Genesis', lastName: 'Temonio' }
  ];
  var fakeMetrics = {
    'lasonnya chisolm-priester': 'L_METRICS',
    'alfreda harris': 'A_METRICS'
  };
  var partFn = function(t) {
    return lookupByName(fakeMetrics, t.firstName, t.lastName, t.name) !== null;
  };
  var partResult = partitionTeachersByDataAvailability(fakeTeachers, partFn);
  _testAssertEq(results, 'partition: mixed input separates by data presence',
    [partResult.withData.length, partResult.skipped.length], [2, 2]);
  _testAssertEq(results, 'partition: withData preserves teacher names',
    partResult.withData.map(function(t) { return t.name; }).sort(),
    ['Alfreda Harris', 'Lasonnya Chisolm-Priester']);
  _testAssertEq(results, 'partition: skipped preserves teacher names',
    partResult.skipped.map(function(t) { return t.name; }).sort(),
    ['Genesis Temonio', 'Kelly Thornton']);
  _testAssertEq(results, 'partition: empty input returns empty arrays',
    partitionTeachersByDataAvailability([], partFn),
    { withData: [], skipped: [] });

  // --- dateRangeToPdfPattern ---
  _testAssertEq(results, 'dateRangeToPdfPattern: valid range',
    dateRangeToPdfPattern('2026-04-20_to_2026-04-26'), '2026-04-20 - 2026-04-26');
  _testAssertEq(results, 'dateRangeToPdfPattern: malformed passthrough',
    dateRangeToPdfPattern('not_a_range'), 'not_a_range');

  // --- buildPdfCandidateFilenames ---
  var teacher = { name: 'Avlen Edwards', firstName: 'Avlen', lastName: 'Edwards', folderName: 'Avlen_Edwards' };
  var candidates = buildPdfCandidateFilenames(teacher, '2026-04-20_to_2026-04-26');
  _testAssertEq(results, 'candidates: contains spaced name',
    candidates.indexOf('Avlen Edwards - 2026-04-20 - 2026-04-26.pdf') !== -1, true);
  _testAssertEq(results, 'candidates: contains underscored folderName',
    candidates.indexOf('Avlen_Edwards - 2026-04-20 - 2026-04-26.pdf') !== -1, true);
  // Dedup check
  var seen = {};
  var dups = 0;
  for (var c = 0; c < candidates.length; c++) {
    if (seen[candidates[c]]) dups++;
    seen[candidates[c]] = true;
  }
  _testAssertEq(results, 'candidates: no duplicates', dups, 0);
  // Empty teacher
  _testAssertEq(results, 'candidates: empty teacher returns empty list',
    buildPdfCandidateFilenames({}, '2026-04-20_to_2026-04-26'), []);

  // --- v2.5.1: apostrophe handling in candidates ---
  var teacherApos = { name: "Dan O'Brien", firstName: 'Dan', lastName: "O'Brien", folderName: "Dan_O'Brien" };
  var aposCands = buildPdfCandidateFilenames(teacherApos, '2026-04-20_to_2026-04-26');
  _testAssertEq(results, 'candidates: apostrophe preserved in name form',
    aposCands.indexOf("Dan O'Brien - 2026-04-20 - 2026-04-26.pdf") !== -1, true);
  _testAssertEq(results, 'candidates: apostrophe preserved in folderName form',
    aposCands.indexOf("Dan_O'Brien - 2026-04-20 - 2026-04-26.pdf") !== -1, true);
  _testAssertEq(results, 'candidates: apostrophe count is at least 1',
    aposCands.length >= 1, true);

  // --- v2.5.1: _schoolFolderMatches (parent verification helper) ---
  _testAssertEq(results, 'schoolMatches: id match returns true',
    _schoolFolderMatches('id123', 'School Name', 'id123', 'Different Name'), true);
  _testAssertEq(results, 'schoolMatches: id mismatch returns false',
    _schoolFolderMatches('idA', 'Same Name', 'idB', 'Same Name'), false);
  _testAssertEq(results, 'schoolMatches: name fallback when no expected id',
    _schoolFolderMatches('idA', 'School Name', null, 'school_name'), true);
  _testAssertEq(results, 'schoolMatches: name mismatch when no expected id',
    _schoolFolderMatches('idA', 'School A', null, 'School B'), false);
  _testAssertEq(results, 'schoolMatches: nothing to verify returns false',
    _schoolFolderMatches('idA', 'School', null, null), false);
  _testAssertEq(results, 'schoolMatches: name normalize underscore=space',
    _schoolFolderMatches(null, 'JRES_-_Ridgeland Elementary', null, 'JRES - Ridgeland Elementary'), true);

  // --- v2.5.2: NAME_ALIASES resolution ---
  // 'aston haughton' → 'anton haughton' (BQ typo, AFMS)
  _testAssertEq(results, 'aliases: Aston→Anton resolves via NAME_ALIASES',
    lookupByName({ 'anton haughton': 'ANTON_DATA' }, 'Aston', 'Haughton', 'Aston Haughton'), 'ANTON_DATA');
  // 'lakieshie jennings' → 'lakieshie roberts-jennings' (hyphenated last name, JHES)
  _testAssertEq(results, 'aliases: Lakieshie→Roberts-Jennings resolves via NAME_ALIASES',
    lookupByName({ 'lakieshie roberts-jennings': 'LAKIESHIE_DATA' }, 'Lakieshie', 'Jennings', 'Lakieshie Jennings'), 'LAKIESHIE_DATA');
  // 'lisa kloesz' → 'lisa kloetz' (long-standing alias)
  _testAssertEq(results, 'aliases: Lisa Kloesz→Kloetz still works',
    lookupByName({ 'lisa kloetz': 'KLOETZ_DATA' }, 'Lisa', 'Kloesz', 'Lisa Kloesz'), 'KLOETZ_DATA');
  // Alias is non-destructive: direct match wins when both exist
  _testAssertEq(results, 'aliases: direct match wins over alias',
    lookupByName({ 'aston haughton': 'DIRECT', 'anton haughton': 'ALIAS' }, 'Aston', 'Haughton', 'Aston Haughton'), 'DIRECT');

  // --- v2.6.0: cellToDateString helper ---
  var apr20 = new Date(2026, 3, 20); // month is 0-indexed
  _testAssertEq(results, 'cellToDateString: Date object yields ISO',
    cellToDateString(apr20), '2026-04-20');
  _testAssertEq(results, 'cellToDateString: string passthrough trimmed',
    cellToDateString('  2026-04-20  '), '2026-04-20');
  _testAssertEq(results, 'cellToDateString: null safe',
    cellToDateString(null), '');
  _testAssertEq(results, 'cellToDateString: undefined safe',
    cellToDateString(undefined), '');

  // --- v2.6.0: getMySchools helper (mock mappingData) ---
  var mockMapping = [
    ['Folder Name', 'Display Name', 'IM Email'],
    ['JHES_-_Hardeeville_Elementary_School', 'JHES - Hardeeville Elementary School', 'frank@studient.com'],
    ['AFMS_-_Allendale_Fairfax_Middle_School', 'AFMS - Allendale Fairfax Middle School', 'bruna@studient.com'],
    ['JHMS_-_Hardeeville', 'JHMS - Hardeeville Junior Senior High School', 'frank@studient.com']
  ];
  _testAssertEq(results, 'getMySchools: frank gets 2 schools',
    getMySchools('frank@studient.com', mockMapping).length, 2);
  _testAssertEq(results, 'getMySchools: bruna gets 1 school',
    getMySchools('bruna@studient.com', mockMapping).length, 1);
  _testAssertEq(results, 'getMySchools: no match returns empty array',
    getMySchools('nobody@nowhere.com', mockMapping), []);
  _testAssertEq(results, 'getMySchools: returned shape is {folderName, displayName}',
    Object.keys(getMySchools('bruna@studient.com', mockMapping)[0]).sort(),
    ['displayName', 'folderName']);

  // --- v2.6.0: _buildRetryDialogHtml helper ---
  _testAssertEq(results, 'retryDialogHtml: contains header',
    _buildRetryDialogHtml(['Aston Haughton <a@x.com>'], 'run-123').indexOf('Retry Failed Teachers') !== -1, true);
  _testAssertEq(results, 'retryDialogHtml: contains teacher name',
    _buildRetryDialogHtml(['Aston Haughton <a@x.com>'], 'run-123').indexOf('Aston Haughton') !== -1, true);
  _testAssertEq(results, 'retryDialogHtml: empty list still renders',
    _buildRetryDialogHtml([], 'run-x').indexOf('0 teacher(s)') !== -1, true);
  _testAssertEq(results, 'retryDialogHtml: sanitizes runId',
    _buildRetryDialogHtml([], '<script>alert(1)</script>').indexOf('<script>alert') === -1, true);

  // --- v2.6.0: Threshold sanity (not bugs but confirms CONFIG values exist) ---
  _testAssertEq(results, 'CONFIG.THRESHOLDS.ACTIVE_DAYS_GREEN exists',
    typeof CONFIG.THRESHOLDS.ACTIVE_DAYS_GREEN, 'number');
  _testAssertEq(results, 'CONFIG.THRESHOLDS.AVG_MINS_GREEN > YELLOW',
    CONFIG.THRESHOLDS.AVG_MINS_GREEN > CONFIG.THRESHOLDS.AVG_MINS_YELLOW, true);
  _testAssertEq(results, 'CONFIG.LIMITS.ERROR_LOG_TRIM_TRIGGER > MAX_ROWS',
    CONFIG.LIMITS.ERROR_LOG_TRIM_TRIGGER > CONFIG.LIMITS.ERROR_LOG_MAX_ROWS, true);

  // --- v2.6.5: SC Final Email helpers ---
  var mockTotals = {
    campus: 'AFMS - Allendale Fairfax Middle School',
    numStudents: 12, totalMinutes: 8423, totalLessons: 188,
    totalGradeLevels: 14, avgLessons: 15.7, avgGradeLevels: 1.2
  };
  _testAssertEq(results, 'buildYearHighlightReel: shows totalMinutes formatted with commas',
    buildYearHighlightReel(mockTotals).indexOf('8,423') !== -1, true);
  _testAssertEq(results, 'buildYearHighlightReel: null totals renders dashes',
    buildYearHighlightReel(null).indexOf('--') !== -1, true);
  _testAssertEq(results, 'buildYearKpiStrip: shows avg with one decimal',
    buildYearKpiStrip(mockTotals).indexOf('15.7') !== -1, true);
  var mockHighlightGrade = [{ rank: 1, studentName: 'Sa’myiah Patterson', cumulativeLessons: 41,
    cumulativeGradeLevels: 3, topSubject: 'Reading', leadingMetric: 'grade_levels' }];
  // v2.6.7: subject mention dropped from grade_levels narrative — student-level total only.
  _testAssertEq(results, 'buildStudentSpotlights: grade_levels narrative substitutes student/N',
    buildStudentSpotlights(mockHighlightGrade).indexOf('mastered 3 grade levels this year, showing exceptional growth through Motivention') !== -1, true);
  var mockHighlightLessons = [{ rank: 2, studentName: 'James Lee', cumulativeLessons: 67,
    cumulativeGradeLevels: 1, topSubject: 'Math', leadingMetric: 'lessons' }];
  _testAssertEq(results, 'buildStudentSpotlights: lessons narrative substitutes student/N',
    buildStudentSpotlights(mockHighlightLessons).indexOf('master 67 lessons this year, leading the class') !== -1, true);
  _testAssertEq(results, 'buildStudentSpotlights: empty array shows fallback',
    buildStudentSpotlights([]).indexOf('still being calculated') !== -1, true);

  // --- v2.9.0: buildMapScoresTable (Spring 2026 MAP Scores template; 6-col + 5-band X Growth) ---
  var mockMapRows = [
    { studentName: 'Aiyana Patel', subject: 'Math', winterRit: 205, springRit: 213, projectedGrowth: 8, observedGrowth: 8 },
    { studentName: 'Aiyana Patel', subject: 'Reading', winterRit: 198, springRit: '', projectedGrowth: 7, observedGrowth: null },
    { studentName: 'Diego Martinez', subject: 'Language', winterRit: null, springRit: 220, projectedGrowth: null, observedGrowth: null }
  ];
  var mapTableHtml = buildMapScoresTable(mockMapRows);
  _testAssertEq(results, 'buildMapScoresTable: renders 6-col header',
    mapTableHtml.indexOf('Student Name') !== -1
      && mapTableHtml.indexOf('Subject') !== -1
      && mapTableHtml.indexOf('Winter Score') !== -1
      && mapTableHtml.indexOf('Spring Score') !== -1
      && mapTableHtml.indexOf('Projected Growth') !== -1
      && mapTableHtml.indexOf('X Growth') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: empty rows shows fallback callout',
    buildMapScoresTable([]).indexOf('No MAP score data found') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: null score renders as --',
    buildMapScoresTable([{ studentName: 'X', subject: 'Math', winterRit: null, springRit: null, projectedGrowth: null, observedGrowth: null }]).indexOf('--') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: data row count matches input',
    (buildMapScoresTable(mockMapRows).match(/<tr style="background-color:#(?:ffffff|d9ead3|6aa84f|93c47d|f4cccc|cc0000);">/g) || []).length, 3);

  // v2.9.1: 5-band X-Growth row color (boundary at X = -2 inclusive of dark red).
  _testAssertEq(results, 'buildMapScoresTable: X >= 2.0 renders darker green (#6aa84f)',
    buildMapScoresTable([{ studentName: 'A', subject: 'Math', winterRit: 200, springRit: 220, projectedGrowth: 5, observedGrowth: 20 }]).indexOf('background-color:#6aa84f') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: 1.5 <= X < 2.0 renders medium green (#93c47d)',
    buildMapScoresTable([{ studentName: 'B', subject: 'Math', winterRit: 200, springRit: 212, projectedGrowth: 8, observedGrowth: 12 }]).indexOf('background-color:#93c47d') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: 0 < X < 1.5 renders very light green (#d9ead3)',
    buildMapScoresTable([{ studentName: 'C', subject: 'Math', winterRit: 200, springRit: 205, projectedGrowth: 8, observedGrowth: 5 }]).indexOf('background-color:#d9ead3') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: X = 0 (flat) renders very light red (#f4cccc)',
    buildMapScoresTable([{ studentName: 'D', subject: 'Math', winterRit: 200, springRit: 200, projectedGrowth: 8, observedGrowth: 0 }]).indexOf('background-color:#f4cccc') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: -2 < X <= 0 renders very light red (#f4cccc)',
    buildMapScoresTable([{ studentName: 'E', subject: 'Math', winterRit: 200, springRit: 192, projectedGrowth: 8, observedGrowth: -8 }]).indexOf('background-color:#f4cccc') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: X = -2 exactly renders dark red (#cc0000)',
    buildMapScoresTable([{ studentName: 'F2', subject: 'Math', winterRit: 200, springRit: 190, projectedGrowth: 5, observedGrowth: -10 }]).indexOf('background-color:#cc0000') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: X < -2 renders dark red (#cc0000)',
    buildMapScoresTable([{ studentName: 'F', subject: 'Math', winterRit: 200, springRit: 170, projectedGrowth: 5, observedGrowth: -30 }]).indexOf('background-color:#cc0000') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: observed missing renders white (no highlight)',
    buildMapScoresTable([{ studentName: 'G', subject: 'Math', winterRit: 200, springRit: null, projectedGrowth: 8, observedGrowth: null }]).indexOf('background-color:#ffffff') !== -1, true);

  // v2.9.0: X Growth value rendering + floor-at-1 rule
  _testAssertEq(results, 'buildMapScoresTable: X Growth = obs / proj formatted to 2 decimals',
    buildMapScoresTable([{ studentName: 'H', subject: 'Math', winterRit: 200, springRit: 212, projectedGrowth: 8, observedGrowth: 12 }]).indexOf('>1.50<') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: projected=0 floors to 1 (X = obs)',
    buildMapScoresTable([{ studentName: 'I', subject: 'Math', winterRit: 200, springRit: 210, projectedGrowth: 0, observedGrowth: 10 }]).indexOf('>10.00<') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: projected<0 floors to 1 (X = obs)',
    buildMapScoresTable([{ studentName: 'J', subject: 'Math', winterRit: 200, springRit: 205, projectedGrowth: -3, observedGrowth: 5 }]).indexOf('>5.00<') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: observed missing renders X Growth as --',
    (buildMapScoresTable([{ studentName: 'K', subject: 'Math', winterRit: 200, springRit: null, projectedGrowth: 8, observedGrowth: null }]).match(/>--</g) || []).length >= 2, true);
  _testAssertEq(results, 'buildMapScoresTable: projected growth renders with 1 decimal',
    buildMapScoresTable([{ studentName: 'L', subject: 'Math', winterRit: 200, springRit: 208, projectedGrowth: 8, observedGrowth: 8 }]).indexOf('>8.0<') !== -1, true);
  _testAssertEq(results, 'buildMapScoresTable: projected missing renders as --',
    buildMapScoresTable([{ studentName: 'M', subject: 'Math', winterRit: 200, springRit: 210, projectedGrowth: null, observedGrowth: 10 }]).indexOf('>--<') !== -1, true);
  // v2.6.8: lookupByName resolves 3-token roster name to 2-token map key.
  // Fixes "John Bradley Apostol" (roster) vs "john apostol" (Year Teacher Totals)
  // mismatch where the previous direct-map lookup returned null.
  var mockYearMap = { 'john apostol': { numStudents: 25, totalLessons: 1442 } };
  _testAssertEq(results, 'lookupByName: 3-token roster name resolves to 2-token map key (john bradley apostol -> john apostol)',
    lookupByName(mockYearMap, 'John', 'Apostol', 'John Bradley Apostol') !== null, true);

  // --- v2.10.0: Summer School Week 1+2 ---
  _testAssertEq(results, 'summerKey: campus+teacher normalize (underscore = space)',
    _summerKey('JHMS - Hardeeville', 'Janice_Allen'), _summerKey('jhms - hardeeville', 'janice allen'));
  _testAssertEq(results, 'summerKey: group folder matches dashboard spacing',
    _summerKey('JRHS', 'Group_8A'), _summerKey('JRHS', 'Group 8A'));
  _testAssertEq(results, 'summerKey: different teacher differs',
    _summerKey('JHMS', 'A') === _summerKey('JHMS', 'B'), false);
  _testAssertEq(results, 'summerFirstName: first token for a person', _summerFirstName('Janice Allen'), 'Janice');
  _testAssertEq(results, 'summerFirstName: single token kept', _summerFirstName('Morgan'), 'Morgan');
  _testAssertEq(results, 'summerFirstName: group name kept whole', _summerFirstName('Group 8A'), 'Group 8A');
  var shdr = _summerHeaderIndex(['week_start', 'campus_name', 'teacher_name', 'students', 'avg_active_days', 'total_minutes', 'lessons_mastered']);
  _testAssertEq(results, 'summerHeaderIndex: normalized header -> index',
    [shdr['week start'], shdr['teacher name'], shdr['avg active days'], shdr['lessons mastered']], [0, 2, 4, 6]);
  var wk = _summerWeeklyByTeacher([
    { key: 'k1', week: '2026-06-01', students: 21, active: 1.5, mins: 210, lessons: 241 },
    { key: 'k1', week: '2026-06-08', students: 20, active: 3.5, mins: 420, lessons: 759 }
  ]);
  _testAssertEq(results, 'summerWeekly: week 1 metrics (students/active/minsPerStudent/lessons)',
    [wk.k1['2026-06-01'].students, wk.k1['2026-06-01'].activeDays, wk.k1['2026-06-01'].minsPerStudent, wk.k1['2026-06-01'].lessons], [21, 1.5, 10, 241]);
  _testAssertEq(results, 'summerWeekly: week 2 metrics (students/active/minsPerStudent/lessons)',
    [wk.k1['2026-06-08'].students, wk.k1['2026-06-08'].activeDays, wk.k1['2026-06-08'].minsPerStudent, wk.k1['2026-06-08'].lessons], [20, 3.5, 21, 759]);
  _testAssertEq(results, 'summerWeekly: minsPerStudent guards divide-by-zero',
    _summerWeeklyByTeacher([{ key: 'z', week: '2026-06-01', students: 0, active: 0, mins: 0, lessons: 0 }]).z['2026-06-01'].minsPerStudent, 0);
  var sst = buildSummerSchoolTable({
    '2026-06-01': { students: 18, activeDays: 4.2, minsPerStudent: 105, lessons: 120 },
    '2026-06-08': { students: 17, activeDays: 3.1, minsPerStudent: 88, lessons: 200 }
  });
  _testAssertEq(results, 'summerTable: 5-col per-week header',
    sst.indexOf('>Week</th>') !== -1 && sst.indexOf('# Students') !== -1 && sst.indexOf('Avg Active Days') !== -1
      && sst.indexOf('Avg Minutes/Student') !== -1 && sst.indexOf('Lessons Mastered') !== -1, true);
  _testAssertEq(results, 'summerTable: labels both weeks',
    sst.indexOf('Week 1 (6/1-6/7)') !== -1 && sst.indexOf('Week 2 (6/8-6/14)') !== -1, true);
  _testAssertEq(results, 'summerTable: renders week-1 and week-2 values',
    sst.indexOf('>18<') !== -1 && sst.indexOf('4.2') !== -1 && sst.indexOf('105.0') !== -1 && sst.indexOf('>120<') !== -1
      && sst.indexOf('>17<') !== -1 && sst.indexOf('3.1') !== -1 && sst.indexOf('88.0') !== -1 && sst.indexOf('>200<') !== -1, true);
  _testAssertEq(results, 'summerTable: missing week renders dashes',
    (buildSummerSchoolTable({ '2026-06-01': { students: 5, activeDays: 2, minsPerStudent: 30, lessons: 4 } }).match(/>--</g) || []).length, 4);
  _testAssertEq(results, 'summerTable: null dataRow -> fallback note',
    buildSummerSchoolTable(null).indexOf('summary not available') !== -1, true);
  _testAssertEq(results, 'summerTable: empty object -> fallback note',
    buildSummerSchoolTable({}).indexOf('summary not available') !== -1, true);
  var ssb = generateSummerSchoolWeek12Body({ name: 'Janice Allen', firstName: 'Janice' },
    { '2026-06-01': { students: 12, activeDays: 3, minsPerStudent: 80, lessons: 100 },
      '2026-06-08': { students: 12, activeDays: 4, minsPerStudent: 95, lessons: 130 } });
  _testAssertEq(results, 'summerBody: greets teacher', ssb.indexOf('Hi Janice,') !== -1, true);
  _testAssertEq(results, 'summerBody: contains the 3 moves',
    ssb.indexOf('Work the room') !== -1 && ssb.indexOf('Ask better questions') !== -1 && ssb.indexOf('Celebrate small wins') !== -1, true);
  _testAssertEq(results, 'summerBody: contains Timeback callout', ssb.indexOf('Thursday = Timeback') !== -1, true);
  _testAssertEq(results, 'summerBody: embeds the per-week data table', ssb.indexOf('Lessons Mastered') !== -1 && ssb.indexOf('Week 1 (6/1-6/7)') !== -1, true);
  _testAssertEq(results, 'summerBody: no literal sun emoji', ssb.indexOf(String.fromCharCode(0x2600)) === -1, true);
  _testAssertEq(results, 'summerBody: no em dash (hard rule)', ssb.indexOf(String.fromCharCode(0x2014)) === -1, true);

  // v2.12.0: JRHS-style consolidation (one email, all groups, Group x Week table)
  _testAssertEq(results, 'isConsolidated: JRHS true',
    _summerIsConsolidated('JRHS - Ridgeland Secondary Academy of Excellence'), true);
  _testAssertEq(results, 'isConsolidated: JRHS underscored true',
    _summerIsConsolidated('JRHS_-_Ridgeland_Secondary_Academy_of_Excellence'), true);
  _testAssertEq(results, 'isConsolidated: other school false',
    _summerIsConsolidated('JHMS - Hardeeville Junior Senior High School'), false);
  var cons = buildSummerConsolidatedTable([
    { teacher: 'Group 6B', dataRow: { '2026-06-01': { students: 9, activeDays: 2, minsPerStudent: 40, lessons: 11 }, '2026-06-08': { students: 9, activeDays: 4, minsPerStudent: 90, lessons: 22 } } },
    { teacher: 'Group 6A', dataRow: { '2026-06-01': { students: 10, activeDays: 1, minsPerStudent: 30, lessons: 5 }, '2026-06-08': { students: 12, activeDays: 4, minsPerStudent: 100, lessons: 18 } } }
  ]);
  _testAssertEq(results, 'consolidatedTable: Group + Week header',
    cons.indexOf('>Group</th>') !== -1 && cons.indexOf('>Week</th>') !== -1 && cons.indexOf('Lessons Mastered') !== -1, true);
  _testAssertEq(results, 'consolidatedTable: sorts groups (6A before 6B)',
    cons.indexOf('Group 6A') < cons.indexOf('Group 6B'), true);
  _testAssertEq(results, 'consolidatedTable: both weeks labeled per group',
    (cons.split('Week 1 (6/1-6/7)').length - 1) === 2 && (cons.split('Week 2 (6/8-6/14)').length - 1) === 2, true);
  _testAssertEq(results, 'consolidatedTable: renders week values',
    cons.indexOf('>10<') !== -1 && cons.indexOf('100.0') !== -1 && cons.indexOf('>18<') !== -1, true);
  _testAssertEq(results, 'consolidatedTable: missing week renders dashes',
    (buildSummerConsolidatedTable([{ teacher: 'Group 7A', dataRow: { '2026-06-01': { students: 3, activeDays: 1, minsPerStudent: 20, lessons: 2 } } }]).match(/>--</g) || []).length, 4);
  var cbody = generateSummerSchoolConsolidatedBody('JRHS - Ridgeland Secondary Academy of Excellence', [
    { teacher: 'Group 8A', dataRow: { '2026-06-01': { students: 10, activeDays: 1.6, minsPerStudent: 38, lessons: 79 } } }
  ]);
  _testAssertEq(results, 'consolidatedBody: greets + Group table + the 3 moves',
    cbody.indexOf('Hi team,') !== -1 && cbody.indexOf('>Group</th>') !== -1 && cbody.indexOf('Work the room') !== -1, true);
  _testAssertEq(results, 'consolidatedBody: no em dash', cbody.indexOf(String.fromCharCode(0x2014)) === -1, true);

  // v2.13.0: Week 3 per-district + template-driven config
  _testAssertEq(results, 'summerDistrict: JHMS -> jasper', _summerDistrict('JHMS - Hardeeville Junior Senior High School'), 'jasper');
  _testAssertEq(results, 'summerDistrict: JRES -> jasper', _summerDistrict('JRES - Ridgeland Elementary School'), 'jasper');
  _testAssertEq(results, 'summerDistrict: AFMS -> allendale', _summerDistrict('AFMS - Allendale Fairfax Middle School'), 'allendale');
  _testAssertEq(results, 'summerDistrict: AFES -> allendale', _summerDistrict('AFES - Allendale Fairfax Elementary School'), 'allendale');
  var sc3 = _summerTemplateConfig('Summer School Week 3');
  _testAssertEq(results, 'templateConfig: Week 3 single week 6/15', sc3.weekStarts, ['2026-06-15']);
  _testAssertEq(results, 'templateConfig: Week 3 byDistrict', sc3.byDistrict, true);
  _testAssertEq(results, 'summerVariant: Week 3 Jasper subject',
    _summerVariant(sc3, 'JHMS - Hardeeville Junior Senior High School').subject, 'Studient - Week 4: Finish Strong');
  _testAssertEq(results, 'summerVariant: Week 3 Allendale subject',
    _summerVariant(sc3, 'AFMS - Allendale Fairfax Middle School').subject, 'Studient - Week 3: Push Through the Slump');
  _testAssertEq(results, 'summerVariant: Week 1+2 single subject',
    _summerVariant(_summerTemplateConfig('Summer School Week 1+2'), 'AFMS').subject, 'Studient: Week 2: Keep the Momentum Going');
  var jasperCopy = _summerWeek3JasperCopy().join('');
  _testAssertEq(results, 'week3 Jasper copy: distinctive lines',
    jasperCopy.indexOf('Accountability + celebration') !== -1 && jasperCopy.indexOf('Keep urgency high') !== -1 && jasperCopy.indexOf('Final push') !== -1, true);
  _testAssertEq(results, 'week3 Jasper copy: no em dash / sun',
    jasperCopy.indexOf(String.fromCharCode(0x2014)) === -1 && jasperCopy.indexOf(String.fromCharCode(0x2600)) === -1, true);
  var allenCopy = _summerWeek3AllendaleCopy().join('');
  _testAssertEq(results, 'week3 Allendale copy: distinctive lines',
    allenCopy.indexOf('Motivation &gt; compliance') !== -1 && allenCopy.indexOf('Coach through frustration') !== -1 && allenCopy.indexOf('Thursday = Timeback') !== -1, true);
  _testAssertEq(results, 'week3 Allendale copy: no em dash / sun',
    allenCopy.indexOf(String.fromCharCode(0x2014)) === -1 && allenCopy.indexOf(String.fromCharCode(0x2600)) === -1, true);
  var t1wk = buildSummerSchoolTable({ '2026-06-15': { students: 9, activeDays: 3, minsPerStudent: 70, lessons: 40 } }, ['2026-06-15'], ['Week of 6/15 (6/15-6/21)']);
  _testAssertEq(results, 'singleWeekTable: one labeled row with values',
    t1wk.indexOf('Week of 6/15 (6/15-6/21)') !== -1 && t1wk.indexOf('>9<') !== -1 && t1wk.indexOf('70.0') !== -1 && t1wk.indexOf('>40<') !== -1, true);
  _testAssertEq(results, 'singleWeekTable: exactly one data row', (t1wk.split('<tr>').length - 1), 1);
  _testAssertEq(results, 'archive skip: normalized archive name detected',
    normalizeFolderName('ZZARCHIVE (Wrong Title PDF Report)').indexOf('archive') !== -1, true);
  _testAssertEq(results, 'summer template: Week 3 registered + summerSchool',
    !!TEMPLATES['Summer School Week 3'] && TEMPLATES['Summer School Week 3'].summerSchool === true, true);
  _testAssertEq(results, 'summer template: Week 3 in TEMPLATE_NAMES',
    TEMPLATE_NAMES.indexOf('Summer School Week 3') !== -1, true);

  // v2.14.0: Summer School Final Week (all campuses + student awards)
  var scF = _summerTemplateConfig('Summer School Final Week');
  _testAssertEq(results, 'finalWeek config: single week 6/22', scF.weekStarts, ['2026-06-22']);
  _testAssertEq(results, 'finalWeek config: showStudentAwards true', scF.showStudentAwards, true);
  _testAssertEq(results, 'finalWeek config: not byDistrict (universal)', !!scF.byDistrict, false);
  _testAssertEq(results, 'finalWeek variant: You Made It subject (Jasper campus)',
    _summerVariant(scF, 'JHMS - Hardeeville Junior Senior High School').subject, 'Studient - Final Week: You Made It');
  _testAssertEq(results, 'finalWeek variant: same subject (Allendale campus)',
    _summerVariant(scF, 'AFMS - Allendale Fairfax Middle School').subject, 'Studient - Final Week: You Made It');
  var fwCopy = _summerFinalWeekCopy().join('');
  _testAssertEq(results, 'finalWeek copy: distinctive lines',
    fwCopy.indexOf('You made it') !== -1 && fwCopy.indexOf('Celebrate the finish') !== -1 && fwCopy.indexOf('Thank you') !== -1, true);
  _testAssertEq(results, 'finalWeek copy: no em dash / sun',
    fwCopy.indexOf(String.fromCharCode(0x2014)) === -1 && fwCopy.indexOf(String.fromCharCode(0x2600)) === -1, true);
  var awTest = buildSummerStudentAwards([
    { name: 'Ava Stone', minutes: 460, days: 12, accuracy: 94, status: 'At fidelity' },
    { name: 'Ben Cole', minutes: 130, days: 6, accuracy: 70, status: 'Below fidelity' },
    { name: 'Cara Lin', minutes: 40, days: 2, accuracy: 95, status: 'Not started' }
  ]);
  _testAssertEq(results, 'awards: Hit Fidelity Goal bucket present + names at-fidelity student',
    awTest.indexOf('Hit Fidelity Goal') !== -1 && awTest.indexOf('Ava Stone') !== -1, true);
  _testAssertEq(results, 'awards: 125+ Minutes bucket present',
    awTest.indexOf('125+ Minutes') !== -1, true);
  _testAssertEq(results, 'awards: High Accuracy bucket present',
    awTest.indexOf('High Accuracy (90%+)') !== -1, true);
  _testAssertEq(results, 'awards: empty list -> fallback note',
    buildSummerStudentAwards([]).indexOf('No student achievement data') !== -1, true);
  _testAssertEq(results, 'awards: no em dash', awTest.indexOf(String.fromCharCode(0x2014)) === -1, true);
  _testAssertEq(results, 'finalWeek template: registered + summerSchool',
    !!TEMPLATES['Summer School Final Week'] && TEMPLATES['Summer School Final Week'].summerSchool === true, true);
  _testAssertEq(results, 'finalWeek template: in TEMPLATE_NAMES',
    TEMPLATE_NAMES.indexOf('Summer School Final Week') !== -1, true);

  // v2.11.0: Summer School template registration (dropdown + routing flag)
  _testAssertEq(results, 'summer template: registered in TEMPLATES',
    !!TEMPLATES['Summer School Week 1+2'], true);
  _testAssertEq(results, 'summer template: summerSchool routing flag set',
    TEMPLATES['Summer School Week 1+2'] && TEMPLATES['Summer School Week 1+2'].summerSchool === true, true);
  _testAssertEq(results, 'summer template: subject matches CONFIG.SUMMER_SCHOOL.SUBJECT',
    TEMPLATES['Summer School Week 1+2'].subject, CONFIG.SUMMER_SCHOOL.SUBJECT);
  _testAssertEq(results, 'summer template: appears in TEMPLATE_NAMES (dropdown)',
    TEMPLATE_NAMES.indexOf('Summer School Week 1+2') !== -1, true);
  _testAssertEq(results, 'summer template: requiresPdf false (no weekly PDF lookup)',
    TEMPLATES['Summer School Week 1+2'].requiresPdf, false);

  // v2.21.0: SY26-27 Weeks 1-9
  var k2627 = [
    '26-27 Week 1: Growth Mindset Culture',
    '26-27 Week 2: Clarity Builds Mastery',
    '26-27 Week 3: Persistence',
    '26-27 Week 4: Reflection & Ownership',
    '26-27 Week 5: Learning Narratives',
    '26-27 Week 6: Persistent Engagement',
    '26-27 Week 7: Actionable Feedback',
    '26-27 Week 8: Misses as Roadmaps',
    '26-27 Week 9: Confidence Through Evidence'
  ];
  var t2627 = { name: 'Test Teacher', firstName: 'Test', campus: 'JHES - Hardeeville Elementary School' };
  _testAssertEq(results, '26-27: all 9 keys registered in TEMPLATES',
    k2627.filter(function (k) { return !!TEMPLATES[k]; }).length, 9);
  _testAssertEq(results, '26-27: all 9 in TEMPLATE_NAMES (dropdown)',
    k2627.filter(function (k) { return TEMPLATE_NAMES.indexOf(k) !== -1; }).length, 9);
  _testAssertEq(results, '26-27: lead the dropdown (first 9 entries)',
    TEMPLATE_NAMES.slice(0, 9).join('|'), k2627.join('|'));
  _testAssertEq(results, '26-27: weekly PDF still attached (requiresPdf not disabled)',
    k2627.filter(function (k) { return TEMPLATES[k].requiresPdf === false; }).length, 0);
  _testAssertEq(results, '26-27: every subject non-empty',
    k2627.filter(function (k) { return !TEMPLATES[k].subject; }).length, 0);

  var bad2627 = [];
  for (var w2 = 1; w2 <= 9; w2++) {
    var spec2 = WEEK_SPECS_2627[w2];
    var html2 = TEMPLATES[k2627[w2 - 1]].buildBody(t2627, []);
    // Every week must surface its own video, infographic, the Timeback login,
    // and the Teacher Hub -- these are the links IMs actually click.
    if (html2.indexOf(spec2.videoUrl) === -1) bad2627.push('wk' + w2 + ' video');
    if (html2.indexOf(spec2.infographicUrl) === -1) bad2627.push('wk' + w2 + ' infographic');
    if (html2.indexOf(TIMEBACK_PLATFORM_URL_2627) === -1) bad2627.push('wk' + w2 + ' timeback');
    if (html2.indexOf(TEACHER_HUB_URL_2627) === -1) bad2627.push('wk' + w2 + ' hub');
    // No unrendered doc markers or leftover placeholders may ship.
    if (html2.indexOf('<<Teacher Data Table>>') !== -1) bad2627.push('wk' + w2 + ' raw marker');
    if (html2.indexOf('PLACEHOLDER') !== -1 || html2.indexOf('_____') !== -1) bad2627.push('wk' + w2 + ' placeholder');
    // AIM link renders only where the doc has one (weeks 1-6).
    if (spec2.aimUrl && html2.indexOf(spec2.aimUrl) === -1) bad2627.push('wk' + w2 + ' aim missing');
    if (!spec2.aimUrl && html2.indexOf('AIM Launch Link') !== -1) bad2627.push('wk' + w2 + ' aim leaked');
  }
  _testAssertEq(results, '26-27: all 9 bodies render links + no stray markers', bad2627.join(','), '');
  _testAssertEq(results, '26-27: no em dash in any body (repo style rule)',
    k2627.filter(function (k) {
      return TEMPLATES[k].buildBody(t2627, []).indexOf('—') !== -1;
    }).length, 0);
  _testAssertEq(results, '26-27: weeks 7-9 have no AIM link (doc omits it)',
    [7, 8, 9].filter(function (w) { return !!WEEK_SPECS_2627[w].aimUrl; }).length, 0);
  // Week 1's doc tab has no data-table marker; product decision is to show the
  // table anyway, so guard that it does.
  var wk1html = TEMPLATES[k2627[0]].buildBody(t2627, [
    { subject: 'Math', activeDays: 4, lessons: 10, minutes: 200, logins: 5 }
  ]);
  _testAssertEq(results, '26-27 wk1: renders metrics table despite no doc marker',
    wk1html.indexOf('<table') !== -1, true);
  _testAssertEq(results, '26-27 wk1: no data-line caption (doc has none)',
    WEEK_SPECS_2627[1].dataLine, '');

  // v2.22.0: manager-editable templates (resolver + doc parser)
  // Drift guard: registry subjects must equal spec subjects (two declarations, one truth).
  _testAssertEq(results, '26-27 v2.22: registry subject === spec subject for all 9',
    k2627.filter(function (k, i) { return TEMPLATES[k].subject !== WEEK_SPECS_2627[i + 1].subject; }).length, 0);

  // Resolver: fallback path renders byte-identical to the static builders.
  _testAssertEq(results, '26-27 v2.22: resolver fallback body === static builder body',
    resolveTemplate_('26-27 Week 3: Persistence').buildBody(t2627, []),
    generate2627Week3Body(t2627, []));
  _testAssertEq(results, '26-27 v2.22: resolver fallback subject from spec',
    resolveTemplate_('26-27 Week 5: anything after the week number').subject,
    WEEK_SPECS_2627[5].subject);
  _testAssertEq(results, '26-27 v2.22: resolver passes non-26-27 names to registry',
    resolveTemplate_('Summer School Week 1+2').summerSchool, true);
  _testAssertEq(results, '26-27 v2.22: resolver returns null for unknown names',
    resolveTemplate_('Nonexistent Template'), null);
  _testAssertEq(results, '26-27 v2.22: resolver returns null for unsynced week 12',
    resolveTemplate_('26-27 Week 12: Not Yet Written'), null);

  // Synced override: a Template Content row beats the hardcoded spec.
  var _fakeSynced = {
    subject: 'Custom Subject From Managers',
    focusTitle: 'Custom Focus',
    action: 'Custom Action',
    actionDetail: 'Custom detail sentence.',
    dataLine: 'Custom data line.',
    videoText: 'Custom Video', videoUrl: 'https://canva.link/custom',
    infographicText: 'Custom Infographic', infographicUrl: 'https://drive.google.com/custom',
    aimUrl: '', aimMaterials: '',
    templateName: '26-27 Week 2: Custom Focus'
  };
  _syncedSpecs2627Cache = { 2: _fakeSynced };
  var ovr = resolveTemplate_('26-27 Week 2: Clarity Builds Mastery');
  _testAssertEq(results, '26-27 v2.22: synced spec overrides subject', ovr.subject, 'Custom Subject From Managers');
  var ovrHtml = ovr.buildBody(t2627, []);
  _testAssertEq(results, '26-27 v2.22: synced spec overrides body content',
    ovrHtml.indexOf('https://canva.link/custom') !== -1 && ovrHtml.indexOf('Custom Focus') !== -1, true);
  var namesWithSync = getTemplateNames_();
  _testAssertEq(results, '26-27 v2.22: synced templateName appears in dropdown names',
    namesWithSync.indexOf('26-27 Week 2: Custom Focus') !== -1, true);
  _testAssertEq(results, '26-27 v2.22: unsynced weeks keep static dropdown names',
    namesWithSync.indexOf('26-27 Week 1: Growth Mindset Culture'), 0);
  _syncedSpecs2627Cache = null;

  // No sync at all: dropdown = static 26-27 keys first, full registry after.
  _syncedSpecs2627Cache = {};
  var namesNoSync = getTemplateNames_();
  _testAssertEq(results, '26-27 v2.22: no-sync dropdown leads with the 9 static keys',
    namesNoSync.slice(0, 9).join('|'), k2627.join('|'));
  _testAssertEq(results, '26-27 v2.22: no-sync dropdown has every registry template',
    namesNoSync.length, TEMPLATE_NAMES.length);
  _syncedSpecs2627Cache = null;

  // Doc parser fixtures - replicating the REAL doc's formatting quirks.
  function _fxB(t) { return { text: t, bold: true, url: '' }; }
  function _fxN(t) { return { text: t, bold: false, url: '' }; }
  function _fxL(t, u) { return { text: t, bold: false, url: u }; }

  // wk1 pattern: Focus+Subject+WeeklyFocus merged in one all-bold paragraph; split ✅ runs.
  var p1 = _parseWeekLines_([
    { runs: [_fxN('Focus: Relationship Foundations'), _fxB('Subject: Studient: Week 1: Let\'s Launch!'), _fxB('🎯 Weekly Focus: Fostering a Growth Mindset Culture. ')] },
    { runs: [_fxB('✅'), _fxB('Coach for growth'), _fxN('Strengthen perseverance and progress.')] },
    { runs: [_fxN('🎬 Got 60 seconds? Watch: '), _fxL('Teacher Language That Builds', 'https://canva.link/vid1')] },
    { runs: [_fxN('📊 Prefer to skim? View the '), _fxL('Growth Mindset Infographic', 'https://drive.google.com/file/d/abc'), _fxN(' - easy to save or print')] },
    { runs: [_fxL('AIM Launch Link', 'https://www.canva.com/design/aim1')] },
    { runs: [_fxN(' Needed Materials: Sticky Notes, Stopwatch')] }
  ]);
  _testAssertEq(results, '26-27 parser: wk1-style subject cut at 🎯', p1.spec.subject, 'Studient: Week 1: Let\'s Launch!');
  _testAssertEq(results, '26-27 parser: wk1-style split-bold action', p1.spec.action, 'Coach for growth');
  _testAssertEq(results, '26-27 parser: wk1-style detail after action', p1.spec.actionDetail, 'Strengthen perseverance and progress.');
  _testAssertEq(results, '26-27 parser: wk1-style no dataLine without marker', p1.spec.dataLine, '');
  _testAssertEq(results, '26-27 parser: wk1-style aim + materials', p1.spec.aimUrl === 'https://www.canva.com/design/aim1' && p1.spec.aimMaterials === 'Sticky Notes, Stopwatch', true);
  _testAssertEq(results, '26-27 parser: wk1-style valid (no errors)', p1.errors.join(','), '');

  // wk2 pattern: focus title + action + detail all in ONE line, bold-boundary split.
  var p2 = _parseWeekLines_([
    { runs: [_fxN('Subject: Studient: Teach It.')] },
    { runs: [_fxN('<<Teacher Data Table>>')] },
    { runs: [_fxN('Utilizing objective metrics to guide instruction.')] },
    { runs: [_fxB('🎯 Weekly Focus: Clarity builds mastery'), _fxB('✅Create consistency that supports mastery'), _fxN('Reinforce visible, repeatable learning.')] },
    { runs: [_fxN('🎬 Watch: '), _fxL('Video', 'https://canva.link/vid2')] },
    { runs: [_fxN('📊 View the '), _fxL('Mastery Infographic', 'https://drive.google.com/file/d/def')] }
  ]);
  _testAssertEq(results, '26-27 parser: wk2-style title cut at ✅', p2.spec.focusTitle, 'Clarity builds mastery');
  _testAssertEq(results, '26-27 parser: wk2-style action from bold segment', p2.spec.action, 'Create consistency that supports mastery');
  _testAssertEq(results, '26-27 parser: wk2-style detail after bold end', p2.spec.actionDetail, 'Reinforce visible, repeatable learning.');
  _testAssertEq(results, '26-27 parser: wk2-style dataLine from next line', p2.spec.dataLine, 'Utilizing objective metrics to guide instruction.');

  // wk5 pattern: non-bold detail on the focus line; "This week's moves" fenced off the action.
  var p5 = _parseWeekLines_([
    { runs: [_fxN('Subject: Studient: Narrative')] },
    { runs: [_fxB('🎯 Weekly Focus: Learning Narratives'), _fxN('Building learner confidence through evidence.')] },
    { runs: [_fxB('✅Coach Productive Learning Narratives'), _fxB('This week\'s moves ⬇️: ')] },
    { runs: [_fxN('🎬 Watch: '), _fxL('V', 'https://canva.link/vid5')] },
    { runs: [_fxN('📊 View the '), _fxL('I', 'https://drive.google.com/file/d/ghi')] }
  ]);
  _testAssertEq(results, '26-27 parser: wk5-style action fenced at This week', p5.spec.action, 'Coach Productive Learning Narratives');
  _testAssertEq(results, '26-27 parser: wk5-style detail from focus line', p5.spec.actionDetail, 'Building learner confidence through evidence.');

  // wk4 pattern: marker + dataLine in the same paragraph. wk3 pattern: stray quote after marker.
  var p4 = _parseWeekLines_([{ runs: [_fxN('<<Teacher Data Table>>Integrating objective evidence into conversations.')] }]);
  _testAssertEq(results, '26-27 parser: wk4-style same-line dataLine', p4.spec.dataLine, 'Integrating objective evidence into conversations.');
  var p3 = _parseWeekLines_([
    { runs: [_fxN('<<Teacher Data Table>>’')] },
    { runs: [_fxN('Monitoring platform data for frustration.')] }
  ]);
  _testAssertEq(results, '26-27 parser: wk3-style stray-quote marker then next-line dataLine', p3.spec.dataLine, 'Monitoring platform data for frustration.');

  // wk8 pattern: infographic link with EMPTY text; label lives in a bold run.
  var p8 = _parseWeekLines_([
    { runs: [_fxN('📊 '), _fxB('Prefer to skim? '), _fxN(' View the '), _fxB('Curiosity Infographic'), _fxL('', 'https://drive.google.com/file/d/jkl'), _fxN('- easy to save or print')] }
  ]);
  _testAssertEq(results, '26-27 parser: wk8-style empty-link text falls back to bold label',
    p8.spec.infographicText, 'Curiosity Infographic');
  _testAssertEq(results, '26-27 parser: wk8-style url captured from empty-text link',
    p8.spec.infographicUrl, 'https://drive.google.com/file/d/jkl');

  // Live-doc regression (sim run 2026-07-24): subject and <<marker>> share one paragraph.
  var pSubjMk = _parseWeekLines_([
    { runs: [_fxB('Subject: Studient: Teach It. Check It. Repeat It.'), _fxN('<<Teacher Data Table>>')] },
    { runs: [_fxN('Utilizing objective metrics.')] }
  ]);
  _testAssertEq(results, '26-27 parser: subject cut at <<marker>> (same paragraph)',
    pSubjMk.spec.subject, 'Studient: Teach It. Check It. Repeat It.');
  _testAssertEq(results, '26-27 parser: marker at line end still yields next-line dataLine',
    pSubjMk.spec.dataLine, 'Utilizing objective metrics.');

  // Live-doc regression (sim run 2026-07-24): 🎬 and 📊 merged into ONE paragraph -
  // each link must anchor at its own emoji, not "first link on the line".
  var pMerged = _parseWeekLines_([
    { runs: [
      _fxB('This week\'s moves ⬇️: '), _fxN('(Same content, two ways)'),
      _fxN('🎬 Got 60 seconds? Watch: '), _fxL('Video Title', 'https://canva.link/vidX'),
      _fxN('📊 Prefer to skim? View the '), _fxL('Persistence Infographic', 'https://drive.google.com/file/d/infX'),
      _fxN(' - easy to save or print')
    ] }
  ]);
  _testAssertEq(results, '26-27 parser: merged 🎬+📊 paragraph, video anchored at 🎬',
    pMerged.spec.videoUrl, 'https://canva.link/vidX');
  _testAssertEq(results, '26-27 parser: merged 🎬+📊 paragraph, infographic anchored at 📊',
    pMerged.spec.infographicUrl + '|' + pMerged.spec.infographicText,
    'https://drive.google.com/file/d/infX|Persistence Infographic');

  // Live-doc regression (sim run 2026-07-24): materials paragraph swallows the
  // following "- Teacher Hub" bullet.
  var pMats = _parseWeekLines_([
    { runs: [_fxN(' Needed Materials: Sticky Notes, Measuring Tape- Teacher Hub')] }
  ]);
  _testAssertEq(results, '26-27 parser: materials cut before Teacher Hub bullet',
    pMats.spec.aimMaterials, 'Sticky Notes, Measuring Tape');

  // Style rule: em dashes in doc content ship as hyphens.
  var pEm = _parseWeekLines_([{ runs: [_fxN('Subject: Data — delivered')] }]);
  _testAssertEq(results, '26-27 parser: em dash converted to hyphen', pEm.spec.subject, 'Data - delivered');

  // Validation: missing required pieces produce SKIP errors, never a broken spec.
  var pBad = _parseWeekLines_([{ runs: [_fxN('Subject: Only a subject')] }]);
  _testAssertEq(results, '26-27 parser: missing focus/action/links -> 4 errors', pBad.errors.length, 4);
  var pBlank = _parseWeekLines_([
    { runs: [_fxN('Subject: S')] },
    { runs: [_fxB('🎯 Weekly Focus: F'), _fxB('✅A_____'), _fxN('')] },
    { runs: [_fxN('🎬 Watch: '), _fxL('V', 'https://c.link/v')] },
    { runs: [_fxN('📊 View the '), _fxL('I', 'https://d.google.com/i')] }
  ]);
  _testAssertEq(results, '26-27 parser: unfilled blank rejected',
    pBlank.errors.join(',').indexOf('unfilled blank') !== -1, true);

  // Render
  var pass = 0, fail = 0;
  var lines = [];
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    if (r.pass) {
      pass++;
      lines.push('<div style="color:#2e7d32;">&#10003; ' + r.name + '</div>');
    } else {
      fail++;
      lines.push('<div style="color:#c62828;"><b>&#10007; ' + r.name + '</b><br>'
        + '&nbsp;&nbsp;&nbsp;got: <code>' + r.actual + '</code><br>'
        + '&nbsp;&nbsp;&nbsp;expected: <code>' + r.expected + '</code></div>');
    }
  }
  var summary = '<h2>Unit Tests</h2><p><b>'
    + pass + ' passed, ' + fail + ' failed</b> (total: ' + results.length + ')</p>';
  var html = summary + '<div style="font-family:monospace;font-size:13px;line-height:1.5;">'
    + lines.join('') + '</div>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(700).setHeight(600),
    'Unit Test Results'
  );
}

function createDraftForTeacher(teacher, rootFolder, dateRange, metrics, winners, schoolFolderMap, template, schoolFolderCache) {
  // v2.8.1: templates can opt out of the weekly PDF attachment. Spring 2026
  // MAP Scores carries its data table inline (no per-week PDF exists for it),
  // so skip the PDF lookup entirely. Default true preserves Week 0-8 / Wrap
  // Up / 4/20 / 4/27 / SC Final Email behavior.
  var needsPdf = template.requiresPdf !== false;

  // v2.5.0 PIVOT: PDF lookup now tries Drive's search API FIRST (works for
  // shared-with-me users; bypasses parent-folder permission gap entirely).
  // Falls back to folder traversal for filename anomalies. Both paths log
  // failures to the Error Log tab; a clean miss returns a structured error.
  var summaryPdf = null;
  if (needsPdf) {
    try {
      // v2.5.1: pass schoolFolderCache so collision-detection can verify parent
      // chain when 2+ search hits exist (cross-school name collision defense).
      summaryPdf = findTeacherPdfBySearch(teacher, dateRange, schoolFolderCache);
    } catch (e) {
      logError('WARN', 'createDraftForTeacher', teacher,
        'search-API path threw: ' + (e.message || e), e.stack || '');
    }

    // FALLBACK: existing folder traversal — handles cases where the PDF filename
    // doesn't exactly match our candidate list (e.g., trailing whitespace, an
    // unexpected name format). Failures here log + return null instead of crashing.
    if (!summaryPdf) {
      try {
        summaryPdf = findTeacherPdfByTraversal(teacher, dateRange, rootFolder, schoolFolderMap, schoolFolderCache);
      } catch (e) {
        logError('WARN', 'createDraftForTeacher', teacher,
          'traversal fallback threw: ' + (e.message || e), e.stack || '');
      }
    }

    if (!summaryPdf) {
      var pdfPatternForErr = dateRangeToPdfPattern(dateRange);
      var msg = 'PDF not found for "' + teacher.name + '" week "' + pdfPatternForErr
        + '". Tried search-API + folder traversal.';
      logError('ERROR', 'createDraftForTeacher', teacher, msg, '');
      return { success: false, error: msg };
    }
  }

  // v2.4.1: Pass the File directly to createDraft (no getAs() — it's already a PDF;
  // getAs(MimeType.PDF) was a no-op coercion that added a Drive call AND a failure
  // surface). Wrap the call in a named try/catch so any error identifies the
  // specific PDF + size + Gmail operation that failed.
  // v2.5.3: withGmailRetry (renamed from withDriveRetry) handles transient 5xx /
  // rate-limit blips (one retry after 2s).
  // v2.8.1: when needsPdf is false, no attachments key sent to createDraft.
  var body = template.buildBody(teacher, metrics, winners);

  // v2.15.0: the weekly PDF is now delivered as a TRACKED LINK (not attached),
  // so click-through can be measured. Ensure the file is viewable by recipients
  // (link-sharing), inject a "View your weekly report" CTA, and route it through
  // the tracking redirect. Body links are rewritten too. All fail OPEN: if the
  // web app isn't deployed yet, links pass through untracked and the email still
  // works. Sharing failures (Shared-Drive policy) are logged, not fatal.
  // v2.17.0: the tracked link points at the ORIGINAL PDF - doGet now serves the
  // bytes server-side (as the web-app owner), so no sharing and no public copy
  // is needed. Attachment fallback only when the PDF's URL is unreadable.
  var trackMeta = { week: dateRange, email: teacher.email, campus: teacher.campus, teacher: teacher.name };
  var attachFallback = null;
  if (summaryPdf) {
    var pdfUrl = null;
    try { pdfUrl = summaryPdf.getUrl(); } catch (_) {}
    if (pdfUrl) {
      var trackedPdf = buildTrackedUrl(pdfUrl, {
        week: dateRange, email: teacher.email, campus: teacher.campus,
        teacher: teacher.name, linkType: 'pdf'
      });
      body = _injectPdfCta(body, buildPdfCtaHtml_(trackedPdf));
    } else {
      attachFallback = summaryPdf;  // no url somehow -> attach original
      logError('WARN', 'createDraftForTeacher', teacher,
        'PDF getUrl failed; attaching instead (PDF click not tracked this send)', '');
    }
  }
  body = rewriteBodyLinks_(body, trackMeta);

  try {
    withGmailRetry(function() {
      var draftOptions = { htmlBody: body };
      if (attachFallback) draftOptions.attachments = [attachFallback];
      GmailApp.createDraft(teacher.email, template.subject, '', draftOptions);
    });
  } catch (e) {
    var pdfName = summaryPdf ? '<unknown>' : '(no-pdf template)';
    var pdfSize = summaryPdf ? '<unknown>' : 0;
    if (summaryPdf) {
      try { pdfName = summaryPdf.getName(); pdfSize = summaryPdf.getSize(); } catch (_) {}
    }
    return {
      success: false,
      error: 'createDraft failed for "' + pdfName + '" (' + pdfSize + ' bytes): ' + (e.message || e)
    };
  }
  logSendEvent(teacher, dateRange, (template && template.subject) || '');
  return { success: true };
}

// ============================================
// SHARED EMAIL COMPONENTS
// ============================================

function dotSpan(color) {
  return '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + color + ';margin-right:6px;vertical-align:middle;"></span>';
}

function buildGreeting(teacher) {
  return '<p>Hi ' + String(teacher.firstName || '') + ',</p>';
}

function buildMetricsTable(teacher, metricsArray) {
  if (!metricsArray || metricsArray.length === 0) {
    // v2.4.0: clearer "no data" message — distinguishes upstream-data-gap from
    // a name-mismatch issue. If a teacher exists in the roster but has no row
    // in "All Teacher Metrics" for the selected week, the cause is one of:
    //   (a) UPSTREAM: teacher not assigned as advisor in source SIS (e.g. JCSD
    //       alpha_student.advisor) -- contact data team to update the SIS.
    //   (b) ROSTER MISMATCH: teacher name spelled differently in roster vs
    //       BigQuery -- usually fixed by adding a NAME_ALIASES entry in Code.gs.
    //   (c) PIPELINE NOT RUN: data pipeline hasn't run yet for this week.
    return '<div style="background-color:#fff3cd;padding:10px;border-radius:6px;border:1px solid #ffe699;margin:8px 0;">'
      + '<p style="margin:0;"><em>No metrics rows found for this teacher for the selected week.</em></p>'
      + '<p style="margin:4px 0 0 0;font-size:12px;color:#666;">'
      + '<strong>Diagnostic:</strong> Run <strong>Email Tools &gt; Debug: Check Teacher Names</strong> '
      + 'to compare this teacher\'s roster spelling against the metrics tab. '
      + 'If the metrics tab has the teacher under a slightly different name (typo, hyphen, middle name), '
      + 'ask Khiem to add a NAME_ALIASES entry in Code.gs. If the teacher is genuinely missing '
      + 'from the metrics tab, they\'re missing from BigQuery for this week (escalate to data team).'
      + '</p></div>';
  }
  var html = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;text-align:center;font-family:Arial,sans-serif;width:100%;max-width:640px;">';
  html += '<tr style="background-color:#f3f3f3;"><th style="padding:8px;">Teacher</th><th style="padding:8px;">Grade</th><th style="padding:8px;">Avg Active Days</th><th style="padding:8px;">Avg Minutes</th><th style="padding:8px;">Avg Lessons/Student</th></tr>';
  for (var i = 0; i < metricsArray.length; i++) {
    var m = metricsArray[i];
    var activeDays = Number(m.activeDays || 0);
    var avgMins = Number(m.avgMins || 0);
    var avgLessons = Number(m.avgLessons || 0);
    // v2.6.0: thresholds extracted to CONFIG.THRESHOLDS.
    var daysColor = activeDays >= CONFIG.THRESHOLDS.ACTIVE_DAYS_GREEN ? '#d9ead3' :
                    (activeDays >= CONFIG.THRESHOLDS.ACTIVE_DAYS_YELLOW ? '#fff2cc' : '#f4cccc');
    var minsColor = avgMins >= CONFIG.THRESHOLDS.AVG_MINS_GREEN ? '#d9ead3' :
                    (avgMins >= CONFIG.THRESHOLDS.AVG_MINS_YELLOW ? '#fff2cc' : '#f4cccc');
    html += '<tr>';
    html += '<td style="padding:8px;">' + String(teacher.name || '') + '</td>';
    html += '<td style="padding:8px;">' + String(m.grade || '') + '</td>';
    html += '<td style="padding:8px;background-color:' + daysColor + ';">' + activeDays.toFixed(1) + '</td>';
    html += '<td style="padding:8px;background-color:' + minsColor + ';">' + avgMins.toFixed(1) + '</td>';
    html += '<td style="padding:8px;">' + avgLessons.toFixed(1) + '</td>';
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

function buildColorLegend() {
  var html = '<p><strong>Average Active Days:</strong> ';
  html += dotSpan('#2e7d32') + '<span style="color:#2e7d32;font-weight:bold;">Green 4+</span> &nbsp; ';
  html += dotSpan('#DAA520') + '<span style="color:#DAA520;font-weight:bold;">Yellow 3</span> &nbsp; ';
  html += dotSpan('#c62828') + '<span style="color:#c62828;font-weight:bold;">Red 1-2</span></p>';
  html += '<p><strong>Key metrics:</strong> Average mastered lessons, active days, Daily logins, Average minutes</p>';
  return html;
}

function getOverallTrendColor(metricsArray) {
  if (!metricsArray || metricsArray.length === 0) return 'red';
  var totalActiveDays = 0;
  for (var i = 0; i < metricsArray.length; i++) {
    totalActiveDays += parseFloat(metricsArray[i].activeDays) || 0;
  }
  var avg = totalActiveDays / metricsArray.length;
  if (avg >= CONFIG.THRESHOLDS.ACTIVE_DAYS_GREEN) return 'green';
  if (avg >= CONFIG.THRESHOLDS.ACTIVE_DAYS_YELLOW) return 'yellow';
  return 'red';
}

function buildTrendAlert(metricsArray) {
  var trendColor = getOverallTrendColor(metricsArray);
  var trendMessages = {
    green: 'Great work! Your students are on track and meeting their goals.',
    yellow: "You're close -- schedule at least 35 minutes daily so students can meet their goals.",
    red: "Your class isn't meeting time goals yet -- students need 35 minutes daily in Motivention."
  };
  var trendDotColors = { green: '#2e7d32', yellow: '#DAA520', red: '#c62828' };
  var trendBgColors = { green: '#d9ead3', yellow: '#fff2cc', red: '#f4cccc' };
  var trendBorderColors = { green: '#b6d7a8', yellow: '#ffe599', red: '#ea9999' };

  var html = '<div style="background-color:' + trendBgColors[trendColor] + ';padding:12px;border-radius:6px;margin:12px 0;border:1px solid ' + trendBorderColors[trendColor] + ';">';
  html += '<p style="margin:0 0 8px 0;">' + dotSpan(trendDotColors[trendColor]) + '<strong>Current trend:</strong> ' + trendMessages[trendColor] + '</p>';
  html += '<p style="margin:0 0 8px 0;">Students are expected to engage every day or until weekly goals are met.</p>';
  html += '<p style="margin:0;">Participation is monitored at the school, district, and state levels.</p>';
  html += '</div>';
  return html;
}

function buildWinnersHtml(winnersArray) {
  if (!winnersArray || winnersArray.length === 0) {
    return '<p style="color:#666;font-style:italic;">No student achievement data available for this period.</p>';
  }

  var categories = {};
  var sortOrders = {};
  for (var i = 0; i < winnersArray.length; i++) {
    var w = winnersArray[i];
    if (!categories[w.category]) {
      categories[w.category] = { every: '', some: '' };
      sortOrders[w.category] = w.sortOrder;
    }
    if (w.frequency === 'frequent') {
      categories[w.category].every = w.studentNames;
    } else {
      categories[w.category].some = w.studentNames;
    }
  }

  var catNames = Object.keys(categories);
  catNames.sort(function(a, b) { return (sortOrders[a] || 99) - (sortOrders[b] || 99); });

  var smallDot = function(c) { return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + c + ';margin-right:4px;vertical-align:middle;"></span>'; };
  var catIcons = {
    'Grade Level Mastered': smallDot('#FFD700'),
    '10+ Lessons/Week': smallDot('#2e7d32'),
    '5+ Lessons/Week': smallDot('#66bb6a'),
    'Resilience (Fail then Pass)': smallDot('#1565c0'),
    '125+ Minutes': smallDot('#FFD700'),
    '100+ Minutes': smallDot('#ef6c00'),
    '4.5+ Active Days': smallDot('#c62828'),
    '4+ Active Days': smallDot('#e57373')
  };

  var html = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;width:100%;max-width:560px;font-size:13px;">';
  html += '<tr style="background-color:#1a1a1a;color:#fff;">';
  html += '<th style="padding:8px;text-align:left;">Category</th>';
  html += '<th style="padding:8px;text-align:left;">3+ Weeks</th>';
  html += '<th style="padding:8px;text-align:left;">1-2 Times in 6 Weeks</th>';
  html += '</tr>';

  for (var j = 0; j < catNames.length; j++) {
    var cat = catNames[j];
    var data = categories[cat];
    var icon = catIcons[cat] || '';
    var bgColor = j % 2 === 0 ? '#f9f9f9' : '#ffffff';
    html += '<tr style="background-color:' + bgColor + ';">';
    html += '<td style="padding:6px 8px;font-weight:bold;white-space:nowrap;">' + icon + ' ' + cat + '</td>';
    html += '<td style="padding:6px 8px;">' + (data.every || '--') + '</td>';
    html += '<td style="padding:6px 8px;">' + (data.some || '--') + '</td>';
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

function buildResourcesSection(links) {
  var html = '<h3 style="color:#1a1a1a;">Resources</h3>';
  html += '<ol style="padding-left:20px;">';
  html += '<li><strong>Teacher Data Deep Dive</strong> (Attached)</li>';
  if (links && links.length > 0) {
    for (var i = 0; i < links.length; i++) {
      html += '<li>' + links[i] + '</li>';
    }
  }
  html += '<li><strong>Pomodoro Timer:</strong> <a href="https://studient.com/customer-portal">studient.com/customer-portal</a></li>';
  html += '<li><strong>Goal Tracker Sheet:</strong> <a href="https://drive.google.com/file/d/1aA963Hk-r4WJ3OEEa2GLTEPwerRZOAQ8/view?usp=drive_link">ELA Weekly Tracker</a>; <a href="https://drive.google.com/file/d/1alli2qWNmgNfWV5rXAGQXAtE7InQE2LR/view?usp=drive_link">Math Weekly Tracker</a></li>';
  html += '</ol>';
  return html;
}

/**
 * v2.6.5: SC Final Email — "Classroom Data Highlight Reel" 1-row table.
 * Three metrics: Total Minutes / Total Lessons Mastered / Total Grade Levels Mastered.
 * Renders dashes if `totals` missing.
 */
function buildYearHighlightReel(totals) {
  var fmtNum = function(n) {
    if (n == null || isNaN(n)) return '--';
    return Math.round(n).toLocaleString('en-US');
  };
  var totalMinutes = totals ? totals.totalMinutes : null;
  var totalLessons = totals ? totals.totalLessons : null;
  var totalGradeLevels = totals ? totals.totalGradeLevels : null;
  var html = '<h3 style="color:#1a1a1a;margin-bottom:8px;">Classroom Data Highlight Reel</h3>';
  html += '<table border="1" cellpadding="10" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;width:100%;max-width:560px;font-size:14px;">';
  html += '<tr style="background-color:#1a1a1a;color:#fff;">';
  html += '<th style="padding:8px;text-align:center;">Total Minutes</th>';
  html += '<th style="padding:8px;text-align:center;">Total Lessons Mastered</th>';
  html += '<th style="padding:8px;text-align:center;">Total Grade Levels Mastered</th>';
  html += '</tr>';
  html += '<tr style="background-color:#f9f9f9;">';
  html += '<td style="padding:10px;text-align:center;font-size:18px;font-weight:bold;">' + fmtNum(totalMinutes) + '</td>';
  html += '<td style="padding:10px;text-align:center;font-size:18px;font-weight:bold;">' + fmtNum(totalLessons) + '</td>';
  html += '<td style="padding:10px;text-align:center;font-size:18px;font-weight:bold;">' + fmtNum(totalGradeLevels) + '</td>';
  html += '</tr>';
  html += '</table>';
  return html;
}

/**
 * v2.6.5: SC Final Email — 2 KPI cards: Avg Mastered Lessons/Student + Avg Mastered Grades/Student.
 * Renders dashes if `totals` missing.
 */
function buildYearKpiStrip(totals) {
  var fmtAvg = function(n) {
    if (n == null || isNaN(n)) return '--';
    return (Math.round(n * 10) / 10).toFixed(1);
  };
  var avgLessons = totals ? totals.avgLessons : null;
  var avgGradeLevels = totals ? totals.avgGradeLevels : null;
  var html = '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:560px;margin-top:8px;">';
  html += '<tr>';
  html += '<td style="width:50%;padding:6px;">';
  html += '<div style="background-color:#e8f5e9;border:1px solid #c8e6c9;border-radius:6px;padding:14px;text-align:center;">';
  html += '<div style="font-size:13px;color:#1a1a1a;font-weight:bold;">Avg Mastered Lessons / Student</div>';
  html += '<div style="font-size:24px;font-weight:bold;color:#2e7d32;margin-top:4px;">' + fmtAvg(avgLessons) + '</div>';
  html += '</div>';
  html += '</td>';
  html += '<td style="width:50%;padding:6px;">';
  html += '<div style="background-color:#e3f2fd;border:1px solid #bbdefb;border-radius:6px;padding:14px;text-align:center;">';
  html += '<div style="font-size:13px;color:#1a1a1a;font-weight:bold;">Avg Mastered Grades / Student</div>';
  html += '<div style="font-size:24px;font-weight:bold;color:#1565c0;margin-top:4px;">' + fmtAvg(avgGradeLevels) + '</div>';
  html += '</div>';
  html += '</td>';
  html += '</tr>';
  html += '</table>';
  return html;
}

/**
 * v2.6.5: SC Final Email — 2 student spotlight cards.
 * `highlights` is the per-teacher array from getStudentYearHighlights.
 * Narrative templates by leading_metric:
 *   'grade_levels': "<student> mastered <N> grade levels this year, showing exceptional growth through Motivention."
 *   'lessons':     "<student> worked diligently to master <N> lessons this year, leading the class."
 */
function buildStudentSpotlights(highlights) {
  var html = '<h3 style="color:#1a1a1a;margin-top:18px;margin-bottom:8px;">Student Spotlights</h3>';
  if (!highlights || highlights.length === 0) {
    html += '<p style="color:#666;font-style:italic;">Top student highlights are still being calculated for this period.</p>';
    return html;
  }
  var renderNarrative = function(h) {
    var name = h.studentName || 'A standout student';
    if (h.leadingMetric === 'grade_levels') {
      // v2.6.7: drop subject mention per user direction; spotlight is
      // student-level total grade_levels across all subjects.
      var n = Math.round(h.cumulativeGradeLevels || 0);
      return name + ' mastered ' + n + ' grade level' + (n === 1 ? '' : 's') +
             ' this year, showing exceptional growth through Motivention.';
    }
    // default: lessons
    var l = Math.round(h.cumulativeLessons || 0);
    return name + ' worked diligently to master ' + l + ' lesson' + (l === 1 ? '' : 's') +
           ' this year, leading the class.';
  };
  html += '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:560px;">';
  html += '<tr>';
  for (var i = 0; i < Math.min(2, highlights.length); i++) {
    var bg = i === 0 ? '#fff8e1' : '#fce4ec';
    var border = i === 0 ? '#ffd54f' : '#f8bbd0';
    html += '<td style="width:50%;padding:6px;vertical-align:top;">';
    html += '<div style="background-color:' + bg + ';border:1px solid ' + border + ';border-radius:6px;padding:14px;">';
    html += '<div style="font-size:12px;font-weight:bold;color:#1a1a1a;letter-spacing:0.5px;">SPOTLIGHT ' + (i + 1) + '</div>';
    html += '<p style="margin:8px 0 0 0;font-size:14px;line-height:1.4;">' + renderNarrative(highlights[i]) + '</p>';
    html += '</div>';
    html += '</td>';
  }
  // Pad if only 1 highlight
  if (highlights.length === 1) {
    html += '<td style="width:50%;padding:6px;"></td>';
  }
  html += '</tr>';
  html += '</table>';
  return html;
}

/**
 * v2.8.0: Spring 2026 MAP Scores - 4-column table per teacher
 * (Student Name | Subject | Winter Score | Spring Score).
 * Missing scores render as "--" so students with only one window tested
 * still appear. Empty rows array shows a friendly fallback callout.
 *
 * @param {Array<{studentName, subject, winterRit, springRit}>} rows
 * @return {string} HTML table fragment.
 */
function buildMapScoresTable(rows) {
  if (!rows || rows.length === 0) {
    return '<div style="background-color:#fff3cd;padding:12px;border-radius:6px;border:1px solid #ffe082;margin:12px 0;">'
      + '<p style="margin:0;">No MAP score data found for your students yet. Scores will populate here automatically as they are ingested.</p>'
      + '</div>';
  }
  var html = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;text-align:center;font-family:Arial,sans-serif;width:100%;max-width:760px;margin:12px 0;">';
  html += '<tr style="background-color:#f3f3f3;font-weight:bold;">'
    + '<th style="padding:8px;">Student Name</th>'
    + '<th style="padding:8px;">Subject</th>'
    + '<th style="padding:8px;">Winter Score</th>'
    + '<th style="padding:8px;">Spring Score</th>'
    + '<th style="padding:8px;">Projected Growth</th>'
    + '<th style="padding:8px;">X Growth</th>'
    + '</tr>';
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var wMissing = (r.winterRit === null || r.winterRit === undefined || r.winterRit === '');
    var sMissing = (r.springRit === null || r.springRit === undefined || r.springRit === '');
    var pMissing = (r.projectedGrowth === null || r.projectedGrowth === undefined || r.projectedGrowth === '');
    var oMissing = (r.observedGrowth === null || r.observedGrowth === undefined || r.observedGrowth === '');
    var winter = wMissing ? '--' : r.winterRit;
    var spring = sMissing ? '--' : r.springRit;
    var projDisplay = pMissing ? '--' : Number(r.projectedGrowth).toFixed(1);
    // v2.9.0: X Growth = observed / max(projected, 1), 2-decimal rounded.
    // Floor-at-1 rule matches parent sheets_builder._compute_x_growth (v3.43.7).
    var xGrowth = null;
    var xDisplay = '--';
    if (!oMissing) {
      var projFloor = pMissing ? 1 : Math.max(Number(r.projectedGrowth), 1);
      xGrowth = Number(r.observedGrowth) / projFloor;
      xDisplay = xGrowth.toFixed(2);
    }
    // v2.9.1: 5-band row color by X Growth (boundary at -2 is inclusive of dark red).
    //   X >= 2.0      -> darker green   #6aa84f
    //   1.5 <= X < 2  -> medium green   #93c47d
    //   0 < X < 1.5   -> very light gn  #d9ead3
    //   -2 < X <= 0   -> very light red #f4cccc
    //   X <= -2       -> dark red       #cc0000
    //   X uncomputable (observed missing) -> white  #ffffff
    var bg = '#ffffff';
    if (xGrowth !== null) {
      if (xGrowth >= 2.0) bg = '#6aa84f';
      else if (xGrowth >= 1.5) bg = '#93c47d';
      else if (xGrowth > 0) bg = '#d9ead3';
      else if (xGrowth > -2.0) bg = '#f4cccc';
      else bg = '#cc0000';
    }
    html += '<tr style="background-color:' + bg + ';">'
      + '<td style="padding:6px;">' + (r.studentName || '') + '</td>'
      + '<td style="padding:6px;">' + (r.subject || '') + '</td>'
      + '<td style="padding:6px;">' + winter + '</td>'
      + '<td style="padding:6px;">' + spring + '</td>'
      + '<td style="padding:6px;">' + projDisplay + '</td>'
      + '<td style="padding:6px;">' + xDisplay + '</td>'
      + '</tr>';
  }
  html += '</table>';
  return html;
}

function buildWeeklyChallenge(challengeText, reflectionText) {
  var html = '<div style="padding:15px;border-radius:5px;margin-top:20px;">';
  html += '<h3 style="margin-top:0;">Weekly Challenge</h3>';
  html += '<p>' + (challengeText || "Increase your class's daily log ins, minutes, or lessons mastered to share as a class challenge.") + '</p>';
  html += '<h3>Reflection Prompt:</h3>';
  html += '<p>' + (reflectionText || 'What will you tweak for this coming week?') + '</p>';
  html += '</div>';
  return html;
}

/**
 * Wraps content sections into the standard email container.
 */
function wrapEmailHtml(sections) {
  return '<meta charset="utf-8"><div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6;color:#333;">'
    + sections.join('')
    + '</div>';
}


// ============================================
// TEMPLATE FUNCTIONS
// ============================================
// Each returns the full HTML email body.
// Week 6 is the reference implementation; others are skeletons
// that will be filled with content from the Google Doc.

// --- WEEK 0: Map Data ---
function generateWeek0Body(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),

    '<h2 style="color:#1a1a1a;">Map Data From Motivention</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    buildColorLegend(),
    buildTrendAlert(metricsArray),

    '<h2 style="color:#1a1a1a;">Weekly Focus: Review and familiarize yourself with individual MAP data</h2>',
    '<p>This data will serve as each student\'s baseline within Motivention.</p>',
    '<p>' + dotSpan('#1565c0') + '<strong>Placement Note:</strong> Students are placed 2-3 grade levels below their baseline to ensure they can demonstrate mastery before advancing. Many students may start at Kindergarten level, and that is intentional to build confidence and momentum.</p>',

    '<h3 style="color:#1a1a1a;">Your Actions This Week:</h3>',
    '<p>' + dotSpan('#2e7d32') + '<strong>Ground Yourself:</strong> Access and familiarize yourself with each student\'s MAP baseline data.</p>',
    '<p>' + dotSpan('#1565c0') + '<strong>Identify What Matters:</strong> Note key strengths and areas of need that may influence how students engage in the classroom and while accessing Motivention.</p>',
    '<p>' + dotSpan('#ef6c00') + '<strong>Coach From Evidence:</strong> Keep baseline data accessible as you coach and monitor growth.</p>',

    '<h3 style="color:#1a1a1a;">Student MAP Scores</h3>',
    '<p><a href="https://docs.google.com/spreadsheets/d/1PWBHLO5DzQAAJp2vajf16n6wb9XCPwB53URuoKT4xJw/edit?gid=1538111350#gid=1538111350">View MAP Scores Spreadsheet</a></p>',

    buildResourcesSection([]),
    buildWeeklyChallenge(
      'Review your MAP baseline data and identify one student who may need extra support this week.',
      'What patterns do you notice in your students\' baseline data?'
    )
  ]);
}

// --- WEEK 1: Goals & Monitoring ---
function generateWeek1Body(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),

    '<h2 style="color:#1a1a1a;">Your Weekly Data</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    '<p>___ Tests Mastered (90+) &nbsp;&nbsp; ___ Tests Attempted</p>',
    '<p>Next week we will share % of your students who logged in everyday.</p>',
    '<p><strong>Data Deep Dive attached. Be sure to award points in LiveSchool!</strong></p>',

    '<h2 style="color:#1a1a1a;">Weekly Focus -- Start</h2>',
    '<p>Anchor the block with clear goals and active monitoring. Review systems with this week\'s AIM Launches.</p>',

    '<h3 style="color:#1a1a1a;">Why It Matters</h3>',
    '<p>Students need a specific target to aim for, and your presence ensures they stay on the path. Active monitoring prevents "fake working" and aimlessness.</p>',

    '<h3 style="color:#1a1a1a;">Your Actions This Week:</h3>',
    '<p>' + dotSpan('#2e7d32') + '<strong>The Doorway Greeting:</strong> Greet every student by name. Before they log in, prompt them to write down a specific target on their goal sheet. (e.g., "Complete 2 lessons")</p>',

    '<p>' + dotSpan('#1565c0') + '<strong>Tests or Lessons?</strong><br>'
      + 'Complete any tests in Reading or Language first.<br>'
      + 'Lessons are listed under Language.<br>'
      + '<em>Lessons Pro Tip:</em> After students log in with the lesson key, return to the dashboard and click the lesson to ensure they receive credit.</p>',

    '<p>' + dotSpan('#ef6c00') + '<strong>Walk the Room:</strong> Don\'t sit. Circulate to check screens. Use subtle cues (a tap on the desk, thumbs up, sticky note, etc.) to redirect focus -- Avoid Public Call Outs.</p>',

    buildResourcesSection([
      '<strong>AIM Launches for this week</strong>',
      '<strong>Goal Setting Sheet</strong>',
      '<strong>Your Teacher Dash:</strong> Here you can see what students see. Log in with your email and the password <code>Iloveschool1!</code>'
    ]),
    buildWeeklyChallenge(
      'Ensure every student _____ this week.',
      'Did your class meet the _____ goal last week?'
    )
  ]);
}

// --- WEEK 2: Tech Hygiene & Student Ownership ---
function generateWeek2Body(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),

    '<h2 style="color:#1a1a1a;">% of Students Logged In Everyday</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    '<p><strong>Color Key:</strong> '
      + dotSpan('#2e7d32') + '<span style="color:#2e7d32;font-weight:bold;">Green 85%+</span> &nbsp; '
      + dotSpan('#DAA520') + '<span style="color:#DAA520;font-weight:bold;">Yellow 75-84%</span> &nbsp; '
      + dotSpan('#c62828') + '<span style="color:#c62828;font-weight:bold;">Red &lt;75%</span></p>',
    '<p>Students are expected to engage in Motivention for the full scheduled time each day or until they meet their weekly goals. Participation data is reviewed at the school, district, and state levels.</p>',
    '<p><strong>This next week, ensure all students log in daily and work toward their goals.</strong></p>',
    '<p>Data Deep Dive: Daily log ins, # tests mastered, # Lessons Mastered (Attached)</p>',

    '<h2 style="color:#1a1a1a;">Weekly Focus -- Start</h2>',
    '<p>Build two habits: stable tech routines and students who understand their own data.</p>',

    '<h3 style="color:#1a1a1a;">Why It Matters</h3>',
    '<p>Glitches quickly drain motivation. And when students don\'t understand their dashboard, they can\'t adjust their effort.</p>',
    '<p>A quick Dash check throughout the session gives them instant, objective feedback. Starting the day by reviewing their Daily Dash helps students set goals that match their actual progress.</p>',

    '<h3 style="color:#1a1a1a;">Your Actions This Week:</h3>',
    '<p>' + dotSpan('#2e7d32') + '<strong>Verify the Path:</strong> Make sure students can navigate directly to their Required Learning page so they never need to ask, "What should I do next?". Tests always come first. After logging in iXL, students should go back to Dash and select the lesson to ensure they are in the correct lesson.</p>',

    '<p>' + dotSpan('#1565c0') + '<strong>Use the Path (Quick Dash Check):</strong><br>'
      + 'Near the end of class, check the Dash with students in two steps:<br>'
      + '1. On the Required Learning Page, do they have at least two lessons crossed off?<br>'
      + '2. On their Dash > My Daily Activity, check the Daily Learning section.<br><br>'
      + 'Ask:<br>'
      + '- Did you meet your minimum accuracy goal? (Is the blue ring closed at 80%?)<br>'
      + '- Did you meet your working time goal? (Is the red ring closed at 25 minutes?)<br><br>'
      + '<em>Pro Tip: Data is most accurate the following morning.</em></p>',

    '<p>' + dotSpan('#ef6c00') + '<strong>Teach the "Green Outline" for Goal Setting:</strong> A subject box outlined in green means the student met their daily goals. Any day a student takes a test or meets their goals will appear green. Have students check My Daily Activity from the previous day to find the Green Outline. Use those updated rings to help them set today\'s goal.</p>',

    '<p>' + dotSpan('#c62828') + '<strong>The Restart Routine:</strong> Remind students to fully close Chrome (not just tabs) and fully shut down their device daily to keep tech running smoothly.</p>',

    buildResourcesSection([
      '<strong>This Week\'s AIM Launches</strong>',
      '<strong>Share teacher Dash Login Details</strong>',
      'Something Wonky (i.e. a student is missing a key, a test or lessons didn\'t populate, etc.)? <a href="https://studient.com/customer-portal">Submit a ticket here</a>'
    ]),
    buildWeeklyChallenge(
      'Ensure every student logs in daily this week.',
      'What will you tweak for this coming week to meet this week\'s goal?'
    )
  ]);
}

// --- WEEK 3: The Art of Micro-Coaching ---
function generateWeek3Body(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),

    '<h2 style="color:#1a1a1a;">% of Students Logged In Everyday</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    '<p><strong>Color Key:</strong> '
      + dotSpan('#2e7d32') + '<span style="color:#2e7d32;font-weight:bold;">Green 85%+</span> &nbsp; '
      + dotSpan('#DAA520') + '<span style="color:#DAA520;font-weight:bold;">Yellow 75-84%</span> &nbsp; '
      + dotSpan('#c62828') + '<span style="color:#c62828;font-weight:bold;">Red &lt;75%</span></p>',
    '<p>Students are expected to engage in Motivention daily until they meet their weekly goals. Participation data is reviewed at the school, district, and state levels.</p>',
    '<p>Data Deep Dive: Daily log ins, # tests mastered, # Lessons Mastered (Attached)</p>',

    '<h2 style="color:#1a1a1a;">Weekly Focus</h2>',
    '<p>Executing 2-4 minute 1:1 check-ins and managing frustration.</p>',

    '<h3 style="color:#1a1a1a;">Why It Matters</h3>',
    '<p>Students need to know you are "on the sidelines calling the plays." Catching frustration early prevents full shutdown.</p>',

    '<h3 style="color:#1a1a1a;">Your Actions This Week:</h3>',
    '<p>' + dotSpan('#2e7d32') + '<strong>Track the "Big 3":</strong> Keep your Coach Dashboard open. Scan for Time-on-task, Accuracy, and Goal Progress.</p>',

    '<p>' + dotSpan('#1565c0') + '<strong>Ask, Don\'t Tell:</strong> When a student is stuck, avoid giving the answer. Ask: "What strategy could you try here?" or "Where have you seen a problem like this before?"</p>',

    '<p>' + dotSpan('#ef6c00') + '<strong>Spot Frustration:</strong> Look for rapid clicking, long periods of inaction, or slumped posture. Intervene immediately -- not to rescue, but to support.</p>',

    '<p>' + dotSpan('#c62828') + '<strong>Reframe Negative Talk:</strong> If a student says, "I\'m bad at math," interrupt the narrative. Highlight their effort: "You didn\'t give up; you tried a new way."</p>',

    buildResourcesSection([
      '<strong>Growth Mindset AIM Launches for this week!</strong>'
    ]),
    buildWeeklyChallenge(
      'Ensure every student _____ this week.',
      'What will you tweak for this coming week to meet ______?'
    )
  ]);
}

// --- WEEK 4: Diagnosing Habits with Data ---
function generateWeek4Body(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),

    '<h2 style="color:#1a1a1a;">Average Active Days in Motivention</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    buildColorLegend(),
    '<p><strong>Current trend:</strong> Many students are logging in only half of the expected days rather than daily.</p>',
    '<p>Students are expected to engage every day or until weekly goals are met. Participation is monitored at the school, district, and state levels.</p>',
    '<p><strong>Key metrics:</strong> Average active days, Daily logins, Average minutes</p>',
    '<p>Data Deep Dive attached.</p>',

    '<div style="background-color:#fff2cc;padding:12px;border-radius:6px;margin:12px 0;border:1px solid #ffe599;">',
    '<p style="margin:0;"><strong>Implementation Note:</strong> Improved student outcomes are directly tied to implementation fidelity. Daily usage and consistent routines are essential to achieving expected growth.</p>',
    '</div>',

    '<h2 style="color:#1a1a1a;">Weekly Focus -- Mental Effort</h2>',
    '<p>Using data, identify one specific blocker per student using the 3 Lenses.</p>',

    '<h3 style="color:#1a1a1a;">Why It Matters</h3>',
    '<p>Sometimes effort is misplaced. The system shows the exact habit holding a student back (e.g., skipping explanations).</p>',

    '<h3 style="color:#1a1a1a;">Your Actions This Week -- Dashboard Data Dive:</h3>',
    '<p>' + dotSpan('#2e7d32') + '<strong>How Many Green Days?</strong> Check the rings for a quick check in: Number of Mastered Lessons, Accuracy, Time.</p>',

    '<p>' + dotSpan('#1565c0') + '<strong>Look for the Blue Coaching Flags:</strong> Open the Daily Dashboard tab in your teacher view with the student. Scan for coaching flags, open to see the feedback (e.g., "Ignoring Explanations" or "Rushing"). <em>Note: These do not appear every day.</em></p>',

    '<p>' + dotSpan('#ef6c00') + '<strong>Coach the Fix:</strong> Give a precise correction: "The data shows you are skipping explanations after wrong answers. Be sure to read them before moving on."</p>',

    '<p>' + dotSpan('#c62828') + '<strong>Use the 3 Lenses:</strong> AI Data -- Are they spinning their wheels? Trackers -- Are they honest? Points -- Do they need momentum?</p>',

    buildResourcesSection([
      '<strong>AIM Launches (Next 3 weeks) -- For short week combine Mon & Tues:</strong><br>'
        + '<a href="https://www.canva.com/design/DAHDeEQyjI0/UESk6Vp4GScPIiS7Xjdhfw/view?utm_content=DAHDeEQyjI0&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=he8b086611c">Week 3 - Growth Mindset - Beginner\'s Brain</a><br>'
        + '<a href="https://www.canva.com/design/DAHDjdCSoBE/ZhB3f6k-dMvNMQ9QtNT0iA/view?utm_content=DAHDjdCSoBE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd9e0f0c72b">Week 4 - Growth Mindset - The Power of Yet</a><br>'
        + '<a href="https://www.canva.com/design/DAHDyS0iyd8/cMK174HeOxUmagRJvojT6Q/view?utm_content=DAHDyS0iyd8&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h3e9c4fa347">Week 5 - Growth Mindset - Cognitive Reframing</a>'
    ]),
    buildWeeklyChallenge(
      'Ensure every student _____ this week.',
      'Last week\'s goal result: ______ What will you change this week to hit ______?'
    )
  ]);
}

// --- WEEK 5: Re-Engagement & Resets ---
function generateWeek5Body(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),

    '<h2 style="color:#1a1a1a;">Average Active Days in Motivention</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    buildColorLegend(),
    buildTrendAlert(metricsArray),

    '<h2 style="color:#1a1a1a;">Weekly Focus: Mental Focus & Persistence</h2>',
    '<p>Use quick resets and short plans to bring disengaged students back into learning.</p>',

    '<h3 style="color:#1a1a1a;">Why It Matters</h3>',
    '<p>When students disengage, it\'s often because they feel overwhelmed. A brief reset during class or a short-term plan can help them regain focus and rebuild confidence.</p>',

    '<h3 style="color:#1a1a1a;">Your Actions This Week:</h3>',
    '<p>' + dotSpan('#2e7d32') + '<strong>Mid-Block Breath:</strong> If a student begins to shut down or spiral, pause the moment. Ask them to take a breath and reset. Then shrink the goal for the next 5-10 minutes so they can experience quick success.<br><br>'
      + '<em>What if the whole class is shifting focus?</em> Have everyone "Pacman" their devices, stand, stretch, take three deep breaths, and shake it out before diving back in.</p>',

    '<p>' + dotSpan('#1565c0') + '<strong>Doom Loop Reset:</strong> If a student keeps attempting the same test without progress, try one of these coaching moves to break the cycle before their next retest.</p>',

    '<p>' + dotSpan('#ef6c00') + '<strong>The Reset Conference:</strong> If a student has been disengaged for two days, schedule a quick 3-minute check-in.<br>'
      + 'Try asking: "I\'ve noticed the last few days have been challenging. What\'s getting in the way?"<br>'
      + 'Create a Reset Goal for the next two class blocks. Keep it small and achievable. Consider offering a small mystery reward if they reach it.</p>',

    buildResourcesSection([
      '<strong>AIM Launches (Next 3 weeks):</strong><br>'
        + '<a href="https://www.canva.com/design/DAHDyS0iyd8/cMK174HeOxUmagRJvojT6Q/view?utm_content=DAHDyS0iyd8&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h3e9c4fa347">Week 5 - Growth Mindset - Cognitive Reframing</a><br>'
        + '<a href="https://www.canva.com/design/DAHD3NLIJ9k/SK2vLZcgFXR-T3o1i539Rw/view?utm_content=DAHD3NLIJ9k&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hffe456c812">Week 6 - Growth Mindset - Productive Struggle</a><br>'
        + '<a href="https://www.canva.com/design/DAHENc2sjwE/UzInFMp3qcfF3zzNUzqPEg/view?utm_content=DAHENc2sjwE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hfe0b04f9e7">Week 7 - Growth Mindset - Celebrating Effort</a>'
    ]),
    buildWeeklyChallenge(
      'Increase your class\'s daily log ins, minutes, or lessons mastered to share as a class challenge.',
      'What will you tweak for this coming week?'
    )
  ]);
}

// --- WEEK 6: Culture, Shoutouts & Rewards (FULL IMPLEMENTATION) ---
function generateWeek6Body(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),

    '<h2 style="color:#1a1a1a;">Average Active Days in Motivention</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    buildColorLegend(),
    buildTrendAlert(metricsArray),

    // Weekly Focus: Persistence
    '<h2 style="color:#1a1a1a;">Weekly Focus -- Persistence</h2>',
    '<p>Use recognition and PBIS to build visible momentum.</p>',

    '<h3 style="color:#1a1a1a;">Why It Matters</h3>',
    '<p>Culture drives behavior. When students see growth celebrated and effort rewarded, classroom norms rise.</p>',

    '<h3 style="color:#1a1a1a;">Your Actions This Week:</h3>',
    '<p>' + dotSpan('#2e7d32') + '<strong>Weekly Trailblazer Shoutout:</strong> Take 2 minutes to spotlight specific behaviors: consistent effort, encouraging peers, resilience under challenge.</p>',
    '<p>' + dotSpan('#1565c0') + '<strong>Narrate the Why:</strong> Don\'t give points silently -- label the behavior: "You kept going when it got hard -- that earns a point."</p>',
    '<p>' + dotSpan('#ef6c00') + '<strong>Peer Nominations:</strong> Students write "Win Cards" for peers. Public praise builds belonging.</p>',

    // Student Achievement Awards (Week 6 only)
    '<h3 style="color:#1a1a1a;">Student Achievement Awards (Last 6 Weeks)</h3>',
    buildWinnersHtml(winnersArray),

    // Resources with AIM Launch links
    buildResourcesSection([
      '<strong>AIM Launches (Next 3 weeks):</strong><br>' +
      '<a href="https://www.canva.com/design/DAHD3NLIJ9k/SK2vLZcgFXR-T3o1i539Rw/view?utm_content=DAHD3NLIJ9k&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hffe456c812">Week 6 - Growth Mindset - Productive Struggle</a><br>' +
      '<a href="https://www.canva.com/design/DAHENc2sjwE/UzInFMp3qcfF3zzNUzqPEg/view?utm_content=DAHENc2sjwE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hfe0b04f9e7">Week 7 - Growth Mindset - Celebrating Effort</a><br>' +
      '<a href="https://www.canva.com/design/DAHEUib_nsU/uKxIbPC2qH5KKoXDUWXElQ/view?utm_content=DAHEUib_nsU&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd496d310e1">Week 8 - Growth Mindset - Curiosity</a>'
    ]),
    buildWeeklyChallenge(
      "Increase your class's daily log ins, minutes, or lessons mastered to share as a class challenge.",
      'What will you tweak for this coming week?'
    )
  ]);
}

// --- WEEK 7: The "I'm Stuck" Protocol ---
function generateWeek7Body(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),

    '<h2 style="color:#1a1a1a;">Average Active Days in Motivention</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    buildColorLegend(),
    buildTrendAlert(metricsArray),

    '<h2 style="color:#1a1a1a;">Weekly Focus -- Persistence</h2>',
    '<p><strong>Persist:</strong> Students maintain focus and keep working through challenges.</p>',

    '<h3 style="color:#1a1a1a;">Why It Matters</h3>',
    '<p>When students get stuck too long, they disengage. Clear next steps help them push through instead of giving up.</p>',

    '<h3 style="color:#1a1a1a;">Your Actions This Week:</h3>',
    '<p>' + dotSpan('#2e7d32') + '<strong>Watch for Stalling</strong><br>'
      + '<em>Problem:</em> Students sit on one lesson with no progress<br>'
      + '<em>Action:</em> Identify and intervene quickly</p>',

    '<p>' + dotSpan('#1565c0') + '<strong>Give a Path Forward</strong><br>'
      + '<em>Problem:</em> Students don\'t know what to do when stuck<br>'
      + '<em>Action:</em> Prompt a choice: Try a new Toolbox strategy, or Ask for help</p>',

    '<p>' + dotSpan('#ef6c00') + '<strong>Use "I\'m Stuck"</strong><br>'
      + '<em>Problem:</em> Students stay stuck instead of taking action<br>'
      + '<em>Action:</em> Guide them through the built-in "I\'m Stuck" protocol</p>',

    buildResourcesSection([
      '<strong>AIM Launches:</strong><br>'
        + '<a href="https://www.canva.com/design/DAHENc2sjwE/UzInFMp3qcfF3zzNUzqPEg/view?utm_content=DAHENc2sjwE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hfe0b04f9e7">Week 7 - Growth Mindset - Celebrating Effort</a><br>'
        + '<a href="https://www.canva.com/design/DAHEUib_nsU/uKxIbPC2qH5KKoXDUWXElQ/view?utm_content=DAHEUib_nsU&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd496d310e1">Week 8 - Growth Mindset - Curiosity</a>'
    ]),
    buildWeeklyChallenge(
      'Ensure every student uses a strategy to move forward when stuck this week.',
      'Where did students stall last week? What will you adjust to help them persist through challenges?'
    )
  ]);
}

// --- WEEK 8: Growth Mindset Reframing ---
function generateWeek8Body(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),

    '<h2 style="color:#1a1a1a;">Average Active Days in Motivention</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    buildColorLegend(),
    buildTrendAlert(metricsArray),

    '<h2 style="color:#1a1a1a;">Weekly Focus -- Mental Effort & Focus</h2>',
    '<p><strong>Mental Effort:</strong> Students sustain effort and avoid unproductive "doom loops."</p>',

    '<h3 style="color:#1a1a1a;">Why It Matters</h3>',
    '<p>Students may shut down when work feels hard. Reframing their thinking keeps them engaged and trying.</p>',

    '<h3 style="color:#1a1a1a;">Your Actions This Week:</h3>',
    '<p>' + dotSpan('#2e7d32') + '<strong>Catch the Language</strong><br>'
      + '<em>Problem:</em> "I can\'t" leads to shutdown<br>'
      + '<em>Action:</em> Reframe: "You can\'t <em>yet</em>. What\'s the first step?"</p>',

    '<p>' + dotSpan('#c62828') + '<strong>Normalize the Struggle</strong><br>'
      + '<em>Problem:</em> Students see difficulty as failure<br>'
      + '<em>Action:</em> Reinforce: "It\'s supposed to be hard -- your brain is growing."</p>',

    '<p>' + dotSpan('#1565c0') + '<strong>Shift to Strategy</strong><br>'
      + '<em>Problem:</em> Students equate struggle with inability<br>'
      + '<em>Action:</em> Redirect: "You don\'t need to quit -- try a different strategy."</p>',

    buildResourcesSection([
      '<strong>AIM Launches:</strong><br>'
        + '<a href="https://www.canva.com/design/DAHEUib_nsU/uKxIbPC2qH5KKoXDUWXElQ/view?utm_content=DAHEUib_nsU&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd496d310e1">Week 8 - Growth Mindset - Curiosity</a>'
    ]),
    buildWeeklyChallenge(
      'Ensure every student uses positive self-talk and applies a strategy when work gets hard this week.',
      'Where did students shut down last week? What will you adjust to keep them engaged in productive effort?'
    )
  ]);
}

// --- WRAP UP: Celebrate the Wins ---
function generateWrapUpBody(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),
    '<h2 style="color:#1a1a1a;">Average Active Days in Motivention</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    buildColorLegend(),
    buildTrendAlert(metricsArray),

    '<h2 style="color:#1a1a1a;">Wrap Up -- Celebrating the Wins</h2>',
    '<p>[PLACEHOLDER: Wrap Up focus content -- paste from Google Doc]</p>',

    // Wrap Up may include winners with extended window
    '<h3 style="color:#1a1a1a;">Student Achievement Awards</h3>',
    buildWinnersHtml(winnersArray),

    buildResourcesSection([]),
    buildWeeklyChallenge(
      'Celebrate! Share your class achievements and reflect on the journey.',
      'What are you most proud of from this period?'
    )
  ]);
}

// --- 4/20 JASPER: Finishing Strong! ---
function generateJasperFinishingStrongBody(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),

    '<h2 style="color:#1a1a1a;">Average Active Days in Motivention</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    buildColorLegend(),
    buildTrendAlert(metricsArray),

    '<h2 style="color:#1a1a1a;">Weekly Focus -- Finishing Strong</h2>',
    '<p>Here are a few updates you\'ll notice in your students\' dashboards this week:</p>',

    '<p>' + dotSpan('#2e7d32') + '<strong>Reading Focus (Next 2 Weeks):</strong><br>'
      + 'We\'ll be prioritizing the Reading Block to help students build momentum and confidence. (Students will find lessons under Reading not Language)</p>',

    '<p>' + dotSpan('#1565c0') + '<strong>Personalized Reading Practice:</strong><br>'
      + 'Each student will be assigned either AlphaRead or Lalilo based on their current placement level, ensuring targeted support where they need it most.</p>',

    '<p>' + dotSpan('#ef6c00') + '<strong>Math Fluency Support:</strong><br>'
      + 'To help students strengthen math facts ahead of state testing, Fast Math is now available for all students in their dashboard. This can be an optional choice after they meet their goals, last 10 mins, or even during their math block.</p>',

    '<p>' + dotSpan('#FFD700') + '<strong>Incentivized Progress:</strong><br>'
      + 'Once students meet their reading goals, they can unlock time to practice math fluency -- keeping motivation high while reinforcing key skills.</p>',

    '<h3 style="color:#1a1a1a;">Your Actions This Week:</h3>',
    '<p>' + dotSpan('#2e7d32') + 'Help students navigate getting to lessons.</p>',
    '<p>' + dotSpan('#1565c0') + 'Coach students for mastery.</p>',

    buildResourcesSection([
      '<strong>AIM Launches:</strong><br>'
        + '<a href="https://www.canva.com/design/DAHENc2sjwE/UzInFMp3qcfF3zzNUzqPEg/view?utm_content=DAHENc2sjwE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hfe0b04f9e7">Week 7 - Growth Mindset - Celebrating Effort</a><br>'
        + '<a href="https://www.canva.com/design/DAHEUib_nsU/uKxIbPC2qH5KKoXDUWXElQ/view?utm_content=DAHEUib_nsU&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd496d310e1">Week 8 - Growth Mindset - Curiosity</a><br>'
        + '<strong>Bonus Week - Confidence - What Is Confidence?</strong> (Great for leading up to testing)'
    ]),
    buildWeeklyChallenge(
      'Help every student navigate smoothly to their assigned reading lessons this week.',
      'Which students will benefit most from the new Reading Focus, and how will you coach them toward mastery?'
    )
  ]);
}

// --- 4/20 MATH+ELA: Finishing Strong! ---
function generateMathElaFinishingStrongBody(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),

    '<h2 style="color:#1a1a1a;">Average Active Days in Motivention</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    buildColorLegend(),
    buildTrendAlert(metricsArray),

    '<h2 style="color:#1a1a1a;">Weekly Focus -- Updates & Finishing Strong</h2>',
    '<p>Updates you\'ll notice in your students\' dashboards this week:</p>',

    '<p>' + dotSpan('#2e7d32') + '<strong>Reading Focus (Next 2 Weeks):</strong><br>'
      + 'We\'re prioritizing the Reading Block to build momentum and confidence. (Lessons are under Reading -- not Language.)</p>',

    '<p>' + dotSpan('#1565c0') + '<strong>Personalized Reading Practice:</strong><br>'
      + 'Students will use AlphaRead or Lalilo based on placement -- targeting exactly what they need.</p>',

    '<p>' + dotSpan('#ef6c00') + '<strong>New Math App: Math Academy (For students placed 4th grade or higher):</strong><br>'
      + 'Students working in 4th grade+ will spend 25 minutes in Math Academy, then 10 minutes in Fast Math.</p>',

    '<p>' + dotSpan('#FFD700') + '<strong>Math Fluency Support:</strong><br>'
      + 'Fast Math is available to all students to strengthen math facts before state testing. ELA students can use it after meeting goals, in the last 10 minutes, or even during their math block.</p>',

    '<div style="background-color:#fff2cc;padding:12px;border-radius:6px;margin:12px 0;border:1px solid #ffe599;">',
    '<p style="margin:0;"><strong>Note:</strong> Math-track students below 4th grade will spend the full Motivation Block on math fluency. Let\'s lock those facts in!</p>',
    '</div>',

    '<h3 style="color:#1a1a1a;">Your Actions This Week:</h3>',
    '<p>' + dotSpan('#2e7d32') + 'Help students navigate getting to lessons.</p>',
    '<p>' + dotSpan('#1565c0') + 'Coach students for mastering lessons.</p>',

    buildResourcesSection([
      '<strong>AIM Launches:</strong><br>'
        + '<a href="https://www.canva.com/design/DAHENc2sjwE/UzInFMp3qcfF3zzNUzqPEg/view?utm_content=DAHENc2sjwE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hfe0b04f9e7">Week 7 - Growth Mindset - Celebrating Effort</a><br>'
        + '<a href="https://www.canva.com/design/DAHEUib_nsU/uKxIbPC2qH5KKoXDUWXElQ/view?utm_content=DAHEUib_nsU&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd496d310e1">Week 8 - Growth Mindset - Curiosity</a><br>'
        + '<strong>Bonus Week - Confidence - What Is Confidence?</strong> (Great for leading up to testing)'
    ]),
    buildWeeklyChallenge(
      'Help every student navigate smoothly to their assigned reading + math lessons this week.',
      'Where will Math Academy + Fast Math make the biggest difference for your students heading into testing?'
    )
  ]);
}

// --- 4/27: Last Week of Motivention -- To the Finish Line ---
// No Actions / Weekly Challenge / Reflection Prompt sections per source content.
function generateLastWeekFinishLineBody(teacher, metricsArray, winnersArray) {
  return wrapEmailHtml([
    buildGreeting(teacher),

    // Standard data block
    // NOTE: 4/27 template intentionally omits buildTrendAlert per user request
    // (end-of-year context — trend coaching out of place; data table + update note speak for themselves).
    '<h2 style="color:#1a1a1a;">Average Active Days in Motivention</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    buildColorLegend(),

    // Update note: minutes/lessons changed due to recent updates
    '<div style="background-color:#fff2cc;padding:12px;border-radius:6px;margin:12px 0;border:1px solid #ffe599;">',
    '<p style="margin:0;"><strong>Note:</strong> Minutes/lessons may look different due to recent updates.</p>',
    '</div>',

    // ---- Updates section: 3 non-boring updates ----
    '<h2 style="color:#1a1a1a;">FastMath Points Update</h2>',
    '<p>' + dotSpan('#FFD700') + '<strong>+200 BONUS POINTS for finishing ALL FastMath</strong> -- share today!</p>',
    '<p>All weekly + mastery points are calculated for you in your attached data!</p>',

    '<h2 style="color:#1a1a1a;">Final Days to Earn & Spend Points</h2>',
    '<p>Remind students: <strong>this is the last chance to earn.</strong></p>',
    '<p><strong>Store Closing Dates:</strong></p>',
    '<p>' + dotSpan('#c62828') + 'Store closes <strong>MAY 8</strong></p>',
    '<p>' + dotSpan('#DAA520') + '<strong>Points do NOT carry over to next year.</strong></p>',
    '<p>' + dotSpan('#FFD700') + '<strong>Extra points = raffle entries.</strong> Skip small rewards -- go for big prizes.</p>',

    '<h2 style="color:#1a1a1a;">End of Year Raffle Prize Drawing</h2>',
    '<p><strong>Big prizes students actually want:</strong></p>',
    '<p>' + dotSpan('#1565c0') + 'Beats Headphones &nbsp; ' + dotSpan('#2e7d32') + 'JBL Speakers &nbsp; ' + dotSpan('#ef6c00') + 'LEGO Sets + more</p>',
    '<p>Display the <a href="https://canva.link/8yi8gcx0p3p6acg"><strong>prize slide</strong></a> this week to build urgency.</p>',
    '<p>Students with leftover points are automatically eligible for the raffle. <strong>Raffle will be May 26.</strong></p>',

    // ---- Weekly Focus (one-liner per source) ----
    '<h2 style="color:#1a1a1a;">Weekly Focus -- Persistence</h2>',
    '<p>Students stay focused and keep working through the final week.</p>',

    // ---- Resources ----
    buildResourcesSection([
      '<strong>AIM Launches</strong> (Bonus for testing days):<br>'
        + '<a href="https://www.canva.com/design/DAHEUib_nsU/uKxIbPC2qH5KKoXDUWXElQ/view?utm_content=DAHEUib_nsU&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd496d310e1">Week 8 - Growth Mindset - Curiosity</a><br>'
        + '<a href="https://www.canva.com/design/DAHEzkY6lYU/raJFlAdAxHyZfVrLf31oYw/view?utm_content=DAHEzkY6lYU&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h499bdd75c8">Week 9 - Confidence - What Is Confidence?</a><br>'
        + '<a href="https://www.canva.com/design/DAHFGgoRC5c/oDVz3mDlrpNOov7jVmSZCw/view?utm_content=DAHFGgoRC5c&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=he56325bd08">Week 10 - Confidence - What Is Self-Efficacy?</a><br>'
        + '<a href="https://canva.link/motiventionweek11">Week 11 - Confidence - The Brain-Body Feedback Loop</a>'
    ])
    // No buildWeeklyChallenge per source
  ]);
}

// --- SC FINAL EMAIL: Growth & Hardwork = Results (v2.6.5) ---
// Year-cumulative end-of-year summary. Reads Year Teacher Totals +
// Student Year Highlights tabs (populated by parent v3.41.4).
// Per-teacher data: classroom highlight reel + 2 KPIs + 2 student spotlights.
function generateScFinalEmailBody(teacher, metricsArray, winnersArray) {
  // v2.6.8: use lookupByName instead of direct-map lookup. Fixes multi-token
  // roster names (e.g., "John Bradley Apostol" in roster vs "John Apostol" in
  // BQ/Year Teacher Totals — BQ drops the middle name upstream). Direct lookup
  // returned null → email rendered all "--" KPIs + spotlight fallback text.
  // lookupByName step 2 resolves firstName.split(' ')[0] + ' ' + lastName,
  // matching all 13 weekly templates' behavior.
  var totals = lookupByName(
    getYearTeacherTotals(), teacher && teacher.firstName, teacher && teacher.lastName, teacher && teacher.name
  );
  var highlights = lookupByName(
    getStudentYearHighlights(), teacher && teacher.firstName, teacher && teacher.lastName, teacher && teacher.name
  ) || [];

  return wrapEmailHtml([
    buildGreeting(teacher),

    // Intro + slide CTA
    '<p>Make sure students spend their points on prizes and a chance to enter the raffle. Attached data has points earned last week.</p>',
    '<p style="text-decoration:underline;text-align:center;margin:14px 0 4px 0;font-weight:bold;">Teachers: please show your students this slide</p>',
    '<p style="margin:4px 0 14px 0;text-align:center;">',
    '<a href="https://canva.link/y430aqrxczjr9oz" style="display:inline-block;background-color:#1a73e8;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">SHOW THIS SLIDE</a>',
    '</p>',
    '<div style="background-color:#fff2cc;padding:12px;border-radius:6px;border:1px solid #ffe599;margin:12px 0;">',
    '<p style="margin:0;font-weight:bold;">Last day to order is May 8th!</p>',
    '</div>',

    // Classroom Data Highlight Reel
    buildYearHighlightReel(totals),

    // Top Student Highlights = 2 KPIs + 2 spotlights
    '<h2 style="color:#1a1a1a;margin-top:22px;">Top Student Highlights</h2>',
    buildYearKpiStrip(totals),
    buildStudentSpotlights(highlights),

    // Quarter coaching paragraph
    '<p style="margin-top:20px;font-style:italic;color:#333;">This didn\'t happen by chance: it\'s the result of intentional coaching and becoming more consistent through the process each week this quarter.</p>',
    '<p><strong>Weekly Data Attached</strong></p>',

    // State testing transition
    '<p>The practices that built this growth are the same ones that will carry students into state and MAP testing with confidence.</p>',
    '<p>As you move into state testing, know that your work has prepared students well.</p>',
    '<p>We\'re excited to connect again at the end of the month for MAP testing and to keep building on this progress.</p>',

    // Mindset Mini-Launches (Week 9-11)
    '<h3 style="color:#1a1a1a;margin-top:18px;">Keep going! Mindset Mini-Launches</h3>',
    '<ol style="padding-left:20px;line-height:1.6;">',
    '<li><strong>Week 9 - Confidence:</strong> <a href="https://www.canva.com/design/DAHEzkY6lYU/raJFlAdAxHyZfVrLf31oYw/view?utm_content=DAHEzkY6lYU&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h499bdd75c8">What Is Confidence?</a></li>',
    '<li><strong>Week 10 - Confidence:</strong> <a href="https://www.canva.com/design/DAHFGgoRC5c/oDVz3mDlrpNOov7jVmSZCw/view?utm_content=DAHFGgoRC5c&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=he56325bd08">What Is Self-Efficacy?</a></li>',
    '<li><strong>Week 11 - Confidence:</strong> <a href="https://canva.link/motiventionweek11">The Brain-Body Feedback Loop</a></li>',
    '</ol>'
  ]);
}


// --- SPRING 2026 MAP SCORES (v2.8.0) ---
// Live-data template. Reads the Spring 2026 MAP Scores tab (populated by parent
// generate_report_v3.py Step 5). One row per (student, subject). The table
// auto-reflects fresh data each time an IM clicks Generate My Email Drafts.
function generateSpring2026MapBody(teacher, metricsArray, winnersArray) {
  // v2.8.0: ignore standard args; load MAP scores via module-cached reader.
  // Pattern mirrors generateScFinalEmailBody (v2.6.5).
  var rows = lookupByName(
    getMapScoresForTeacher(),
    teacher && teacher.firstName,
    teacher && teacher.lastName,
    teacher && teacher.name
  ) || [];

  return wrapEmailHtml([
    buildGreeting(teacher),
    '<h2 style="color:#1a1a1a;">Spring 2026 MAP Scores: Your Students\' Results</h2>',
    '<p>Here is the latest snapshot of your students\' NWEA MAP RIT scores for the Winter and Spring 2026 testing windows. The table below reflects all tests completed as of yesterday.</p>',
    // v2.9.0: prioritize section + IM-editable callout (replaces the v2.8.x "celebrate growth..." line)
    '<h3 style="color:#1a1a1a;margin-top:18px;">Please prioritize the following today:</h3>',
    '<ul style="line-height:1.6;margin:6px 0;">',
    '<li>Any student in attendance with a blank or incomplete MAP test must complete testing today.</li>',
    '<ul style="line-height:1.6;margin:4px 0;">',
    '<li>Ensure Language testing is completed before Reading.</li>',
    '<li>Some students who have been identified as re-test candidates will be testing again today.</li>',
    '</ul>',
    '</ul>',
    buildMapScoresTable(rows),
    '<p style="margin-top:20px;">A few interpretation notes:</p>',
    '<ul style="line-height:1.6;">',
    '<li><strong>Spring Score</strong> is the student\'s RIT from the Spring</li>',
    '<li><strong>Projected Growth</strong> is the RIT growth expected by NWEA for that student</li>',
    '<li><strong>X Growth</strong> = How much more or less a student grew than expected; above 1.00 means they exceeded expectations, below 1.00 means they fell short of expectations</li>',
    '<li>A score of <strong>--</strong> means the student has not yet been tested in that window.</li>',
    '</ul>',
    '<p style="margin-top:20px;">Growth calculations and prizes will be handed out today.</p>'
  ]);
}


// ============================================
// DIAGNOSTIC TOOL
// ============================================
/**
 * v2.5.2: Pre-flight roster ↔ metrics name alignment check.
 *
 * Catches the Aston/Anton class of bug BEFORE the IM runs Generate My Email
 * Drafts. Iterates teachers in the IM's assigned schools, runs the same
 * `lookupByName` logic that Generate uses, reports matched vs unmatched. For
 * each unmatched teacher, shows any metrics-tab name with first-name or
 * last-name token overlap (heuristic for "is there a typo we can alias?").
 *
 * Use this BEFORE every weekly run, OR when the "No metrics rows found"
 * callout appears in any draft. Apps Script port of `scripts/check_email_data.py`.
 */
function checkTeacherNames() {
  var ui = SpreadsheetApp.getUi();
  var dateRange = getConfigValue('Date Range');
  if (!dateRange) {
    ui.alert('Error', 'Please set Date Range first (Email Tools > Set Date Range or the Config tab).', ui.ButtonSet.OK);
    return;
  }
  var weekStart = dateRange.split('_to_')[0];

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var currentUserEmail = Session.getActiveUser().getEmail().toLowerCase();
  // v2.6.0: extracted to getMySchools helper.
  var mySchools = getMySchools(currentUserEmail);
  if (mySchools.length === 0) {
    ui.alert('Error', 'No schools assigned to your email.', ui.ButtonSet.OK);
    return;
  }

  var teachers = getTeachersForSchools(mySchools.map(function(s) { return s.displayName; }));
  var metrics = getTeacherMetricsForWeek(weekStart);
  var metricsKeys = Object.keys(metrics);

  var html = '<h2>Teacher Name Diagnostic</h2>';
  html += '<p><b>Week:</b> ' + weekStart + '</p>';
  html += '<p><b>Schools:</b> ' + mySchools.map(function(s) { return s.displayName; }).join(', ') + '</p>';

  // v2.6.9: distinguish "roster empty for assigned schools" (upstream source
  // Campus column wiped) from "roster non-empty but names don't match metrics"
  // (the NAME_ALIASES path). The previous behavior silently rendered
  // "Matched: 0 of 0" which looked like a clean pass.
  if (teachers.length === 0) {
    html += '<div style="background:#fff4e5;border-left:4px solid #f57c00;padding:12px 16px;margin:12px 0;">';
    html += '<p style="color:#e65100;font-weight:bold;margin:0 0 8px 0;">&#9888; Zero teachers loaded from the roster</p>';
    html += '<p style="margin:0 0 4px 0;">For your assigned school(s) (' + mySchools.map(function(s) { return s.displayName; }).join(', ') + '), the "Teacher Emails" roster returned zero candidate rows. This usually means the upstream MAP Master Roster source spreadsheet has empty <b>Column C ("Campus")</b> for your school. IMPORTRANGE pulls the empty values into Teacher Emails Column C; this function correctly filters them out.</p>';
    html += '<p style="margin:8px 0 4px 0;"><b>Action:</b></p>';
    html += '<ol style="margin:4px 0 0 24px;padding:0;">';
    html += '<li>Open the MAP Master Roster source sheet (ID <code>1scEay0a8OR6vU3uJuxbHKWCEx_RVgSsRXF9naJh3XYw</code>).</li>';
    html += '<li>Find the tab matching your school (e.g. "Ridgeland Elementary School (Dash)" for JRES).</li>';
    html += '<li>Confirm Column C is populated for all student rows with the school name (e.g. "JRES - Ridgeland Elementary School").</li>';
    html += '<li>If Column C is empty, restore from File &gt; Version history, then re-run this diagnostic.</li>';
    html += '<li>If Column C is populated upstream but this destination still shows zero, force IMPORTRANGE recalc: edit the formula in Teacher Emails cell A1 (add then remove a space, hit Enter).</li>';
    html += '</ol>';
    html += '</div>';
    var earlyOutput = HtmlService.createHtmlOutput(html).setWidth(800).setHeight(600);
    ui.showModalDialog(earlyOutput, 'Teacher Name Diagnostic');
    return;
  }

  var matched = [], unmatched = [];
  for (var t = 0; t < teachers.length; t++) {
    var teacher = teachers[t];
    var hit = lookupByName(metrics, teacher.firstName, teacher.lastName, teacher.name);
    if (hit) matched.push(teacher);
    else unmatched.push(teacher);
  }

  html += '<p style="color:#2e7d32;">&#10003; <b>Matched:</b> ' + matched.length + ' of ' + teachers.length + ' teachers will get metrics in their email</p>';
  if (unmatched.length === 0) {
    html += '<p style="color:#2e7d32;font-weight:bold;">All teachers matched. No NAME_ALIASES additions needed.</p>';
  } else {
    html += '<p style="color:#c62828;">&#10071; <b>Unmatched:</b> ' + unmatched.length + ' teachers will get the "No metrics rows found" callout</p>';
    html += '<h3>Unmatched teachers:</h3>';
    html += '<table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px;width:100%;">';
    html += '<tr style="background:#1a1a1a;color:#fff;"><th>Teacher</th><th>School</th><th>Possible match in metrics tab</th></tr>';
    for (var u = 0; u < unmatched.length; u++) {
      var unm = unmatched[u];
      var fn = (unm.firstName || '').toLowerCase();
      var ln = (unm.lastName || '').toLowerCase();
      var overlaps = [];
      for (var k = 0; k < metricsKeys.length; k++) {
        var mk = metricsKeys[k];
        var mkParts = mk.split(' ');
        for (var mp = 0; mp < mkParts.length; mp++) {
          var mpp = mkParts[mp].toLowerCase();
          if (fn && (mpp === fn || mpp.indexOf(fn) !== -1 || fn.indexOf(mpp) !== -1)) {
            if (overlaps.indexOf(mk) === -1) overlaps.push(mk);
            break;
          }
          if (ln && (mpp === ln || mpp.indexOf(ln) !== -1 || ln.indexOf(mpp) !== -1)) {
            if (overlaps.indexOf(mk) === -1) overlaps.push(mk);
            break;
          }
        }
      }
      var overlapText = overlaps.length > 0
        ? overlaps.slice(0, 3).join('<br>')
        : '<i style="color:#888;">no overlap &mdash; likely missing from BigQuery</i>';
      html += '<tr><td><b>' + unm.name + '</b></td><td>' + unm.campus + '</td><td>' + overlapText + '</td></tr>';
    }
    html += '</table>';
    html += '<h3>What to do</h3>';
    html += '<ul>';
    html += '<li>If a metrics name above is a clear typo of the roster name (e.g. "Anton" &harr; "Aston", or a hyphenated last name), ask Khiem to add a NAME_ALIASES entry in Code.gs.</li>';
    html += '<li>If "no overlap" is shown, the teacher is genuinely missing from the BigQuery data for this week. Escalate to the data team (likely a SIS roster sync gap).</li>';
    html += '</ul>';
  }

  var output = HtmlService.createHtmlOutput(html).setWidth(800).setHeight(600);
  ui.showModalDialog(output, 'Teacher Name Diagnostic');
}

function checkTeacherFolders() {
  var ui = SpreadsheetApp.getUi();
  var currentUserEmail = Session.getActiveUser().getEmail().toLowerCase();

  // v2.6.0: extracted to getMySchools helper.
  var mySchools = getMySchools(currentUserEmail);
  if (mySchools.length === 0) return ui.alert('Error', 'No schools assigned to you.', ui.ButtonSet.OK);

  var teachers = getTeachersForSchools(mySchools.map(function(s) { return s.displayName; }));
  var rootFolder = getRootFolder();
  if (!rootFolder) return ui.alert('Error', 'Root folder not found. Run Debug: Drive Access.', ui.ButtonSet.OK);

  var report = '<h2>Teacher Folder Diagnostic Report</h2>';

  for (var s = 0; s < mySchools.length; s++) {
    var school = mySchools[s];
    report += '<h3>' + school.displayName + '</h3>';
    // v2.4.3: try displayName first (search API works for shared-with-me), fall back to folderName
    var schoolFolder = school.displayName ? findFolderByName(school.displayName, rootFolder) : null;
    if (!schoolFolder) schoolFolder = findFolderByName(school.folderName, rootFolder);

    if (!schoolFolder) {
      report += '<p style="color:red;">School folder not found in Drive: tried <b>' + school.displayName + '</b> and <b>' + school.folderName + '</b></p>';
      continue;
    }

    // v2.4.3: wrap getFolders + iteration. Shared-with-me users hit "Service error: Drive"
    // here. Fail-soft: report the limitation and skip this school's teacher folder check.
    var driveFolderNameSet = {};
    try {
      var driveFolders = schoolFolder.getFolders();
      while (driveFolders.hasNext()) {
        try {
          driveFolderNameSet[driveFolders.next().getName().toLowerCase()] = true;
        } catch (eInner) {
          // skip a single broken iteration step but keep iterating
          continue;
        }
      }
    } catch (e) {
      report += '<p style="color:red;">getFolders() FAILED on this school: ' + (e.message || e) + ' \u2014 likely shared-with-me list permission gap. Run <b>Email Tools &gt; Debug: Drive Auth</b>.</p>';
      continue;
    }

    var schoolTeachers = teachers.filter(function(t) { return t.campus === school.displayName; });
    report += '<ul>';
    for (var ti = 0; ti < schoolTeachers.length; ti++) {
      var t = schoolTeachers[ti];
      // v2.5.2: try BOTH spaced (t.name) AND underscored (t.folderName) forms.
      // Drive folders may be named with spaces ("Aston Haughton") while the
      // roster stores the underscored form ("Aston_Haughton"). Pre-v2.5.2 only
      // checked underscored — caused all-MISSING red walls for shared-with-me
      // users with spaced Drive folders (the actual production case).
      var foundByUnderscored = !!driveFolderNameSet[t.folderName.toLowerCase()];
      var foundBySpaced = !!driveFolderNameSet[t.name.toLowerCase()];
      if (foundByUnderscored || foundBySpaced) {
        var matchedAs = foundBySpaced ? t.name : t.folderName;
        report += '<li>Found folder for: ' + t.name + ' (<i>' + matchedAs + '</i>)</li>';
      } else {
        report += '<li style="color:red;"><b>MISSING</b> folder for: ' + t.name + ' (Expected: <b>' + t.folderName + '</b> or <b>' + t.name + '</b>)</li>';
      }
    }
    report += '</ul><hr>';
  }

  var htmlOutput = HtmlService.createHtmlOutput(report).setWidth(600).setHeight(500);
  ui.showModalDialog(htmlOutput, 'Folder Diagnostic');
}

// ============================================
// v2.6.2 — VALIDATE ALL PDFs (Drive PDF coverage check)
// ============================================
//
// Iterates ALL teachers across ALL schools (every IM's roster, plus Reading
// Teachers tab). For the week selected in the Config Date Range: looks up the
// teacher's metrics using the SAME chain the bulk Generate run uses
// (lookupByName + NAME_ALIASES), and if metrics exist, checks Drive for a PDF
// using findTeacherPdfBySearch with findTeacherPdfByTraversal as fallback.
//
// Reports MISSING (metrics but no PDF). Runs as the current user — works for
// shared-with-me Drive folders that the service-account-side Python validator
// (scripts/validate_pdfs.py) cannot see.
//
// v2.6.4: respects Config Date Range (the week the IM is about to use), not
// "last 2 weeks". Set Date Range first via the Config tab dropdown or
// Email Tools -> Set Date Range.

function validateAllPdfs() {
  var ui = SpreadsheetApp.getUi();
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(0)) {
    ui.alert('Already Running',
      'Email generation or another validation is in progress. Wait for it to finish before validating.',
      ui.ButtonSet.OK);
    return;
  }
  try {
    _runIdCache = null;

    // v2.6.4: validate the Config-selected week — that's what the bulk run
    // would actually generate for. "Last 2 weeks" was confusing because the
    // upcoming week's PDFs may not yet exist (mark.katigbak's pipeline runs
    // late in the week), so they'd flag as MISSING even though the IM doesn't
    // care about that week yet.
    var configRange = getConfigValue('Date Range');
    if (!configRange) {
      ui.alert('Error',
        'Set Config Date Range first (Config tab dropdown or Email Tools -> Set Date Range).\n\n' +
        'The validator checks PDFs for whichever week the bulk Generate run would use.',
        ui.ButtonSet.OK);
      return;
    }
    var weeksToCheck = [configRange];

    var rootFolder = getRootFolder();
    if (!rootFolder) {
      ui.alert('Error', 'Could not find root folder. Run Debug: Drive Access first.', ui.ButtonSet.OK);
      return;
    }

    // Get ALL schools across ALL IMs (NOT filtered by current user). Validation
    // is system-wide, so every teacher anywhere in the roster is in scope.
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var mappingData = ss.getSheetByName(CONFIG.MAPPING_SHEET_NAME).getDataRange().getValues();
    var allSchools = [];
    var seenDisplay = {};
    for (var i = 1; i < mappingData.length; i++) {
      var folderName = String(mappingData[i][0] || '').trim();
      var displayName = String(mappingData[i][1] || '').trim() || folderName;
      if (!displayName || seenDisplay[displayName]) continue;
      seenDisplay[displayName] = true;
      allSchools.push({ folderName: folderName, displayName: displayName });
    }
    var allDisplayNames = allSchools.map(function(s) { return s.displayName; });
    var allTeachers = getTeachersForSchools(allDisplayNames);

    // Build school folder cache once — reused across all weeks.
    var schoolFolderCache = buildSchoolFolderCache(allSchools, rootFolder);
    // schoolFolderMap is needed for traversal fallback (mirrors generateDraftsForCurrentUser).
    var schoolFolderMap = {};
    for (var sm = 0; sm < allSchools.length; sm++) {
      schoolFolderMap[allSchools[sm].displayName] = allSchools[sm].folderName;
    }

    var html = '<h2>PDF Validation Report</h2>';
    html += '<p><b>User:</b> ' + Session.getActiveUser().getEmail() + '</p>';
    html += '<p><b>Config Date Range:</b> ' + configRange + ' &nbsp; <span style="color:#888;font-size:12px;">(change via Config tab or Email Tools -> Set Date Range)</span></p>';
    html += '<p><b>Schools scanned:</b> ' + allSchools.length + '</p>';
    html += '<p><b>Teachers in roster:</b> ' + allTeachers.length + '</p>';
    html += '<p style="font-size:12px;color:#555;">For the Config-selected week, this checks every teacher with metrics in BigQuery against the Drive folder for a matching PDF, using the same lookup chain (lookupByName + NAME_ALIASES + search-API + traversal-fallback) as the bulk Generate run.</p>';

    var grandMissing = 0, grandMatched = 0;

    for (var w = 0; w < weeksToCheck.length; w++) {
      var dateRange = weeksToCheck[w];
      var weekStart = dateRange.split('_to_')[0];
      var allMetrics = getTeacherMetricsForWeek(weekStart);

      html += '<h3>Week ' + dateRange + '</h3>';
      if (Object.keys(allMetrics).length === 0) {
        html += '<p style="color:#888;"><i>No metrics rows for this week.</i></p>';
        continue;
      }

      var withMetrics = [];
      for (var t = 0; t < allTeachers.length; t++) {
        var teacher = allTeachers[t];
        var metrics = lookupByName(allMetrics, teacher.firstName, teacher.lastName, teacher.name);
        if (metrics) withMetrics.push(teacher);
      }

      var missing = [];
      var found = 0;
      var foundViaFallback = 0;
      for (var t2 = 0; t2 < withMetrics.length; t2++) {
        var teacher2 = withMetrics[t2];
        var pdf = null;
        var note = '';
        // v2.6.3: mirror createDraftForTeacher's two-phase lookup. Search-API
        // returns 0 hits for files mark.katigbak just added (Drive search index
        // updates lazily for shared-with-me users), but the iteration fallback
        // works because we already have the school folder cached.
        try {
          pdf = findTeacherPdfBySearch(teacher2, dateRange, schoolFolderCache);
        } catch (e) {
          note = 'Search-API error: ' + (e.message || e);
        }
        if (!pdf) {
          try {
            pdf = findTeacherPdfByTraversal(teacher2, dateRange, rootFolder, schoolFolderMap, schoolFolderCache);
            if (pdf) foundViaFallback++;
          } catch (e2) {
            if (!note) note = 'Traversal error: ' + (e2.message || e2);
          }
        }
        if (pdf) found++;
        else missing.push({ teacher: teacher2, error: note });
      }

      grandMatched += found;
      grandMissing += missing.length;

      var matchRate = withMetrics.length === 0 ? 0 : (found / withMetrics.length * 100);
      html += '<p><b>Teachers with metrics:</b> ' + withMetrics.length + '</p>';
      html += '<p><b>PDF match rate:</b> ' + matchRate.toFixed(1) + '% &nbsp; (' + found + ' / ' + withMetrics.length + ')';
      if (foundViaFallback > 0) {
        html += ' &nbsp; <span style="color:#888;">(' + foundViaFallback + ' via traversal fallback — search-index lag)</span>';
      }
      html += '</p>';

      if (missing.length === 0) {
        html += '<p style="color:#2e7d32;font-weight:bold;">&#10003; All teachers with metrics have PDFs.</p>';
      } else {
        html += '<p style="color:#c62828;"><b>&#10071; MISSING PDFs (' + missing.length + ' teacher(s)):</b></p>';
        // Sort by school then name so IMs can scan their districts.
        missing.sort(function(a, b) {
          var ca = (a.teacher.campus || ''), cb = (b.teacher.campus || '');
          if (ca !== cb) return ca < cb ? -1 : 1;
          return (a.teacher.name || '') < (b.teacher.name || '') ? -1 : 1;
        });
        html += '<table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px;width:100%;">';
        html += '<tr style="background:#1a1a1a;color:#fff;"><th>Teacher</th><th>Email</th><th>School</th><th>Note</th></tr>';
        for (var m = 0; m < missing.length; m++) {
          var ms = missing[m];
          html += '<tr><td><b>' + ms.teacher.name + '</b></td><td>' + ms.teacher.email + '</td><td>' + ms.teacher.campus + '</td><td>' + (ms.error || 'No PDF found in Drive') + '</td></tr>';
        }
        html += '</table>';
      }
    }

    // Summary
    html += '<hr><h3>Summary</h3>';
    html += '<p><b>' + grandMissing + '</b> teacher(s) missing PDF, out of <b>' + (grandMatched + grandMissing) + '</b> teacher(s) with metrics for week ' + configRange + '.</p>';
    if (grandMissing > 0) {
      html += '<p>Action: ping <code>mark.katigbak</code> with the MISSING list above so upstream PDF generation re-runs for those teachers. Until then, those teachers will produce errors in the Error Log when an IM runs Generate.</p>';
    } else {
      html += '<p style="color:#2e7d32;"><b>&#10003; Every teacher with metrics has a PDF. The bulk run will produce zero PDF-missing errors for this week.</b></p>';
    }

    var output = HtmlService.createHtmlOutput(html).setWidth(900).setHeight(700);
    ui.showModalDialog(output, 'PDF Validation (' + configRange + ')');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Comprehensive Drive access diagnostic.
 * Shows exactly what DriveApp can see from the current user's perspective:
 *   - Root folder lookup (by ID and by name)
 *   - All school folders
 *   - Teacher folders inside each school
 *   - PDFs in teacher folders matching the current Config date range
 */
function debugDriveAccess() {
  var ui = SpreadsheetApp.getUi();
  var dateRange = getConfigValue('Date Range') || '(none set)';
  var pdfPattern = dateRangeToPdfPattern(dateRange);
  var report = '<h2>Drive Access Diagnostic</h2>';
  report += '<p><b>User:</b> ' + Session.getActiveUser().getEmail() + '</p>';
  report += '<p><b>Config Date Range:</b> ' + dateRange + '</p>';
  report += '<p><b>Expected PDF pattern:</b> "' + pdfPattern + '"</p>';
  report += '<hr>';

  // 1. Root folder lookup
  report += '<h3>1. Root Folder</h3>';
  var rootById = null;
  try { rootById = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID); }
  catch (e) { report += '<p style="color:red;">getFolderById("' + CONFIG.ROOT_FOLDER_ID + '") FAILED: ' + e.message + '</p>'; }
  if (rootById) report += '<p style="color:green;">Found by ID: <b>' + rootById.getName() + '</b> (id=' + rootById.getId() + ')</p>';

  var rootByName = findFolderByName(CONFIG.ROOT_FOLDER_NAME);
  if (rootByName) report += '<p style="color:green;">Found by name: <b>' + rootByName.getName() + '</b> (id=' + rootByName.getId() + ')</p>';
  else report += '<p style="color:red;">NOT found by name "' + CONFIG.ROOT_FOLDER_NAME + '"</p>';

  var rootFolder = rootById || rootByName;
  if (!rootFolder) {
    report += '<p style="color:red;"><b>FATAL:</b> cannot find root folder by either method.</p>';
    var h1 = HtmlService.createHtmlOutput(report).setWidth(800).setHeight(600);
    ui.showModalDialog(h1, 'Drive Diagnostic');
    return;
  }

  // 2. List all school folders
  // v2.4.2: wrap getFolders() — for shared-with-me users this throws "Service error: Drive"
  // even though direct child-folder access works. Surface the limitation explicitly so
  // the diagnostic produces useful output instead of crashing.
  report += '<h3>2. School Folders in Root</h3>';
  var schoolNames = [];
  try {
    var schoolFolders = rootFolder.getFolders();
    report += '<ul>';
    while (schoolFolders.hasNext()) {
      var sf = schoolFolders.next();
      schoolNames.push({ name: sf.getName(), id: sf.getId() });
      report += '<li>' + sf.getName() + ' <i>(id=' + sf.getId() + ')</i></li>';
    }
    report += '</ul>';
  } catch (e) {
    report += '<p style="color:red;">rootFolder.getFolders() FAILED: ' + (e.message || e) + '</p>';
    report += '<p>This is the "Service error: Drive" pattern from your earlier run. You have direct access to the root via Shared-with-me but lack <i>list children</i> permission. Run <b>Email Tools &gt; Debug: Drive Auth</b> for the full diagnosis + fix path.</p>';
    report += '<p>Continuing with per-school checks below \u2014 they use exact-name search which works for shared-with-me users.</p>';
  }

  // 3. For current user's schools, check teacher folders + PDFs
  var currentUserEmail = Session.getActiveUser().getEmail().toLowerCase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // v2.6.0: extracted to getMySchools helper.
  var mySchools = getMySchools(currentUserEmail);

  report += '<h3>3. Your Schools (from School-IM Mapping)</h3>';
  for (var s = 0; s < mySchools.length; s++) {
    var sch = mySchools[s];
    report += '<h4>' + sch.displayName + '</h4>';
    report += '<p>Looking for folder named: "' + sch.folderName + '" or "' + sch.displayName + '"</p>';

    // v2.4.2: try displayName FIRST (exact-match via getFoldersByName works for shared-with-me)
    var schoolFolder = sch.displayName ? findFolderByName(sch.displayName, rootFolder) : null;
    if (!schoolFolder) schoolFolder = findFolderByName(sch.folderName, rootFolder);
    if (!schoolFolder) {
      report += '<p style="color:red;">NOT FOUND in Drive. Tried both displayName and folderName. Possible cause: name mismatch in School-IM Mapping vs actual Drive folder.</p>';
      continue;
    }
    report += '<p style="color:green;">Found: <b>' + schoolFolder.getName() + '</b></p>';

    // List teacher folders (v2.4.2/v2.4.3: wrap every iteration step)
    report += '<ul>';
    var tfs;
    try {
      tfs = schoolFolder.getFolders();
    } catch (e) {
      report += '<li style="color:red;">getFolders() FAILED on this school folder: ' + (e.message || e) + '. (Same shared-with-me limitation as the root.)</li></ul>';
      continue;
    }
    var count = 0;
    var loopBroke = false;
    while (count < 50 && !loopBroke) {
      var tfHasNext;
      try { tfHasNext = tfs.hasNext(); }
      catch (e) {
        report += '<li style="color:red;">tfs.hasNext() FAILED: ' + (e.message || e) + '</li>';
        loopBroke = true; break;
      }
      if (!tfHasNext) break;
      var tf;
      try { tf = tfs.next(); }
      catch (e) { report += '<li style="color:red;">tfs.next() FAILED: ' + (e.message || e) + '</li>'; count++; continue; }
      count++;
      // Count PDFs matching the date pattern
      var pdfMatches = [];
      var files;
      try { files = tf.getFiles(); }
      catch (e) {
        report += '<li>' + tf.getName() + ' <span style="color:red;">- tf.getFiles() FAILED: ' + (e.message || e) + '</span></li>';
        continue;
      }
      var fileCount = 0;
      var fileLoopBroke = false;
      while (fileCount < 20 && !fileLoopBroke) {
        var fHasNext;
        try { fHasNext = files.hasNext(); }
        catch (e) { fileLoopBroke = true; break; }
        if (!fHasNext) break;
        try {
          var f = files.next();
          fileCount++;
          var fn = f.getName();
          if (fn.indexOf(pdfPattern) !== -1 && fn.toUpperCase().indexOf('.PDF') !== -1) {
            pdfMatches.push(fn);
          }
        } catch (e) {
          // skip a single broken file iteration step
          fileCount++;
        }
      }
      var pdfInfo = pdfMatches.length > 0
        ? '<span style="color:green;"> -> ' + pdfMatches.length + ' PDF match(es): ' + pdfMatches.join(', ') + '</span>'
        : '<span style="color:red;"> -> no PDF matching pattern</span>';
      report += '<li>' + tf.getName() + pdfInfo + '</li>';
    }
    report += '</ul>';
  }

  var html = HtmlService.createHtmlOutput(report).setWidth(900).setHeight(700);
  ui.showModalDialog(html, 'Drive Access Diagnostic');
}

// ============================================
// v2.10.0 - SUMMER SCHOOL WEEK 1+2 (separate external-source generation path)
// ============================================
//
// The summer-school cohort is NOT in this spreadsheet, the School-IM Mapping,
// or the regular weekly Drive tree. It lives in THREE external resources
// (CONFIG.SUMMER_SCHOOL): a Summer Performance Dashboard, the MAP Master
// Roster, and a nested "Public School Summer Camp" Drive folder
// (Camp -> School -> Teacher -> two weekly XP-report PDFs). This block reads
// those live each run and drafts one email per teacher/group (combined two-week
// data table + both XP PDFs attached), plus one Unassigned draft per school.
//
// Recipient model: drafts land in the Gmail of whoever runs the menu item.
// To = roster email, or BLANK when there is no roster match (operator fills it
// in manually); Unassigned drafts are blank-To with a banner. Reached via its
// own menu items, NOT the TEMPLATES-driven generateDraftsForCurrentUser loop.

/** Cross-source join key: normalized (campus, teacher). */
function _summerKey(campus, teacher) {
  return normalizeFolderName(campus) + '||' + normalizeFolderName(teacher);
}

/** First name for the greeting. Group folders ("Group 8A") are kept whole. */
function _summerFirstName(name) {
  var n = String(name || '').trim();
  var low = n.toLowerCase();
  if (low.indexOf('group ') === 0 || low.indexOf('group_') === 0) return n;
  return n.split(' ')[0] || n;
}

/** Map a header row to { normalizedHeaderName -> columnIndex } (first wins). */
function _summerHeaderIndex(headerRow) {
  var map = {};
  for (var i = 0; i < headerRow.length; i++) {
    var key = normalizeFolderName(headerRow[i]);
    if (key && !(key in map)) map[key] = i;
  }
  return map;
}

/** Select a sheet/tab by its gid (getSheetId), or null. */
function getSheetByGid(ss, gid) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) return sheets[i];
  }
  return null;
}

/** Minimal HTML-escape for values interpolated into banners. */
function _esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- External readers (called live inside the orchestrator) ----

function _isSummerRosterTab(sheet) {
  try {
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) return false;
    var idx = _summerHeaderIndex(sheet.getRange(1, 1, 1, lastCol).getValues()[0]);
    return (idx['summer school teacher email'] != null)
      && (idx['summer school teacher'] != null)
      && (idx['campus'] != null);
  } catch (e) { return false; }
}

function _findSummerRosterTab(ss) {
  var hinted = getSheetByGid(ss, CONFIG.SUMMER_SCHOOL.ROSTER_GID);
  if (hinted && _isSummerRosterTab(hinted)) return hinted;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (_isSummerRosterTab(sheets[i])) return sheets[i];
  }
  // Reached only when neither the gid-hinted tab nor any sheet passed the
  // roster-signature check. `hinted` here is definitionally a NON-roster tab
  // (a valid hint would have returned at the top), so return null and let the
  // caller log a clean "not found" rather than handing back the wrong tab.
  return null;
}

/**
 * Read the MAP Master Roster Summer School tab into a (campus, teacher)-keyed
 * map of { campus, displayName, email }. Only rows with Summer School == TRUE
 * and a non-blank teacher are kept. Fail-soft: any access error returns {}.
 */
function readSummerRoster() {
  var out = {};
  var ss;
  try { ss = SpreadsheetApp.openById(CONFIG.SUMMER_SCHOOL.ROSTER_ID); }
  catch (e) { logError('ERROR', 'readSummerRoster', null, 'openById roster failed: ' + (e.message || e), ''); return out; }
  var sheet = _findSummerRosterTab(ss);
  if (!sheet) { logError('ERROR', 'readSummerRoster', null, 'roster tab (gid ' + CONFIG.SUMMER_SCHOOL.ROSTER_GID + ' / header signature) not found', ''); return out; }
  var data;
  try { data = sheet.getDataRange().getValues(); }
  catch (e) { logError('ERROR', 'readSummerRoster', null, 'roster getValues failed: ' + (e.message || e), ''); return out; }
  if (data.length < 2) return out;
  var idx = _summerHeaderIndex(data[0]);
  var cCampus = idx['campus'], cTeacher = idx['summer school teacher'],
      cEmail = idx['summer school teacher email'], cFlag = idx['summer school'];
  if (cCampus == null || cTeacher == null || cEmail == null) {
    logError('ERROR', 'readSummerRoster', null, 'roster header missing Campus / Summer School Teacher / Email', '');
    return out;
  }
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (cFlag != null) {
      var flag = String(row[cFlag] == null ? '' : row[cFlag]).trim().toLowerCase();
      if (flag !== 'true' && flag !== 'yes' && flag !== '1') continue;
    }
    var campus = String(row[cCampus] || '').trim();
    var teacher = String(row[cTeacher] || '').trim();
    if (!campus || !teacher) continue;
    var email = String(row[cEmail] || '').trim();
    var key = _summerKey(campus, teacher);
    if (!out[key]) out[key] = { campus: campus, displayName: teacher, email: email };
    else if (!out[key].email && email) out[key].email = email;
  }
  return out;
}

/** Header signature that uniquely identifies the per-(campus,teacher,week) summary tab. */
function _isSummerTeacherTab(sheet) {
  try {
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) return false;
    var idx = _summerHeaderIndex(sheet.getRange(1, 1, 1, lastCol).getValues()[0]);
    return (idx['teacher name'] != null) && (idx['avg active days'] != null)
      && (idx['campus name'] != null) && (idx['week start'] != null)
      && ((idx['doom loop pct'] != null) || (idx['total active student days'] != null));
  } catch (e) { return false; }
}

function _findSummerDataTab(ss) {
  var hinted = getSheetByGid(ss, CONFIG.SUMMER_SCHOOL.DATA_GID);
  if (hinted && _isSummerTeacherTab(hinted)) return hinted;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (_isSummerTeacherTab(sheets[i])) return sheets[i];
  }
  return null;
}

/**
 * v2.14.0: Read student-level summer fidelity for the "Final Week" awards.
 * Sources (Summer Performance Dashboard, rebuilt hourly by the timeback pipeline):
 *   _SummerFAData (clean headers: week_start, campus_name, student_id,
 *     student_name, teacher_name, grade, total_minutes, days_active, total_xp,
 *     correct_q, total_q) -> cumulative minutes/days/accuracy per student.
 *   _SummerFAStud (NO header row, one row per student) -> the authoritative
 *     "At fidelity" status in column 7 (0-indexed), joined by student_id (col 0).
 * The VISIBLE "Summer Fidelity" tab is filter-dependent (Campus/Teacher dropdowns)
 * so it is deliberately NOT used. Fail-soft: any miss -> empty groups.
 * Returns { byKey: { _summerKey(campus,teacher): [student...] },
 *           byCampus: { normalizeFolderName(campus): [student...] } },
 *   student = { name, teacher, campus, minutes, days, accuracy, status }.
 */
function readSummerStudentFidelity() {
  var empty = { byKey: {}, byCampus: {} };
  var ss;
  try { ss = SpreadsheetApp.openById(CONFIG.SUMMER_SCHOOL.DATA_ID); }
  catch (e) { logError('ERROR', 'readSummerStudentFidelity', null, 'openById data failed: ' + (e.message || e), ''); return empty; }

  // 1. _SummerFAData -> per-student cumulative minutes/days/accuracy + identity.
  var dataSheet = ss.getSheetByName('_SummerFAData');
  if (!dataSheet) { logError('WARN', 'readSummerStudentFidelity', null, '_SummerFAData tab not found - no awards section', ''); return empty; }
  var d;
  try { d = dataSheet.getDataRange().getValues(); }
  catch (e) { logError('ERROR', 'readSummerStudentFidelity', null, '_SummerFAData getValues failed: ' + (e.message || e), ''); return empty; }
  if (d.length < 2) return empty;
  var di = _summerHeaderIndex(d[0]);
  var cId = di['student id'], cName = di['student name'], cTeach = di['teacher name'],
      cCamp = di['campus name'], cMin = di['total minutes'], cDays = di['days active'],
      cCorr = di['correct q'], cTot = di['total q'];
  if (cId == null || cName == null || cCamp == null) {
    logError('WARN', 'readSummerStudentFidelity', null, '_SummerFAData header missing student_id/student_name/campus_name', '');
    return empty;
  }
  var byId = {};
  for (var i = 1; i < d.length; i++) {
    var row = d[i];
    var sid = String(row[cId] == null ? '' : row[cId]).trim();
    if (!sid) continue;
    var rec = byId[sid];
    if (!rec) {
      rec = byId[sid] = {
        name: String(row[cName] || '').trim(),
        teacher: (cTeach != null) ? String(row[cTeach] || '').trim() : '',
        campus: String(row[cCamp] || '').trim(),
        minutes: 0, days: 0, correct: 0, total: 0, status: ''
      };
    }
    if (cMin != null) rec.minutes += parseFloat(row[cMin]) || 0;
    if (cDays != null) rec.days += parseFloat(row[cDays]) || 0;
    if (cCorr != null) rec.correct += parseFloat(row[cCorr]) || 0;
    if (cTot != null) rec.total += parseFloat(row[cTot]) || 0;
  }

  // 2. _SummerFAStud (NO header row) -> authoritative status by POSITION
  // (col 0 student_id, col 7 status). Sanity-check the layout before trusting it.
  var studSheet = ss.getSheetByName('_SummerFAStud');
  if (studSheet) {
    var s = null;
    try { s = studSheet.getDataRange().getValues(); }
    catch (e) { logError('WARN', 'readSummerStudentFidelity', null, '_SummerFAStud getValues failed: ' + (e.message || e), ''); }
    if (s && s.length) {
      var STATUS_OK = { 'at fidelity': 1, 'below fidelity': 1, 'not started': 1 };
      var sane = 0, checked = 0;
      for (var c = 0; c < s.length && checked < 6; c++) {
        if (s[c].length > 7 && String(s[c][0]).trim()) {
          checked++;
          if (STATUS_OK[String(s[c][7]).trim().toLowerCase()]) sane++;
        }
      }
      if (checked > 0 && sane >= Math.ceil(checked / 2)) {
        for (var r2 = 0; r2 < s.length; r2++) {
          var sr = s[r2];
          if (sr.length <= 7) continue;
          var sid2 = String(sr[0] == null ? '' : sr[0]).trim();
          if (sid2 && byId[sid2]) byId[sid2].status = String(sr[7] || '').trim();
        }
      } else {
        logError('WARN', 'readSummerStudentFidelity', null, '_SummerFAStud layout sanity check failed (col 7 not a status) - fidelity bucket skipped', '');
      }
    }
  }

  // 3. finalize accuracy (0-100) + group by (campus,teacher) and by campus.
  var byKey = {}, byCampus = {};
  var ids = Object.keys(byId);
  for (var x = 0; x < ids.length; x++) {
    var rr = byId[ids[x]];
    rr.accuracy = (rr.total > 0) ? (rr.correct / rr.total * 100) : 0;
    var nc = normalizeFolderName(rr.campus);
    if (!byCampus[nc]) byCampus[nc] = [];
    byCampus[nc].push(rr);
    if (rr.teacher) {
      var key = _summerKey(rr.campus, rr.teacher);
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(rr);
    }
  }
  return { byKey: byKey, byCampus: byCampus };
}

/**
 * Group per-(campus,teacher,week) rows into PER-WEEK metrics per (campus,
 * teacher). PURE (no Apps Script API) so it is unit-tested directly. Returns:
 *   { key -> { weekStart -> { students, activeDays, minsPerStudent, lessons } } }
 * Last row wins per (key, week); the dashboard tab is one row per teacher/week.
 */
function _summerWeeklyByTeacher(rows) {
  var out = {};
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!out[r.key]) out[r.key] = {};
    out[r.key][r.week] = {
      students: r.students,
      activeDays: r.active,
      minsPerStudent: (r.students > 0 ? r.mins / r.students : 0),
      lessons: r.lessons
    };
  }
  return out;
}

/**
 * Read the Summer Performance Dashboard teacher-weekly-summary tab and return a
 * (campus, teacher)-keyed PER-WEEK metrics object. Fail-soft: returns {}.
 */
function readSummerTeacherData(weekStarts) {
  var out = {};
  var ss;
  try { ss = SpreadsheetApp.openById(CONFIG.SUMMER_SCHOOL.DATA_ID); }
  catch (e) { logError('ERROR', 'readSummerTeacherData', null, 'openById data failed: ' + (e.message || e), ''); return out; }
  var sheet = _findSummerDataTab(ss);
  if (!sheet) { logError('ERROR', 'readSummerTeacherData', null, 'teacher-weekly-summary tab not found by signature', ''); return out; }
  var data;
  try { data = sheet.getDataRange().getValues(); }
  catch (e) { logError('ERROR', 'readSummerTeacherData', null, 'data getValues failed: ' + (e.message || e), ''); return out; }
  if (data.length < 2) return out;
  var idx = _summerHeaderIndex(data[0]);
  var cWeek = idx['week start'], cCampus = idx['campus name'], cTeacher = idx['teacher name'];
  var cStudents = (idx['students'] != null) ? idx['students'] : idx['n students'];
  var cActive = idx['avg active days'], cMins = idx['total minutes'];
  var cLessons = (idx['lessons mastered'] != null) ? idx['lessons mastered'] : idx['sum lessons'];
  if (cWeek == null || cCampus == null || cTeacher == null || cActive == null || cMins == null) {
    logError('ERROR', 'readSummerTeacherData', null, 'data tab missing week_start/campus_name/teacher_name/avg_active_days/total_minutes', '');
    return out;
  }
  // Non-fatal: Students / Lessons Mastered are read fail-soft (default 0 when
  // the column is absent). Warn so a header rename that silently zeroes these
  // KPIs surfaces in the log instead of shipping zeros into the data table.
  if (cStudents == null) logError('WARN', 'readSummerTeacherData', null, 'Students / N Students column not found - student counts read 0', '');
  if (cLessons == null) logError('WARN', 'readSummerTeacherData', null, 'Lessons Mastered / Sum Lessons column not found - lessons read 0', '');
  var weeks = weekStarts || CONFIG.SUMMER_SCHOOL.WEEK_STARTS;
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var ws = cellToDateString(row[cWeek]);
    if (weeks.indexOf(ws) === -1) continue;
    var campus = String(row[cCampus] || '').trim();
    var teacher = String(row[cTeacher] || '').trim();
    if (!campus || !teacher) continue;
    rows.push({
      key: _summerKey(campus, teacher),
      week: ws,
      students: (cStudents != null) ? (parseFloat(row[cStudents]) || 0) : 0,
      active: parseFloat(row[cActive]) || 0,
      mins: parseFloat(row[cMins]) || 0,
      lessons: (cLessons != null) ? (parseFloat(row[cLessons]) || 0) : 0
    });
  }
  return _summerWeeklyByTeacher(rows);
}

// ---- PDF tree traversal (Camp -> School -> Teacher -> PDFs) ----

function _collectSummerPdfs(folder, weekStarts) {
  var pdfs = [];
  var weeks = weekStarts || CONFIG.SUMMER_SCHOOL.WEEK_STARTS;
  var it;
  try { it = folder.getFiles(); } catch (e) { return pdfs; }
  while (true) {
    var has;
    try { has = it.hasNext(); } catch (e) { break; }
    if (!has) break;
    var f;
    try { f = it.next(); } catch (e) { continue; }
    var name;
    try { name = f.getName(); } catch (e) { continue; }
    if (name.toUpperCase().indexOf('.PDF') === -1) continue;
    if (name.toUpperCase().indexOf('XP_REPORT') === -1) continue;
    var matchesWeek = false;
    for (var w = 0; w < weeks.length; w++) { if (name.indexOf(weeks[w]) !== -1) { matchesWeek = true; break; } }
    if (!matchesWeek) continue;
    pdfs.push(f);
  }
  pdfs.sort(function (a, b) {
    var an, bn;
    try { an = a.getName(); } catch (e) { an = ''; }
    try { bn = b.getName(); } catch (e) { bn = ''; }
    return an < bn ? -1 : (an > bn ? 1 : 0);
  });
  return pdfs;
}

/**
 * Walk the Public School Summer Camp tree. Returns
 *   { teachers: { key(campus,teacher) -> {campus, teacher, pdfs[]} },
 *     unassigned: [ {campus, pdfs[]} ] }
 * Every Drive iterator step is wrapped (shared-with-me permission safety).
 */
function traverseSummerPdfTree(weekStarts) {
  var result = { teachers: {}, unassigned: [] };
  var camp;
  try { camp = DriveApp.getFolderById(CONFIG.SUMMER_SCHOOL.PDF_CAMP_FOLDER_ID); }
  catch (e) { logError('ERROR', 'traverseSummerPdfTree', null, 'getFolderById camp failed: ' + (e.message || e), ''); return result; }
  var schoolIt;
  try { schoolIt = camp.getFolders(); }
  catch (e) { logError('ERROR', 'traverseSummerPdfTree', null, 'camp.getFolders failed: ' + (e.message || e), ''); return result; }
  while (true) {
    var hasS;
    try { hasS = schoolIt.hasNext(); } catch (e) { break; }
    if (!hasS) break;
    var school;
    try { school = schoolIt.next(); } catch (e) { continue; }
    var campus;
    try { campus = school.getName(); } catch (e) { continue; }
    // v2.13.0: skip non-school folders (e.g. "ZZARCHIVE (Wrong Title PDF Report)").
    if (normalizeFolderName(campus).indexOf('archive') !== -1) continue;
    var teacherIt;
    try { teacherIt = school.getFolders(); } catch (e) { continue; }
    while (true) {
      var hasT;
      try { hasT = teacherIt.hasNext(); } catch (e) { break; }
      if (!hasT) break;
      var tfolder;
      try { tfolder = teacherIt.next(); } catch (e) { continue; }
      var tname;
      try { tname = tfolder.getName(); } catch (e) { continue; }
      var pdfs = _collectSummerPdfs(tfolder, weekStarts);
      if (normalizeFolderName(tname) === 'unassigned') {
        result.unassigned.push({ campus: campus, pdfs: pdfs });
      } else {
        var displayTeacher = String(tname).replace(/_/g, ' ');
        result.teachers[_summerKey(campus, displayTeacher)] = { campus: campus, teacher: displayTeacher, pdfs: pdfs };
      }
    }
  }
  return result;
}

// ---- Rendering ----

function buildSummerSchoolTable(weekData, weekStarts, weekLabels) {
  if (!weekData || Object.keys(weekData).length === 0) {
    return '<div style="background-color:#fff3cd;padding:10px;border-radius:6px;border:1px solid #ffe699;margin:8px 0;">'
      + '<p style="margin:0;"><em>Two-week summary not available for this teacher. See the attached weekly reports for the student-level detail.</em></p>'
      + '</div>';
  }
  var html = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;text-align:center;font-family:Arial,sans-serif;width:100%;max-width:680px;">';
  html += '<tr style="background-color:#f3f3f3;">'
    + '<th style="padding:8px;text-align:left;">Week</th>'
    + '<th style="padding:8px;"># Students</th>'
    + '<th style="padding:8px;">Avg Active Days</th>'
    + '<th style="padding:8px;">Avg Minutes/Student</th>'
    + '<th style="padding:8px;">Lessons Mastered</th></tr>';
  var weeks = weekStarts || CONFIG.SUMMER_SCHOOL.WEEK_STARTS;
  var labels = weekLabels || CONFIG.SUMMER_SCHOOL.WEEK_LABELS;
  for (var wi = 0; wi < weeks.length; wi++) {
    var label = labels[wi] || ('Week ' + (wi + 1));
    var d = weekData[weeks[wi]];
    if (!d) {
      html += '<tr>'
        + '<td style="padding:8px;text-align:left;">' + label + '</td>'
        + '<td style="padding:8px;">--</td>'
        + '<td style="padding:8px;">--</td>'
        + '<td style="padding:8px;">--</td>'
        + '<td style="padding:8px;">--</td></tr>';
      continue;
    }
    var students = Number(d.students || 0);
    var activeDays = Number(d.activeDays || 0);
    var avgMins = Number(d.minsPerStudent || 0);
    var lessons = Number(d.lessons || 0);
    var daysColor = activeDays >= CONFIG.THRESHOLDS.ACTIVE_DAYS_GREEN ? '#d9ead3'
      : (activeDays >= CONFIG.THRESHOLDS.ACTIVE_DAYS_YELLOW ? '#fff2cc' : '#f4cccc');
    var minsColor = avgMins >= CONFIG.THRESHOLDS.AVG_MINS_GREEN ? '#d9ead3'
      : (avgMins >= CONFIG.THRESHOLDS.AVG_MINS_YELLOW ? '#fff2cc' : '#f4cccc');
    html += '<tr>'
      + '<td style="padding:8px;text-align:left;">' + label + '</td>'
      + '<td style="padding:8px;">' + students + '</td>'
      + '<td style="padding:8px;background-color:' + daysColor + ';">' + activeDays.toFixed(1) + '</td>'
      + '<td style="padding:8px;background-color:' + minsColor + ';">' + avgMins.toFixed(1) + '</td>'
      + '<td style="padding:8px;">' + lessons + '</td></tr>';
  }
  html += '</table>';
  return html;
}

// The shared copy (focus + checklist + 3 moves + Timeback + closing) used by both
// the per-teacher body and the consolidated (JRHS) body. Returns section strings.
function _summerBodyCopySections() {
  var greenDot = dotSpan('#2e7d32');
  var checklist = ['Asking questions.', 'Keeping energy high.', 'Helping students push through frustration.', 'More coaching in the room.'];
  var checkHtml = '<ul style="list-style:none;padding-left:0;margin:8px 0;">';
  for (var i = 0; i < checklist.length; i++) checkHtml += '<li style="margin:4px 0;">' + greenDot + checklist[i] + '</li>';
  checkHtml += '</ul>';

  var questions = ["What are you working on?", "What's your goal today?", "What's slowing you down?", "Show me your progress."];
  var qHtml = '<ul style="margin:6px 0 0 0;padding-left:18px;">';
  for (var q = 0; q < questions.length; q++) qHtml += '<li style="margin:2px 0;">&rarr; ' + questions[q] + '</li>';
  qHtml += '</ul>';

  var movesHtml = '<ol style="padding-left:20px;margin:8px 0;">'
    + '<li style="margin:10px 0;"><strong>Work the room.</strong><br>Be visible. Walk around. Spot frustration early. Help before students check out.</li>'
    + '<li style="margin:10px 0;"><strong>Ask better questions.</strong><br>Skip: "Are you working?"<br>Ask:' + qHtml + '</li>'
    + '<li style="margin:10px 0;"><strong>Celebrate small wins.</strong><br>Finished a lesson? Celebrate it. Focused longer? Call it out. Kept going when it got hard? Recognize it. Small wins build momentum.</li>'
    + '</ol>';

  var timebackBox = '<div style="background-color:#e7f0fe;padding:12px;border-radius:6px;margin:14px 0;border:1px solid #b6d0f7;">'
    + '<p style="margin:0 0 6px 0;">' + dotSpan('#1565c0') + '<strong>Thursday = Timeback</strong></p>'
    + '<p style="margin:0;">Reminders all week: Stay focused. Hit your goals. Earn your Timeback activity.</p>'
    + '</div>';

  return [
    '<p style="margin:14px 0 4px 0;font-size:16px;">' + dotSpan('#DAA520') + "<strong>Weekly Focus: Coach, don't monitor.</strong></p>",
    '<p style="margin:0 0 8px 0;">Students know the routine now. This week is about staying present.</p>',
    checkHtml,
    '<p style="margin:12px 0 4px 0;">' + "<strong>This week's moves:</strong></p>",
    movesHtml,
    timebackBox,
    '<p style="margin:12px 0 0 0;">' + "Let's keep the energy high and the excuses low." + '</p>'
  ];
}

// v2.13.0: compose a summer body from greeting + a table + the per-template copy
// sections. Used by the core for both per-teacher and consolidated drafts.
function _summerComposeBody(teacher, tableHtml, copySections) {
  return wrapEmailHtml([buildGreeting(teacher), tableHtml].concat(copySections));
}

// v2.13.0: Summer School Week 3 - Jasper "Finish Strong" copy.
function _summerWeek3JasperCopy() {
  var progressList = '<ul style="margin:6px 0 0 0;padding-left:18px;">'
    + '<li style="margin:2px 0;">Completed lessons</li>'
    + '<li style="margin:2px 0;">Improved attendance</li>'
    + '<li style="margin:2px 0;">Academic growth</li>'
    + '</ul>';
  var movesHtml = '<ol style="padding-left:20px;margin:8px 0;">'
    + '<li style="margin:10px 0;"><strong>Keep urgency high.</strong><br>' + "Remind students: We're not done yet." + '</li>'
    + '<li style="margin:10px 0;"><strong>Highlight progress.</strong><br>' + "Show students how far they've come." + progressList + 'Make it visible.</li>'
    + '<li style="margin:10px 0;"><strong>End strong.</strong><br>Push students to finish what they started. Strong finish &gt; slow fade.</li>'
    + '</ol>';
  var finalPushBox = '<div style="background-color:#fff3cd;padding:12px;border-radius:6px;margin:14px 0;border:1px solid #ffe699;">'
    + '<p style="margin:0 0 6px 0;">' + dotSpan('#DAA520') + '<strong>Final push</strong></p>'
    + '<p style="margin:0;">Help students finish proud.</p>'
    + '</div>';
  return [
    '<p style="margin:14px 0 4px 0;font-size:16px;">' + dotSpan('#DAA520') + '<strong>Weekly Focus: Accountability + celebration</strong></p>',
    '<p style="margin:0 0 8px 0;">' + "The finish line is close. Students may coast. Don't let them." + '</p>',
    '<p style="margin:12px 0 4px 0;">' + "<strong>This week's moves:</strong></p>",
    movesHtml,
    finalPushBox,
    '<p style="margin:12px 0 0 0;">' + "Let's close out summer strong." + '</p>'
  ];
}

// v2.13.0: Summer School Week 3 - Allendale "Push Through the Slump" copy.
function _summerWeek3AllendaleCopy() {
  var qHtml = '<ul style="margin:6px 0 0 0;padding-left:18px;">'
    + '<li style="margin:2px 0;">&rarr; ' + "What's feeling hard right now?" + '</li>'
    + '<li style="margin:2px 0;">&rarr; ' + "What's one step you can take next?" + '</li>'
    + '<li style="margin:2px 0;">&rarr; Need help getting unstuck?</li>'
    + '</ul>';
  var movesHtml = '<ol style="padding-left:20px;margin:8px 0;">'
    + '<li style="margin:10px 0;"><strong>Check progress early and often.</strong><br>' + "Don't wait until the end of class. Know who's on pace. Know who's falling behind. Intervene early." + '</li>'
    + '<li style="margin:10px 0;"><strong>Coach through frustration.</strong><br>When students stall:' + qHtml + 'Be a problem solver.</li>'
    + '<li style="margin:10px 0;"><strong>Keep goals visible.</strong><br>' + "Remind students what they're working toward. Progress. Completion. Rewards. Growth." + '</li>'
    + '</ol>';
  var timebackBox = '<div style="background-color:#e7f0fe;padding:12px;border-radius:6px;margin:14px 0;border:1px solid #b6d0f7;">'
    + '<p style="margin:0 0 6px 0;">' + dotSpan('#1565c0') + '<strong>Thursday = Timeback</strong></p>'
    + '<p style="margin:0;">Stay focused now &rarr; enjoy Timeback later.</p>'
    + '</div>';
  return [
    '<p style="margin:14px 0 4px 0;font-size:16px;">' + dotSpan('#DAA520') + '<strong>Weekly Focus: Motivation &gt; compliance</strong></p>',
    '<p style="margin:0 0 8px 0;">' + "This is where energy can dip. Your role: keep students engaged, goals visible, and momentum moving." + '</p>',
    '<p style="margin:12px 0 4px 0;">' + "<strong>This week's moves:</strong></p>",
    movesHtml,
    timebackBox
  ];
}

// v2.14.0: Summer School Final Week - universal "You Made It" wrap-up copy (all
// campuses). Celebrates finishing the summer + the students named in the awards
// section above. dotSpan colors + HTML entities, NO literal emoji, NO em dash.
function _summerFinalWeekCopy() {
  var movesHtml = '<ol style="padding-left:20px;margin:8px 0;">'
    + '<li style="margin:10px 0;"><strong>Celebrate every name.</strong><br>' + "Read the shout-outs above out loud. Every student on that list earned it." + '</li>'
    + '<li style="margin:10px 0;"><strong>Make the wins visible.</strong><br>' + "Post the list. Send it home. Let students see what they built this summer." + '</li>'
    + '<li style="margin:10px 0;"><strong>Send them off proud.</strong><br>' + "End on a high note so they walk away wanting to come back." + '</li>'
    + '</ol>';
  var thanksBox = '<div style="background-color:#e8f5e9;padding:12px;border-radius:6px;margin:14px 0;border:1px solid #a5d6a7;">'
    + '<p style="margin:0 0 6px 0;">' + dotSpan('#2e7d32') + '<strong>Thank you</strong></p>'
    + '<p style="margin:0;">' + "You showed up all summer. Your students did too. That is the whole game." + '</p>'
    + '</div>';
  return [
    '<p style="margin:14px 0 4px 0;font-size:16px;">' + dotSpan('#2e7d32') + '<strong>Weekly Focus: Celebrate the finish</strong></p>',
    '<p style="margin:0 0 8px 0;">' + "You made it. The students above hit their goals because you kept them going. Time to celebrate it." + '</p>',
    '<p style="margin:12px 0 4px 0;"><strong>Close it out:</strong></p>',
    movesHtml,
    thanksBox
  ];
}

// v2.14.0: categorized student shout-outs for the Final Week wrap-up, mirroring
// buildWinnersHtml styling (dark header, dot icons, alternating rows). 2-column
// (Achievement | Students). students = [{ name, minutes, days, accuracy, status }].
// Empty bucket -> "--"; no students -> the same italic fallback note. PURE fn.
function buildSummerStudentAwards(students) {
  if (!students || students.length === 0) {
    return '<p style="color:#666;font-style:italic;">No student achievement data available for this summer.</p>';
  }
  function names(pred) {
    var out = [];
    for (var i = 0; i < students.length; i++) {
      if (pred(students[i]) && students[i].name) out.push(students[i].name);
    }
    out.sort();
    return out.length ? out.join(', ') : '--';
  }
  var rows = [
    { cat: 'Hit Fidelity Goal', dot: '#FFD700', val: names(function (s) { return String(s.status || '').trim().toLowerCase() === 'at fidelity'; }) },
    { cat: '125+ Minutes', dot: '#ef6c00', val: names(function (s) { return (s.minutes || 0) >= 125; }) },
    { cat: 'High Accuracy (90%+)', dot: '#2e7d32', val: names(function (s) { return (s.accuracy || 0) >= 90; }) }
  ];
  var smallDot = function (c) { return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + c + ';margin-right:4px;vertical-align:middle;"></span>'; };
  var html = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;width:100%;max-width:560px;font-size:13px;">';
  html += '<tr style="background-color:#1a1a1a;color:#fff;"><th style="padding:8px;text-align:left;">Achievement</th><th style="padding:8px;text-align:left;">Students</th></tr>';
  for (var j = 0; j < rows.length; j++) {
    var bg = j % 2 === 0 ? '#f9f9f9' : '#ffffff';
    html += '<tr style="background-color:' + bg + ';">'
      + '<td style="padding:6px 8px;font-weight:bold;white-space:nowrap;">' + smallDot(rows[j].dot) + ' ' + rows[j].cat + '</td>'
      + '<td style="padding:6px 8px;">' + rows[j].val + '</td></tr>';
  }
  html += '</table>';
  return html;
}

// v2.13.0: district + per-template summerConfig resolution.
function _summerDistrict(campus) {
  var list = CONFIG.SUMMER_SCHOOL.JASPER_CAMPUSES || [];
  var nc = normalizeFolderName(campus);
  for (var i = 0; i < list.length; i++) {
    if (normalizeFolderName(list[i]) === nc) return 'jasper';
  }
  return 'allendale';
}

function _summerTemplateConfig(templateName) {
  var t = templateName && resolveTemplate_(templateName);
  if (t && t.summerConfig) return t.summerConfig;
  return TEMPLATES['Summer School Week 1+2'].summerConfig;
}

function _summerVariant(scfg, campus) {
  if (scfg && scfg.byDistrict) return scfg.variants[_summerDistrict(campus)] || scfg.variants.allendale;
  return (scfg && scfg.variant) || { subject: CONFIG.SUMMER_SCHOOL.SUBJECT, copy: _summerBodyCopySections };
}

function generateSummerSchoolWeek12Body(teacher, dataRow) {
  return wrapEmailHtml([buildGreeting(teacher), buildSummerSchoolTable(dataRow)].concat(_summerBodyCopySections()));
}

// v2.12.0: consolidated body for a campus where one teacher runs every group
// (CONFIG.SUMMER_SCHOOL.CONSOLIDATE_CAMPUSES). One Group x Week table + same copy.
function generateSummerSchoolConsolidatedBody(campus, entries) {
  return wrapEmailHtml([buildGreeting({ firstName: 'team' }), buildSummerConsolidatedTable(entries)].concat(_summerBodyCopySections()));
}

// v2.12.0: one table for ALL groups of a consolidated campus -- a row per group
// per week (Group, Week, # Students, Avg Active Days, Avg Minutes/Student, Lessons).
function buildSummerConsolidatedTable(entries, weekStarts, weekLabels) {
  var weeks = weekStarts || CONFIG.SUMMER_SCHOOL.WEEK_STARTS;
  var labels = weekLabels || CONFIG.SUMMER_SCHOOL.WEEK_LABELS;
  var sorted = entries.slice().sort(function (a, b) {
    var an = a.teacher || '', bn = b.teacher || '';
    return an < bn ? -1 : (an > bn ? 1 : 0);
  });
  var html = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;text-align:center;font-family:Arial,sans-serif;width:100%;max-width:760px;">';
  html += '<tr style="background-color:#f3f3f3;">'
    + '<th style="padding:8px;text-align:left;">Group</th>'
    + '<th style="padding:8px;text-align:left;">Week</th>'
    + '<th style="padding:8px;"># Students</th>'
    + '<th style="padding:8px;">Avg Active Days</th>'
    + '<th style="padding:8px;">Avg Minutes/Student</th>'
    + '<th style="padding:8px;">Lessons Mastered</th></tr>';
  for (var e = 0; e < sorted.length; e++) {
    var entry = sorted[e];
    var weekData = entry.dataRow || {};
    for (var wi = 0; wi < weeks.length; wi++) {
      var label = labels[wi] || ('Week ' + (wi + 1));
      var d = weekData[weeks[wi]];
      if (!d) {
        html += '<tr>'
          + '<td style="padding:8px;text-align:left;">' + entry.teacher + '</td>'
          + '<td style="padding:8px;text-align:left;">' + label + '</td>'
          + '<td style="padding:8px;">--</td><td style="padding:8px;">--</td><td style="padding:8px;">--</td><td style="padding:8px;">--</td></tr>';
        continue;
      }
      var students = Number(d.students || 0);
      var activeDays = Number(d.activeDays || 0);
      var avgMins = Number(d.minsPerStudent || 0);
      var lessons = Number(d.lessons || 0);
      var daysColor = activeDays >= CONFIG.THRESHOLDS.ACTIVE_DAYS_GREEN ? '#d9ead3' : (activeDays >= CONFIG.THRESHOLDS.ACTIVE_DAYS_YELLOW ? '#fff2cc' : '#f4cccc');
      var minsColor = avgMins >= CONFIG.THRESHOLDS.AVG_MINS_GREEN ? '#d9ead3' : (avgMins >= CONFIG.THRESHOLDS.AVG_MINS_YELLOW ? '#fff2cc' : '#f4cccc');
      html += '<tr>'
        + '<td style="padding:8px;text-align:left;">' + entry.teacher + '</td>'
        + '<td style="padding:8px;text-align:left;">' + label + '</td>'
        + '<td style="padding:8px;">' + students + '</td>'
        + '<td style="padding:8px;background-color:' + daysColor + ';">' + activeDays.toFixed(1) + '</td>'
        + '<td style="padding:8px;background-color:' + minsColor + ';">' + avgMins.toFixed(1) + '</td>'
        + '<td style="padding:8px;">' + lessons + '</td></tr>';
    }
  }
  html += '</table>';
  return html;
}

// ---- Orchestration ----

function generateSummerSchoolSmokeTest() {
  var tpl = getConfigValue('Template');
  var tplEntry = tpl && resolveTemplate_(tpl);
  if (!tplEntry || !tplEntry.summerSchool) tpl = 'Summer School Week 1+2';
  _runSummerSchool({ smokeMode: true, templateName: tpl });
}

// v2.12.0: campuses in CONFIG.SUMMER_SCHOOL.CONSOLIDATE_CAMPUSES get ONE email
// for all their groups (one teacher runs them), not one draft per group.
function _summerIsConsolidated(campus) {
  var list = CONFIG.SUMMER_SCHOOL.CONSOLIDATE_CAMPUSES || [];
  var nc = normalizeFolderName(campus);
  for (var i = 0; i < list.length; i++) {
    if (normalizeFolderName(list[i]) === nc) return true;
  }
  return false;
}

function _summerConsolidatedBanner(campus) {
  return '<div style="background-color:#fff3cd;padding:8px 10px;border-radius:6px;border:1px solid #ffe699;margin:0 0 10px 0;font-size:13px;">'
    + '<strong>To: (fill in).</strong> This email consolidates every group at ' + _esc(campus) + ' (one teacher runs them all). Add the teacher address before sending.'
    + '</div>';
}

function _summerBlankToBanner(campus, teacher) {
  return '<div style="background-color:#fff3cd;padding:8px 10px;border-radius:6px;border:1px solid #ffe699;margin:0 0 10px 0;font-size:13px;">'
    + '<strong>To: (fill in).</strong> No email on file for ' + _esc(teacher) + ' (' + _esc(campus) + '). Add the recipient before sending.'
    + '</div>';
}

function _summerUnassignedBanner(campus) {
  return '<div style="background-color:#fff3cd;padding:8px 10px;border-radius:6px;border:1px solid #ffe699;margin:0 0 10px 0;font-size:13px;">'
    + '<strong>Unassigned students at ' + _esc(campus) + '.</strong> This draft attaches the Unassigned weekly reports. Choose the recipient(s) manually before sending.'
    + '</div>';
}

/**
 * Create one summer-school draft. Attempts the given To (which may be blank);
 * if Gmail rejects an empty recipient, falls back to a draft addressed to the
 * operator (the body already carries a fill-in banner).
 */
function _createSummerDraft(toEmail, subject, htmlBody, pdfs, teacherObj) {
  // v2.15.0 + v2.17.0: summer PDFs become tracked links to the ORIGINALS
  // (doGet serves the bytes server-side; no sharing/copies needed). Any PDF
  // whose URL is unreadable is ATTACHED instead so the teacher still gets it.
  // Fail-open: no web app => links pass through untracked.
  var sMeta = {
    week: 'summer',
    email: toEmail || (teacherObj && teacherObj.email) || '',
    campus: (teacherObj && teacherObj.campus) || '',
    teacher: (teacherObj && (teacherObj.teacher || teacherObj.name)) || ''
  };
  var body = htmlBody;
  var pdfLinks = [];
  var attachFallbacks = [];
  for (var i = 0; i < (pdfs || []).length; i++) {
    var f = pdfs[i];
    var nm = 'report', url = null;
    try { nm = f.getName(); url = f.getUrl(); } catch (_) {}
    if (url) {
      var tracked = buildTrackedUrl(url, {
        week: 'summer', email: sMeta.email, campus: sMeta.campus,
        teacher: sMeta.teacher, linkType: 'pdf'
      });
      pdfLinks.push('<a href="' + tracked + '">&#128196; ' + _esc(nm) + '</a>');
    } else {
      attachFallbacks.push(f);  // no url -> attach original
    }
  }
  if (pdfLinks.length) {
    body += '<div style="margin:16px 0;"><strong>Your weekly report(s):</strong><br>'
      + pdfLinks.join('<br>') + '</div>';
  }
  body = rewriteBodyLinks_(body, sMeta);
  var opts = { htmlBody: body };
  if (attachFallbacks.length) opts.attachments = attachFallbacks;
  var to = toEmail || '';
  try {
    withGmailRetry(function () { GmailApp.createDraft(to, subject, '', opts); });
    logSendEvent({ name: (teacherObj && teacherObj.teacher) || (teacherObj && teacherObj.name) || '',
      email: sMeta.email, campus: sMeta.campus }, 'summer', subject);
    return { success: true };
  } catch (e) {
    var msg = String(e && e.message || e);
    if (!to && /recipient|email|address|empty|invalid/i.test(msg)) {
      try {
        var operator = Session.getActiveUser().getEmail();
        withGmailRetry(function () { GmailApp.createDraft(operator, subject, '', opts); });
        logError('WARN', '_createSummerDraft', teacherObj, 'empty To rejected; drafted to operator with fill-in banner instead', '');
        return { success: true };
      } catch (e2) {
        logError('ERROR', '_createSummerDraft', teacherObj, 'createDraft empty-To fallback failed: ' + (e2.message || e2), '');
        return { success: false, error: (e2.message || e2) };
      }
    }
    logError('ERROR', '_createSummerDraft', teacherObj, 'createDraft failed: ' + msg, e.stack || '');
    return { success: false, error: msg };
  }
}

function _runSummerSchool(opts) {
  var ui = SpreadsheetApp.getUi();
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(0)) {
    ui.alert('Already Running', 'Email generation is already in progress. Please wait for it to finish.', ui.ButtonSet.OK);
    return;
  }
  try {
    _runIdCache = null;
    _runSummerSchoolCore(opts);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Core Summer School generation (NO locking + NO run-id reset; the caller owns
 * those). Called by _runSummerSchool (dedicated smoke test, all schools) and by
 * generateDraftsForCurrentUser (Config Template path, scoped to the IM's
 * School-IM Mapping schools).
 *
 * opts: { smokeMode: bool, allowedCampuses: {normalizedCampus -> true} | null }
 *   - smokeMode true  -> every draft addressed to the operator.
 *   - allowedCampuses -> only folders/Unassigned in those campuses are drafted
 *     (null = every summer campus).
 */
function _runSummerSchoolCore(opts) {
  var ui = SpreadsheetApp.getUi();
  var NL = String.fromCharCode(10);
  var operator = Session.getActiveUser().getEmail();
  var smokeMode = !!(opts && opts.smokeMode);
  var allowed = (opts && opts.allowedCampuses) || null;
  function campusAllowed(campus) {
    return !allowed || allowed[normalizeFolderName(campus)] === true;
  }

  var scfg = _summerTemplateConfig(opts && opts.templateName);
  var weekStarts = scfg.weekStarts, weekLabels = scfg.weekLabels;

  var roster = readSummerRoster();
  var dataByTeacher = readSummerTeacherData(weekStarts);
  // v2.14.0: student-level awards (Final Week only). Cumulative summer fidelity,
  // grouped per (campus,teacher) and per campus. Empty groups when not enabled.
  var fid = scfg.showStudentAwards ? readSummerStudentFidelity() : { byKey: {}, byCampus: {} };
  var tree = traverseSummerPdfTree(weekStarts);

  // Teacher universe = folder teachers UNION roster teachers, keyed by
  // (campus, teacher), filtered to allowedCampuses when scoped.
  var universe = {};
  var k;
  var folderKeys = Object.keys(tree.teachers);
  for (var fi = 0; fi < folderKeys.length; fi++) {
    k = folderKeys[fi];
    var info = tree.teachers[k];
    if (!campusAllowed(info.campus)) continue;
    universe[k] = {
      campus: info.campus, teacher: info.teacher, pdfs: info.pdfs || [],
      email: (roster[k] && roster[k].email) || '', dataRow: dataByTeacher[k] || null
    };
  }
  var rosterKeys = Object.keys(roster);
  for (var ri = 0; ri < rosterKeys.length; ri++) {
    k = rosterKeys[ri];
    if (universe[k]) continue;
    var rinfo = roster[k];
    if (!campusAllowed(rinfo.campus)) continue;
    universe[k] = {
      campus: rinfo.campus, teacher: rinfo.displayName, pdfs: [],
      email: rinfo.email || '', dataRow: dataByTeacher[k] || null
    };
  }
  var universeKeys = Object.keys(universe).sort();

  // v2.12.0: split out CONSOLIDATE_CAMPUSES (e.g. JRHS) -- one email per such
  // campus with all its group PDFs + a single Group x Week table, instead of one
  // draft per group. Everything else stays one draft per teacher/group.
  var consolidated = {};
  var normalKeys = [];
  for (var pk = 0; pk < universeKeys.length; pk++) {
    var pe = universe[universeKeys[pk]];
    if (_summerIsConsolidated(pe.campus)) {
      var cck = normalizeFolderName(pe.campus);
      if (!consolidated[cck]) consolidated[cck] = { campus: pe.campus, entries: [] };
      consolidated[cck].entries.push(pe);
    } else {
      normalKeys.push(universeKeys[pk]);
    }
  }
  var consolidatedCampuses = Object.keys(consolidated);

  var unassigned = [];
  for (var uai = 0; uai < tree.unassigned.length; uai++) {
    if (campusAllowed(tree.unassigned[uai].campus)) unassigned.push(tree.unassigned[uai]);
  }

  if (universeKeys.length === 0 && unassigned.length === 0) {
    ui.alert('Nothing to generate',
      'No Summer School teacher folders or roster rows matched'
      + (allowed ? ' your assigned schools' : '')
      + '. Confirm you have access to the Public School Summer Camp folder plus the two source sheets '
      + '(Email Tools > Debug: Drive Auth), then retry.',
      ui.ButtonSet.OK);
    return;
  }

  var nBlankTo = 0, nNoPdf = 0, nNoData = 0;
  for (var c = 0; c < normalKeys.length; c++) {
    var uu = universe[normalKeys[c]];
    if (!uu.email) nBlankTo++;
    if (!uu.pdfs.length) nNoPdf++;
    if (!uu.dataRow) nNoData++;
  }
  for (var cci = 0; cci < consolidatedCampuses.length; cci++) {
    var cg0 = consolidated[consolidatedCampuses[cci]];
    nBlankTo++;  // consolidated emails are always blank-To (groups have no roster email)
    var anyPdf = false, anyData = false;
    for (var ce0 = 0; ce0 < cg0.entries.length; ce0++) {
      if (cg0.entries[ce0].pdfs && cg0.entries[ce0].pdfs.length) anyPdf = true;
      if (cg0.entries[ce0].dataRow) anyData = true;
    }
    if (!anyPdf) nNoPdf++;
    if (!anyData) nNoData++;
  }

  var scopeLine = '';
  if (allowed) {
    var campusNames = {};
    for (var scc = 0; scc < universeKeys.length; scc++) campusNames[universe[universeKeys[scc]].campus] = true;
    for (var su = 0; su < unassigned.length; su++) campusNames[unassigned[su].campus] = true;
    scopeLine = 'Your schools: ' + Object.keys(campusNames).sort().join('; ') + NL;
  }

  var msg = (smokeMode ? 'SMOKE TEST: every draft goes to YOU (' + operator + ').' + NL + NL : '')
    + (((opts && opts.templateName) || 'Summer School') + ':') + NL + NL
    + scopeLine
    + 'Teacher/group drafts: ' + (normalKeys.length + consolidatedCampuses.length)
      + (consolidatedCampuses.length ? ' (incl. ' + consolidatedCampuses.length + ' consolidated school email(s))' : '') + NL
    + 'Unassigned drafts: ' + unassigned.length + NL
    + 'Blank To (no roster email): ' + nBlankTo + NL
    + 'No PDF attached: ' + nNoPdf + NL
    + 'No data table: ' + nNoData + NL + NL
    + 'Drafts land in YOUR Gmail (' + operator + ').' + NL + 'Proceed?';
  if (ui.alert('Confirm Summer School Generation', msg, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  var success = 0, failC = 0, errors = [];

  for (var t = 0; t < normalKeys.length; t++) {
    var u = universe[normalKeys[t]];
    var teacherObj = { name: u.teacher, firstName: _summerFirstName(u.teacher), campus: u.campus };
    try {
      var v = _summerVariant(scfg, u.campus);
      var copySections = scfg.showStudentAwards
        ? ['<h3 style="color:#1a1a1a;margin:16px 0 4px 0;">Summer Achievement Awards</h3>', buildSummerStudentAwards(fid.byKey[normalKeys[t]] || [])].concat(v.copy())
        : v.copy();
      var body = _summerComposeBody(teacherObj, buildSummerSchoolTable(u.dataRow, weekStarts, weekLabels), copySections);
      var toEmail;
      if (smokeMode) { toEmail = operator; }
      else if (u.email) { toEmail = u.email; }
      else { toEmail = ''; body = _summerBlankToBanner(u.campus, u.teacher) + body; }
      var res = _createSummerDraft(toEmail, v.subject, body, u.pdfs, teacherObj);
      if (res.success) success++;
      else { failC++; errors.push(u.campus + ' / ' + u.teacher + ': ' + res.error); }
    } catch (e) {
      failC++; errors.push(u.campus + ' / ' + u.teacher + ': ' + (e.message || e));
    }
  }

  for (var ci = 0; ci < consolidatedCampuses.length; ci++) {
    var cgrp = consolidated[consolidatedCampuses[ci]];
    var cObj = { name: cgrp.campus + ' (all groups)', firstName: 'team', campus: cgrp.campus };
    try {
      var cEntries = cgrp.entries.slice().sort(function (a, b) {
        var an = a.teacher || '', bn = b.teacher || '';
        return an < bn ? -1 : (an > bn ? 1 : 0);
      });
      var cPdfs = [];
      for (var cee = 0; cee < cEntries.length; cee++) {
        var ep = cEntries[cee].pdfs || [];
        for (var ppi = 0; ppi < ep.length; ppi++) cPdfs.push(ep[ppi]);
      }
      var cv = _summerVariant(scfg, cgrp.campus);
      var cCopy = scfg.showStudentAwards
        ? ['<h3 style="color:#1a1a1a;margin:16px 0 4px 0;">Summer Achievement Awards</h3>', buildSummerStudentAwards(fid.byCampus[normalizeFolderName(cgrp.campus)] || [])].concat(cv.copy())
        : cv.copy();
      var cBody = _summerComposeBody(cObj, buildSummerConsolidatedTable(cEntries, weekStarts, weekLabels), cCopy);
      var cTo;
      if (smokeMode) { cTo = operator; }
      else { cTo = ''; cBody = _summerConsolidatedBanner(cgrp.campus) + cBody; }
      var cRes = _createSummerDraft(cTo, cv.subject + ' (' + cgrp.campus + ' - all groups)', cBody, cPdfs, cObj);
      if (cRes.success) success++;
      else { failC++; errors.push('Consolidated / ' + cgrp.campus + ': ' + cRes.error); }
    } catch (e) {
      failC++; errors.push('Consolidated / ' + cgrp.campus + ': ' + (e.message || e));
    }
  }

  for (var ua = 0; ua < unassigned.length; ua++) {
    var un = unassigned[ua];
    var unObj = { name: 'Unassigned (' + un.campus + ')', firstName: 'team', campus: un.campus };
    try {
      var uv = _summerVariant(scfg, un.campus);
      var unBody = _summerUnassignedBanner(un.campus) + _summerComposeBody(unObj, buildSummerSchoolTable(null, weekStarts, weekLabels), uv.copy());
      var unTo = smokeMode ? operator : '';
      var unRes = _createSummerDraft(unTo, uv.subject + ' (Unassigned: ' + un.campus + ')', unBody, un.pdfs, unObj);
      if (unRes.success) success++;
      else { failC++; errors.push('Unassigned / ' + un.campus + ': ' + unRes.error); }
    } catch (e) {
      failC++; errors.push('Unassigned / ' + un.campus + ': ' + (e.message || e));
    }
  }

  var done = (smokeMode ? 'SMOKE TEST complete. ' : 'Summer School complete. ')
    + success + ' drafts created in your Gmail, ' + failC + ' failed.';
  if (errors.length > 0) {
    var es = errors.join(' | ');
    if (es.length > CONFIG.LIMITS.ERROR_MSG_TRUNCATE) {
      console.log('Full summer-school error list:' + NL + errors.join(NL));
      es = es.substring(0, CONFIG.LIMITS.ERROR_MSG_TRUNCATE) + '... (' + errors.length + ' total; see logs)';
    }
    done += NL + NL + 'Errors: ' + es;
  }
  done += NL + NL + 'Open Gmail Drafts to review the To, the data table, and the attached PDFs.';
  ui.alert('Done', done, ui.ButtonSet.OK);
}


// ============================================
// SY26-27 WEEKLY TEMPLATES (Weeks 1-9)  [v2.21.0]
// ============================================
// Copy + links are transcribed from the shared Google Doc
// "26_27 Implementation Emails" (1pKkcEnP-Ljt6MtZ7ukdLzsfxSrbG8nqEz4__xMyqohw),
// tabs UPD_WK 1..UPD_WK 7 + Week 8 + Week 9.
//
// One spec table drives nine bodies so the weeks can't drift into nine
// near-identical copies of the same HTML. To add Weeks 10-18 later: add spec
// entries, a generate2627WeekNBody wrapper, and a TEMPLATES key.
//
// Doc structure -> spec field:
//   "Focus: ..."                     -> focus (internal label, not rendered)
//   "Subject: ..."                   -> subject (lives on the TEMPLATES entry)
//   line under <<Teacher Data Table>> -> dataLine (caption under the metrics table)
//   "Weekly Focus: ..."              -> focusTitle
//   "✅ ..." + following sentence     -> action + actionDetail
//   Watch / View the ... links       -> video / infographic
//   Resources                        -> aim (optional) + materials + Teacher Hub
var WEEK_SPECS_2627 = {
  1: {
    subject: 'Studient: Week 1: Let\'s Launch!',
    focus: 'Relationship Foundations + Emotional Safety',
    dataLine: '',
    focusTitle: 'Fostering a Growth Mindset Culture',
    action: 'Coach for growth',
    actionDetail: 'Strengthen perseverance, productive risk-taking, and progress over perfection.',
    videoText: 'Teacher Language That Builds Confident Learners',
    videoUrl: 'https://canva.link/odeniz479l85fy3',
    infographicText: 'Growth Mindset Infographic',
    infographicUrl: 'https://drive.google.com/file/d/1q88wfKpj7rRLz0lbLCp6L3uONU22knSd/view?usp=sharing',
    aimUrl: 'https://www.canva.com/design/DAHCV6eulqc/3oEsttJjNc0jO49KYHLyfw/view?utm_content=DAHCV6eulqc&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h5cacee9c30',
    aimMaterials: 'Sticky Notes, Stopwatch (Motivention Clock), Measuring Tape'
  },
  2: {
    subject: 'Studient: Teach It. Check It. Repeat It.',
    focus: 'Explicit Expectations + Predictable Routines',
    dataLine: 'Utilizing objective metrics to guide targeted instruction, practice, and intervention.',
    focusTitle: 'Clarity builds mastery',
    action: 'Create consistency that supports mastery',
    actionDetail: 'Reinforce visible, accessible, and repeatable learning.',
    videoText: 'Less cognitive load, more lightbulb moments',
    videoUrl: 'https://canva.link/3ba5xdlt06j4xvj',
    infographicText: 'Building Mastery Infographic',
    infographicUrl: 'https://drive.google.com/file/d/1L_Gui6-Yaudf3hZOieWhwQE4Fa-tuara/view?usp=sharing',
    aimUrl: 'https://www.canva.com/design/DAHC0PQ5IKg/SCAKPRLE5bzKgZ5rJoeqbA/view?utm_content=DAHC0PQ5IKg&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hed034bb29b',
    aimMaterials: 'Stopwatch (Motivention Clock), Printer Paper, Measuring Tape, Empty Trash Can/Box, Plastic Cups'
  },
  3: {
    subject: 'Studient: Persistence Starts with Presence',
    focus: 'Fostering Persistence through Productive Struggle',
    dataLine: 'Monitoring platform data to identify emerging frustration and reinforce a beginner\'s mindset.',
    focusTitle: 'Persistence',
    action: 'Reinforce persistence and respond early.',
    actionDetail: 'Encourage sustained engagement and confidence during productive struggle.',
    videoText: 'How This One \'Data Hack\' Unlocks the Beginner\'s Brain',
    videoUrl: 'https://canva.link/wsqbejf3c6eylrf',
    infographicText: 'Persistence Infographic',
    infographicUrl: 'https://drive.google.com/file/d/1uW9-BhUx5MCMybSLa1jtv2XV95kwDvVZ/view?usp=sharing',
    aimUrl: 'https://www.canva.com/design/DAHDeEQyjI0/UESk6Vp4GScPIiS7Xjdhfw/view?utm_content=DAHDeEQyjI0&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=he8b086611c',
    aimMaterials: 'Stopwatch (Motivention Clock), Construction Paper, Measuring Tape, Pencils, Clothespins/Clips, Plastic Cups (6), Pom Poms, Ping Pong Balls, Paper Labels for corners (how, why, what if, I wonder)'
  },
  4: {
    subject: 'Studient: Cultivating the "Yet"',
    focus: 'Fostering Student Ownership Through Reflection',
    dataLine: 'Integrating objective evidence into restorative conversations to support reflection and action planning.',
    focusTitle: 'Reflection',
    action: 'Build ownership through action.',
    actionDetail: 'Cultivate student ownership through reflection and goal-directed action.',
    videoText: 'The \'Yet\' Cheat Code',
    videoUrl: 'https://canva.link/c8050scyhcjgnj6',
    infographicText: 'Cultivating the "Yet" Infographic',
    infographicUrl: 'https://drive.google.com/file/d/15XoQSkSEj-kQ2v1-BEg0Y8lXF1yMMYsu/view?usp=sharing',
    aimUrl: 'https://www.canva.com/design/DAHDjdCSoBE/ZhB3f6k-dMvNMQ9QtNT0iA/view?utm_content=DAHDjdCSoBE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd9e0f0c72b',
    aimMaterials: 'Paper, Pencils'
  },
  5: {
    subject: 'Studient: Changing the Learning Narrative',
    focus: 'Success data rewrites beliefs',
    dataLine: 'Using student performance data to reinforce growth, identify support needs, and inform instructional decisions.',
    focusTitle: 'Learning Narratives',
    action: 'Coach Productive Learning Narratives',
    actionDetail: 'Building learner confidence through visible evidence of growth, effort, and achievement.',
    videoText: 'The "I Can\'t" Cure: 3 Moves to Rewrite Student Narratives',
    videoUrl: 'https://canva.link/3vufcvbip3n6y8i',
    infographicText: 'Learning Narrative Infographic',
    infographicUrl: 'https://drive.google.com/file/d/13Mh--BQF5HSwVOEHDxLJ5T0FKSALm1uq/view?usp=sharing',
    aimUrl: 'https://www.canva.com/design/DAHDyS0iyd8/cMK174HeOxUmagRJvojT6Q/view?utm_content=DAHDyS0iyd8&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h3e9c4fa347#2',
    aimMaterials: 'Paper, Pencils, Stopwatch (Motivention Clock), Sticky Notes/Cards labeled (excited, annoyed, scared, nervous, rude, shy)'
  },
  6: {
    subject: 'Studient: How to make "struggling" the best part of your class.',
    focus: 'Embrace the friction of learning',
    dataLine: 'Interpreting platform data to recognize productive struggle, guide responsive coaching, and reinforce sustained effort.',
    focusTitle: 'Persistent Engagement',
    action: 'Build persistence during struggle',
    actionDetail: 'Developing learner perseverance through strategic problem-solving and sustained effort.',
    videoText: 'Embracing the Friction of Learning',
    videoUrl: 'https://canva.link/6d5epb3qbi31dgd',
    infographicText: 'Persistence Infographic',
    infographicUrl: 'https://drive.google.com/file/d/1buTjSQAUk3ZLvKT1kPQgt6LmkkO8IfmV/view?usp=sharing',
    aimUrl: 'https://www.canva.com/design/DAHD3NLIJ9k/SK2vLZcgFXR-T3o1i539Rw/view?utm_content=DAHD3NLIJ9k&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hffe456c812',
    aimMaterials: 'Four Corner Labels, Stopwatch (Motivention Clock), Scissors, Pencils, Ping Pong Balls, Rubber Bands, Plastic Cups, Straws, Painters Tape, Spoons, Tape, String, Cardboard, Paperclips, Index Cards'
  },
  7: {
    subject: 'Studient: Build Curious, Unstoppable Problem-Solvers',
    focus: 'Data as the Map, Effort as the Engine',
    dataLine: 'Analyzing platform data to guide responsive instruction, personalize feedback, and support continuous student growth.',
    focusTitle: 'Persistent Engagement',
    action: 'Provide Actionable Feedback',
    actionDetail: 'Promoting the effective use of feedback to strengthen strategy and student ownership.',
    videoText: 'Why the First Draft Needs to Fail',
    videoUrl: 'https://canva.link/f5bfq425coloeoa',
    infographicText: 'Data Driven Decisions Infographic',
    infographicUrl: 'https://drive.google.com/drive/folders/1M3pc_Ax3mAIDIJKqbIjmUoaz2uteXh27',
    // Weeks 7-9 carry no AIM Launch link in the doc; the Teacher Hub entry
    // covers "AIM launches and needed materials" for those weeks instead.
    aimUrl: '',
    aimMaterials: ''
  },
  8: {
    subject: 'Studient: Turn a "miss" into a roadmap.',
    focus: 'The Curious Learner',
    dataLine: 'Interpreting platform data to identify learning gaps, guide responsive supports, and provide actionable feedback.',
    focusTitle: 'Misses as Roadmaps',
    action: 'Focus on Continuous Improvement',
    actionDetail: 'Reflecting on mistakes, feedback, and challenges to refine strategies, close learning gaps, and build confidence.',
    videoText: 'Do your students see roadblocks or roadmaps?',
    videoUrl: 'https://canva.link/n93k6c5z2798rrh',
    infographicText: 'Curiosity Infographic',
    infographicUrl: 'https://drive.google.com/file/d/11MoVqhgNBgpKb6MDpVO7VeLdf5wY5z0h/view?usp=drive_link',
    aimUrl: '',
    aimMaterials: ''
  },
  9: {
    subject: 'Studient: Stop hoping for confidence. Start building it.',
    focus: 'Building Confidence Through Evidence',
    dataLine: 'Leveraging student data to monitor growth, inform coaching, and celebrate progress.',
    focusTitle: 'Confidence is built, not given.',
    action: 'Have Students Use Evidence to Explain Their Learning',
    actionDetail: 'Using personal data, reflection, and evidence of growth to set goals, recognize progress, and build earned confidence.',
    videoText: 'Flip the Script on Student Apathy',
    videoUrl: 'https://canva.link/qjpq162elmefuns',
    infographicText: 'Confidence Infographic',
    infographicUrl: 'https://drive.google.com/drive/folders/1181PLU6vbcMMD3SZqBiLTH-VaXj188GT',
    aimUrl: '',
    aimMaterials: ''
  }
};

var TIMEBACK_PLATFORM_URL_2627 = 'https://alpha.timeback.com/login';
var TEACHER_HUB_URL_2627 = 'https://studient.com/teacher';

// "This week's moves" block: the same content offered as a 60-second video or a
// skimmable infographic.
function _build2627Moves(spec) {
  return '<h3 style="color:#1a1a1a;">This week\'s moves ⬇️</h3>'
    + '<p style="margin:0 0 8px 0;color:#666;"><em>(Same content, two ways)</em></p>'
    + '<p>🎬 <strong>Got 60 seconds?</strong> Watch: '
    + '<a href="' + spec.videoUrl + '">' + spec.videoText + '</a></p>'
    + '<p>📊 <strong>Prefer to skim?</strong> View the '
    + '<a href="' + spec.infographicUrl + '">' + spec.infographicText + '</a>'
    // Doc copy uses an em dash here; repo style bans it (see the summer-copy
    // "no em dash" tests), so it ships as a hyphen.
    + ' - easy to save or print</p>'
    + '<p>⏰ <a href="' + TIMEBACK_PLATFORM_URL_2627 + '">Access Timeback Platform</a></p>';
}

// Resources list for the 26-27 weeks. Deliberately NOT buildResourcesSection():
// that helper hardcodes SY25-26 items (Pomodoro portal, ELA/Math Goal Trackers)
// the new doc doesn't list. The weekly PDF still ships, so it stays listed.
function _build2627Resources(spec) {
  var html = '<h3 style="color:#1a1a1a;">📚 Resources</h3><ul style="padding-left:20px;">';
  // Since v2.16.0 the weekly PDF ships as the tracked "View your weekly report
  // (PDF)" button that _injectPdfCta puts under the greeting, NOT as an
  // attachment. Don't copy buildResourcesSection's stale "(Attached)" wording.
  html += '<li><strong>Teacher Data Deep Dive:</strong> the "View your weekly report (PDF)" button above</li>';
  if (spec.aimUrl) {
    html += '<li><a href="' + spec.aimUrl + '">AIM Launch Link</a>';
    if (spec.aimMaterials) {
      html += '<br><em>Needed Materials:</em> ' + spec.aimMaterials;
    }
    html += '</li>';
  }
  html += '<li><a href="' + TEACHER_HUB_URL_2627 + '">Teacher Hub</a>'
    + '<br><em>Find here Focus Clock, AIM launches and needed materials, goal sheets, resources, and more.</em></li>';
  html += '</ul>';
  return html;
}

function _build2627Body(teacher, metricsArray, week) {
  // v2.22.0: synced (manager-edited) spec wins; hardcoded spec is the fallback.
  var spec = _getSpec2627_(week);
  if (!spec) throw new Error('No 26-27 spec for week ' + week);
  return _build2627BodyFromSpec(teacher, metricsArray, spec);
}

/** Render a 26-27 weekly body from a spec object (hardcoded or synced). */
function _build2627BodyFromSpec(teacher, metricsArray, spec) {
  var sections = [
    buildGreeting(teacher),
    '<h2 style="color:#1a1a1a;">Average Active Days in Motivention</h2>',
    buildMetricsTable(teacher, metricsArray),
    '<br>',
    buildColorLegend(),
    buildTrendAlert(metricsArray)
  ];
  // Week 1 has no caption line under the data table in the doc.
  if (spec.dataLine) {
    sections.push('<p style="color:#555;"><em>' + spec.dataLine + '</em></p>');
  }
  sections.push('<h2 style="color:#1a1a1a;">🎯 Weekly Focus: ' + spec.focusTitle + '</h2>');
  sections.push('<p>' + dotSpan('#2e7d32') + '<strong>' + spec.action + '</strong><br>'
    + spec.actionDetail + '</p>');
  sections.push(_build2627Moves(spec));
  sections.push(_build2627Resources(spec));
  return wrapEmailHtml(sections);
}

function generate2627Week1Body(teacher, metricsArray) { return _build2627Body(teacher, metricsArray, 1); }
function generate2627Week2Body(teacher, metricsArray) { return _build2627Body(teacher, metricsArray, 2); }
function generate2627Week3Body(teacher, metricsArray) { return _build2627Body(teacher, metricsArray, 3); }
function generate2627Week4Body(teacher, metricsArray) { return _build2627Body(teacher, metricsArray, 4); }
function generate2627Week5Body(teacher, metricsArray) { return _build2627Body(teacher, metricsArray, 5); }
function generate2627Week6Body(teacher, metricsArray) { return _build2627Body(teacher, metricsArray, 6); }
function generate2627Week7Body(teacher, metricsArray) { return _build2627Body(teacher, metricsArray, 7); }
function generate2627Week8Body(teacher, metricsArray) { return _build2627Body(teacher, metricsArray, 8); }
function generate2627Week9Body(teacher, metricsArray) { return _build2627Body(teacher, metricsArray, 9); }


// ============================================
// v2.22.0 — TEMPLATE SYNC FROM THE 26-27 DOC
// ============================================
// Managers author weekly content in the shared "26_27 Implementation Emails"
// Doc (CONFIG.TEMPLATE_DOC_ID). "Email Tools > Templates: Sync from 26-27 Doc"
// parses every week tab (UPD_WK N / Week N; UPD_WK wins for the same N),
// validates it, previews the result, and on YES writes the parsed specs to the
// Template Content tab - which resolveTemplate_/_getSpec2627_ read at draft
// time. A week that fails validation is SKIPPED (previous synced content, or
// the hardcoded fallback, keeps serving) - bad formatting can never reach a
// teacher's inbox.
//
// Doc structure contract per week tab (what the parser needs):
//   "Subject: <text>"                       -> subject (ends at the 🎯 emoji if same line)
//   "Weekly Focus: <bold title>"            -> focusTitle (bold run; non-bold text after it = actionDetail)
//   "✅<bold action>"                        -> action (bold run after the check; non-bold remainder = actionDetail)
//   <<Teacher Data Table>> [text]           -> dataLine (same line or the next line; optional)
//   🎬 line with a link                      -> video text + URL (required)
//   📊 line with a link                      -> infographic text + URL (required; bold label used when the link text is empty)
//   link whose text contains "AIM Launch"   -> aimUrl (optional)
//   "Needed Materials: <list>"              -> aimMaterials (optional)
// Timeback + Teacher Hub links stay code-owned constants.

var TEMPLATE_CONTENT_HEADERS = [
  'week', 'template_name', 'subject', 'focus_title', 'action', 'action_detail',
  'data_line', 'video_text', 'video_url', 'infographic_text', 'infographic_url',
  'aim_url', 'aim_materials', 'synced_at', 'synced_by'
];

/** Clean a parsed field: em dash -> hyphen (repo style rule), collapse whitespace, fix doubled commas. */
function _cleanField2627_(s) {
  return String(s || '')
    .replace(/—/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim();
}

/**
 * Parse one week tab's extracted lines into a spec. PURE (node-testable).
 * @param {Array<{runs: Array<{text, bold, url}>}>} lines
 * @return {{spec: Object, errors: string[]}}
 */
function _parseWeekLines_(lines) {
  var spec = {
    templateName: '', subject: '', focusTitle: '', action: '', actionDetail: '',
    dataLine: '', videoText: '', videoUrl: '', infographicText: '',
    infographicUrl: '', aimUrl: '', aimMaterials: ''
  };
  var errors = [];
  var detailFromFocusLine = '', detailAfterAction = '';
  var pendingDataLine = false;

  function textOf(line) {
    var s = '';
    for (var i = 0; i < line.runs.length; i++) s += line.runs[i].text;
    return s;
  }
  function charFlags(line) {
    var flags = [];
    for (var i = 0; i < line.runs.length; i++) {
      var r = line.runs[i];
      for (var c = 0; c < r.text.length; c++) flags.push({ bold: !!r.bold, url: r.url || '' });
    }
    return flags;
  }

  for (var li = 0; li < lines.length; li++) {
    var line = lines[li];
    var text = textOf(line);
    var trimmed = text.trim();
    if (!trimmed) continue;
    var flags = charFlags(line);

    // dataLine continuation: the first suitable line after a bare marker line.
    if (pendingDataLine && !spec.dataLine) {
      if (text.indexOf('Subject:') < 0 && text.indexOf('Weekly Focus') < 0
          && text.indexOf('✅') < 0 && text.indexOf('🎯') < 0) {
        spec.dataLine = _cleanField2627_(trimmed.replace(/^['’\s]+/, ''));
      }
      pendingDataLine = false;
    }

    // Subject (ends at the 🎯 emoji or the <<...>> marker when the doc merges
    // lines into one paragraph - both merges exist in the live doc)
    if (!spec.subject) {
      var sm = text.indexOf('Subject:');
      if (sm >= 0) {
        var rest = text.slice(sm + 'Subject:'.length);
        var cut = rest.indexOf('🎯');
        if (cut >= 0) rest = rest.slice(0, cut);
        var cut2 = rest.indexOf('<<');
        if (cut2 >= 0) rest = rest.slice(0, cut2);
        spec.subject = _cleanField2627_(rest);
      }
    }

    // <<Teacher Data Table>> marker: caption on the same line, or the next line.
    var mk = text.indexOf('<<Teacher Data Table>>');
    if (mk >= 0 && !spec.dataLine) {
      var after = text.slice(mk + '<<Teacher Data Table>>'.length).replace(/^['’\s]+/, '');
      if (after.trim()) spec.dataLine = _cleanField2627_(after);
      else pendingDataLine = true;
    }

    // Weekly Focus: bold title; non-bold remainder on the line = detail candidate.
    var wf = text.indexOf('Weekly Focus:');
    if (wf >= 0 && !spec.focusTitle) {
      var start = wf + 'Weekly Focus:'.length;
      while (start < text.length && text[start] === ' ') start++;
      var checkIdx = text.indexOf('✅', start);
      var boldEnd = start;
      while (boldEnd < text.length && flags[boldEnd] && flags[boldEnd].bold) boldEnd++;
      var titleEnd;
      if (boldEnd > start) titleEnd = (checkIdx >= 0 && checkIdx < boldEnd) ? checkIdx : boldEnd;
      else titleEnd = (checkIdx >= 0) ? checkIdx : text.length;
      spec.focusTitle = _cleanField2627_(text.slice(start, titleEnd));
      var candEnd = (checkIdx >= 0) ? checkIdx : text.length;
      if (candEnd > titleEnd) {
        var cand = _cleanField2627_(text.slice(titleEnd, candEnd));
        if (cand) detailFromFocusLine = cand;
      }
    }

    // ✅ action: the bold segment after the check. Adjacent bold ("This week's
    // moves") is fenced off explicitly since char-level bold can't split it.
    var ck = text.indexOf('✅');
    if (ck >= 0 && !spec.action) {
      var as = ck + 1;
      while (as < text.length && (text[as] === ' ' || text[as] === '✅')) as++;
      var ae = as;
      while (ae < text.length && flags[ae] && flags[ae].bold) ae++;
      if (ae === as) ae = text.length;  // action not bolded: take the rest of the line
      var tw = text.indexOf('This week', as);
      if (tw >= 0 && tw < ae) ae = tw;
      spec.action = _cleanField2627_(text.slice(as, ae));
      var rem = _cleanField2627_(text.slice(ae));
      if (rem && rem.indexOf('This week') !== 0 && rem.indexOf('(Same content') !== 0) {
        detailAfterAction = rem;
      }
    }

    // Run offsets: first link AT/AFTER an anchor position. The doc merges 🎬
    // and 📊 into one paragraph in several weeks, so "first link on the line"
    // is wrong; and wk8 carries a ZERO-WIDTH link (empty text run), which a
    // char scan can never see - hence run-offset based selection.
    function firstLinkFrom(anchorIdx) {
      var off = 0, url = '';
      for (var fr = 0; fr < line.runs.length; fr++) {
        var r = line.runs[fr];
        var end = off + r.text.length;
        var covers = r.text.length ? (end > anchorIdx) : (off >= anchorIdx);
        if (r.url && covers) { url = r.url; break; }
        off = end;
      }
      if (!url) return null;
      var txt = '', off2 = 0;
      for (var fr2 = 0; fr2 < line.runs.length; fr2++) {
        var r2 = line.runs[fr2];
        var end2 = off2 + r2.text.length;
        var covers2 = r2.text.length ? (end2 > anchorIdx) : (off2 >= anchorIdx);
        if (r2.url === url && covers2) txt += r2.text;
        off2 = end2;
      }
      return { url: url, text: txt };
    }

    // 🎬 video
    if (!spec.videoUrl && (text.indexOf('🎬') >= 0 || text.indexOf('Watch:') >= 0)) {
      var vIdx = text.indexOf('🎬');
      if (vIdx < 0) vIdx = text.indexOf('Watch:');
      var vlink = firstLinkFrom(vIdx);
      if (vlink) {
        spec.videoUrl = vlink.url;
        spec.videoText = _cleanField2627_(vlink.text) || 'Watch the 60-second video';
      }
    }

    // 📊 infographic: when the link text is empty/whitespace (wk8 pattern:
    // bold label + zero-width link), use the bold text after "View the".
    if (!spec.infographicUrl && text.indexOf('📊') >= 0) {
      var pIdx = text.indexOf('📊');
      var ilink = firstLinkFrom(pIdx);
      if (ilink) {
        spec.infographicUrl = ilink.url;
        var itext = _cleanField2627_(ilink.text);
        if (!itext) {
          var vt = text.indexOf('View the');
          var from = vt >= 0 ? vt + 'View the'.length : pIdx;
          var bs = '';
          for (var c2 = from; c2 < text.length; c2++) {
            if (flags[c2] && flags[c2].bold) bs += text[c2];
          }
          itext = _cleanField2627_(bs);
        }
        spec.infographicText = itext || 'Infographic';
      }
    }

    // AIM Launch link (optional; weeks 7+ point teachers at the Hub instead)
    if (!spec.aimUrl) {
      var aimTxt = '', aimUrl = '';
      for (var ar = 0; ar < line.runs.length; ar++) {
        var ra = line.runs[ar];
        if (ra.url) { aimTxt += ra.text; if (!aimUrl) aimUrl = ra.url; }
      }
      if (aimUrl && /AIM Launch/i.test(aimTxt)) spec.aimUrl = aimUrl;
    }

    // Needed Materials (optional). The doc sometimes merges the following
    // "- Teacher Hub" bullet into the same paragraph - cut it off.
    if (!spec.aimMaterials) {
      var nm = text.indexOf('Needed Materials:');
      if (nm >= 0) {
        var mats = text.slice(nm + 'Needed Materials:'.length);
        var th = mats.indexOf('- Teacher Hub');
        if (th < 0) th = mats.indexOf('Teacher Hub');
        if (th >= 0) mats = mats.slice(0, th);
        spec.aimMaterials = _cleanField2627_(mats).replace(/\s*-\s*$/, '');
      }
    }
  }

  spec.actionDetail = detailAfterAction || detailFromFocusLine || '';

  if (!spec.subject) errors.push('no "Subject:" line');
  if (!spec.focusTitle) errors.push('no "Weekly Focus:" line');
  if (!spec.action) errors.push('no ✅ action line');
  if (!/^https:\/\//.test(spec.videoUrl)) errors.push('no video link on the 🎬 line');
  if (!/^https:\/\//.test(spec.infographicUrl)) errors.push('no infographic link on the 📊 line');
  if (spec.aimUrl && !/^https:\/\//.test(spec.aimUrl)) errors.push('AIM link is not https');
  var joined = spec.subject + spec.focusTitle + spec.action + spec.actionDetail + spec.dataLine;
  if (joined.indexOf('_____') >= 0) errors.push('unfilled blank (_____) in content');
  if (joined.indexOf('<<') >= 0) errors.push('unresolved << >> marker in content');

  return { spec: spec, errors: errors };
}

/** Flatten a doc tab body into the runs model _parseWeekLines_ consumes. */
function _extractTabLines_(documentTab) {
  var body = documentTab.getBody();
  var lines = [];
  for (var i = 0; i < body.getNumChildren(); i++) {
    var child = body.getChild(i);
    var t = child.getType();
    if (t !== DocumentApp.ElementType.PARAGRAPH && t !== DocumentApp.ElementType.LIST_ITEM) continue;
    var textEl = child.editAsText();
    var full = textEl.getText();
    if (!full) { lines.push({ runs: [] }); continue; }
    var idx = textEl.getTextAttributeIndices();
    var runs = [];
    for (var j = 0; j < idx.length; j++) {
      var start = idx[j];
      var end = (j + 1 < idx.length) ? idx[j + 1] : full.length;
      runs.push({
        text: full.substring(start, end),
        bold: textEl.isBold(start) === true,
        url: textEl.getLinkUrl(start) || ''
      });
    }
    lines.push({ runs: runs });
  }
  return lines;
}

/** Walk the doc's (nested) tabs; return {week: Tab}. UPD_WK N beats Week N. */
function _collectWeekTabs_(doc) {
  var found = {};
  function walk(tabs) {
    for (var i = 0; i < tabs.length; i++) {
      var title = String(tabs[i].getTitle() || '').trim();
      var m = /^(UPD_WK|Week)\s*(\d+)$/i.exec(title);
      if (m) {
        var w = Number(m[2]);
        var isUpd = /^UPD/i.test(m[1]);
        if (!found[w] || (isUpd && !found[w].upd)) found[w] = { tab: tabs[i], upd: isUpd };
      }
      walk(tabs[i].getChildTabs());
    }
  }
  walk(doc.getTabs());
  return found;
}

/** Full rewrite of the Template Content tab from a {week: spec} map. */
function _writeTemplateContentTab_(specsByWeek) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.TEMPLATE_CONTENT_TAB);
  if (!sheet) sheet = ss.insertSheet(CONFIG.TEMPLATE_CONTENT_TAB);
  sheet.clear();
  var now = Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd HH:mm');
  var user = Session.getActiveUser().getEmail();
  var rows = [TEMPLATE_CONTENT_HEADERS];
  Object.keys(specsByWeek).map(Number).sort(function (a, b) { return a - b; }).forEach(function (w) {
    var s = specsByWeek[w];
    rows.push([
      w, s.templateName || ('26-27 Week ' + w + ': ' + s.focusTitle), s.subject,
      s.focusTitle, s.action, s.actionDetail, s.dataLine, s.videoText, s.videoUrl,
      s.infographicText, s.infographicUrl, s.aimUrl, s.aimMaterials, now, user
    ]);
  });
  sheet.getRange(1, 1, rows.length, TEMPLATE_CONTENT_HEADERS.length).setValues(rows);
  sheet.setFrozenRows(1);
}

/**
 * Menu entry: parse the 26-27 Doc, preview per-week results, and on YES write
 * the Template Content tab + refresh the dropdown. Skipped weeks keep whatever
 * they serve today (previous synced row, or the hardcoded fallback).
 */
function syncTemplatesFromDoc() {
  var ui = SpreadsheetApp.getUi();
  var doc;
  try {
    doc = DocumentApp.openById(CONFIG.TEMPLATE_DOC_ID);
  } catch (e) {
    // v2.22.1: the common cause is a stale OAuth grant (the script gained the
    // Google Docs permission in v2.22.0; older grants predate it), NOT doc
    // sharing - the first IM to hit this OWNED the doc. Explicit oauthScopes
    // in the manifest now force the re-auth prompt up front, so this catch
    // should be rare; keep both explanations, re-auth first.
    ui.alert('Error',
      'Cannot open the 26_27 Implementation Emails doc.\n\n'
      + 'Most likely fix: the script needs you to RE-AUTHORIZE with its new Google Docs permission. '
      + 'Close this dialog, click the menu item again, and approve the authorization window when it appears. '
      + 'If no window appears, open a Google Sheets incognito-free tab, reload the spreadsheet, and retry.\n\n'
      + 'If you have re-authorized and still see this: confirm you have at least view access to the doc.\n\n'
      + 'Details: ' + (e.message || e),
      ui.ButtonSet.OK);
    return;
  }

  var tabs = _collectWeekTabs_(doc);
  var weeks = Object.keys(tabs).map(Number).sort(function (a, b) { return a - b; });
  if (weeks.length === 0) {
    ui.alert('Error', 'No week tabs (UPD_WK N / Week N) found in the doc.', ui.ButtonSet.OK);
    return;
  }

  var ok = {};
  var report = [];
  for (var i = 0; i < weeks.length; i++) {
    var w = weeks[i];
    try {
      var parsed = _parseWeekLines_(_extractTabLines_(tabs[w].tab.asDocumentTab()));
      if (parsed.errors.length > 0) {
        report.push('Week ' + w + ': SKIPPED - ' + parsed.errors.join('; '));
      } else {
        parsed.spec.templateName = '26-27 Week ' + w + ': ' + parsed.spec.focusTitle;
        ok[w] = parsed.spec;
        report.push('Week ' + w + ': OK - "' + parsed.spec.subject + '"');
      }
    } catch (e) {
      report.push('Week ' + w + ': SKIPPED - parse error: ' + (e.message || e));
    }
  }

  var okCount = Object.keys(ok).length;
  var resp = ui.alert('Sync Templates from 26-27 Doc',
    report.join('\n') + '\n\nApply ' + okCount + ' week(s)? Skipped weeks keep the content they serve today.',
    ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;
  if (okCount === 0) {
    ui.alert('Nothing to apply', 'Every week tab failed validation; the Template Content tab was not changed.', ui.ButtonSet.OK);
    return;
  }

  // Merge over existing synced rows so a week that fails THIS sync keeps its
  // previously synced content instead of silently reverting to the hardcoded copy.
  _syncedSpecs2627Cache = null;
  var merged = {};
  var existing = _getSyncedSpecs_();
  Object.keys(existing).forEach(function (w) { merged[w] = existing[w]; });
  Object.keys(ok).forEach(function (w) { merged[w] = ok[w]; });
  _writeTemplateContentTab_(merged);
  _syncedSpecs2627Cache = null;

  setupTemplateDropdown();  // shows its own "Done" alert listing the new names
}
