// ============================================
// CONFIGURATION
// ============================================
var CONFIG = {
  ROOT_FOLDER_NAME: "Bruna and Mark's Schools - Weekly Report",
  ROOT_FOLDER_ID: "1cDnSQ2P8EmmvC1bb4CuRPIdG9XNfozgR",  // Bulletproof fallback: direct folder ID
  CONFIG_SHEET_NAME: "Config",
  MAPPING_SHEET_NAME: "School-IM Mapping",
  ROSTER_SHEET_NAME: "Teacher Emails",
  ALL_METRICS_SHEET_NAME: "All Teacher Metrics",
  WINNERS_SHEET_NAME: "Student Winners",
  READING_TEACHERS_SHEET_NAME: "Reading Teachers",
  AVAILABLE_WEEKS_SHEET_NAME: "Available Weeks",

  // Column indices in Teacher Emails sheet (0-indexed)
  CAMPUS_COL: 2,           // Column C: Campus
  TEACHER_FIRST_COL: 24,   // Column Y: Teacher 1 First Name
  TEACHER_LAST_COL: 25,    // Column Z: Teacher 1 Last Name
  TEACHER_EMAIL_COL: 26    // Column AA: Teacher 1 Email
};

// ============================================
// TEMPLATE REGISTRY
// ============================================
// Each template: { subject, buildBody(teacher, metrics, winners, dot) }
// Templates that don't use winners pass null for winnersArray
var TEMPLATES = {
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
  }
};

