// ============================================
// CONFIGURATION
// ============================================
var CONFIG = {
  ROOT_FOLDER_NAME: "Bruna and Mark's Schools - Weekly Report",
  CONFIG_SHEET_NAME: "Config",
  MAPPING_SHEET_NAME: "School-IM Mapping",
  ROSTER_SHEET_NAME: "Teacher Emails",
  ALL_METRICS_SHEET_NAME: "All Teacher Metrics",
  WINNERS_SHEET_NAME: "Student Winners",
  READING_TEACHERS_SHEET_NAME: "Reading Teachers",
  AVAILABLE_WEEKS_SHEET_NAME: "Available Weeks",

  // Legacy single-week tab (backward compat)
  TEACHER_DATA_SHEET_NAME: "Teacher Metrics",

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
  'Week 1: Goals & Monitoring': {
    subject: 'Your data is served (with a side order of goals and monitoring reminders!)',
    buildBody: generateWeek1Body
  },
  'Week 2: Tech Hygiene': {
    subject: 'Attached: Your Data (+ 3 things you actually need to read about tech hygiene and student data ownership.)',
    buildBody: generateWeek2Body
  },
  'Week 3: Micro-Coaching': {
    subject: 'Your Motivention Data (+ 3 Micro-coaching moves to keep students moving.)',
    buildBody: generateWeek3Body
  },
  'Week 4: Diagnosing Habits': {
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
  'Wrap Up: Celebrate Wins': {
    subject: 'Data drop: Celebrating your students\' wins and hard work',
    buildBody: generateWrapUpBody
  }
};

// Template names list for dropdown validation
var TEMPLATE_NAMES = [
  'Week 0: Data',
  'Week 1: Goals & Monitoring',
  'Week 2: Tech Hygiene',
  'Week 3: Micro-Coaching',
  'Week 4: Diagnosing Habits',
  'Week 5: Re-Engagement',
  'Week 6: Culture & Shoutouts',
  'Week 7: I\'m Stuck Protocol',
  'Week 8: Growth Mindset',
  'Wrap Up: Celebrate Wins'
];

// Manual aliases for teachers whose names differ between roster and metrics
var NAME_ALIASES = {
  'lisa kloesz': 'lisa kloetz'
};

// ============================================
// MENU
// ============================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Email Tools')
    .addItem('Generate My Email Drafts', 'generateDraftsForCurrentUser')
    .addItem('Debug: Check Teacher Folders', 'checkTeacherFolders')
    .addSeparator()
    .addItem('Set Date Range', 'setDateRange')
    .addItem('Set Template', 'setTemplate')
    .addToUi();
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
  var currentUserEmail = Session.getActiveUser().getEmail().toLowerCase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Read Config defaults
  var dateRange = getConfigValue('Date Range');
  if (!dateRange) return ui.alert('Error', 'Please set the Date Range first (Config tab or Email Tools menu).', ui.ButtonSet.OK);

  var templateName = getConfigValue('Template') || 'Week 6: Culture & Shoutouts';
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
  var rootFolder = findFolderByName(CONFIG.ROOT_FOLDER_NAME);
  if (!rootFolder) return ui.alert('Error', 'Could not find root folder: ' + CONFIG.ROOT_FOLDER_NAME, ui.ButtonSet.OK);

  var driveFolderExists = checkDriveFolderExists(rootFolder, mySchools, dateRange);

  // Validate metrics data exists for selected week
  var weekStart = dateRange.split('_to_')[0];
  var metricsExist = checkMetricsExistForWeek(weekStart);

  // Show confirmation dialog
  var dialogMsg = 'Ready to generate email drafts.\n\n'
    + 'Date Range: ' + dateRange + '\n'
    + 'Template: ' + templateName + '\n'
    + 'Teachers found: ' + teachers.length + '\n'
    + 'Metrics data: ' + (metricsExist ? 'Available' : 'NOT FOUND') + '\n'
    + 'Drive folders: ' + (driveFolderExists ? 'Found' : 'NOT FOUND') + '\n';

  if (!driveFolderExists) {
    dialogMsg += '\nWARNING: No Drive folders found for date range "' + dateRange + '".\n'
      + 'PDFs cannot be attached. Generation is BLOCKED.\n'
      + 'Please check that the date range matches your Drive folder names.';
    return ui.alert('Cannot Generate', dialogMsg, ui.ButtonSet.OK);
  }

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
      var result = createDraftForTeacher(teacher, rootFolder, dateRange, metrics, winners, schoolFolderMap, template);
      if (result.success) successCount++;
      else { errorCount++; errors.push(teacher.name + ': ' + result.error); }
    } catch (e) {
      errorCount++; errors.push(teacher.name + ': ' + e.message);
    }
  }

  var msg = 'Created ' + successCount + ' drafts. ' + errorCount + ' errors.';
  if (errorCount > 0) { msg += ' | ERRORS: ' + errors.join(' | '); }
  msg += ' | Check your Gmail Drafts!';
  ui.alert('Complete', msg, ui.ButtonSet.OK);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Looks up a teacher in a name-keyed object, trying multiple name formats.
 */
