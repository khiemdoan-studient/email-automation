// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  ROOT_FOLDER_NAME: "Bruna and Mark's Schools - Weekly Report",
  CONFIG_SHEET_NAME: "Config",
  MAPPING_SHEET_NAME: "School-IM Mapping",
  ROSTER_SHEET_NAME: "Teacher Emails",
  TEACHER_DATA_SHEET_NAME: "Teacher Metrics",

  // Column indices in Teacher Emails sheet (0-indexed)
  CAMPUS_COL: 2,           // Column C: Campus
  TEACHER_FIRST_COL: 24,   // Column Y: Teacher 1 First Name
  TEACHER_LAST_COL: 25,    // Column Z: Teacher 1 Last Name
  TEACHER_EMAIL_COL: 26    // Column AA: Teacher 1 Email
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📧 Email Tools')
    .addItem('Generate My Email Drafts', 'generateDraftsForCurrentUser')
    .addItem('🛠️ Debug: Check Teacher Folders', 'checkTeacherFolders')
    .addSeparator()
    .addItem('⚙️ Set Date Range', 'setDateRange')
    .addToUi();
}

function setDateRange() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('Set Date Range', 'Enter the date range folder name (e.g., 2026-03-09_to_2026-03-15):', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() === ui.Button.OK) {
    const dateRange = response.getResponseText().trim();
    const configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.CONFIG_SHEET_NAME);
    const data = configSheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === 'Date Range') {
        configSheet.getRange(i + 1, 2).setValue(dateRange);
        ui.alert('Date range set to: ' + dateRange);
        return;
      }
    }
    configSheet.appendRow(['Date Range', dateRange]);
    ui.alert('Date range set to: ' + dateRange);
  }
}

function generateDraftsForCurrentUser() {
  const ui = SpreadsheetApp.getUi();
  const currentUserEmail = Session.getActiveUser().getEmail().toLowerCase();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const dateRange = getConfigValue('Date Range');
  if (!dateRange) return ui.alert('Error', 'Please set the Date Range first.', ui.ButtonSet.OK);

  // Get IM's assigned schools
  const mappingData = ss.getSheetByName(CONFIG.MAPPING_SHEET_NAME).getDataRange().getValues();
  const mySchools = [];
  for (let i = 1; i < mappingData.length; i++) {
    if (String(mappingData[i][2]).toLowerCase().trim() === currentUserEmail) {
      mySchools.push({ folderName: mappingData[i][0], displayName: mappingData[i][1] });
    }
  }

  if (mySchools.length === 0) return ui.alert('Error', 'Your email is not assigned to any schools.', ui.ButtonSet.OK);

  const teachers = getTeachersForSchools(mySchools.map(s => s.displayName));
  if (teachers.length === 0) return ui.alert('Error', 'No teachers found for your schools.', ui.ButtonSet.OK);

  const rootFolder = findFolderByName(CONFIG.ROOT_FOLDER_NAME);
  if (!rootFolder) return ui.alert('Error', 'Could not find root folder.', ui.ButtonSet.OK);

  // Load Teacher Metrics
  const teacherMetrics = getTeacherMetrics();

  let successCount = 0, errorCount = 0;
  const errors = [];

  for (const teacher of teachers) {
    try {
      const metrics = teacherMetrics[teacher.name.toLowerCase()] || null;
      const result = createDraftForTeacher(teacher, rootFolder, dateRange, metrics);
      if (result.success) successCount++;
      else { errorCount++; errors.push(teacher.name + ': ' + result.error); }
    } catch (e) {
      errorCount++; errors.push(teacher.name + ': ' + e.message);
    }
  }

  let msg = "Created " + successCount + " drafts. " + errorCount + " errors.";
  if (errorCount > 0) { msg += " | ERRORS: " + errors.join(" | "); }
  msg += " | Check your Gmail Drafts!";
  ui.alert('Complete', msg, ui.ButtonSet.OK);
}

// --- HELPER FUNCTIONS ---