// Template names list for dropdown validation.
// Derived from TEMPLATES so TEMPLATE_NAMES can never drift out of sync with the registry.
// V8 Object.keys preserves insertion order for string keys, so the dropdown order matches
// the order entries appear in the TEMPLATES literal above.
var TEMPLATE_NAMES = Object.keys(TEMPLATES);

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
    .addSeparator()
    .addItem('Debug: Check Teacher Names (roster vs metrics)', 'checkTeacherNames')
    .addItem('Debug: Check Teacher Folders', 'checkTeacherFolders')
    .addItem('Debug: Drive Access', 'debugDriveAccess')
    .addItem('Debug: Drive Auth (run if "Service error: Drive")', 'diagnoseDriveAuth')
    .addItem('View Error Log', 'viewErrorLog')
    .addItem('Clear Error Log', 'clearErrorLog')
    .addItem('Run Unit Tests', 'runUnitTests')
    .addSeparator()
    .addItem('Set Date Range', 'setDateRange')
    .addItem('Set Template', 'setTemplate')
    .addItem('Refresh Template Dropdown', 'setupTemplateDropdown')
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

  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(TEMPLATE_NAMES, true)
    .setAllowInvalid(false)
    .setHelpText('Select a template. Edit TEMPLATE_NAMES in Code.gs to add more.')
    .build();
  configSheet.getRange(templateRow, 2).setDataValidation(rule);

  ui.alert('Done',
    'Template dropdown refreshed with ' + TEMPLATE_NAMES.length + ' options:\n\n'
      + TEMPLATE_NAMES.join('\n'),
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
  var msg = 'Enter the template name:\n\n' + TEMPLATE_NAMES.join('\n');
  var response = ui.prompt('Set Template', msg, ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() === ui.Button.OK) {
    var template = response.getResponseText().trim();
    if (!TEMPLATES[template]) {
      ui.alert('Error', 'Unknown template: ' + template + '\n\nValid options:\n' + TEMPLATE_NAMES.join('\n'), ui.ButtonSet.OK);
      return;
    }
    setConfigValue('Template', template);
    ui.alert('Template set to: ' + template);
  }
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

  var currentUserEmail = Session.getActiveUser().getEmail().toLowerCase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Read Config defaults
  var dateRange = getConfigValue('Date Range');
  if (!dateRange) return ui.alert('Error', 'Please set the Date Range first (Config tab or Email Tools menu).', ui.ButtonSet.OK);

  // Default template tracks the current end-of-year context. Update at each cycle handoff.
  var templateName = getConfigValue('Template') || '4/27: Last Week of Motivention';
  if (!TEMPLATES[templateName]) {
    return ui.alert('Error', 'Unknown template: ' + templateName + '\n\nSet a valid template in Config or use Email Tools > Set Template.', ui.ButtonSet.OK);
  }

  // Get IM's assigned schools
  var mappingData = ss.getSheetByName(CONFIG.MAPPING_SHEET_NAME).getDataRange().getValues();
  var mySchools = [];
  for (var i = 1; i < mappingData.length; i++) {
    if (String(mappingData[i][2]).toLowerCase().trim() === currentUserEmail) {
      mySchools.push({ folderName: mappingData[i][0], displayName: mappingData[i][1] });
    }
  }

  if (mySchools.length === 0) return ui.alert('Error', 'Your email is not assigned to any schools.', ui.ButtonSet.OK);

  var teachers = getTeachersForSchools(mySchools.map(function(s) { return s.displayName; }));
  if (teachers.length === 0) return ui.alert('Error', 'No teachers found for your schools.', ui.ButtonSet.OK);

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
  // v2.5.1: cache keyed by BOTH displayName AND folderName for robust lookups.
  // Reads use teacher.campus (which equals displayName by construction in
  // getTeachersForSchools), but dual-keying prevents silent cache misses if
  // any future caller passes the folderName form instead.
  var schoolFolderCache = {};
  for (var sIdx = 0; sIdx < mySchools.length; sIdx++) {
    var sch = mySchools[sIdx];
    var folder = sch.displayName ? findFolderByName(sch.displayName, rootFolder) : null;
    if (!folder && sch.folderName) folder = findFolderByName(sch.folderName, rootFolder);
    if (folder) {
      if (sch.displayName) schoolFolderCache[sch.displayName] = folder;
      if (sch.folderName && sch.folderName !== sch.displayName) {
        schoolFolderCache[sch.folderName] = folder;
      }
    }
  }

  // v2.5.3: pre-flight `checkDriveFolderExists` removed. After the v2.5.0
  // search-API pivot, that pre-flight was wasted work — it failed-open on
  // iteration errors (so never actually blocked anyone in practice), and
  // missing PDFs already surface as per-teacher errors in the Error Log tab.
  // To check folder structure proactively, IMs can run "Debug: Check Teacher Folders".

  // Validate metrics data exists for selected week
  var weekStart = dateRange.split('_to_')[0];
  var metricsExist = checkMetricsExistForWeek(weekStart);

  // Show confirmation dialog
  var dialogMsg = 'Ready to generate email drafts.\n\n'
    + 'Date Range: ' + dateRange + '\n'
    + 'Template: ' + templateName + '\n'
    + 'Teachers found: ' + teachers.length + '\n'
    + 'Metrics data: ' + (metricsExist ? 'Available' : 'NOT FOUND') + '\n';

  if (!metricsExist) {
    dialogMsg += '\nWARNING: No metrics data found for week ' + weekStart + '.\n'
      + 'Emails will be generated WITHOUT metrics tables.\n';
  }

  dialogMsg += '\nProceed?';
  var confirm = ui.alert('Confirm Generation', dialogMsg, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  // Load data
  var teacherMetrics = metricsExist ? getTeacherMetricsForWeek(weekStart) : {};
  var allWinners = getStudentWinners();

  var successCount = 0, errorCount = 0;
  var errors = [];

  // Build school folder name lookup once
  var schoolFolderMap = {};
  for (var m = 1; m < mappingData.length; m++) {
    schoolFolderMap[mappingData[m][1]] = mappingData[m][0];
  }

  var template = TEMPLATES[templateName];

  for (var t = 0; t < teachers.length; t++) {
    var teacher = teachers[t];
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
    if (errStr.length > 1500) {
      errStr = errStr.substring(0, 1500) + '... (' + (errors.length) + ' total errors -- see logs for full list)';
      console.log('Full error list:\n' + errors.join('\n'));
    }
    msg += ' | ERRORS: ' + errStr;
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
    var val = data[i][0];
    if (val instanceof Date) {
      var y = val.getFullYear();
      var m = ('0' + (val.getMonth() + 1)).slice(-2);
      var d = ('0' + val.getDate()).slice(-2);
      val = y + '-' + m + '-' + d;
    } else {
      val = String(val).trim();
    }
    if (val === weekStart) return true;
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
    // Column A: week_start
    var wsVal = data[i][0];
    if (wsVal instanceof Date) {
      var y = wsVal.getFullYear();
      var m = ('0' + (wsVal.getMonth() + 1)).slice(-2);
      var d = ('0' + wsVal.getDate()).slice(-2);
      wsVal = y + '-' + m + '-' + d;
    } else {
      wsVal = String(wsVal).trim();
    }

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

  for (var i = 1; i < data.length; i++) {
    var campus = String(data[i][CONFIG.CAMPUS_COL] || '').trim();
    if (schoolDisplayNames.indexOf(campus) === -1) continue;
    if (campus === 'Reading Community City School District') continue;

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

  // Reading Community: dedicated tab
  if (schoolDisplayNames.indexOf('Reading Community City School District') !== -1) {
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
var ERROR_LOG_MAX_ROWS = 500;       // Target row count after a trim
var ERROR_LOG_TRIM_TRIGGER = 600;   // v2.5.1: only trigger trim when count exceeds this (hysteresis to avoid O(n) deleteRows on every call past 500)
var _runIdCache = null;

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

    // v2.5.1: Trim with hysteresis. Old (v2.5.0) behavior triggered deleteRows
    // on EVERY call past 500 — an O(n) Sheet operation that rewrites all
    // subsequent rows. End-of-year runs that log 50+ errors per execution
    // would cascade into 50 expensive deletes mid-loop. New: only trigger
    // trim when count exceeds ERROR_LOG_TRIM_TRIGGER (600), then trim down
    // to ERROR_LOG_MAX_ROWS (500). Trims ~once every 100 errors instead of
    // on every call.
    var lastRow = sheet.getLastRow();
    if (lastRow > ERROR_LOG_TRIM_TRIGGER + 1) {
      sheet.deleteRows(2, lastRow - ERROR_LOG_MAX_ROWS - 1);
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
  // v2.5.0 PIVOT: PDF lookup now tries Drive's search API FIRST (works for
  // shared-with-me users; bypasses parent-folder permission gap entirely).
  // Falls back to folder traversal for filename anomalies. Both paths log
  // failures to the Error Log tab; a clean miss returns a structured error.
  var summaryPdf = null;
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

  // v2.4.1: Pass the File directly to createDraft (no getAs() — it's already a PDF;
  // getAs(MimeType.PDF) was a no-op coercion that added a Drive call AND a failure
  // surface). Wrap the call in a named try/catch so any error identifies the
  // specific PDF + size + Gmail operation that failed.
  // v2.5.3: withGmailRetry (renamed from withDriveRetry) handles transient 5xx /
  // rate-limit blips (one retry after 2s).
  var body = template.buildBody(teacher, metrics, winners);
  try {
    withGmailRetry(function() {
      GmailApp.createDraft(teacher.email, template.subject, '', {
        htmlBody: body,
        attachments: [summaryPdf]
      });
    });
  } catch (e) {
    var pdfName = '<unknown>';
    var pdfSize = '<unknown>';
    try { pdfName = summaryPdf.getName(); pdfSize = summaryPdf.getSize(); } catch (_) {}
    return {
      success: false,
      error: 'createDraft failed for "' + pdfName + '" (' + pdfSize + ' bytes): ' + (e.message || e)
    };
  }
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
    var daysColor = activeDays >= 3.95 ? '#d9ead3' : (activeDays >= 2.95 ? '#fff2cc' : '#f4cccc');
    var minsColor = avgMins >= 99.5 ? '#d9ead3' : (avgMins >= 79.5 ? '#fff2cc' : '#f4cccc');
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
  if (avg >= 3.95) return 'green';
  if (avg >= 2.95) return 'yellow';
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
  var mappingData = ss.getSheetByName(CONFIG.MAPPING_SHEET_NAME).getDataRange().getValues();
  var mySchools = [];
  for (var i = 1; i < mappingData.length; i++) {
    if (String(mappingData[i][2]).toLowerCase().trim() === currentUserEmail) {
      mySchools.push({ folderName: mappingData[i][0], displayName: mappingData[i][1] });
    }
  }
  if (mySchools.length === 0) {
    ui.alert('Error', 'No schools assigned to your email.', ui.ButtonSet.OK);
    return;
  }

  var teachers = getTeachersForSchools(mySchools.map(function(s) { return s.displayName; }));
  var metrics = getTeacherMetricsForWeek(weekStart);
  var metricsKeys = Object.keys(metrics);

  var matched = [], unmatched = [];
  for (var t = 0; t < teachers.length; t++) {
    var teacher = teachers[t];
    var hit = lookupByName(metrics, teacher.firstName, teacher.lastName, teacher.name);
    if (hit) matched.push(teacher);
    else unmatched.push(teacher);
  }

  var html = '<h2>Teacher Name Diagnostic</h2>';
  html += '<p><b>Week:</b> ' + weekStart + '</p>';
  html += '<p><b>Schools:</b> ' + mySchools.map(function(s) { return s.displayName; }).join(', ') + '</p>';
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var mappingData = ss.getSheetByName(CONFIG.MAPPING_SHEET_NAME).getDataRange().getValues();
  var mySchools = [];
  for (var i = 1; i < mappingData.length; i++) {
    if (String(mappingData[i][2]).toLowerCase().trim() === currentUserEmail) {
      mySchools.push({ folderName: mappingData[i][0], displayName: mappingData[i][1] });
    }
  }

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
  var mappingData = ss.getSheetByName(CONFIG.MAPPING_SHEET_NAME).getDataRange().getValues();
  var mySchools = [];
  for (var i = 1; i < mappingData.length; i++) {
    if (String(mappingData[i][2]).toLowerCase().trim() === currentUserEmail) {
      mySchools.push({ folderName: mappingData[i][0], displayName: mappingData[i][1] });
    }
  }

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