function lookupByName(obj, firstName, lastName, fullName) {
  if (!obj) return null;
  var full = fullName.toLowerCase().trim();
  if (obj[full]) return obj[full];
  var first = firstName.toLowerCase().trim().split(' ')[0];
  var last = lastName.toLowerCase().trim();
  var shortKey = first + ' ' + last;
  if (obj[shortKey]) return obj[shortKey];
  var lastMatches = [];
  for (var k in obj) {
    if (k.endsWith(' ' + last)) lastMatches.push(k);
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
 * Check if at least one school's Drive folder has a subfolder for the date range.
 */
function checkDriveFolderExists(rootFolder, schools, dateRange) {
  for (var i = 0; i < schools.length; i++) {
    var schoolFolder = findFolderByName(schools[i].folderName, rootFolder);
    if (!schoolFolder) continue;
    // Check if any teacher folder has the date range subfolder
    var teacherFolders = schoolFolder.getFolders();
    while (teacherFolders.hasNext()) {
      var tf = teacherFolders.next();
      var dateFolder = findFolderByName(dateRange, tf);
      if (dateFolder) return true;
    }
  }
  return false;
}

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
    var teacherName = String(data[i][1]).trim().toLowerCase();
    var grade = String(data[i][2]).trim();
    if (!teacherName || teacherName === '') continue;

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
    var teacherName = String(data[i][1]).trim().toLowerCase();
    if (!teacherName) continue;
    if (!winners[teacherName]) winners[teacherName] = [];
    winners[teacherName].push({
      category: String(data[i][2]).trim(),
      sortOrder: parseInt(data[i][3]) || 0,
      frequency: String(data[i][4]).trim(),
      studentNames: String(data[i][5]).trim(),
      studentCount: parseInt(data[i][6]) || 0
    });
  }
  return winners;
}

function findFolderByName(folderName, parentFolder) {
  var folders = parentFolder ? parentFolder.getFoldersByName(folderName) : DriveApp.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : null;
}