function getConfigValue(key) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.CONFIG_SHEET_NAME).getDataRange().getValues();
  for (const row of data) if (row[0] === key) return row[1];
  return null;
}

function getTeachersForSchools(schoolDisplayNames) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ROSTER_SHEET_NAME).getDataRange().getValues();
  const teacherMap = new Map();

  for (let i = 1; i < data.length; i++) {
    const campus = String(data[i][CONFIG.CAMPUS_COL] || '').trim();
    if (!schoolDisplayNames.includes(campus)) continue;

    let firstName, lastName, email;

    if (campus === 'Reading Community City School District') {
      // Reading schools use columns AD, AE, AF (indices 29, 30, 31)
      firstName = String(data[i][29] || '').trim();
      lastName = String(data[i][30] || '').trim();
      email = String(data[i][31] || '').trim();
    } else {
      firstName = String(data[i][CONFIG.TEACHER_FIRST_COL] || '').trim();
      lastName = String(data[i][CONFIG.TEACHER_LAST_COL] || '').trim();
      email = String(data[i][CONFIG.TEACHER_EMAIL_COL] || '').trim();
    }

    if (firstName && lastName && email) {
      const folderName = (firstName + '_' + lastName).replace(/ /g, '_');
      const key = folderName.toLowerCase();
      if (!teacherMap.has(key)) {
        teacherMap.set(key, { firstName: firstName.split(' ')[0], lastName: lastName, name: firstName + ' ' + lastName, folderName: folderName, email: email, campus: campus });
      }
    }
  }
  return Array.from(teacherMap.values());
}

function getTeacherMetrics() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.TEACHER_DATA_SHEET_NAME);
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const metrics = {};

  for (let i = 1; i < data.length; i++) {
    const teacherName = String(data[i][0]).trim().toLowerCase();
    const grade = String(data[i][1]).trim();
    if (!teacherName || teacherName === "") continue;
    if (!metrics[teacherName]) { metrics[teacherName] = []; }
    metrics[teacherName].push({
      grade: grade,
      numStudents: parseFloat(data[i][2]) || 0,
      activeDays: parseFloat(data[i][3]) || 0,
      pctLoggedIn: parseFloat(data[i][4]) || 0,
      pctEveryday: parseFloat(data[i][5]) || 0,
      avgMins: parseFloat(data[i][6]) || 0,
      testsMastered: parseFloat(data[i][7]) || 0,
      avgTests: parseFloat(data[i][8]) || 0,
      lessonsMastered: parseFloat(data[i][9]) || 0,
      avgLessons: parseFloat(data[i][10]) || 0
    });
  }
  return metrics;
}

function findFolderByName(folderName, parentFolder) {
  const folders = parentFolder ? parentFolder.getFoldersByName(folderName) : DriveApp.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : null;
}

function createDraftForTeacher(teacher, rootFolder, dateRange, metrics) {
  const mappingData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.MAPPING_SHEET_NAME).getDataRange().getValues();
  let schoolFolderName = "";
  for (let i = 1; i < mappingData.length; i++) {
    if (mappingData[i][1] === teacher.campus) schoolFolderName = mappingData[i][0];
  }

  const schoolFolder = findFolderByName(schoolFolderName, rootFolder);
  if (!schoolFolder) return { success: false, error: 'School folder not found: ' + schoolFolderName };

  const teacherFolder = findFolderByName(teacher.folderName, schoolFolder);
  if (!teacherFolder) return { success: false, error: 'Teacher folder not found: ' + teacher.folderName };

  const dateFolder = findFolderByName(dateRange, teacherFolder);
  if (!dateFolder) return { success: false, error: 'Date folder not found: ' + dateRange };

  const files = dateFolder.getFiles();
  let summaryPdf = null;
  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName().toUpperCase();
    if (fileName.startsWith('00') && fileName.includes('SUMMARY') && fileName.endsWith('.PDF')) {
      summaryPdf = file; break;
    }
  }
  if (!summaryPdf) return { success: false, error: 'Summary PDF not found' };

  const subject = 'Freshly pressed data (+ 3 insights that aren\'t just noise about Re-Engagement & Resets)';
  const body = generateEmailBody(teacher, metrics);

  GmailApp.createDraft(teacher.email, subject, '', { htmlBody: body, attachments: [summaryPdf.getAs(MimeType.PDF)] });
  return { success: true };
}

