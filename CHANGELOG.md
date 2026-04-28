# Changelog

All notable changes to this project will be documented in this file.

## [v2.6.4] - 2026-04-28

### validateAllPdfs: respect Config Date Range (not "last 2 weeks")

After v2.6.3 fixed the false-positive issue, user ran the validator with Config Date Range set to `2026-04-20_to_2026-04-26` and got two reports back: week 04-20 (100% match — correct) AND week 04-27 (0% match — confusing because mark.katigbak's upstream pipeline hasn't run yet for the upcoming week).

User question: "Date range in config is set to 2026-04-20. So why doesn't it look for that?"

### Root cause

v2.6.2 hardcoded `getAvailableWeeks().slice(0, 2)` — it read the last 2 weeks from the Available Weeks helper tab, ignoring Config. Available Weeks is sorted week_start DESC, so the FIRST entry is always the upcoming week (which the upstream PDF generator may not have populated yet) and only the SECOND entry was the Config week. The validator was structurally guaranteed to flag the future week as MISSING for the entire roster every time.

### Fix

- Read Config Date Range via `getConfigValue('Date Range')`.
- Validate ONLY that week (the week the bulk Generate run would actually use).
- Error if Config has no Date Range set, with pointer to the Config tab dropdown / `Set Date Range` menu.
- Updated header to show the Config range prominently with edit-pointer text.
- Updated summary line + modal title to reflect single-week scope.
- Renamed menu item: `Debug: Validate All PDFs (last 2 weeks)` → `Debug: Validate All PDFs (Config week)` so the scope is obvious from the menu.

### Why this is correct

The whole point of the validator is "if I run Generate right now, will any teacher fail because of a missing PDF?". The bulk Generate run uses the Config week. So the validator should answer that exact question for that exact week.

If the IM wants to validate a different week, they change the Config dropdown first. That's a 2-second action and matches the existing workflow (Config Date Range is the single source of truth for everything else too).

### Files modified

- `Code.js` — `validateAllPdfs` reads Config (~10 LOC simplified), menu item label updated.
- `package.json` — version bump 2.6.3 → 2.6.4.
- `CHANGELOG.md` — this entry.
- `CLAUDE.md` — v2.6.4 history line.

### Verified

- ✓ `node --check Code.js`: SYNTAX OK
- ✓ `node test_runner.js`: 45 / 45 unit tests PASS (no regression — change is internal to validateAllPdfs)
- ✓ `npm run deploy`: pushed to clasp

### Action required

1. Reload spreadsheet (close tab + reopen).
2. Confirm Config Date Range is set to the week you want to validate.
3. Run **Email Tools -> Debug: Validate All PDFs (Config week)**.
4. Single-week report. Match rate should match the bulk-Generate reality. Any "MISSING" reported here is a true upstream gap.

## [v2.6.3] - 2026-04-28

### validateAllPdfs: add traversal fallback (mirror createDraftForTeacher)

User ran v2.6.2's `validateAllPdfs` and got 0/74 PDF match for the current week + 50/74 for the prior week, with many MISSING teachers (Bertha Folk, Avlen Edwards, Verenice Rivera, etc.) whose PDFs were clearly visible in Drive. Same teachers had succeeded in v2.6.0's smoke test — same code path (`findTeacherPdfBySearch`), same week. Why the divergence?

### Root cause

`createDraftForTeacher` (Code.js:1865-1881) does **search-API first, traversal fallback** — but my v2.6.2 `validateAllPdfs` only called `findTeacherPdfBySearch`. It missed the fallback entirely.

Drive's search API has known **search-index lag** for shared-with-me users: a file added by a different owner (mark.katigbak) is not immediately findable via `getFilesByName`, even though the file is fully accessible via folder traversal. The fallback in `createDraftForTeacher` exists exactly to handle this — once the school folder is cached, `findTeacherPdfByTraversal` finds files inside it regardless of search-index state.

So the bulk Generate run worked for the same teachers that validateAllPdfs reported as missing — search returned null, traversal succeeded silently. validateAllPdfs was reporting false-positives because it stopped at search.

### Fix

`validateAllPdfs` now mirrors the exact same two-phase lookup as `createDraftForTeacher`:

1. Try `findTeacherPdfBySearch(teacher, dateRange, schoolFolderCache)` first.
2. If null, try `findTeacherPdfByTraversal(teacher, dateRange, rootFolder, schoolFolderMap, schoolFolderCache)`.
3. Only report MISSING if BOTH return null (which is what `createDraftForTeacher` would also fail on).

Added `schoolFolderMap` build (mirrors lines 815-818 of generateDraftsForCurrentUser). Added `foundViaFallback` counter; the per-week match-rate line now shows e.g. `67.6% (50 / 74) (12 via traversal fallback — search-index lag)` when the fallback was needed, so user can distinguish "search index stale" from "real upstream gap".

### Files modified

- `Code.js` — `validateAllPdfs` (~10 LOC added: schoolFolderMap build + traversal call + counter).
- `package.json` — version bump 2.6.2 → 2.6.3.
- `CHANGELOG.md` — this entry.
- `CLAUDE.md` — v2.6.3 history line.

### Verified

- ✓ `node --check Code.js`: SYNTAX OK
- ✓ `node test_runner.js`: 45 / 45 unit tests PASS (no regression — fallback is additive)
- ✓ `npm run deploy`: pushed to clasp

### Action required

1. Reload spreadsheet (close tab + reopen).
2. Re-run **Email Tools -> Debug: Validate All PDFs (last 2 weeks)**.
3. Match rate should now match the bulk-Generate reality. Any "MISSING" reported here is a true upstream gap (no PDF anywhere in Drive for that teacher-week, by either lookup method) — pingable to mark.katigbak.

### Lesson

When mirroring an existing flow's behavior, **mirror the WHOLE flow**, not just the headline call. The bulk Generate run's PDF lookup is two-phase by design (v2.5.0 + v2.5.x); v2.6.2 cherry-picked one phase and produced false positives. Same lesson as the v2.5.2 incident (`checkTeacherFolders` searched only one folder-name form but Drive uses both — pre-existing bug surfaced by mismatched assumptions).

## [v2.6.2] - 2026-04-28

### Comprehensive PDF coverage validator (Apps Script side)

After v2.6.1's smoke-test fix landed, user asked: "are there any other teachers who have ANY data from the last two weeks that do NOT have reports made for them?". The Python validator I wrote first (`scripts/validate_pdfs.py`) returned 0 PDFs because the service account `service-account@reading-dashboard-482106.iam.gserviceaccount.com` has no Drive access to the teacher PDF folders (those folders are owned by mark.katigbak's upstream system, not Khiem's pipeline).

### Pivot

Built the equivalent check INTO Apps Script as a menu item. Apps Script runs as the active user (the IM, or Khiem when validating), whose Drive auth has shared-with-me access to every teacher PDF folder.

### What's new