function createDraftForTeacher(teacher, rootFolder, dateRange, metrics, winners, schoolFolderMap, template) {
  var schoolFolderName = schoolFolderMap[teacher.campus] || '';
  var schoolFolder = findFolderByName(schoolFolderName, rootFolder);
  if (!schoolFolder) return { success: false, error: 'School folder not found: ' + schoolFolderName };

  var teacherFolder = findFolderByName(teacher.folderName, schoolFolder);
  if (!teacherFolder) return { success: false, error: 'Teacher folder not found: ' + teacher.folderName };

  var dateFolder = findFolderByName(dateRange, teacherFolder);
  if (!dateFolder) return { success: false, error: 'Date folder not found: ' + dateRange };

  var files = dateFolder.getFiles();
  var summaryPdf = null;
  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName().toUpperCase();
    if (fileName.indexOf('00') === 0 && fileName.indexOf('SUMMARY') !== -1 && fileName.indexOf('.PDF') === fileName.length - 4) {
      summaryPdf = file; break;
    }
  }
  if (!summaryPdf) return { success: false, error: 'Summary PDF not found' };

  var body = template.buildBody(teacher, metrics, winners);
  GmailApp.createDraft(teacher.email, template.subject, '', { htmlBody: body, attachments: [summaryPdf.getAs(MimeType.PDF)] });
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
    return '<p><em>No data available for this week.</em></p>';
  }
  var html = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;text-align:center;font-family:Arial,sans-serif;width:100%;max-width:560px;">';
  html += '<tr style="background-color:#f3f3f3;"><th style="padding:8px;">Teacher</th><th style="padding:8px;">Grade</th><th style="padding:8px;">Avg Active Days</th><th style="padding:8px;">Avg Minutes</th></tr>';
  for (var i = 0; i < metricsArray.length; i++) {
    var m = metricsArray[i];
    var activeDays = Number(m.activeDays || 0);
    var avgMins = Number(m.avgMins || 0);
    var daysColor = activeDays >= 3.95 ? '#d9ead3' : (activeDays >= 2.95 ? '#fff2cc' : '#f4cccc');
    var minsColor = avgMins >= 99.5 ? '#d9ead3' : (avgMins >= 79.5 ? '#fff2cc' : '#f4cccc');
    html += '<tr>';
    html += '<td style="padding:8px;">' + String(teacher.name || '') + '</td>';
    html += '<td style="padding:8px;">' + String(m.grade || '') + '</td>';
    html += '<td style="padding:8px;background-color:' + daysColor + ';">' + activeDays.toFixed(1) + '</td>';
    html += '<td style="padding:8px;background-color:' + minsColor + ';">' + avgMins.toFixed(1) + '</td>';
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
  html += '<p><strong>Key metrics:</strong> Average active days, Daily logins, Average minutes</p>';
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


// ============================================
// DIAGNOSTIC TOOL
// ============================================
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
  var rootFolder = findFolderByName(CONFIG.ROOT_FOLDER_NAME);
  if (!rootFolder) return ui.alert('Error', 'Root folder not found.', ui.ButtonSet.OK);

  var report = '<h2>Teacher Folder Diagnostic Report</h2>';

  for (var s = 0; s < mySchools.length; s++) {
    var school = mySchools[s];
    report += '<h3>' + school.displayName + '</h3>';
    var schoolFolder = findFolderByName(school.folderName, rootFolder);

    if (!schoolFolder) {
      report += '<p style="color:red;">School folder not found in Drive: <b>' + school.folderName + '</b></p>';
      continue;
    }

    var driveFolders = schoolFolder.getFolders();
    var driveFolderNames = [];
    while (driveFolders.hasNext()) {
      driveFolderNames.push(driveFolders.next().getName().toLowerCase());
    }

    var schoolTeachers = teachers.filter(function(t) { return t.campus === school.displayName; });
    report += '<ul>';
    for (var ti = 0; ti < schoolTeachers.length; ti++) {
      var t = schoolTeachers[ti];
      if (driveFolderNames.indexOf(t.folderName.toLowerCase()) !== -1) {
        report += '<li>Found folder for: ' + t.name + ' (<i>' + t.folderName + '</i>)</li>';
      } else {
        report += '<li style="color:red;"><b>MISSING</b> folder for: ' + t.name + ' (Expected: <b>' + t.folderName + '</b>)</li>';
      }
    }
    report += '</ul><hr>';
  }

  var htmlOutput = HtmlService.createHtmlOutput(report).setWidth(600).setHeight(500);
  ui.showModalDialog(htmlOutput, 'Folder Diagnostic');
}