// ============================================
// EMAIL TEMPLATE
// ============================================

/**
 * Determines the overall trend color for a teacher based on
 * the average of activeDays across all their grade rows.
 * Returns 'green', 'yellow', or 'red'.
 */
function getOverallTrendColor(metricsArray) {
  if (!metricsArray || metricsArray.length === 0) return 'red';
  var totalActiveDays = 0;
  var count = 0;
  for (var i = 0; i < metricsArray.length; i++) {
    totalActiveDays += parseFloat(metricsArray[i].activeDays) || 0;
    count++;
  }
  var avg = totalActiveDays / count;
  if (avg >= 3.95) return 'green';
  if (avg >= 2.95) return 'yellow';
  return 'red';
}

function generateEmailBody(teacher, metricsArray) {
  // Helper: colored dot span
  var dot = function(color) {
    return '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + color + ';margin-right:6px;vertical-align:middle;"></span>';
  };

  // --- Teacher Data Table ---
  var metricsHtml = '<p><em>No data available for this week.</em></p>';
  if (metricsArray && metricsArray.length > 0) {
    metricsHtml = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;text-align:center;font-family:Arial,sans-serif;width:100%;max-width:560px;">';
    metricsHtml += '<tr style="background-color:#f3f3f3;"><th style="padding:8px;">Teacher</th><th style="padding:8px;">Grade</th><th style="padding:8px;">Avg Active Days</th><th style="padding:8px;">Avg Minutes</th></tr>';
    for (var i = 0; i < metricsArray.length; i++) {
      var m = metricsArray[i];
      var activeDays = Number(m.activeDays || 0);
      var avgMins = Number(m.avgMins || 0);
      var daysColor = activeDays >= 3.95 ? '#d9ead3' : (activeDays >= 2.95 ? '#fff2cc' : '#f4cccc');
      var minsColor = avgMins >= 99.5 ? '#d9ead3' : (avgMins >= 79.5 ? '#fff2cc' : '#f4cccc');
      metricsHtml += '<tr>';
      metricsHtml += '<td style="padding:8px;">' + String(teacher.name || '') + '</td>';
      metricsHtml += '<td style="padding:8px;">' + String(m.grade || '') + '</td>';
      metricsHtml += '<td style="padding:8px;background-color:' + daysColor + ';">' + activeDays.toFixed(1) + '</td>';
      metricsHtml += '<td style="padding:8px;background-color:' + minsColor + ';">' + avgMins.toFixed(1) + '</td>';
      metricsHtml += '</tr>';
    }
    metricsHtml += '</table>';
  }

  // --- Conditional Trend ---
  var trendColor = getOverallTrendColor(metricsArray);
  var trendMessages = {
    green: 'Great work! Your students are on track and meeting their goals.',
    yellow: "You're close \u2014 schedule at least 35 minutes daily so students can meet their goals.",
    red: "Your class isn't meeting time goals yet \u2014 students need 35 minutes daily in Motivention."
  };
  var trendDotColors = { green: '#2e7d32', yellow: '#DAA520', red: '#c62828' };
  var trendBgColors = { green: '#d9ead3', yellow: '#fff2cc', red: '#f4cccc' };
  var trendBorderColors = { green: '#b6d7a8', yellow: '#ffe599', red: '#ea9999' };

  // --- Build Email HTML ---
  var html = '<meta charset="utf-8">';
  html += '<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6;color:#333;">';

  // Greeting
  html += '<p>Hi ' + String(teacher.firstName || '') + ',</p>';

  // Header + Table
  html += '<h2 style="color:#1a1a1a;">Average Active Days in Motivention</h2>';
  html += metricsHtml;
  html += '<br>';

  // Color Legend
  html += '<p><strong>Average Active Days:</strong> ';
  html += dot('#2e7d32') + '<span style="color:#2e7d32;font-weight:bold;">Green 4+</span> &nbsp; ';
  html += dot('#DAA520') + '<span style="color:#DAA520;font-weight:bold;">Yellow 3</span> &nbsp; ';
  html += dot('#c62828') + '<span style="color:#c62828;font-weight:bold;">Red 1-2</span></p>';

  // Key metrics
  html += '<p><strong>Key metrics:</strong> Average active days, Daily logins, Average minutes</p>';

  // Conditional Current Trend
  html += '<div style="background-color:' + trendBgColors[trendColor] + ';padding:12px;border-radius:6px;margin:12px 0;border:1px solid ' + trendBorderColors[trendColor] + ';">';
  html += '<p style="margin:0 0 8px 0;">' + dot(trendDotColors[trendColor]) + '<strong>Current trend:</strong> ' + trendMessages[trendColor] + '</p>';
  html += '<p style="margin:0 0 8px 0;">Students are expected to engage every day or until weekly goals are met.</p>';
  html += '<p style="margin:0;">Participation is reported to the school admin, district leaders, and state team.</p>';
  html += '</div>';

  // Weekly Focus
  html += '<h2 style="color:#1a1a1a;">Weekly Focus: Mental Focus &amp; Persistence</h2>';
  html += '<p>Use quick resets and short plans to bring disengaged students back into learning.</p>';

  // Why It Matters
  html += '<h3 style="color:#1a1a1a;">Why It Matters</h3>';
  html += '<p>When students disengage, it\'s often because they feel overwhelmed. A brief reset during class or a short-term plan can help them regain focus and rebuild confidence.</p>';

  // Actions This Week
  html += '<h3 style="color:#1a1a1a;">Your Actions This Week</h3>';

  // Mid-Block Breath
  html += '<p>' + dot('#2e7d32') + '<strong>Mid-Block Breath:</strong> If a student begins to shut down or spiral, pause the moment. Ask them to take a breath and reset. Then shrink the goal for the next 5\u201310 minutes so they can experience quick success.</p>';
  html += '<p style="margin-left:20px;"><em>What if the whole class is shifting focus?</em> Have everyone \u201CPacman\u201D their devices, stand, stretch, take three deep breaths, and shake it out before diving back in.</p>';

  // Doom Loop Reset
  html += '<p>' + dot('#1565c0') + '<strong>Doom Loop Reset:</strong> If a student keeps attempting the same test without progress, try one of these coaching moves to break the cycle before their next retest.</p>';

  // Reset Conference
  html += '<p>' + dot('#ef6c00') + '<strong>The Reset Conference:</strong> If a student has been disengaged for two days, schedule a quick 3-minute check-in.</p>';
  html += '<p style="margin-left:20px;">Try asking: <em>\u201CI\'ve noticed the last few days have been challenging. What\'s getting in the way?\u201D</em></p>';
  html += '<p style="margin-left:20px;">Create a Reset Goal for the next two class blocks. Keep it small and achievable. Consider offering a small mystery reward if they reach it.</p>';

  // Resources
  html += '<h3 style="color:#1a1a1a;">Resources</h3>';
  html += '<ul style="padding-left:20px;">';
  html += '<li><strong>Teacher Data Deep Dive</strong> (Attached)</li>';
  html += '<li><strong>AIM Launches (Next 3 weeks):</strong><br>';
  html += '<a href="https://www.canva.com/design/DAHDyS0iyd8/cMK174HeOxUmagRJvojT6Q/view?utm_content=DAHDyS0iyd8&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h3e9c4fa347">Week 5 - Growth Mindset - Cognitive Reframing</a><br>';
  html += '<a href="https://www.canva.com/design/DAHDjdCSoBE/ZhB3f6k-dMvNMQ9QtNT0iA/view?utm_content=DAHDjdCSoBE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hd9e0f0c72b">Week 6 - Growth Mindset - Productive Struggle</a><br>';
  html += '<a href="https://www.canva.com/design/DAHDeEQyjI0/UESk6Vp4GScPIiS7Xjdhfw/view?utm_content=DAHDeEQyjI0&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=he8b086611c">Week 7 - Growth Mindset - Celebrating Effort</a></li>';
  html += '<li><strong>Goal Tracker Sheet:</strong> <a href="https://drive.google.com/file/d/1aA963Hk-r4WJ3OEEa2GLTEPwerRZOAQ8/view?usp=drive_link">ELA Weekly Tracker</a>; <a href="https://drive.google.com/file/d/1alli2qWNmgNfWV5rXAGQXAtE7InQE2LR/view?usp=drive_link">Math Weekly Tracker</a></li>';
  html += '</ul>';

  // Weekly Challenge
  html += '<div style="background-color:#fff2cc;padding:15px;border-radius:5px;margin-top:20px;border:1px solid #ffe599;">';
  html += '<h3 style="margin-top:0;">Weekly Challenge</h3>';
  html += '<p>Increase your class\'s daily log ins, minutes, or lessons mastered to share as a class challenge.</p>';
  html += '<h3>Reflection Prompt:</h3>';
  html += '<p>What will you tweak for this coming week?</p>';
  html += '</div>';

  html += '</div>';
  return html;
}

