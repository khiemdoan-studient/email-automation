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
try {
  runUnitTests();
} catch (e) {
  console.error('');
  console.error('[FAIL] runUnitTests threw before completing: ' + (e && e.stack ? e.stack : e));
  console.error('This is a TEST FAILURE (the suite did not finish). Fix the error above.');
  process.exit(1);
}

// ── v2.27.1: tracking-shim open-redirect guard (docs/r.html) ──
// These run against the SHIPPED file, not a copy of the logic. A test that
// re-implemented hostAllowed would pass while the live page stayed vulnerable.
(function testShimRedirectGuard() {
  const fs = require('fs');
  const path = require('path');
  const shimPath = path.join(__dirname, 'docs', 'r.html');
  let src;
  try {
    src = fs.readFileSync(shimPath, 'utf8');
  } catch (e) {
    allResults.push({ pass: false, name: 'shim: docs/r.html is readable',
      actual: JSON.stringify(String(e)), expected: '"readable"' });
    return;
  }

  // Pull the real allowlist + matcher out of the page and run them.
  const hostsSrc = (src.match(/var INSTANT_HOSTS = \[[\s\S]*?\];/) || [])[0];
  const fnSrc = (src.match(/function hostAllowed\(u\) \{[\s\S]*?\n  \}/) || [])[0];
  if (!hostsSrc || !fnSrc) {
    allResults.push({ pass: false, name: 'shim: INSTANT_HOSTS + hostAllowed present in docs/r.html',
      actual: JSON.stringify({ hostsSrc: !!hostsSrc, fnSrc: !!fnSrc }), expected: '{"hostsSrc":true,"fnSrc":true}' });
    return;
  }
  const hostAllowed = new Function(hostsSrc + '\n' + fnSrc + '\nreturn hostAllowed;')();

  const cases = [
    ['https://studient.com/teacher', true, 'teacher hub'],
    ['https://www.canva.com/design/abc/view', true, 'AIM launch (subdomain)'],
    ['https://canva.link/xyz123', true, 'short video link'],
    ['https://drive.google.com/file/d/abc/view', true, 'infographic'],
    ['https://docs.google.com/document/d/abc', true, 'doc'],
    ['https://alpha.timeback.com/login', true, 'timeback platform'],
    // The bypasses an allowlist gets wrong when it uses substring matching.
    ['https://canva.com.evil.tld/phish', false, 'suffix-append bypass blocked'],
    ['https://notstudient.com/phish', false, 'prefix-append bypass blocked'],
    ['https://evil.tld/?x=drive.google.com', false, 'allowed host in query blocked'],
    ['https://evil.tld/#studient.com', false, 'allowed host in fragment blocked'],
    ['https://evil.example/phish', false, 'arbitrary attacker host blocked'],
    ['not-a-url', false, 'garbage blocked'],
  ];
  cases.forEach(function (c) {
    global._testAssertEq(allResults, 'shim hostAllowed: ' + c[2], hostAllowed(c[0]), c[1]);
  });

  // The matcher existing is worthless if the redirect does not call it. Assert
  // the instant-redirect branch is actually gated on it.
  const gated = /linkType !== 'pdf'[\s\S]{0,120}?hostAllowed\(p\.dest\)[\s\S]{0,200}?location\.replace\(p\.dest\)/.test(src);
  global._testAssertEq(allResults, 'shim: instant redirect is gated on hostAllowed', gated, true);

  // Unverified payload must never drive a redirect to an unlisted host: the only
  // other location.replace on a client-decoded value would be a regression.
  const rawReplaces = (src.match(/location\.replace\(p\.dest\)/g) || []).length;
  global._testAssertEq(allResults, 'shim: exactly one client-payload redirect site', rawReplaces, 1);

  // Deployment contract that must survive any shim edit.
  global._testAssertEq(allResults, 'shim: pinned /exec id intact',
    src.indexOf('AKfycbzxwauuhinj9htVMrlgPBTDCQxSGaOgLPZO8a9mRNNKBx8d9R_SeDTMBl0bh6r2IBg') !== -1, true);
  global._testAssertEq(allResults, 'shim: no dead Pages host',
    src.indexOf('khiemdoan-studient.github.io') === -1, true);
})();

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