- **NEW menu item: `Email Tools -> Debug: Validate All PDFs (last 2 weeks)`** — runs `validateAllPdfs()`.
- **NEW `validateAllPdfs()`** (~115 LOC, placed near other debug functions before `debugDriveAccess`):
  1. LockService guard (won't run during a bulk Generate or another validation).
  2. Reads last 2 weeks from Available Weeks tab.
  3. Iterates ALL schools across ALL IMs (NOT filtered by current user — system-wide check).
  4. Iterates ALL teachers across all schools (Teacher Emails + Reading Teachers tabs).
  5. For each week, for each teacher: `lookupByName(metrics, ...)` to check has-metrics, then `findTeacherPdfBySearch(...)` to check has-PDF.
  6. Reports MISSING (metrics but no PDF) in an HTML modal sorted by school + name. Includes match rate per week and a grand-total summary.

### Why same chain matters

This uses the EXACT same lookup chain as the bulk Generate run (`lookupByName` + `NAME_ALIASES` + search-API PDF lookup). So a "MISSING" here = guaranteed Error Log entry during the next bulk Generate. No false positives from divergent code paths.

### Python script note

Updated `scripts/validate_pdfs.py` docstring to call out the SA-permission limitation and recommend the Apps Script menu item as the authoritative check. The Python script remains useful if/when the SA is shared on the parent Drive folder (one-line CLI, scriptable for CI).

### Files modified

- `Code.js` — `validateAllPdfs()` function (+~115 LOC) before `debugDriveAccess`; menu item added under existing debug entries.
- `scripts/validate_pdfs.py` — docstring header updated with SA-limitation note + Apps Script alternative pointer.
- `package.json` — version bump 2.6.1 -> 2.6.2.
- `CHANGELOG.md` — this entry.
- `CLAUDE.md` — v2.6.2 history line.

### Verified

- ✓ `node --check Code.js`: SYNTAX OK
- ✓ `node test_runner.js`: 45 / 45 unit tests PASS (no regression — function is additive)
- ✓ Menu inspection: new "Debug: Validate All PDFs (last 2 weeks)" entry between Check Teacher Folders and Drive Access

### Action required after deploy

1. Reload spreadsheet (close tab + reopen) for new menu state.
2. Run **Email Tools -> Debug: Validate All PDFs (last 2 weeks)**.
3. Review the MISSING list — for each teacher-week missing a PDF, ping mark.katigbak so upstream PDF generation re-runs.
4. After upstream regen, re-run the validator to confirm 0 missing.

## [v2.6.1] - 2026-04-28

### Smoke test fixture: swap Faith Armstrong → Vipul Singhal (Metro)

After v2.6.0 deployed, Khiem ran the smoke test and got 6/7 success. The 1 failure was Faith Armstrong (Metro): `PDF not found for "Faith Armstrong" week "2026-04-20 - 2026-04-26"`.

### Investigation

Faith DOES have students (5 grade-9 + 1 grade-10 = 6 total) per the All Teacher Metrics tab. But her cohort is winding down: current-week activity is 0.6 active days / 60% login / 0 lessons mastered. The PDF was missing because mark.katigbak's upstream PDF generation system either skipped her low-activity cohort or has a Metro-Schools-specific gap.

Either way, having Faith in `CONFIG.SMOKE_TEST_TEACHERS` would cause the smoke test to always fail on the Metro slot — which defeats the smoke test's purpose (catch real anomalies, not always-failures from known-stale data).

### Fix

Swapped `'faith armstrong'` → `'vipul singhal'` in `CONFIG.SMOKE_TEST_TEACHERS`. Vipul:
- Multi-grade 9+10 (13 students total — most Metro data)
- 0.8 login rate, 17.92 / 34.3 avg minutes — real ongoing activity
- Better template signal across multiple grade rows

### Verified

- ✓ `npm run deploy` (test-gated): 45/45 passed → `clasp push` → "Pushed 2 files" (Code.js + appsscript.json — no test_runner.js leak per v2.6.0 `.claspignore`)
- After reload, smoke test should now report 7/7

### Files modified

- `Code.js` — 1 line swap in `CONFIG.SMOKE_TEST_TEACHERS`
- `package.json` — version bump 2.6.0 → 2.6.1
- `CHANGELOG.md` — this entry

### Action required after deploy

1. Already pushed via clasp (production has v2.6.1 Code.js).
2. Reload spreadsheet (close tab + reopen) so new menu state picks up.
3. Re-run **Email Tools → Test Mode: Generate Smoke Test (drafts to me)** — expect **7 drafts created in YOUR Gmail, 0 failed** (was 6/1 in v2.6.0).

### Note: Faith Armstrong's missing PDF

Not fixed by this release. The upstream PDF generation system (mark.katigbak's pipeline) didn't generate Faith's PDF for week 2026-04-20. If she needs to receive an actual draft when an IM runs the bulk Generate flow, ping mark.katigbak to investigate. For now, the system correctly handles this case: the per-teacher error logs to the Error Log tab without blocking the rest of the run.

## [v2.6.0] - 2026-04-27

### Audit follow-up — 6 deferred items addressed (helpers, magic nums, smoke test, regen, clasp, tests)

After v2.5.3 audit shipped 16 fixes and deferred 6, this release tackles the deferred set per user direction. Phases A-F:

### Phase A — Helper extraction (audit finding M-6)

DRY cleanup for code duplicated 4+ times. Extracted to `HELPER FUNCTIONS` section near the top of Code.gs:

- **`getMySchools(currentUserEmail, mappingData?)`**: filter School-IM Mapping by IM email. Used by `generateDraftsForCurrentUser`, `checkTeacherNames`, `checkTeacherFolders`, `debugDriveAccess`. ~30 LOC saved.
- **`findSchoolFolder(school, rootFolder)`**: try displayName first (search-API path that works for shared-with-me), fallback to folderName. ~15 LOC saved.
- **`buildSchoolFolderCache(mySchools, rootFolder)`**: dual-keyed cache build (per v2.5.1 fix). Calls `findSchoolFolder` internally.
- **`cellToDateString(val)`**: convert Sheets cell value (Date object OR string) to ISO `YYYY-MM-DD`. Used in `checkMetricsExistForWeek` + `getTeacherMetricsForWeek`. ~10 LOC saved.

**Validation strategy**: scanner ran BEFORE refactor (75/86 baseline) and AFTER (75/86 confirmed identical). All 30 existing tests pass. New tests added (see Phase F).

### Phase B — Magic number extraction (audit finding #4)

- **NEW `CONFIG.THRESHOLDS`**: `ACTIVE_DAYS_GREEN: 3.95`, `ACTIVE_DAYS_YELLOW: 2.95`, `AVG_MINS_GREEN: 99.5`, `AVG_MINS_YELLOW: 79.5`. Used by `buildMetricsTable` cell shading.
- **NEW `CONFIG.LIMITS`**: `ERROR_LOG_MAX_ROWS: 500`, `ERROR_LOG_TRIM_TRIGGER: 600`, `ERROR_MSG_TRUNCATE: 1500`. Replaces module-level vars from v2.5.1.
- All 7 magic-number sites in Code.gs now reference CONFIG.

### Phase C — Smoke test fixture (audit alternative for #2 DriveAdapter)

NEW menu item: **`Test Mode: Generate Smoke Test (drafts to me)`**.

- **`CONFIG.SMOKE_TEST_TEACHERS`** (8 teachers, 1-2 per district): Avlen Edwards (JHMS), Muntasir Hamid (JHMS), Anton Haughton (AFMS), Bertha Folk (AFMS), Kim Bell (Reading — note: 1 of 11 upstream gaps as of 2026-04-20), Faith Armstrong (Metro), Verenice Rivera (Metro), Rebecca Reynolds (JHES).
- **`findTeacherByName(nameLower)`**: NEW helper that searches BOTH Teacher Emails + Reading Teachers tabs. Returns same teacher shape as `getTeachersForSchools`.
- **`generateSmokeTest()`**: full generation pipeline (search-API + alias resolution + PDF lookup + draft creation) but overrides `teacher.email` with current user's email. Result: ~6-8 drafts in YOUR Gmail Drafts folder for visual inspection.
- Use case: pre-cycle sanity check that all template elements (metrics table, winners, trend alert, PDF attachment) render correctly across districts. Catches integration bugs that pure-function tests miss.

### Phase D — Retry multi-select dialog (audit finding #3)

NEW menu item: **`Retry Last Run's Failed Teachers`**.

Persistence via Error Log `run_id` (per user choice — multi-session retries supported).

- **`retryLastRunFailed()`**: reads Error Log, finds most recent `run_id`'s `ERROR`-severity rows from `createDraftForTeacher`, opens a modal with checkboxes (one per failed teacher, all checked by default).
- **`_buildRetryDialogHtml(failedTeachers, runId)`** (pure helper, testable): renders the HTML form. Sanitizes runId against XSS (strips `<>"` chars). Has 4 unit tests.
- **`processRetry(selectedTeacherStrs)`**: server-side handler called by the modal. Re-resolves teacher objects by email, runs `deleteExistingDraft` then `createDraftForTeacher` for each selected. Returns HTML summary.
- **`deleteExistingDraft(teacherEmail, subject)`**: NEW helper. Iterates `GmailApp.getDrafts()`, deletes any draft matching the (recipient, subject) pair. Returns count deleted. Resilient to mid-iteration draft-deleted-by-user.
- LockService respected — retry waits if a bulk run is in progress.

### Phase E — clasp deploy automation (audit finding #1)

User opted to set up clasp themselves and report back. This release adds the documentation + scripts; user does the auth + first push.

- **NEW `docs/CLASP_SETUP.md`**: step-by-step guide (install → enable Apps Script API → login → pull → push → troubleshooting). Includes "When NOT to use clasp" section for Workspace SSO restrictions.
- **`package.json`** scripts added: `npm run pull`, `npm run push`, `npm run open`, `npm run deploy`.
- **Manual paste workflow preserved** as fallback. CLASP_SETUP.md explicitly notes this.

### Phase F — Tests + docs

**`runUnitTests` grew from 30 → 45 test cases** (+15 v2.6.0):
- `cellToDateString` × 4 (Date object, string passthrough, null, undefined)
- `getMySchools` × 4 (frank/bruna filtering, no-match, returned-shape)
- `_buildRetryDialogHtml` × 4 (header, teacher name, empty list, runId XSS sanitize)
- `CONFIG.THRESHOLDS / LIMITS` sanity × 3 (existence, ordering invariants)

All 45 pass via `node test_runner.js` (with NAME_ALIASES drift check + new tests).

### Files modified

- `Code.gs` — Phase A (helpers + 5 caller refactors), Phase B (CONFIG.THRESHOLDS + LIMITS + 7 replacements), Phase C (~150 LOC new for smoke test), Phase D (~250 LOC new for retry dialog), Phase F (+15 unit tests). Net: ~+450 LOC (-50 from helper de-duplication).
- `package.json` — version bump 2.5.3 → 2.6.0 + clasp scripts.
- `docs/CLASP_SETUP.md` — NEW.
- `CHANGELOG.md` — this entry.
- `CLAUDE.md` — v2.6.0 history line.
- `write_doc.py` — user-facing v2.6.0 summary.

### Verified

- ✓ `node --check Code.gs`: SYNTAX OK
- ✓ `node test_runner.js`: NAME_ALIASES drift check PASS + **45 / 45** unit tests PASS
- ✓ `python scripts/check_email_data.py --week 2026-04-20`: still **75 / 86** matched (no regression from helper extraction)

### Action required after deploy

1. **(Recommended)** Set up clasp per `docs/CLASP_SETUP.md`. Once configured, deploy is `npm run push` instead of paste-into-editor.
2. Paste latest `Code.gs` into Apps Script editor (or `npm run push` after clasp setup) → Save → reload spreadsheet.
3. Run **Email Tools → Run Unit Tests** — expect **45 passed, 0 failed**.
4. Run **Email Tools → Test Mode: Generate Smoke Test (drafts to me)** — should create ~7-8 drafts in YOUR Gmail Drafts. Inspect visually for rendering issues across districts.
5. After your next bulk Generate run, if any teachers fail, try **Email Tools → Retry Last Run's Failed Teachers** for surgical retry.

### Skipped (final disposition of original audit findings)

| # | Finding | Status | Reason |
|---|---------|--------|--------|
| #5 | Unicode normalization in `lookupByName` | **Skipped permanently** | No production case; no upcoming international names confirmed |
| (n/a) | DriveAdapter integration tests | **Replaced** | User opted for smoke test fixture (Phase C above) instead |

## [v2.5.3] - 2026-04-27

### Full project audit (3 parallel agents, 23 findings, 16 fixes)

Comprehensive audit triggered by user `/audit` after v2.5.2 shipped. Three parallel subagents scanned Code.gs (2523 LOC), Python tooling (write_doc.py + scripts/check_email_data.py + test_runner.js), and docs/cross-repo drift. **Cross-repo drift: NONE** — parent's `email_winners.py` writers byte-match Code.gs readers (12/2/7 columns).

### Fixes shipped

#### Templates with placeholder/blank content → `[DRAFT]` suffix
Audit found 4 templates ship literal placeholder text or unfilled `_____` blanks if an IM picks them:
- `Wrap Up: Celebrate Wins`: ships `[PLACEHOLDER: Wrap Up focus content -- paste from Google Doc]` in body
- `Week 1: Goals & Monitoring`: 3 unfilled `_____` blanks
- `Week 3: Micro-Coaching`: 2 unfilled `_____` blanks
- `Week 4: Diagnosing Habits`: 2 unfilled `_____` blanks

**Fix**: renamed each TEMPLATES key to add ` [DRAFT]` suffix (e.g., `'Wrap Up: Celebrate Wins [DRAFT]'`). Since `TEMPLATE_NAMES = Object.keys(TEMPLATES)` (per v2.3.0), the dropdown auto-shows the warning. **Action**: Khiem can fill the content later → remove `[DRAFT]` suffix once content is provided.

#### `checkDriveFolderExists` removed (~100 LOC dead code)
After v2.5.0 search-API pivot, the function failed-open on iteration errors (so never actually blocked anyone) AND the per-teacher path already surfaces specific PDF-missing errors via Error Log. The function + the call site + the dialog WARNING block were all removed. Use `Debug: Check Teacher Folders` for proactive folder inspection instead.

#### `withDriveRetry` → `withGmailRetry` rename
The function only wraps `GmailApp.createDraft` (one call site in createDraftForTeacher). The old name "Drive" was misleading after v2.5.0 made Drive lookups iterate-step-wrapped instead. Pure rename — no behavioral change.

#### NAME_ALIASES single source of truth (`scripts/name_aliases.json`)
Was duplicated between Code.gs (Apps Script can't easily fetch JSON at runtime) and `check_email_data.py` (Python). Risk: silent drift if one updated but not the other.

**New architecture**:
- `scripts/name_aliases.json` is the canonical source
- `check_email_data.py` reads JSON at runtime
- `test_runner.js` parses Code.gs's `var NAME_ALIASES = {...}` (via indirectEval populating `global.NAME_ALIASES`) and asserts match against the JSON. **Drift fails CI** before unit tests run.
- Code.gs still hardcodes the map (Apps Script limitation), but the test gate catches drift.

#### Build / dependency hardening
- **`requirements.txt`** (NEW): pins `google-api-python-client>=2.100.0,<3.0.0`, `google-auth>=2.20.0,<3.0.0`, `google-auth-httplib2>=0.1.0,<1.0.0`. Was unpinned — silently broken if a Google API breaking minor shipped.
- **`package.json`** (NEW): pins Node `>=18`, exposes `npm test` as `node test_runner.js`.
- **`.gitignore`**: added `__pycache__/`, `*.pyc`, `*.egg-info/`, `.claude/`. Was missing — `git add .` would have committed Python bytecode.
- **`STUDIENT_SA_KEY` env var**: both `write_doc.py` and `scripts/check_email_data.py` now read SA key path from env var with fallback to local Windows path. Lets the scripts run on EC2 / other dev machines / CI without code changes.

#### `write_doc.py` user-guide formatting fixes
- **Subtitle string** at line 431 was stale (`User Guide & Documentation (v2.4.2)`) — corrected to `(v2.5.3)`. Worked by accident before (same string length).
- **Title HEADING_2 styling loop** (line 442) only iterated v2.4.2 down → v2.5.0/2.5.1/2.5.2/2.5.3 sections lost their `HEADING_2` styling in the user-facing Doc. Loop now includes all v2.5.x entries.

#### Code health micro-fixes
- **`getStudentWinners` null guard**: parity with `getTeacherMetricsForWeek` — `String(null)` returns `'null'` (not `''`), so the prior loop could silently key a row under literal `'null'`. Now skips explicitly.
- **`parseInt` radix**: explicit `, 10` arguments at the 2 call sites in getStudentWinners. V8 default is fine; cosmetic for portability.
- **`lookupByName` multi-token first-name limitation** (audit M-1): documented as a JSDoc comment. Edge case requires multi-token first name in roster + same-token-prefix collision in metrics; not currently exercised by any production teacher. If a real cross-leak appears, tighten the comparison to use full lowercased+trimmed firstName.

#### Documentation alignment
- CLAUDE.md "studient-dashboard-pipeline" → "Studient Excel Automation" (correct repo name).
- CHANGELOG v2.5.2 step 3 (test count check) — already says 30; v2.5.3 adds drift check + `(for week 2026-04-20)` qualifier in user guide.
- write_doc.py user-facing summary updated to describe v2.5.3.

### Audit findings deferred to future cycles

| # | Finding | Severity | Defer reason |
|---|---------|----------|--------------|
| | clasp deploy automation | HIGH | Auth uncertainty; manual paste workflow is acceptable for now |
| | DriveAdapter integration tests | MEDIUM | Medium effort; pure-fn tests + scanner already catch most regressions |
| | Regenerate single teacher menu item | MEDIUM | Medium effort; LockService + bulk re-run is acceptable workaround |
| | Magic-number extraction (color thresholds, file caps) | LOW | Cosmetic; values are stable |
| | Unicode normalization in lookupByName | LOW | No reported case |
| | Helper function extraction (mapping loader, school cache builder) | LOW | DRY improvements; defer to clean-up cycle |

### Files modified

- `Code.gs` — 11 surgical edits (~+50 LOC, ~-110 LOC net): TEMPLATES key renames (×4), checkDriveFolderExists deletion + call-site removal, withDriveRetry → withGmailRetry (×2), getStudentWinners null guard + parseInt radix, lookupByName multi-token doc comment
- `scripts/name_aliases.json` — NEW (single source of truth)
- `scripts/check_email_data.py` — SA key env var + load NAME_ALIASES from JSON
- `write_doc.py` — SA key env var + subtitle fix + title loop expansion
- `test_runner.js` — NAME_ALIASES drift check before unit tests
- `requirements.txt` — NEW
- `package.json` — NEW
- `.gitignore` — added `__pycache__/`, `*.pyc`, `*.egg-info/`, `.claude/`
- `CHANGELOG.md` — this entry
- `CLAUDE.md` — v2.5.3 history line + repo name fix

### Verified

- ✓ `node --check Code.gs`: SYNTAX OK
- ✓ `node test_runner.js`: NAME_ALIASES drift check passes + 30/30 unit tests passed
- ✓ `python scripts/check_email_data.py --week 2026-04-20`: still 75/86 matched (no regression — alias logic unchanged)

### Action required after deploy

1. Paste latest `Code.gs` into Apps Script editor → Save → reload spreadsheet tab.
2. The Email Tools dropdown will now show 4 templates with `[DRAFT]` suffix — IMs should avoid these until content is provided.
3. Run **Email Tools → Refresh Template Dropdown** to update the Config dropdown with the new template names. **If your Config tab's Template was previously set to one of the renamed templates** (`Wrap Up: Celebrate Wins`, `Week 1: Goals & Monitoring`, `Week 3: Micro-Coaching`, `Week 4: Diagnosing Habits`), re-pick from dropdown to use the `[DRAFT]` version.
4. Run **Email Tools → Run Unit Tests** — should report **30 passed, 0 failed**.
5. Run **Email Tools → Generate My Email Drafts** as usual. The `Drive folders: Found / NOT FOUND` line is gone from the confirmation dialog (per-teacher errors now surface in Error Log).

## [v2.5.2] - 2026-04-27

### Post-mortem fix: AFMS production report (Aston Haughton + all-MISSING debug)

An IM tested AFMS after v2.5.1 deployed and reported two issues. Investigation found BOTH were **PRE-EXISTING** bugs unrelated to v2.5.0/v2.5.1, but my verification process didn't catch them. v2.5.2 fixes both, plus adds tooling to prevent the class of bug.

#### Issue 1 — Aston Haughton's email had no metrics table (yellow callout)

**Root cause**: NAME MISMATCH between roster and BigQuery.
- Roster (`Teacher Emails` tab + Drive folder + email address `haughtona@`): "Aston Haughton"
- BigQuery / `All Teacher Metrics` tab: "**Anton** Haughton" (one-letter typo, present every week back to 2025-09-01)

`lookupByName('Aston', 'Haughton', 'Aston Haughton')` correctly returned null per v2.3.1's cross-leak guard (refuses to match `'aston'` to `'anton'` even with shared last name). This bug has existed since the BQ data diverged — would have failed identically in v2.4.3 or any prior version. Surfaced now because AFMS wasn't tested earlier this morning.

#### Issue 2 — `Debug: Check Teacher Folders` showed all 18 AFMS+Metro teachers as MISSING (red wall)

**Root cause**: PRE-EXISTING bug in `checkTeacherFolders` (last touched v2.4.3, line 2231 of Code.gs).
- Function searched for `t.folderName.toLowerCase()` → underscored form (e.g., `"aston_haughton"`)
- Drive folders are SPACED (e.g., `"Aston Haughton"`, owner mark.katigbak)
- Set lookup ALWAYS missed → every teacher reported MISSING

This bug has existed since the new Drive folder structure rolled out (v2.0.3 era) but never surfaced because IMs primarily ran "Generate" (which uses search-API in v2.5.0+) rather than the diagnostic.

### Comprehensive validation across ALL teachers

New script `scripts/check_email_data.py` (Python port of Apps Script's `lookupByName` logic) validates the full roster ↔ metrics alignment. First run for week 2026-04-20:
- **86 teachers in roster** (77 from `Teacher Emails`, 9 from `Reading Teachers`)
- **75 unique names in metrics** for that week
- **73 / 86 matched** — 85% baseline
- **2 likely typos** (high confidence) → both added to NAME_ALIASES below
- **10 true upstream gaps** — no token overlap with metrics, genuinely missing from BQ. Escalation list:
  - JRES (Ridgeland Elementary): Akeisha Arnett, Aresiha Arnett, Armi Laigue, Egeria Bostick, Genesis Temonio, Kelly Ann Thornton, Kelly Thornton, Kumari Bolle, Linda Graves
  - Reading Community: Kim Bell

After applying the 2 aliases below, **75 / 86 matched (87%, +2)**. The remaining 11 (10 gaps + 1 garbage `#REF!` row) need data-team escalation.

### Changes (`Code.gs`)

1. **NAME_ALIASES additions (line 89)**:
   - `'aston haughton': 'anton haughton'` — TEMPORARY until BQ data is corrected (AFMS)
   - `'lakieshie jennings': 'lakieshie roberts-jennings'` — JHES, hyphenated last name
   - Added comprehensive comment block explaining how to find new aliases (`scripts/check_email_data.py`)

2. **`checkTeacherFolders` dual-name match (line ~2231)**: searches both `t.folderName.toLowerCase()` (underscored) AND `t.name.toLowerCase()` (spaced). Mirrors v2.4.2's school-folder-cache fix but for teacher subfolders.

3. **NEW `checkTeacherNames()` function**: Apps Script port of the Python scanner. Iterates teachers, runs `lookupByName` against current week's metrics, shows matched count + unmatched table with token-overlap heuristic for each unmatched teacher. Run BEFORE generation when in doubt.

4. **`onOpen()` menu**: added `Debug: Check Teacher Names (roster vs metrics)` as the first debug item (most actionable).

5. **`buildMetricsTable` empty-state callout**: now directs IM to `Debug: Check Teacher Names` (the right tool for the metrics-gap class of issue), not `Debug: Check Teacher Folders` (which checks Drive, irrelevant here). The old wording was actively misleading.

### New: `scripts/check_email_data.py` (~250 LOC)

Standalone validator for pre-cycle alignment checks. Faithful Python port of `lookupByName` (including v2.3.1 cross-leak guard). Reports MATCHED / LIKELY-TYPO / POSSIBLE-TYPO / UPSTREAM-GAP and outputs a copy-paste-able NAME_ALIASES block. Usage:
```
python scripts/check_email_data.py --week 2026-04-20
python scripts/check_email_data.py --week 2026-04-13 --strict   # exit 1 if mismatches
```

Replaces the post-mortem-only `verify_haughton.py` (deleted).

### Test additions

`runUnitTests` grew from 26 → **30 test cases**:
- `aliases: Aston→Anton resolves via NAME_ALIASES`
- `aliases: Lakieshie→Roberts-Jennings resolves via NAME_ALIASES`
- `aliases: Lisa Kloesz→Kloetz still works`
- `aliases: direct match wins over alias` (non-destructive verification)

### Why my verification missed this (process retrospective)

1. **Unit tests only covered pure functions**. Added 4 alias tests in v2.5.2 but more importantly added the **comprehensive Python scanner** that validates against REAL spreadsheet data (catches the data-shape regression that pure-function tests can't).
2. **Manual test was N=1 school**. After v2.5.0 worked for "one school", I treated that as sufficient. Should have asked for 2-3 schools or run the scanner BEFORE shipping v2.5.1.
3. **`checkTeacherFolders` debug tool itself had a bug** — its red-wall output amplified the perceived breakage. Fixed.
4. **Process change going forward**: ALWAYS run `scripts/check_email_data.py` before shipping ANY v2.x change to email-automation. Add this to AI_INSTRUCTIONS.

### Action required after deploy

1. Paste latest `Code.gs` into Apps Script editor → Save → reload spreadsheet tab.
2. Run **Email Tools → Run Unit Tests** — should report **30 passed, 0 failed**.
3. Run **Email Tools → Debug: Check Teacher Names** — should show 75 / 86 matched, 11 unmatched (the upstream-gap teachers above).
4. Run **Email Tools → Generate My Email Drafts** for AFMS — Haughton's email should now have his metrics table populated.

### Files modified

- `Code.gs` — 6 edits: NAME_ALIASES (+2 entries + comment block), onOpen menu (+1 item), `buildMetricsTable` callout text, `checkTeacherFolders` dual-name match, NEW `checkTeacherNames` function (~80 LOC), `runUnitTests` +4 cases
- `scripts/check_email_data.py` — NEW (~250 LOC)
- `CHANGELOG.md` — this entry
- `CLAUDE.md` — v2.5.2 history line + lesson learned
- `write_doc.py` — user-facing v2.5.2 summary

### Verified

- ✓ `node --check Code.gs`: SYNTAX OK
- ✓ `node test_runner.js`: **30 / 30 passed**
- ✓ `python scripts/check_email_data.py --week 2026-04-20` after aliases applied: **75 / 86 matched**

## [v2.5.1] - 2026-04-27

### Audit-driven hardening (post-v2.5.0 production bake)

After v2.5.0 shipped this morning and tested working for one school, an audit pass surfaced 13 findings ranked Critical → Nice-to-have. v2.5.1 lands the 5 highest-priority fixes (3 Critical + 2 Important); the remaining 8 are deferred to post-program (see "Deferred" section below).

### Critical fixes

#### Fix C-1: Cross-school PDF mix-up — `findTeacherPdfBySearch` now verifies parent chain when 2+ matches exist

**Bug**: v2.5.0's `findTeacherPdfBySearch` returned the first `.pdf` match without verifying parentage. If two schools had a teacher named "John Smith" both with PDFs in the same week, the first hit won — wrong PDF attached silently. Drive search returns ALL matching files visible to the user; an IM managing both schools would see both files in search results.

**Fix**: changed search loop to collect ALL matching PDFs first, then:
- **0 matches**: try next candidate filename
- **1 match**: accept without verification (no ambiguity → no regression risk vs v2.5.0; verification could fail for shared-with-me users whose `getParents()` also throws "Service error: Drive")
- **2+ matches**: walk `file → teacherFolder → schoolFolder` for each, accept the one whose school folder ID matches `schoolFolderCache[teacher.campus]` (fallback: normalized name match)

**Why "1 match → accept without verification"**: this is the common path for ~99% of teachers. Forcing verification here would risk regression for shared-with-me users (whose `getParents()` may throw the same "Service error: Drive" we just fixed). FAIL-CLOSED on verification ONLY in the multi-match case.

**New helpers**:
- `_schoolFolderMatches(actualId, actualName, expectedId, expectedName)` — pure decision logic (testable without Drive mocks)
- `_verifyFileInSchool(file, schoolFolderCache, teacher)` — Drive plumbing (parent chain + comparison + FAIL-CLOSED on `getParents()` error)

#### Fix C-2: Cache key unification — `schoolFolderCache` now keyed by both displayName AND folderName

**Latent bug**: cache was written keyed by `sch.displayName` (line 327) but read by `teacher.campus`. By construction in `getTeachersForSchools`, these ARE always equal (since teachers are filtered by displayName), but the conceptual coupling is fragile — a future refactor of either function could silently break the cache and double Drive calls per teacher.

**Fix**: cache build now writes BOTH `sch.displayName` AND `sch.folderName` keys (when they differ). Reads via either key now hit the cache.

#### Fix C-3: Error Log trim hysteresis — no more O(n) `deleteRows` on every error past 500

**Perf bug**: v2.5.0's `logError` called `sheet.deleteRows(2, n)` on EVERY call past 500 entries — an O(n) Sheet operation that rewrites all subsequent rows. End-of-year runs that log 50+ errors per execution would cascade into 50 expensive deletes mid-loop, potentially hitting Apps Script's 6-min execution timeout.

**Fix**: hysteresis pattern.
- Old: `if (lastRow > 500 + 1) deleteRows(2, lastRow - 500 - 1)` — fires on every call past 500
- New: `if (lastRow > 600 + 1) deleteRows(2, lastRow - 500 - 1)` — fires once every ~100 errors

New constant: `ERROR_LOG_TRIM_TRIGGER = 600`.

### Important fixes

#### Fix I-5: `_runIdCache` reset per invocation

**Latent bug**: Apps Script V8 isolates can persist module globals across consecutive runs in the same warm process. v2.5.0's `_runIdCache` was set on first call and never explicitly reset, so two consecutive `generateDraftsForCurrentUser` runs in a warm isolate would share one `run_id` — breaking the Error Log's per-run filtering.

**Fix**: explicitly `_runIdCache = null` at the top of `generateDraftsForCurrentUser`'s try block.

#### Fix I-8: Wrap backward-compat iterators in `findTeacherPdfByTraversal`

**Latent bug**: v2.5.0's traversal fallback wrapped the new-format iteration but missed the legacy `dateFolder + 00_SUMMARY.PDF` path. Same class of bug v2.4.x spent 4 attempts on; would crash if any legacy teacher folder existed AND search-API miss forced the fallback path.

**Fix**: every iterator step (`findFolderByName`, `dateFolder.getFiles`, `oldFiles.hasNext`, `oldFiles.next`, `f.getName`) now in try/catch with `logError('WARN', ...)` on failure.

### Test additions

`runUnitTests` grew from 17 → **26 test cases**:
- 3 new tests for apostrophe handling in `buildPdfCandidateFilenames` (e.g., "Dan O'Brien")
- 6 new tests for `_schoolFolderMatches` (id match, id mismatch, name fallback, name mismatch, no-info → false, normalize underscore=space)

All 26 pass via `test_runner.js` (Node harness with mocked Apps Script globals).

### Deferred (8 lower-priority findings)

Investigated and explicitly deferred to post-program:
- #4: more test coverage for createDraftForTeacher integration (would need Drive mocks)
- #6: per-teacher PDF preflight in confirm dialog (Medium effort; would add ~30s for 50-teacher run, optional UX)
- #7: multi-grade teacher comment (no functional regression — current code handles via metrics array)
- #9: `lookupByName` middle-name false positive (documented v2.3.1 limitation; cross-leak guard already in place)
- #10: Reading Community constant extraction (cosmetic)
- #11: `clasp` setup for Apps Script version control (Medium effort; manual paste workflow is fine for now)
- #12: apostrophe NORMALIZATION in candidates (preservation already tested; normalization variants only matter if Drive search-API has apostrophe-quoting issues — TBD)
- #13: regenerate single teacher menu item (Medium effort; bulk re-run with LockService is acceptable workaround)

### Files modified

- `Code.gs` — 7 surgical edits (~+90 LOC, ~-10 LOC):
  1. `ERROR_LOG_TRIM_TRIGGER = 600` constant
  2. `logError` trim logic (hysteresis)
  3. `generateDraftsForCurrentUser` reset `_runIdCache`
  4. `schoolFolderCache` build (dual-keying)
  5. `findTeacherPdfBySearch` rewrite + `_schoolFolderMatches` + `_verifyFileInSchool` helpers
  6. `findTeacherPdfByTraversal` backward-compat wrap
  7. `createDraftForTeacher` passes `schoolFolderCache` to `findTeacherPdfBySearch`
- `runUnitTests` — +9 test cases (17 → 26 total)
- `CHANGELOG.md` — this entry
- `CLAUDE.md` — v2.5.1 history line
- `write_doc.py` — user-facing v2.5.1 summary

### Verified

- ✓ `node --check Code.gs` (after copy to .js): SYNTAX OK
- ✓ `node test_runner.js`: 26 passed, 0 failed
- ✓ All 5 target findings (C-1, C-2, C-3, I-5, I-8) addressed
- ✓ Deferred findings explicitly listed above

### Action required after deploy

1. Paste latest `Code.gs` into Apps Script editor → Save → reload spreadsheet tab
2. Run **Email Tools → Run Unit Tests** — should report **26 passed, 0 failed**
3. Run **Email Tools → Generate My Email Drafts** for any school — behavior should match v2.5.0 (same drafts created, same Error Log structure). The Critical fixes are defensive (no observable change in the happy path) but block the wrong-PDF risk if a name collision ever exists.

## [v2.5.0] - 2026-04-27

### Architectural pivot — PDF lookup via Drive search API (eliminates "Service error: Drive" root cause)

After v2.4.1 → v2.4.2 → v2.4.3 (three iterations of try/catch wrapping around folder iteration) STILL failed in production for shared-with-me IMs, this release **pivots** to a fundamentally different lookup mechanism:

**OLD (v2.4.3 and earlier)** — folder traversal as primary path
```
rootFolder.getFolders() → schoolFolder.getFolders() → teacherFolder.getFiles()
                  ^                       ^                       ^
       fails on shared-with-me     same         same
```

**NEW (v2.5.0)** — Drive search API as primary path, folder traversal as fallback
```
DriveApp.getFilesByName('Teacher Name - 2026-04-20 - 2026-04-26.pdf')
                  ^
       Search index — works for any visible file regardless of parent permissions.
       (Same mechanism that makes getFoldersByName work for shared-with-me users
       in v2.4.2's school-folder cache.)
```

The folder-iteration logic is kept as a safety-net **fallback** for filename anomalies, but if iteration ALSO fails for permission reasons, we **log + skip** (no crash, no blocking the rest of the run). The blocked-by-iteration failure mode is gone from the happy path.

### Why this is the right shape

The v2.4.x fixes treated the symptom (wrap each iteration step). v2.5.0 removes the cause (don't iterate at all). Drive's search API doesn't require parent-folder Editor membership — it queries the search index for files the user can directly see, which is exactly what shared-with-me access provides.

### Changes (`Code.gs`)

1. **NEW: `findTeacherPdfBySearch(teacher, dateRange)` (line ~1100)** — primary PDF lookup. Builds 1-3 candidate exact filenames from teacher name variations + date range, calls `DriveApp.getFilesByName(name)` for each, returns the first matching `.pdf`. Every `hasNext()` / `next()` is wrapped in try/catch; failures log to Error Log and continue to the next candidate.

2. **NEW: `findTeacherPdfByTraversal(teacher, dateRange, rootFolder, schoolFolderMap, schoolFolderCache)` (line ~1130)** — extracted from the old `createDraftForTeacher` body as a fallback path. Same logic as v2.4.3 (with all iteration steps wrapped) but on failure logs + returns null instead of returning a `{success:false}` envelope. Preserved for the rare case where filename doesn't match any of the search candidates.

3. **NEW: `buildPdfCandidateFilenames(teacher, dateRange) (line ~1085)** — pure helper, returns deduped list of candidate filenames the search-API will try. Three forms: full name with spaces, first+last with spaces, folderName (underscores). Each combined with " - {YYYY-MM-DD} - {YYYY-MM-DD}.pdf".

4. **REWRITE: `createDraftForTeacher` PDF lookup section (line ~1215)** — replaced the ~70-line cache+school+teacher+files iteration block with a 25-line search-first-fallback-traversal block. The Gmail draft creation step is unchanged (same `withDriveRetry` + named error wrapping from v2.4.1).

5. **NEW: Error Log tab + structured logging (line ~810)** — `logError(severity, fnName, teacherObj, message, stack)` writes a row to the "Error Log" tab on first call (auto-creates the tab + 7-column header). Severity: `INFO` / `WARN` / `ERROR`. Each row includes a `run_id` to group all entries from one execution. Auto-trims to last 500 entries to prevent unbounded growth. Replaces the v2.4.3 pattern of scattering `console.log` calls (which only IMs with Apps Script Editor access could see).

6. **NEW: `runUnitTests()` menu item (line ~1170)** — runs in-process unit tests for the pure helpers (`lookupByName`, `normalizeFolderName`, `dateRangeToPdfPattern`, `buildPdfCandidateFilenames`). Renders pass/fail summary in a modal dialog. 14 test cases including:
   - `lookupByName` exact match + null safety + last-name fallback (no cross-leak between same-last-name teachers)
   - `normalizeFolderName` underscores/curly apostrophes/whitespace
   - `dateRangeToPdfPattern` valid + malformed
   - `buildPdfCandidateFilenames` content + dedup + empty teacher

7. **Updated `onOpen()` menu** — added `View Error Log`, `Clear Error Log`, `Run Unit Tests` separators between the existing items.

### What this means for the failure cases

| Old failure | New behavior |
|------------|--------------|
| "Service error: Drive" at `parentFolder.getFolders()` | search-API hit → never reached |
| "Service error: Drive" at `iter.hasNext()` mid-iteration | search-API hit → never reached |
| "Service error: Drive" at `tf.getFiles()` | search-API hit → never reached |
| Teacher folder name mismatch (e.g., "Avlen_Edwards" vs "Avlen Edwards") | search-API tries 3 name forms → finds it |
| PDF actually missing for week | logs `ERROR` to Error Log + returns clean error to caller |
| Filename has unexpected format (search misses) | falls back to folder traversal; if also fails, logs + skips |

### Action required after deploy

1. Paste latest `Code.gs` into Apps Script editor → save → reload spreadsheet tab.
2. Run **Email Tools → Run Unit Tests** to verify pure-helper logic. Should report 14 passed, 0 failed.
3. Run **Email Tools → Generate My Email Drafts** for any school. The "Service error: Drive" should not appear; if individual teachers fail, the alert + Error Log tab will show the specific reason.
4. Open the new **Error Log** tab to see the structured failure log (one row per failure, with timestamp + run_id + severity + teacher + message).

### Files modified

- `Code.gs` (~+450 LOC, ~-70 LOC) — search-API helpers + error log + unit tests + rewired createDraftForTeacher
- `CHANGELOG.md` (this entry)
- `CLAUDE.md` (version-history line + architecture diagram update)
- `write_doc.py` (user-facing v2.5.0 summary)

### Self-audit

- ✓ Syntax-checked via `node --check` (after copy to `.js`) — passes
- ✓ Unit tests built INTO Code.gs (run via menu item — `Email Tools > Run Unit Tests`)
- ✓ Folder iteration kept as fallback (no functional regression for filename-mismatch cases)
- ✓ Error Log tab is auto-created — no manual setup
- ✓ Backward compat preserved: old date-subfolder + 00_SUMMARY.PDF format still detected by traversal fallback
- ✓ Lock service guard preserved (no double-runs)

### What's NOT in this release (deferred, low priority)

- ~~PDF Manifest pattern (parent pipeline writes file_id mapping)~~ — investigated and **deferred**: teacher PDFs are NOT generated by Khiem's pipeline (they come from mark.katigbak's upstream system), so the parent doesn't have file_ids to write. The search-API approach is zero-coupling and achieves the same outcome (no folder iteration).
- ~~Drive auth pre-flight that auto-grants Editor on parent folder~~ — would require domain admin grant; not in scope.
- ~~Service-account Gmail draft creation (replace Apps Script entirely)~~ — explicitly NOT recommended (would lose IM-driven human-in-the-loop review and run afoul of safety rules around autonomous email handling).

## [v2.4.3] - 2026-04-27

### Fixed — "Service error: Drive" — comprehensive iteration wrap (FOURTH attempt at this class of bug)

User reported same error returning at JHMS:
```
Exception: Service error: Drive
    at checkDriveFolderExists(Code:538:20)        <-- inside files.hasNext() iteration
    at generateDraftsForCurrentUser(Code:330:27)
```

v2.4.1 wrapped `createDraftForTeacher`. v2.4.2 wrapped `findFolderByName` + `schoolFolderCache` build + `debugDriveAccess`. **But `checkDriveFolderExists` and `checkTeacherFolders` still had unwrapped iterators** — those threw exactly the same error in different code paths.

The shared-with-me Drive permission gap throws "Service error: Drive" on:
- `parentFolder.getFolders()` (initial call) — covered in v2.4.2
- `iter.hasNext()` (mid-iteration) — **NEW failure surface in v2.4.3**
- `iter.next()` (mid-iteration) — **NEW failure surface**
- `tf.getFiles()` (initial) — covered in v2.4.1's createDraftForTeacher only
- `files.hasNext()` (mid-iteration) — **NEW failure surface (this is line 538 from user's stack trace)**

### Changes (`Code.gs`)

1. **`checkDriveFolderExists` (lines ~510-590)** — completely rewritten with try/catch on EVERY iteration step (school folder lookup, getFolders, hasNext, next, getFiles, files.hasNext, files.next). Each failure logs to `console.log` for triage and continues with the next iteration item OR fails-open.

2. **FAIL-OPEN by design** — when iteration crashes, return `true` (assume PDFs exist) instead of `false` (block generation). Rationale: createDraftForTeacher (v2.4.1+) wraps every per-teacher Drive call with named errors. The pre-flight "no PDFs at all" check is now best-effort; per-teacher errors surface specific failures clearly. **Blocking the whole run because one Drive call fails was making the symptom worse.**

3. **`checkTeacherFolders` (lines ~1665-1700)** — same comprehensive wrapping. School lookup tries `displayName` FIRST (search-API fast path), wraps every iteration step.

4. **`debugDriveAccess` per-teacher PDF iteration (lines ~1810-1845)** — wrapped every step (`tfs.hasNext`, `tfs.next`, `tf.getFiles`, `files.hasNext`, `files.next`). Diagnostic now produces partial output even on partial Drive failure.

### Why this finally fixes it

The class of bug was wrapping ONE callsite at a time and missing siblings. v2.4.3 audits ALL `getFolders()` and `getFiles()` calls in Code.gs (10 of them) and confirms each is now inside a try/catch, AND that the iterator's `hasNext()` / `next()` methods are also inside try/catch. Every Drive iteration in the codebase is now defensible.

### Investigation: Hamid + Edwards specifically not generating

Confirmed via BQ probe — both ARE in the `All Teacher Metrics` tab and roster:
- `Muntasir Hamid` (JHMS, grade 7, 106 students, 88.21 mins)
- `Avlen Edwards` (JHMS, grade 8, 25 students, 75.43 mins)

Their teacher folders DO exist in Drive (per user screenshot). After v2.4.3 deploys, run "Generate My Email Drafts" again — the per-teacher errors will now surface CLEAN messages identifying any specific PDF / folder issue if one exists. If they still don't generate after deploy, the new error string in the alert will identify exactly why.

### Action required after deploy

1. Paste latest Code.gs into Apps Script editor → save → reload spreadsheet tab
2. Run "Email Tools → Generate My Email Drafts" for JHMS
3. The pre-flight Drive iteration will no longer crash. If individual teachers fail (e.g., missing PDF for that week), each will be listed with the specific reason in the completion alert.
4. If Hamid/Edwards still don't appear: paste the new alert text — the error message now identifies the specific failure phase (school folder / teacher folder / PDF / createDraft) + the specific file/path.

## [v2.4.2] - 2026-04-27

### Fixed — "Service error: Drive" root cause: shared-with-me parent permission gap

User Khiem reported v2.4.1 didn't fix the bare `Exception: Service error: Drive` error. Apps Script Executions stack trace pinpointed the failure:

```
Exception: Service error: Drive
    at findFolderByName(Code:614:13)        <-- parentFolder.getFolders() iteration
    at generateDraftsForCurrentUser(Code:253:18)   <-- schoolFolderCache build
```

Plus a screenshot showing folders accessed via "**Shared with me > Bruna and Mark's Schoo...**" — owner is `mark.katigbak`, NOT the running user. Diagnosis:

**Drive permission gap pattern:**
- `parentFolder.getFoldersByName(name)` (search API) — works for shared-with-me users ✓
- `parentFolder.getFolders()` (children-list API) — **fails** for shared-with-me users ✗

Drive's child-listing requires explicit Editor/Viewer membership on the parent folder. Direct-share recipients ("Shared with me") get individual folder access but NOT parent-list permission. Frank (the IM whose runs work) is presumably an explicit Editor of the parent. Khiem's account is only a direct-share recipient.

The exact failure path was the **normalized-name fallback** in `findFolderByName`. It hits when the School-IM Mapping's column A uses underscores (`JRES_-_Ridgeland_Elementary_School`) but actual Drive folder names use spaces. `getFoldersByName('JRES_-_...')` (search) returns empty → falls through to `parentFolder.getFolders()` (list) → throws.

### Fixes (`Code.gs`)

1. **`findFolderByName` (line ~602)** — both Drive calls now wrapped in named try/catch. On failure, returns `null` and emits a console.log line; does NOT propagate the exception. Calling code's existing null-handling kicks in instead of crashing the whole orchestrator.

2. **schoolFolderCache build (line ~250)** — try `displayName` (with spaces) FIRST, fall back to `folderName` (underscores) only if displayName fails. The space-version exact-matches via `getFoldersByName` (search API which DOES work for shared-with-me users), avoiding the failing `getFolders()` iteration entirely. **This alone resolves the symptom for shared-with-me users**, provided the displayName column is populated correctly.

3. **`debugDriveAccess` (lines ~1675, ~1700, ~1713)** — every `getFolders()` call now wrapped. The diagnostic now produces partial output even if one section fails, with a clear pointer to the new auth diagnostic.

4. **NEW: `diagnoseDriveAuth()` menu item** — minimal Drive auth probe that tests three operations in isolation:
   - `DriveApp.getRootFolder()` (your "My Drive" reachable?)
   - `DriveApp.getFolderById(ROOT_FOLDER_ID)` (project root reachable by ID?)
   - `rootFolder.getFolders()` (can list children?)

   When any test fails, it produces a CLEAR explanation + actionable fix (e.g., "Have the folder OWNER add you as Editor on 'Bruna and Mark's Schools - Weekly Report'. Once added, child iteration works."). Run this FIRST when "Service error: Drive" appears.

### Why v2.4.1's fix wasn't enough

v2.4.1 wrapped `createDraftForTeacher` (per-teacher loop) but the failure was in the **pre-flight `schoolFolderCache` build** that runs BEFORE the per-teacher loop. Pre-flight code paths weren't wrapped — bare exceptions propagated up as `Exception: Service error: Drive`.

### Action required after deploy

1. **Paste latest Code.gs into Apps Script editor → save → reload spreadsheet tab**
2. **Run `Email Tools > Debug: Drive Auth (run if "Service error: Drive")` first** — confirms whether your account hits the shared-with-me limitation
3. If diagnosis shows the limitation: have **mark.katigbak** add you as **Editor** directly on "Bruna and Mark's Schools - Weekly Report" parent folder (NOT just the children). One-click in Drive sharing settings.
4. Re-run "Generate My Email Drafts" — should succeed now.

### Why this works without admin permission grant (workaround)

Even WITHOUT being added to the parent, v2.4.2 will now:
- Use `getFoldersByName('JRES - Ridgeland Elementary School', rootFolder)` (exact-match search) — succeeds for shared-with-me users
- Cache the resolved folder
- Per-teacher loop uses the cached Folder object directly (no further `getFolders` iteration on the parent)
- The teacher folders themselves (children of the school folder) ARE listable via `getFolders()` if the SCHOOL folder is fully accessible (which it is — Khiem confirmed all 12+ JRES teacher folders open fine)

So the immediate symptom resolves with just the v2.4.2 deploy. The proper long-term fix is the parent-folder permission grant.

### Known carry-forward

- If a teacher folder is shared-with-me but NOT under explicit listing permission, `tf.getFiles()` for finding the PDF could still fail in rare cases. Not observed in user's reports. v2.4.1's named try/catch already wraps that surface.

## [v2.4.1] - 2026-04-27

### Fixed — "Exception: Service error: Drive" during email generation

Production user reported the bare error message "Exception: Service error: Drive" while running `Email Tools > Generate My Email Drafts` on the v2.4.0 deploy. The error message had no teacher / file context, making it impossible to triage.

Investigation (parallel Sonnet agent) identified 3 likely causes:
1. **Stale cached Folder reference** — `schoolFolderCache` from v2.3.1 stores `Folder` objects across the run; if a folder is moved/renamed/deleted mid-run, subsequent calls on the cached reference throw "Service error: Drive". The defensive fallback only fired on falsy cache values, not on stale `Folder` objects.
2. **`getAs(MimeType.PDF)` coercion failure** — calling `getAs(MimeType.PDF)` on an already-PDF File is normally a no-op, but adds a Drive API call AND a failure surface. The PDF generator (parent repo v3.31.0+) produces files that occasionally trip this if the size or encoding shifts.
3. **Drive rate limit** — the per-user budget is 1000 reads / 100 sec. With 30+ teachers and 4 Drive calls per teacher worst-case, the budget can exhaust mid-run, surfacing as transient "Service error: Drive".

### Changes (`Code.gs`)

1. **`createDraftForTeacher`** — every Drive surface call (school folder lookup, teacher folder lookup, PDF iteration, createDraft) now wrapped in a named try/catch. Any "Service error: Drive" now identifies the specific phase + file + size in the per-teacher error string. Closes the diagnostic gap.

2. **Stale-Folder-cache detection** — cache hit is now validated via a cheap `getId()` probe; on throw, the cache entry is dropped and a fresh lookup runs. Fixes cause #1.

3. **Drop the `getAs(MimeType.PDF)` coercion** — pass the `File` object directly to `createDraft`. `GmailApp.createDraft` accepts a File without explicit MIME coercion. One fewer Drive call AND eliminates the cause #2 failure surface.

4. **`withDriveRetry(fn)` helper** — wraps the `GmailApp.createDraft` call in a one-retry-after-2s helper that catches transient errors matching `/Service error|Rate Limit|Internal error|Backend Error|temporarily/i`. Real failures still propagate. Closes cause #3 for transient blips.

### Pairs with parent repo v3.33.0

The parent repo (`Studient Excel Automation`) ships v3.33.0 simultaneously, which extends v3.32.0's FastMath-only raw_data injection to ALL 5 connector apps (MA, Lalilo, Zearn, Freckle, MobyMax). When the next pipeline cron runs, the email's "All Teacher Metrics" tab will reflect all 5 apps' minutes — same as the WPD's `Avg Minutes` column. **Most teachers (~80%) will see their email Avg Minutes jump significantly** (mean +32.6 mins, max +112.3 in week 2026-04-20 quantification).

### Action required after deploy

1. Paste latest `Code.gs` into Apps Script editor → save → reload spreadsheet tab
2. Re-test "Email Tools > Generate My Email Drafts" on the same week that previously errored
3. If the error returns, the new error string will identify the specific phase + file (e.g., "createDraft failed for 'Shanatae Taylor - 2026-04-20 - 2026-04-26.pdf' (XXXX bytes): <real error>")
4. Wait for next parent-repo pipeline run for full v3.33.0 effect on metrics values

### Known limitations

- The diagnostic improvements catch errors at named boundaries but don't fix RATE LIMIT exhaustion — for very large IM rosters (40+ teachers), the Drive 1000-reads/100-sec budget can still trigger transient "Service error: Drive". The retry-once helper handles single 5xx blips; persistent rate-limit errors still surface but with more context. Future work: pre-resolve teacher folders + PDFs before the per-teacher loop (mirrors v2.3.1 schoolFolderCache) to halve Drive call count.

## [v2.4.0] - 2026-04-27

### Changed — Improved "No data available" message (`Code.gs:~703`)

When a teacher exists in the roster but has no row in "All Teacher Metrics" for the selected week, the email previously showed only:

> *No data available for this week.*

This was ambiguous — IMs couldn't tell whether the cause was (a) upstream SIS data gap, (b) name mismatch in roster vs BQ, or (c) pipeline hadn't run. Now the message renders as a yellow callout box with the 3 possible causes spelled out and a recommended diagnostic step (`Email Tools > Debug: Check Teacher Folders`).

### Related — sibling repo fix shipping in parallel

The "Shanatae Taylor showed 35 mins in email but 123 in admin" bug from production is fixed in the parent repo (`Studient Excel Automation` v3.32.0). The cause was that the email pipeline queried base `weekly_dashboard` directly while the admin/WPD displays values that include FastMath connector minutes injected during `_inject_fastmath_minutes()`. The parent repo now uses an in-memory aggregator over the already-merged `raw_data`, so the next time the pipeline runs (hourly cron `:07` or manual `./refresh_data.sh`), the email-automation "All Teacher Metrics" tab will show WPD-aligned values.

No change to email-automation Code.gs's metric column count or schema — Apps Script consumes the same 12 columns; only the values inside `Avg Minutes` change.

### Action required after deploy

1. Paste latest Code.gs into Apps Script editor, save
2. Reload spreadsheet tab
3. Wait for next pipeline run (hourly `:07` or manual) to repopulate "All Teacher Metrics" with FastMath-included values
4. Test draft for Shanatae Taylor (or any FastMath-active teacher) — should now show ~123 mins for week 2026-04-20 instead of 35

### Known limitations

- The improved "No data" message only fires if the teacher has ZERO rows for the selected week. If a teacher has SOME rows but the lookup fails (rare with v2.3.1 smart-prefix), the message won't show. That's the right behavior — those are different failure modes.
- For Armi Laigue specifically: even after this release, she'll still show "No data available" because she's not in the upstream SIS at all. The new message guides IMs to the right team to escalate.

## [v2.3.1] - 2026-04-27

### Fixed — `lookupByName` last-name fallback (Code.gs:~339)

v2.3.0 tightened the fallback to require first-letter match — but `Lisa` and `Liam` both start with `L`, so a same-last-name same-first-letter collision could still leak data. Replaced with smart-prefix matching:

```
beforeLast = k.substring(0, k.length - last.length - 1);
if (beforeLast === first || beforeLast.startsWith(first + ' ')) lastMatches.push(k);
```

- **Match**: `lisa smith`, `lisa marie smith`, `lisa b smith` (lookup: Lisa Smith)
- **Reject**: `liam smith`, `marion smith`, `alisa smith`, `lisa jones`

Verified via 11 edge-case unit tests in verify-build (Liam/Lisa, Marion/Mary, alisa/Lisa, two-teacher ambiguous case all behave correctly).

### Performance — School folder caching across validation + per-teacher loops (Code.gs:~245, ~426, ~619)

`generateDraftsForCurrentUser` now pre-resolves each school's Drive folder ONCE into a `schoolFolderCache` keyed by displayName. `checkDriveFolderExists` and `createDraftForTeacher` consume the cache instead of re-doing `findFolderByName()` for every teacher.

For an IM with 4 schools and 30 teachers, this saves **~30 redundant Drive API calls per run** (~50% reduction in school-folder lookups). Both consumers fall back to fresh lookup defensively if the cache misses, so behavior is preserved.

New signatures:
- `checkDriveFolderExists(rootFolder, schools, dateRange, schoolFolderCache)` — fourth param optional for backward compat
- `createDraftForTeacher(teacher, rootFolder, dateRange, metrics, winners, schoolFolderMap, template, schoolFolderCache)` — eighth param optional

### Docs

- `CLAUDE.md` (parent repo `Studient Excel Automation`): Cross-project dependencies row for email-automation updated. Was stale — listed `teacher_email`, `pts_earned`, `target_status` columns that don't exist. Now correctly lists all 12 actual columns of `All Teacher Metrics` plus `Available Weeks` + `Student Winners` schemas. Separate isolated commit on parent repo `main`.
- `CLAUDE.md` (this repo): v2.3.1 entry in version history.
- `write_doc.py`: v2.3.1 + version-history entry. Google Doc pushed live.

### Verification

25/25 verification checks passed. 11 lookupByName edge cases + 7 folder cache plumbing checks + 7 regression checks (template count, 4/27 trend omission, LockService preserved, default template, etc.).

### Known limitations carried forward

- Same-first-name same-last-name + ambiguous match (e.g., `lisa marie smith` AND `lisa beth smith` both in metrics) returns `null` rather than guessing — IM sees "No data available" for that teacher. Correct conservative behavior; if it ever occurs in practice we can add an alias.
- Teacher folder caching not done (school cache only). Lower payoff since teacher folders are looked up once per teacher anyway.
- Default template still hardcoded to 4/27. Update at next cycle handoff.

### Action required after deploy

After pasting Code.gs into Apps Script:
1. Save in editor
2. Reload spreadsheet tab
3. Test draft on one teacher with 4/27 template — confirm trend box still GONE, draft still attaches the correct PDF, draft still creates correctly. The cache should produce **identical output** to v2.3.0 for the happy path.

## [v2.3.0] - 2026-04-26

### Changed — 4/27 template omits trend alert

`generateLastWeekFinishLineBody()` (`Code.gs:~1320`) no longer renders `buildTrendAlert(metricsArray)`. End-of-year context made the green/yellow/red coaching message feel out of place. All 12 other templates retain their trend alert. Verified via diff: only the 4/27 path changed.

### Changed — Default template (Code.gs:~213)

When Config Template is empty, default is now `'4/27: Last Week of Motivention'` (was `'Week 6: Culture & Shoutouts'`). End-of-year cycle handoff. Update at next cycle (or remove default in a future patch).

### Changed — `lookupByName` last-name fallback (Code.gs:~325)

Tightened: the single-last-name fallback now ALSO requires the first letter of the first name to match. Prevents cross-teacher data leak when two teachers share a last name and only one has metrics for the selected week.

Edge case still possible: same-last-name + same-first-letter (e.g., Lisa vs Liam Smith) — narrow window but acknowledged in code comment.

### Added — Concurrency guard (Code.gs:~200)

`generateDraftsForCurrentUser()` now wraps its body in `LockService.getDocumentLock().tryLock(0)` + `try`/`finally`. If the menu fires twice (double-click, accidental re-run), the second invocation shows an "Already Running" alert instead of creating duplicate Gmail drafts. Lock always released in finally.

### Added — TEMPLATE_NAMES auto-derived (Code.gs:~86)

`TEMPLATE_NAMES = Object.keys(TEMPLATES)` instead of a parallel hardcoded array. Eliminates the class of bug where the dropdown is missing a template that's actually registered (or vice versa). V8 preserves insertion order, so dropdown order matches `TEMPLATES` literal order.

### Fixed — Defensive null guards in `lookupByName` (Code.gs:~315)

If `firstName`, `lastName`, or `fullName` is empty/null/undefined, returns null instead of throwing on `.toLowerCase()`. Earlier the per-teacher try/catch caught these but they polluted the error report.

### Fixed — `getTeacherMetricsForWeek` 'undefined' string (Code.gs:~465)

Skips rows where the teacher cell is null. Previously `String(null).trim().toLowerCase()` produced the literal string `'undefined'` which polluted the metrics map (harmless but messy).

### Fixed — Error message truncation (Code.gs:~298)

The completion alert caps the error string at 1500 chars (was unbounded). For 50-teacher runs with many errors, prevents alert overflow past the 4096-char Apps Script limit. Full error list dumped to `console.log` for debugging.

### Fixed — `endsWith('.PDF')` (Code.gs:~635)

Old PDF format fallback now uses `name.endsWith('.PDF')` instead of `name.indexOf('.PDF') === name.length - 4`. Both work in practice but the new form is the conventional safe pattern.

### Fixed — Inner file-count cap in `checkDriveFolderExists` (Code.gs:~430)

The inner `getFiles()` loop now caps at 50 files per teacher folder. Defends against teacher folders with thousands of files (would have stalled the validation).

### Fixed — `debugDriveAccess` teacher cap raised 15 → 50 (Code.gs:~1305)

Matches `checkDriveFolderExists`. IMs with 5+ schools / 30+ teachers per school now see a complete diagnostic.

### Fixed — `checkTeacherFolders` O(N×M) → O(N) (Code.gs:~1220)

Drive folder names now live in a Set-style object literal (`{name: true}`) instead of an Array iterated with `indexOf`. Diagnostic-only, but cheaper.

### Removed — Dead `CONFIG.TEACHER_DATA_SHEET_NAME` (Code.gs:~16)

Was defined but never referenced. Deleted.

### Docs

- CLAUDE.md fixed 3 stale references: "10 templates / Week 0-8 + Wrap Up" → "13 templates including 4/20 + 4/27 templates"; "All 13 school folders" → unhardcoded count
- write_doc.py bumped to v2.3.0 with version-history entry
- Google Doc user guide pushed live

### Audit Coverage

This release was driven by a `/go_plan --push` audit. Three Sonnet subagents fired in parallel scanned: (a) Code.gs for bugs/perf/dead code/error handling/edge cases, (b) parent repo email_winners.py schema vs Code.gs column expectations, (c) doc consistency (CHANGELOG / CLAUDE.md / write_doc.py / Code.gs). Schema cross-check: aligned. Doc audit found 3 stale refs (now fixed). Code audit produced 19 findings (13 auto-fixed as behavior-preserving; 4 fixed with explicit user approval as behavior-changing; 2 deferred as larger refactors). Live Apps Script confirmed in sync with repo HEAD pre-fix.

### Known limitations carried into v2.3.0

- **Folder caching across validation + per-teacher loops** is duplicated work (~50% wasted Drive API calls). Worth a future refactor.
- **`'Lisa' vs 'Liam' Smith` edge case** in lookupByName: same-last-name + same-first-letter still ambiguous. Documented in code; can be tightened further if a real conflict is observed.
- **Default template** still hardcoded; a future patch could derive default from the most recent week_start in Available Weeks instead.

### Action required after deploy

After pasting Code.gs into Apps Script:
1. Verify `Email Tools` menu still has all items (no syntax error broke `onOpen`)
2. Run **Email Tools > Refresh Template Dropdown** (since TEMPLATE_NAMES is now auto-derived, this just confirms the dropdown matches; no functional change)
3. Test draft generation on one teacher with the 4/27 template and verify the trend box is GONE while the data table + update note + 3 updates are still present

## [v2.2.0] - 2026-04-26

### Added — "4/27: Last Week of Motivention" template

End-of-year template covering the final Motivention week. Sections: FastMath +200 bonus reminder, store closing dates (May 8), end-of-year raffle drawing (May 26), AIM Launch links (Weeks 8-11). Subject: "Data crunch & point calculation complete: (+ 3 non-boring updates to finish strong)".

- **`generateLastWeekFinishLineBody()`** (`Code.gs:1304`) — new template body. Uses standard section order (Greeting → Data Table → Color Legend → Trend Alert → Updates → Weekly Focus → Resources). Per source content, OMITS the standard "Your Actions This Week" / "Weekly Challenge" / "Reflection Prompt" sections — just the 3 updates + one-line Persistence focus + Resources.
- **Registry**: `'4/27: Last Week of Motivention'` added to TEMPLATES + TEMPLATE_NAMES (now 13 entries).
- **Update note**: Yellow callout box ("Minutes/lessons may look different due to recent updates") rendered between trend alert and updates section to acknowledge v2.1.0 metric column changes for IMs comparing week-over-week.
- **AIM Launch links**: Week 8 (Curiosity), Week 9 (What Is Confidence), Week 10 (Self-Efficacy), Week 11 (Brain-Body Feedback Loop) — all 4 hyperlinked. Prize slide hyperlinked in raffle section.

### Verification
- Node syntax check passed
- 13 TEMPLATES keys = 13 TEMPLATE_NAMES = 13 `generate*Body` definitions, all names match
- 30/30 content assertions passed (subject, +200 bonus, FastMath, MAY 8 close, raffle prizes, May 26 raffle, prize slide hyperlink, all 4 AIM Launch URLs, no emoji, no Actions/Challenge per source, yellow callout for update note, standard section order)

### Action required after deploy
After pasting Code.gs into Apps Script, run **Email Tools > Refresh Template Dropdown** so the Config B4 dropdown picks up the new template.

## [v2.1.1] - 2026-04-17

### Docs — Troubleshooting entry for stale Template dropdown
Real-world validation of v2.1.0: after pasting the new Code.gs into Apps Script, the new 4/20 templates appeared in the "Set Template" popup (which reads `TEMPLATE_NAMES` directly) but NOT in the Config B4 dropdown (which uses fixed data validation). The fix is `Email Tools > Refresh Template Dropdown`, but this wasn't documented.

- `CLAUDE.md` — added "New templates don't appear in the Config Template dropdown" troubleshooting section with explanation of the popup vs dropdown source-of-truth difference
- `write_doc.py` (Google Doc user guide) — added matching troubleshooting entry

## [v2.1.0] - 2026-04-17

### Added — Avg Lessons/Student column + 2 new templates

**New column: Avg Lessons/Student**
- `buildMetricsTable()` (`Code.gs:620-639`) now renders 5 columns instead of 4. New rightmost column: `Avg Lessons/Student`, pulled from `m.avgLessons` (already parsed from "All Teacher Metrics" column L).
- Max table width bumped `560px` → `640px` to accommodate the new column.
- Propagates to **every** template automatically since `buildMetricsTable()` is the shared component.

**New templates (total now 12)**
- **`4/20 Jasper: Finishing Strong`** — `generateJasperFinishingStrongBody()` (`Code.gs:1213`). Reading Focus next 2 weeks, Personalized Reading (AlphaRead/Lalilo), Math Fluency via Fast Math, Incentivized Progress. Subject: "Data drop: What's changing this week (and why it matters)". AIM Launches: Weeks 7-8 + Bonus Confidence week.
- **`4/20 Math+ELA: Finishing Strong`** — `generateMathElaFinishingStrongBody()` (`Code.gs:1256`). Same intro as Jasper plus New Math App (Math Academy for 4th grade+), math-track students below 4th grade spend full block on fluency. Same subject line. Same AIM Launches.

**Color legend updated**
- `buildColorLegend()` (`Code.gs:640-647`) "Key metrics" line updated: `Average active days, Daily logins, Average minutes` → `Average mastered lessons, active days, Daily logins, Average minutes`. Cascades to Week 0, 4, 5, 6, 7, 8, Wrap Up, and both new 4/20 templates.

**New menu item + function**
- **Email Tools > Refresh Template Dropdown** — runs `setupTemplateDropdown()` (`Code.gs:107-147`) which finds the "Template" row on Config and sets a ONE_OF_LIST data validation rule from the current `TEMPLATE_NAMES`. Run this once after any template add/remove in Code.gs to sync the dropdown. Avoids manually editing Sheets data validation.

### Verification
- Node syntax check passed (via renamed `.js` tmp file)
- 12 TEMPLATES keys = 12 TEMPLATE_NAMES entries = 12 `generate*Body` function definitions, all names match exactly
- Both new templates executed with realistic metrics in Node harness; 19/19 content assertions passed (columns, Reading Focus, Incentivized Progress, Math Academy, Fast Math, below-4th-grade note, Bonus Confidence week, trend alert, updated color legend, no emoji, wrapper, greeting, subject strings)
- No non-ASCII characters introduced (em-dash at byte 4194 is pre-existing from v2.0.3)

## [v2.0.3] - 2026-04-16

### Fixed — Root Folder Lookup (REVERT + bulletproof fallback)
v2.0.2 incorrectly dropped "- Weekly Report" from the root folder name. Restored.

**Verified via Playwright against live Drive:**
- Root: `Bruna and Mark's Schools - Weekly Report` (id: 1cDnSQ2P8EmmvC1bb4CuRPIdG9XNfozgR)
- Schools: human-readable with spaces (`Reading Community City School District`, `AFMS - Allendale Fairfax Middle School`, etc.)
- Teachers: `First Last` (spaces, e.g., `Danielle Roberts`, `Kim Bell`)
- PDFs: `First Last - YYYY-MM-DD - YYYY-MM-DD.pdf` directly in teacher folder

### Added
- **`CONFIG.ROOT_FOLDER_ID`** — direct folder ID fallback (bulletproof against future name changes)
- **`getRootFolder()`** — tries ID first via `getFolderById()`, falls back to name lookup
- **`debugDriveAccess()`** — comprehensive diagnostic accessible from Email Tools menu:
  - Shows which user is running
  - Root folder lookup via both ID and name
  - Lists all school folders in root
  - For each of current user's assigned schools: lists teacher folders + whether a PDF matches the current Config date range pattern
- Better error messages with actionable next steps

## [v2.0.2] - 2026-04-15

### Fixed — New Drive Folder Structure (April 2026 change)
The weekly-report Drive structure was restructured. Updated code to match.

**Old structure:**
```
Bruna and Mark's Schools - Weekly Report/
  School_Folder/Teacher_Folder/
    2026-04-06_to_2026-04-12/
      00_SUMMARY_....PDF
```

**New structure:**
```
Bruna and Mark's Schools/                  (no "- Weekly Report")
  School Folder/Teacher Name/              (spaces, not underscores)
    Teacher Name - 2026-04-06 - 2026-04-12.pdf   (PDF directly in folder)
```

Changes:
- `CONFIG.ROOT_FOLDER_NAME` → `"Bruna and Mark's Schools"`
- New `dateRangeToPdfPattern()` — converts `2026-04-06_to_2026-04-12` → `2026-04-06 - 2026-04-12`
- `checkDriveFolderExists()` now searches for PDFs matching the date pattern directly in teacher folders (no date subfolder)
- `createDraftForTeacher()` searches teacher folder for PDF matching date pattern; falls back to old structure (date subfolder + `00_SUMMARY_...PDF`) for backward compatibility

## [v2.0.1] - 2026-04-15

### Fixed — Flexible Folder Name Matching
Drive folders can now be named with either spaces OR underscores and the code will find them. Previously, `findFolderByName` required exact case-sensitive matches, which broke when folders were named `"Reading Community City School District"` (spaces) but the School-IM Mapping had `"Reading_Community_City_School_District"` (underscores). Similar issue for teacher folders: `"Kim Bell"` (space) vs `"Kim_Bell"` (underscore).

- `findFolderByName()` now tries exact match first (fast path), then falls back to normalized comparison (case-insensitive, underscores and spaces treated as equivalent)
- New `normalizeFolderName()` helper: lowercases, replaces underscores with spaces, collapses whitespace
- `checkDriveFolderExists()` also tries the school's display name as a fallback
- `createDraftForTeacher()` tries both `firstname_lastname` and `firstname lastname` formats for teacher folders
- Added safety cap of 50 teacher folders in checkDriveFolderExists to prevent runaway iteration

## [v2.0.0] - 2026-04-15

### Added — Flexible Email System (Selectable Dates & Templates)
Major rewrite: IMs can now choose any available week and any email template before generating drafts.

- **Template system** — 10 email templates (Week 0-8 + Wrap Up), each with unique subject, coaching content, and action items. Templates are registered in `TEMPLATES` object and dispatched by name.
  - Weeks 0-3 and 6: fully implemented with content from Google Doc
  - Weeks 4-5, 7-8, Wrap Up: skeleton templates (placeholder content)
- **Preloaded metrics** — Pipeline now loads ALL weeks of teacher metrics into "All Teacher Metrics" tab (~2600 rows). Apps Script filters by selected week at generation time. No pipeline re-run needed when switching weeks.
- **Available Weeks helper tab** — Pipeline writes distinct weeks with `YYYY-MM-DD_to_YYYY-MM-DD` format to "Available Weeks" tab, feeding the Config dropdown.
- **Confirmation dialog** — Before generating, shows date range, template, teacher count. Validates Drive folder existence (blocks if missing) and metrics availability.
- **Config: Template row** — New "Template" setting in Config tab with dropdown of all template names.
- **Shared components** — Extracted `buildGreeting()`, `buildMetricsTable()`, `buildTrendAlert()`, `buildColorLegend()`, `buildWinnersHtml()`, `buildResourcesSection()`, `buildWeeklyChallenge()`, `wrapEmailHtml()` as reusable functions.
- **`getTeacherMetricsForWeek(weekStart)`** — Filters "All Teacher Metrics" by selected week, with Date-to-ISO guard for Sheets auto-parsing.
- **`checkDriveFolderExists()`** — Pre-validates Drive folder structure before generation.

### Changed
- `generateDraftsForCurrentUser()` now reads template from Config and passes it through the pipeline
- `createDraftForTeacher()` takes a `template` parameter (subject + body function)
- Legacy "Teacher Metrics" single-week tab kept for backward compatibility

## [v1.2.2] - 2026-04-09

### Added
- **Data freshness validation** — `getMetricsWeekStamp()` reads the pipeline-stamped `week_start` from Teacher Metrics column L. `generateDraftsForCurrentUser()` now compares this stamp against the Config Date Range and blocks draft generation if they don't match, preventing emails with stale/wrong-week data.
- **`write_doc.py`** — Python utility that writes formatted user documentation to a Google Doc via the Docs API. Supports headings, bold text, bulleted lists, and version history formatting.

## [v1.2.1] - 2026-04-08

### Added
- **Auto Teacher Metrics** — Teacher Metrics tab is now auto-populated by the Python pipeline from BigQuery (`query_teacher_metrics_for_email()` in `email_winners.py`). IMs no longer need to manually download data from QuickSight.
- **Reading Teachers tab integration** — `getTeachersForSchools()` now checks if the school matches Reading Community and pulls from the dedicated "Reading Teachers" tab instead of the IMPORTRANGE-based "Teacher Emails" tab.

### Fixed
- **Name matching hardened** — `lookupByName()` now handles middle names (e.g., "John Bradley Apostol" matches "John Apostol") and includes `NAME_ALIASES` map for spelling mismatches (e.g., "Kloesz" → "Kloetz").

### Changed
- Updated `CLAUDE.md` with complete 6-tab architecture, Student Winners schema, and Reading Teachers documentation.

## [v1.2.0] - 2026-04-06

### Added
- **Student Achievement Winners table** — New "Student Winners" tab populated by the Python dashboard pipeline (BigQuery query). Shows per-teacher student achievements across the last 6 weeks with "3+ Weeks" and "1-2 Times" columns.
- Achievement categories (with tiered exclusivity — students only in their highest tier):
  - Grade Level Mastered
  - 10+ Lessons/Week (excludes from 5+)
  - 5+ Lessons/Week (only if not in 10+)
  - Resilience: Fail then Pass (any test fail followed by pass for same subject+grade)
  - 125+ Minutes (excludes from 100+)
  - 100+ Minutes (only if not in 125+)
  - 4.5+ Active Days (excludes from 4+)
  - 4+ Active Days (only if not in 4.5+)
- `getStudentWinners()` function reads pre-computed winners from "Student Winners" tab
- `buildWinnersHtml()` generates HTML table with colored dot icons, alternating rows
- **"Reading Teachers" tab** — Dedicated teacher list for Reading Community (IMPORTRANGE doesn't include teacher email columns for this district)

### Changed
- **New email theme: "Culture, Shoutouts & Rewards"** replacing "Re-Engagement & Resets"
- New subject line: "Data drop: A 2-minute summary of everything that matters about culture, shoutouts, & Rewards"
- Weekly Focus changed to "Persistence" with PBIS/culture-driven actions:
  - Weekly Trailblazer Shoutout
  - Narrate the Why
  - Peer Nominations (Win Cards)
- AIM Launches updated to Weeks 6/7/8 (Productive Struggle, Celebrating Effort, Curiosity)
- Participation language updated: "monitored at the school, district, and state levels"
- Resources section now uses ordered list
- All section headers use plain text (no emojis — they render as broken characters in email clients)
- Category indicators use inline colored dot spans instead of emoji characters

### Removed
- Previous "Mental Focus & Persistence" theme content (Mid-Block Breath, Doom Loop Reset, Reset Conference)
- Week 5 AIM Launch link (Cognitive Reframing)
- Coaching Moves link (moved to previous version's template)
- All emoji unicode characters from email body (replaced with colored CSS dots)

## [v1.1.1] - 2026-03-29

### Changed
- Removed yellow background highlight from Weekly Challenge / Reflection Prompt section
- Added [Coaching Moves] hyperlink to Doom Loop Reset action item
- Added Pomodoro Timer link (studient.com/customer-portal) to Resources section
- Updated AIM Launches Week 6 URL to new Canva design
- Updated AIM Launches Week 7 URL to new Canva design

## [v1.1.0] - 2026-03-29

### Changed
- New subject line: "Freshly pressed data (+ 3 insights that aren't just noise about Re-Engagement & Resets)"
- Complete email template rewrite with new weekly focus theme: Mental Focus & Persistence
- Added conditional "Current trend" logic based on overall average active days:
  - Green (4+): positive reinforcement message
  - Yellow (3): encouragement to schedule more time
  - Red (1-2): direct call to action for 35 minutes daily
- Updated "Your Actions This Week" with three new coaching strategies:
  - Mid-Block Breath (green dot) - reset for individual students
  - Doom Loop Reset (blue dot) - break test retry cycles
  - The Reset Conference (orange dot) - 3-minute disengagement check-in
- Updated AIM Launches links to Weeks 5, 6, 7 (Cognitive Reframing, Productive Struggle, Celebrating Effort)
- Replaced "Weekly Class Goal" section with "Weekly Challenge" format
- Simplified "Reflection Prompt" to single question: "What will you tweak for this coming week?"
- Trend callout box now uses dynamic background color matching the trend level
- Participation monitoring language updated: "reported to the school admin, district leaders, and state team"

### Removed
- "Week 4: Diagnosing Habits with Data" theme and related content
- Coaching flags image embed (Google Drive hosted image)
- "3 Lenses" framework section (AI Data, Trackers, Points)
- "How Many Green Days" detailed checklist
- Fill-in-the-blank goal and reflection format

## [v1.0.0] - 2026-03-23

### Added
- Initial email automation system
- Gmail draft generation with teacher data tables (Avg Active Days, Avg Minutes)
- Color-coded metrics cells (green/yellow/red thresholds)
- PDF attachment support (summary reports from Google Drive)
- School-IM mapping for multi-user support
- Reading Community City School District column index exception
- Teacher folder diagnostic tool (Debug: Check Teacher Folders)
- Configurable date range via UI prompt
- Support for 9 schools across multiple districts