// --- DIAGNOSTIC TOOL ---
function checkTeacherFolders() {
  const ui = SpreadsheetApp.getUi();
  const currentUserEmail = Session.getActiveUser().getEmail().toLowerCase();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const mappingData = ss.getSheetByName(CONFIG.MAPPING_SHEET_NAME).getDataRange().getValues();
  const mySchools = [];
  for (let i = 1; i < mappingData.length; i++) {
    if (String(mappingData[i][2]).toLowerCase().trim() === currentUserEmail) {
      mySchools.push({ folderName: mappingData[i][0], displayName: mappingData[i][1] });
    }
  }

  if (mySchools.length === 0) return ui.alert('Error', 'No schools assigned to you.', ui.ButtonSet.OK);

  const teachers = getTeachersForSchools(mySchools.map(s => s.displayName));
  const rootFolder = findFolderByName(CONFIG.ROOT_FOLDER_NAME);
  if (!rootFolder) return ui.alert('Error', 'Root folder not found.', ui.ButtonSet.OK);

  let report = "<h2>Teacher Folder Diagnostic Report</h2>";

  for (const school of mySchools) {
    report += '<h3>' + school.displayName + '</h3>';
    const schoolFolder = findFolderByName(school.folderName, rootFolder);

    if (!schoolFolder) {
      report += '<p style="color:red;">School folder not found in Drive: <b>' + school.folderName + '</b></p>';
      continue;
    }

    // Get all actual folders in Drive
    const driveFolders = schoolFolder.getFolders();
    const driveFolderNames = [];
    while (driveFolders.hasNext()) {
      driveFolderNames.push(driveFolders.next().getName().toLowerCase());
    }

    // Compare with teachers in spreadsheet
    const schoolTeachers = teachers.filter(t => t.campus === school.displayName);
    report += "<ul>";
    for (const t of schoolTeachers) {
      const expectedFolderName = t.folderName;
      if (driveFolderNames.includes(expectedFolderName.toLowerCase())) {
        report += '<li>Found folder for: ' + t.name + ' (<i>' + expectedFolderName + '</i>)</li>';
      } else {
        report += '<li style="color:red;"><b>MISSING</b> folder for: ' + t.name + ' (Expected exactly: <b>' + expectedFolderName + '</b>)</li>';
      }
    }
    report += "</ul><hr>";
  }

  const htmlOutput = HtmlService.createHtmlOutput(report).setWidth(600).setHeight(500);
  ui.showModalDialog(htmlOutput, 'Folder Diagnostic');
}
