/**
 * Node-based test runner for the Code.gs pure functions.
 * Mocks Apps Script globals (SpreadsheetApp, DriveApp, etc.) and runs the
 * unit-test logic from runUnitTests() inline. Use this to verify pure-helper
 * logic in CI / locally before shipping a new Code.gs version.
 *
 * Usage:  node test_runner.js
 * Exit:   0 = all tests passed; 1 = at least one failed
 */

const fs = require('fs');
const path = require('path');

// ── Mock Apps Script globals so the .gs file evaluates ──
global.SpreadsheetApp = {
  getUi: () => ({
    showModalDialog: (html, title) => { /* no-op */ },
    alert: () => {},
    ButtonSet: { OK: 1, YES_NO: 2 },
    Button: { YES: 1, NO: 2, OK: 3 },
  }),
  getActiveSpreadsheet: () => ({
    getSheetByName: () => null,
    insertSheet: (name) => ({
      appendRow: () => {},
      setFrozenRows: () => {},
      getRange: () => ({ setFontWeight: () => ({ setBackground: () => {} }) }),
    }),
    setActiveSheet: () => {},
  }),
  newDataValidation: () => ({
    requireValueInList: () => ({ setAllowInvalid: () => ({ setHelpText: () => ({ build: () => null }) }) }),
  }),
};
global.DriveApp = {
  getRootFolder: () => null,
  getFolderById: () => null,
  getFoldersByName: () => ({ hasNext: () => false, next: () => null }),
  getFilesByName: () => ({ hasNext: () => false, next: () => null }),
};
global.HtmlService = {
  createHtmlOutput: (html) => ({ setWidth: () => ({ setHeight: () => null }) }),
};
global.GmailApp = { createDraft: () => null };
global.MimeType = { PDF: 'application/pdf' };
global.LockService = { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
global.Session = { getActiveUser: () => ({ getEmail: () => 'test@example.com' }) };
global.Utilities = { sleep: () => {} };
global.console = console;

// ── Load and evaluate Code.js (was Code.gs pre-v2.6.0; renamed for clasp 3.x compatibility) ──
// Falls back to Code.gs if .js not found, so the runner works during the migration.
const codeJsPath = path.join(__dirname, 'Code.js');
const codeGsPath = path.join(__dirname, 'Code.gs');
const codeFile = fs.existsSync(codeJsPath) ? codeJsPath : codeGsPath;
const code = fs.readFileSync(codeFile, 'utf8');
// Indirect eval at module scope so `var` declarations land in global.
const indirectEval = eval;
indirectEval(code);

// ── v2.5.3: NAME_ALIASES drift check ──
// scripts/name_aliases.json is the single source of truth (read at runtime by
// scripts/check_email_data.py). Code.gs hardcodes the same map at the top of
// the file because Apps Script can't easily fetch JSON at runtime. This check
// asserts they match — drift fails CI before the unit tests run.
const aliasesJsonPath = path.join(__dirname, 'scripts', 'name_aliases.json');
if (!fs.existsSync(aliasesJsonPath)) {
  console.error('FATAL: scripts/name_aliases.json missing — single source of truth not found.');
  process.exit(1);
}
const aliasesJson = JSON.parse(fs.readFileSync(aliasesJsonPath, 'utf8'));
const codegsAliases = global.NAME_ALIASES || {};
const jsonKeys = Object.keys(aliasesJson).sort();
const gsKeys = Object.keys(codegsAliases).sort();
let driftFail = false;
if (JSON.stringify(jsonKeys) !== JSON.stringify(gsKeys)) {
  console.error('NAME_ALIASES DRIFT: keys differ between Code.gs and scripts/name_aliases.json');
  console.error('  Code.gs keys: ' + gsKeys.join(', '));
  console.error('  JSON keys:    ' + jsonKeys.join(', '));
  driftFail = true;
}
for (const k of jsonKeys) {
  if (aliasesJson[k] !== codegsAliases[k]) {
    console.error('NAME_ALIASES DRIFT on key "' + k + '":');
    console.error('  Code.gs: ' + codegsAliases[k]);
    console.error('  JSON:    ' + aliasesJson[k]);
    driftFail = true;
  }
}
if (driftFail) {
  console.error('Update either Code.gs (var NAME_ALIASES = {...}) or scripts/name_aliases.json so they match.');
  process.exit(1);
}
console.log('\u2713 NAME_ALIASES drift check: Code.gs matches scripts/name_aliases.json (' + jsonKeys.length + ' aliases)');

// ── Override runUnitTests so we capture results instead of opening a dialog ──
const originalAssert = global._testAssertEq;
const allResults = [];
global._testAssertEq = function(results, name, actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  const pass = actualJson === expectedJson;
  allResults.push({ pass, name, actual: actualJson, expected: expectedJson });
};

// ── Stub the modal renderer so the test harness doesn't try to show UI ──
global.SpreadsheetApp.getUi = () => ({
  showModalDialog: () => {},
  alert: () => {},
  ButtonSet: { OK: 1, YES_NO: 2 },
  Button: { YES: 1, NO: 2, OK: 3 },
});

// ── Run the test cases (this evaluates each _testAssertEq call) ──
runUnitTests();

// ── Render results to stdout ──
const passed = allResults.filter(r => r.pass).length;
const failed = allResults.filter(r => !r.pass).length;

console.log('\n================ UNIT TEST RESULTS ================');
allResults.forEach(r => {
  if (r.pass) {
    console.log('\u2713 ' + r.name);
  } else {
    console.log('\u2717 ' + r.name);
    console.log('    actual:   ' + r.actual);
    console.log('    expected: ' + r.expected);
  }
});
console.log('===================================================');
console.log(`Total: ${allResults.length} | Passed: ${passed} | Failed: ${failed}`);

process.exit(failed > 0 ? 1 : 0);
