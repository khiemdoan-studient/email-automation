# Email Automation - AI Context Document

## Project Overview

Google Apps Script email automation system that generates weekly Gmail drafts for teachers with performance metrics tables and PDF attachments. Built for non-technical Implementation Managers (IMs) to run via a custom menu in Google Sheets.

**v2.0**: IMs can select any available week and any email template before generating drafts. Metrics are preloaded for all weeks so no pipeline re-run is needed when switching weeks. (Originally launched with 10 templates: Week 0-8 + Wrap Up. Now 13 — see version history below.)

**v2.0.3**: Bulletproof root folder lookup via folder ID + comprehensive Drive diagnostic. Drive structure verified against live production Drive (April 2026).

**v2.1.0**: Added `Avg Lessons/Student` column to the shared teacher metrics table (cascades to every template). Added 2 new "Finishing Strong" templates (`4/20 Jasper` and `4/20 Math+ELA`) bringing the total to 12. Added `setupTemplateDropdown()` menu item to sync the Config Template dropdown with `TEMPLATE_NAMES` without manual sheet editing.

**v2.2.0**: Added end-of-year `4/27: Last Week of Motivention` template covering FastMath +200 bonus reminder, May 8 store close, May 26 raffle, and AIM Launches Weeks 8-11. Total templates: 13. Per source intent, this template OMITS the standard "Your Actions This Week" / "Weekly Challenge" / "Reflection Prompt" sections — it's a 3-update + one-line-focus format.

**v2.3.0**: Audit-driven hardening release. **4/27 template now also omits `buildTrendAlert`** (end-of-year context made coaching message out of place). **Default template** changed from Week 6 to 4/27. **`lookupByName`** last-name fallback tightened (requires first-letter match) to prevent cross-teacher data leak. **LockService** guard added to `generateDraftsForCurrentUser` to prevent duplicate drafts on double-click. **`TEMPLATE_NAMES` now auto-derived** from `TEMPLATES` (`Object.keys`) — drift impossible. Plus 8+ defensive fixes (null guards, error truncation, file-count caps, dead code removal, diagnostic cap bumps).

**v2.3.1**: Tightening + perf. **`lookupByName`** smart-prefix match closes the v2.3.0 narrow edge (`Liam` vs `Lisa` no longer collides). **School folder caching** across validation + per-teacher loops eliminates ~50% of redundant Drive API calls. **Parent repo `CLAUDE.md` Cross-project dependencies row** corrected (was stale — listed wrong column names; now matches the actual 12-col `All Teacher Metrics` schema).

**v2.4.0**: Improved "No data available" message. Was ambiguous one-liner; now a yellow callout that distinguishes upstream-data-gap (most common) vs roster-mismatch vs pipeline-not-yet-run. Pairs with parent repo's v3.32.0 fix that aligns email's `Avg Minutes` with WPD's displayed value (FastMath-inclusive aggregation).

**v2.4.1**: Drive error hardening + diagnostic improvements. Wraps every Drive surface call in `createDraftForTeacher` with named try/catch (now any "Service error: Drive" identifies the specific phase + file + size). Stale-Folder-cache detection via `getId()` probe drops cache entries that became invalid mid-run. Dropped `getAs(MimeType.PDF)` coercion (was a no-op that added a Drive call + failure surface). New `withDriveRetry(fn)` helper retries once after 2s on transient 5xx / rate-limit blips. Pairs with parent repo v3.33.0 which extends raw_data injection to all 5 connector apps (MA, Lalilo, Zearn, Freckle, MobyMax).

**v2.4.2**: ROOT CAUSE fix for "Service error: Drive". Stack trace pinpointed `findFolderByName` line 614 (the `parentFolder.getFolders()` iteration). User screenshot confirmed the cause: account has Drive folders via "Shared with me" only, no explicit parent-folder membership. Drive's `getFoldersByName` (search) works for shared-with-me users, but `getFolders` (children-list) does NOT — it requires explicit Editor/Viewer on the parent. Three fixes: (1) wrap both Drive calls in `findFolderByName` with try/catch returning null on failure (prevents crash); (2) try `displayName` FIRST in schoolFolderCache build to exact-match via search API (skips the failing iteration entirely); (3) new `diagnoseDriveAuth()` menu item that isolates the failure to one of 3 specific Drive operations and outputs an actionable fix. Symptom now resolves without admin permission grant; the long-term fix is owner adds the user as Editor on the parent folder.

**v2.4.3**: Comprehensive iteration wrap (FOURTH attempt at this class of bug). User reported same error returning at JHMS — stack trace pinpointed `checkDriveFolderExists:538` (mid-iteration at `files.hasNext()`). v2.4.1/v2.4.2 wrapped `findFolderByName`+`createDraftForTeacher`+`schoolFolderCache build`+`debugDriveAccess` but `checkDriveFolderExists` and `checkTeacherFolders` still had unwrapped iterators. v2.4.3 audits ALL 10 `getFolders()`/`getFiles()` callsites — every iterator step (`hasNext`, `next`, `getFiles`) is now inside try/catch. Plus FAIL-OPEN by design: when iteration crashes pre-flight, return `true` (assume PDFs exist) instead of `false` (block whole run). The per-teacher errors surface specific failures with named messages.

**v2.5.0**: ARCHITECTURAL PIVOT — PDF lookup now uses Drive's **search API** (`DriveApp.getFilesByName`) as the primary path, with folder traversal as fallback. The "Service error: Drive" root cause (parent-folder iteration permission gap for shared-with-me users) is removed from the happy path entirely. Search API works for any file the user can see, regardless of parent permissions. Plus structured error logging: new "Error Log" tab auto-populates with timestamp/run_id/severity/function/teacher/message/stack on every failure (replaces console.log scattered across the codebase). Plus `Run Unit Tests` menu item with 17 test cases covering pure helpers (lookupByName, normalizeFolderName, dateRangeToPdfPattern, buildPdfCandidateFilenames). Zero parent-pipeline coupling — no upstream changes required. Note: the manifest pattern (parent pipeline writes file_id lookup) was investigated and deferred because teacher PDFs come from mark.katigbak's upstream system, not Khiem's pipeline.

**v2.5.1**: Audit-driven hardening (5 of 13 audit findings addressed; rest deferred). **C-1**: cross-school PDF mix-up defense — when `DriveApp.getFilesByName` returns 2+ matches (collision: same teacher name across schools), walk `file→teacherFolder→schoolFolder` and verify against `schoolFolderCache[teacher.campus]` ID; single-match case still accepts without verification (preserves v2.5.0 happy-path behavior for shared-with-me users). New pure helper `_schoolFolderMatches` is testable. **C-2**: `schoolFolderCache` now dual-keyed by both `displayName` AND `folderName` to defend against future refactors. **C-3**: Error Log trim hysteresis (`ERROR_LOG_TRIM_TRIGGER=600`, target=500) — eliminates the v2.5.0 perf cliff where every call past 500 entries triggered an O(n) `deleteRows`. **I-5**: `_runIdCache=null` reset at top of `generateDraftsForCurrentUser` — defends against Apps Script V8 isolate reuse. **I-8**: backward-compat traversal path (legacy `dateFolder + 00_SUMMARY.PDF`) iterators now wrapped — same class of bug v2.4.x spent 4 attempts on, in this rarely-exercised legacy code. Test count grew 17 → 26. Deferred: #4 createDraftForTeacher integration tests, #6 per-teacher PDF preflight in confirm dialog, #7 multi-grade comment, #9 `lookupByName` middle-name false positive (documented v2.3.1 known issue), #10 Reading Community constant extraction, #11 `clasp` setup, #12 apostrophe normalization, #13 regenerate single teacher.

**v2.5.2**: Post-mortem fix from AFMS production report. After v2.5.1 shipped, an IM running AFMS reported (a) Aston Haughton's email had no metrics, (b) `Debug: Check Teacher Folders` showed all 18 teachers MISSING. Investigation: BOTH were PRE-EXISTING bugs, not v2.5.x regressions, but my verification process missed them. **Aston/Anton root cause**: BigQuery has "Anton Haughton" (one-letter typo); roster + Drive folder + email use "Aston". `lookupByName` correctly refused the partial match per v2.3.1's cross-leak guard. **All-MISSING root cause**: `checkTeacherFolders` (line 2231, last touched v2.4.3) searched only the underscored `t.folderName.toLowerCase()` form, but Drive folders are SPACED — pre-existing bug since the v2.0.3 Drive structure change. Fixes: (1) NAME_ALIASES `'aston haughton'→'anton haughton'` (temporary until BQ fixed) + `'lakieshie jennings'→'lakieshie roberts-jennings'` (permanent); (2) `checkTeacherFolders` now dual-checks spaced AND underscored; (3) NEW `checkTeacherNames()` Apps Script function — runs `lookupByName` against full roster vs current week's metrics, shows matched/unmatched with token-overlap heuristics; (4) NEW `scripts/check_email_data.py` Python validator (faithful port of `lookupByName`) for pre-cycle alignment checks; (5) "No metrics rows found" callout now redirects to `Debug: Check Teacher Names` (the right tool) instead of `Debug: Check Teacher Folders` (irrelevant). Test count: 26 → 30. Comprehensive validation: 75 / 86 teachers matched for week 2026-04-20 (was 73, +2 from aliases); 11 remaining are true upstream gaps requiring data-team escalation (10 from JRES + Kim Bell from Reading + 1 garbage `#REF!` row). **Lesson**: ALWAYS run `python scripts/check_email_data.py --week YYYY-MM-DD` before shipping any v2.x change.

**v2.5.3**: Full project audit + 16 fixes (3 parallel agents scanned Code.gs, Python tooling, docs/cross-repo). Highlights: (1) **[DRAFT] suffix** added to template names with placeholder/blank content (`Wrap Up: Celebrate Wins [DRAFT]`, `Week 1 Goals & Monitoring [DRAFT]`, `Week 3 Micro-Coaching [DRAFT]`, `Week 4 Diagnosing Habits [DRAFT]`) so IMs see the warning in the dropdown before picking. (2) **Removed `checkDriveFolderExists`** (~100 LOC dead code) — was wasted work after v2.5.0 search-API pivot (failed-open on iteration errors so never actually blocked anyone). (3) **Renamed `withDriveRetry` → `withGmailRetry`** to reflect actual usage (only wraps GmailApp.createDraft after v2.5.0). (4) **NAME_ALIASES single-source-of-truth**: `scripts/name_aliases.json` is now canonical; check_email_data.py reads it at runtime; test_runner.js asserts Code.gs matches via parse-and-compare. Drift fails CI. (5) Build/dep hardening: `requirements.txt` + `package.json` (Node engines pinned), `__pycache__/` + `.claude/` gitignored, SA key path now reads from `STUDIENT_SA_KEY` env var (fallback to local Windows path). (6) write_doc.py: subtitle string fixed (was stale `v2.4.2`), title-styling loop expanded to v2.5.x (so user-facing Google Doc gets HEADING_2 styling on new sections). (7) Code health micro-fixes: `getStudentWinners` null guard parity, `parseInt` radix args, `lookupByName` multi-token first-name limitation documented as known issue (M-1, low risk). (8) Documentation: cross-repo drift check confirmed NONE (parent's `email_winners.py` writers byte-match Code.gs readers); CLAUDE.md repo-name reference corrected (`studient-dashboard-pipeline` → `Studient Excel Automation`); CHANGELOG v2.5.2 step 3 gained week qualifier. Deferred: clasp deploy automation, integration tests via DriveAdapter (audit findings #6 + #11 from prior audit), regenerate-single-teacher menu item (medium effort, post-program).

**v2.6.2**: Comprehensive PDF coverage validator (Apps Script side). After v2.6.1 shipped, user asked: "are there any other teachers who have ANY data from the last two weeks that do NOT have reports made?". A Python validator (`scripts/validate_pdfs.py`) returned 0 PDFs because the service account has no Drive access to teacher PDF folders (owned by mark.katigbak's upstream system, not Khiem's pipeline). **Pivot**: built the equivalent check INTO Apps Script as a menu item — it runs as the active IM, whose Drive auth has shared-with-me access. **NEW menu item: `Email Tools -> Debug: Validate All PDFs (last 2 weeks)`** → `validateAllPdfs()`. Iterates ALL teachers across ALL schools (system-wide, NOT IM-filtered), checks each for metrics via `lookupByName` (same chain as bulk Generate), then for those with metrics calls `findTeacherPdfBySearch` — reports MISSING in an HTML modal sorted by school + name with grand-total summary. LockService-guarded (won't conflict with bulk run). Same lookup chain as bulk Generate means a "MISSING" result here = guaranteed Error Log entry on the next bulk run, no false positives from divergent code paths. Updated `scripts/validate_pdfs.py` docstring to call out the SA-permission limitation and recommend the Apps Script alternative.

**v2.6.1**: Smoke test fixture swap. After v2.6.0 deployed, smoke test reported 6/7 success — Faith Armstrong (Metro) failed with "PDF not found". Investigation: Faith DOES have students (5 grade-9 + 1 grade-10) but her cohort is winding down (current-week 0.6 active days / 60% login / 0 lessons mastered) and mark.katigbak's upstream PDF generation either skipped her low-activity cohort or has a Metro-Schools-specific gap. Either way, having a known-failure in `CONFIG.SMOKE_TEST_TEACHERS` defeats the smoke test's purpose (catch real anomalies, not always-failures). Swapped `'faith armstrong'` → `'vipul singhal'` (multi-grade 9+10, 13 students, 0.8 login rate, real ongoing activity).

**v2.6.0**: Audit follow-up — addresses 6 of 6 deferred items per user-approved scope. **Phase A (helpers)**: extracted `getMySchools`, `findSchoolFolder`, `buildSchoolFolderCache`, `cellToDateString` to a shared HELPER FUNCTIONS block; refactored 5 callers (generateDraftsForCurrentUser, checkTeacherNames, checkTeacherFolders, debugDriveAccess, getTeacherMetricsForWeek + checkMetricsExistForWeek). ~55 LOC saved. **Phase B (magic numbers)**: introduced `CONFIG.THRESHOLDS` (color bands) + `CONFIG.LIMITS` (error log + truncation) — replaces 7 magic-number sites and the v2.5.1 module-scope vars. **Phase C (smoke test)**: NEW `Test Mode: Generate Smoke Test` menu item generates ~6-8 drafts to the current user's Gmail using `CONFIG.SMOKE_TEST_TEACHERS` (1-2 per district: Jasper / Allendale / Reading / Metro). Visual rendering check across districts. NEW `findTeacherByName` helper searches both Teacher Emails + Reading Teachers tabs. **Phase D (retry multi-select)**: NEW `Retry Last Run's Failed Teachers` menu item reads Error Log for most recent `run_id`'s ERROR rows from createDraftForTeacher, shows checkbox modal, deletes existing drafts via NEW `deleteExistingDraft` helper, regenerates fresh ones. Multi-session persistence via Error Log run_id. NEW pure helper `_buildRetryDialogHtml` is testable. **Phase E (clasp docs)**: NEW `docs/CLASP_SETUP.md` walks through install → enable Apps Script API → login → pull → push. `package.json` adds `npm run pull/push/open/deploy` scripts. Manual paste preserved as fallback. User runs the auth themselves. **Phase F (tests)**: 30 → 45 test cases (+15): cellToDateString × 4, getMySchools × 4, _buildRetryDialogHtml × 4 (incl. XSS sanitize), CONFIG sanity × 3. All pass. Verified with scanner: 75/86 matched (no regression from helper extraction). **Skipped permanently**: #5 Unicode normalization (no production case). **Replaced**: #2 DriveAdapter (smoke test fixture chosen instead).

## Architecture

```
Python Pipeline (BigQuery)
       |
       v
Google Sheet (8 tabs)  -->  Apps Script  -->  Gmail Drafts + PDF attachments
       |                        |
  Config (dropdowns)       Google Drive
  All Teacher Metrics      (folder hierarchy)
  Available Weeks
  Student Winners
  School-IM Mapping
  Teacher Emails
  Reading Teachers
  Teacher Metrics (legacy)
```

### Google Sheet

**Spreadsheet ID:** `1GKtoNumk363StPb2HZ1suiXNB3rHzA_wDLKgRiGj6f8`
**Apps Script Project ID:** `1IbokxMbI7i3FrGGFEQfVtnYHB7ir8vRMcpX9Fs7xDTG3Vlrtuy65ubaP`
**Root Drive Folder ID:** `1cDnSQ2P8EmmvC1bb4CuRPIdG9XNfozgR` (stored in `CONFIG.ROOT_FOLDER_ID`)

### Sheet Tabs

1. **Config** (A1:B4)
   - `Date Range` - dropdown from Available Weeks tab (e.g., `2026-03-30_to_2026-04-05`)
   - `Root Folder Name` - informational only; code uses hardcoded constants
   - `Template` - dropdown of 13 templates (Week 0-8, Wrap Up, 4/20 Jasper, 4/20 Math+ELA, 4/27 Last Week of Motivention). Refresh via `Email Tools > Refresh Template Dropdown` after Code.gs changes.

2. **School-IM Mapping** (A1:C11)
   - Column A: School Folder Name (legacy underscored form — kept for backward compat)
   - Column B: School Display Name (human-readable, matches Drive folder names)
   - Column C: IM Email
   - `findFolderByName` normalizes underscores/spaces so column A still works

3. **Teacher Emails** (dynamically populated via IMPORTRANGE)
   - Key columns: Campus (C/2), Teacher First (Y/24), Last (Z/25), Email (AA/26)
   - Reading Community uses dedicated "Reading Teachers" tab instead

4. **All Teacher Metrics** (auto-populated, ALL weeks preloaded)
   - ~3000 rows across 30+ weeks
   - Column A: `week_start`, B: Teacher, C: Grade, D-L: metrics
   - Apps Script filters by selected week at generation time via `getTeacherMetricsForWeek()`

5. **Available Weeks** (auto-populated helper tab)
   - Column A: `week_start` (ISO date), Column B: `date_range` (folder format)
   - Feeds the Config Date Range dropdown via data validation

6. **Student Winners** (auto-populated, last 6 weeks)
   - 8 achievement categories with tiered exclusivity
   - Only used by Week 6 and Wrap Up templates

7. **Reading Teachers** (manual list)
   - Columns: FirstName, LastName, Email

8. **Teacher Metrics** (legacy, single-week, backward compat)
   - Column L: `week_start` stamp for legacy validation

### Google Drive Folder Structure (verified April 2026)

```
Bruna and Mark's Schools - Weekly Report/   <- ROOT_FOLDER_NAME / ROOT_FOLDER_ID
  +-- Reading Community City School District/   <- human-readable, spaces
  |   +-- Danielle Roberts/                     <- "First Last" with spaces
  |   |   +-- Danielle Roberts - 2026-04-06 - 2026-04-12.pdf   <- PDF directly here
  |   |   +-- Danielle Roberts - 2026-03-30 - 2026-04-05.pdf
  |   +-- Kim Bell/ ...
  |   +-- Rebecca Reynolds/ ...
  +-- AFMS - Allendale Fairfax Middle School/
  +-- AASP - Allendale Aspire Academy/
  +-- AFES - Allendale Fairfax Elementary School/
  +-- JHES - Hardeeville Elementary School/
  +-- JHMS - Hardeeville Junior Senior High School/
  +-- JRES - Ridgeland Elementary School/
  +-- JRHS - Ridgeland Secondary Academy of Excellence/
  +-- Metro Schools/
  +-- ScienceSIS/
  +-- SPIRE Academy/
  +-- Vita High School/
```

**Key facts:**
- No date subfolders — PDFs sit directly in the teacher folder
- PDF filename format: `{Teacher Name} - {start_date} - {end_date}.pdf`
- Date separator in PDF names: ` - ` (space-dash-space), NOT `_to_`
- `dateRangeToPdfPattern()` converts `2026-04-06_to_2026-04-12` -> `2026-04-06 - 2026-04-12` for matching

## Template System

### Registry
`TEMPLATES` object maps template name to `{ subject, buildBody }`. Each template function receives `(teacher, metricsArray, winnersArray)` and returns HTML.

### Available Templates
| Key | Subject | Winners? |
|-----|---------|----------|
| Week 0: Data | Data Delivery: MAP Scores Are In! | No |
| Week 1: Goals & Monitoring | Your data is served... | No |
| Week 2: Tech Hygiene | Attached: Your Data (+ tech hygiene...) | No |
| Week 3: Micro-Coaching | Your Motivention Data (+ micro-coaching...) | No |
| Week 4: Diagnosing Habits | Your weekly Motivention numbers... | No |
| Week 5: Re-Engagement | Freshly pressed data... | No |
| Week 6: Culture & Shoutouts | Data drop: culture, shoutouts, & Rewards | **Yes** |
| Week 7: I'm Stuck Protocol | Data crunch complete... | No |
| Week 8: Growth Mindset | Attached: Your Data (+ Mindset Reframing) | No |
| Wrap Up: Celebrate Wins | Celebrating your students' wins... | **Yes** (placeholder) |
| 4/20 Jasper: Finishing Strong | Data drop: What's changing this week (and why it matters) | No |
| 4/20 Math+ELA: Finishing Strong | Data drop: What's changing this week (and why it matters) | No |
| 4/27: Last Week of Motivention | Data crunch & point calculation complete: (+ 3 non-boring updates...) | No (also omits **trend alert** as of v2.3.0) |

### Shared Components
- `buildGreeting(teacher)` - "Hi {firstName},"
- `buildMetricsTable(teacher, metricsArray)` - 5-column color-coded data table: **Teacher | Grade | Avg Active Days | Avg Minutes | Avg Lessons/Student**. Max width 640px.
- `buildColorLegend()` - green/yellow/red thresholds; "Key metrics" line now includes `Average mastered lessons`
- `buildTrendAlert(metricsArray)` - conditional trend box
- `buildWinnersHtml(winnersArray)` - achievement awards table
- `buildResourcesSection(links)` - resources list with standard items
- `buildWeeklyChallenge(challenge, reflection)` - challenge + prompt
- `wrapEmailHtml(sections)` - wraps sections in email container
- `dotSpan(color)` - colored CSS dot (replaces emoji)

## Key Functions

### `generateDraftsForCurrentUser()`
Main entry point. Flow:
1. Reads Config: Date Range + Template
2. Finds IM's assigned schools
3. `getRootFolder()` for Drive root
4. **Confirmation dialog**: shows date range, template, teacher count, validates Drive folders (blocks if missing) and metrics availability
5. Loads metrics for selected week via `getTeacherMetricsForWeek()`
6. For each teacher: finds PDF matching date pattern, generates HTML via template function, creates Gmail draft

### `getRootFolder()`
Returns the root folder. Tries `DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID)` first (bulletproof), falls back to `findFolderByName(CONFIG.ROOT_FOLDER_NAME)` if the ID fails. This survives folder renames without code changes.

### `getTeacherMetricsForWeek(weekStart)`
Filters "All Teacher Metrics" by week_start column A. Returns teacher-keyed object. Handles Date-to-ISO conversion guard for Sheets auto-parsing.

### `findFolderByName(folderName, parentFolder)`
Two-tier lookup:
1. **Fast path**: exact `getFoldersByName()` match
2. **Fallback**: iterate parent's folders comparing against `normalizeFolderName()` (lowercase, underscores/spaces equivalent, curly-apostrophes normalized, whitespace collapsed)

Handles the mismatch between School-IM Mapping column A (`Reading_Community_City_School_District`) and actual Drive folder name (`Reading Community City School District`).

### `dateRangeToPdfPattern(dateRange)`
Converts `2026-04-06_to_2026-04-12` (Config format) to `2026-04-06 - 2026-04-12` (PDF filename format).

### `checkDriveFolderExists(rootFolder, schools, dateRange)`
Pre-validates that at least one school has a teacher folder containing a PDF matching the date-range pattern. Blocks generation if not found. Safety cap of 50 teacher iterations.

### `lookupByName(obj, firstName, lastName, fullName)`
Fuzzy name matching: exact -> first+last -> unique last -> NAME_ALIASES

### `debugDriveAccess()` (NEW in v2.0.3)
Comprehensive diagnostic exposed via Email Tools menu. Shows:
- Current user email
- Configured date range + expected PDF pattern
- Root folder lookup result (both by ID and by name, with IDs)
- All school folders visible under root
- For each of the user's assigned schools: every teacher folder, and whether a PDF matching the current date pattern was found

Use this first when "Drive folders NOT FOUND" appears.

## Menu (Email Tools)

| Menu Item | Function | Purpose |
|-----------|----------|---------|
| Generate My Email Drafts | `generateDraftsForCurrentUser` | Main action |
| Debug: Check Teacher Folders | `checkTeacherFolders` | Lists missing teacher folders per school |
| Debug: Drive Access | `debugDriveAccess` | **Full Drive visibility diagnostic** |
| Set Date Range | `setDateRange` | Manual override for Config Date Range |
| Set Template | `setTemplate` | Manual override for Config Template |
| Refresh Template Dropdown | `setupTemplateDropdown` | Rebuilds the Config Template data validation from `TEMPLATE_NAMES`. Run after adding/removing templates in Code.gs. |
| Debug: Drive Auth | `diagnoseDriveAuth` | **Run FIRST when "Service error: Drive" appears.** Tests 3 Drive ops in isolation; outputs actionable fix (e.g., "have folder owner add you as Editor on parent"). v2.4.2+. |

## Color Thresholds

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Avg Active Days | >= 3.95 | >= 2.95 | < 2.95 |
| Avg Minutes | >= 99.5 | >= 79.5 | < 79.5 |

## Important Implementation Details

- **No emojis in Code.gs** - causes "could not save" errors. Use `dotSpan()` colored CSS dots
- **Reading Community exception** - uses "Reading Teachers" tab
- **PDF matching (v2.0.3)** - filename contains `YYYY-MM-DD - YYYY-MM-DD` and ends with `.PDF`. Old format (`00_SUMMARY_...PDF` inside date subfolder) still supported as fallback.
- **Folder lookup is flexible** - `findFolderByName` treats underscores and spaces as equivalent, is case-insensitive, and normalizes apostrophe variants
- **Root folder is bulletproof** - `getFolderById()` used first, name lookup as fallback
- **Email HTML** - inline CSS only (no `<style>` blocks)
- **Drive validation blocks generation** if no matching PDF found
- **Winners table only in Week 6 and Wrap Up** templates

## Testing

1. Run `python email_only.py` to populate All Teacher Metrics + Available Weeks + Winners
2. Set Config: Date Range (dropdown) + Template (dropdown)
3. Copy Code.gs to Apps Script editor (paste, no emojis)
4. **Run Debug: Drive Access first** to verify Drive visibility
5. Email Tools > Generate My Email Drafts
6. Confirmation dialog shows settings -> confirm -> check Gmail Drafts

## Troubleshooting

### "Drive folders: NOT FOUND"
Run **Email Tools > Debug: Drive Access**. The report will show:
- Whether `ROOT_FOLDER_ID` lookup succeeded
- Whether `ROOT_FOLDER_NAME` lookup succeeded
- All school folders visible under root (count varies; see Drive Folder Structure section above)
- For each of your schools: teacher folders + PDF match status

Most common causes:
1. `ROOT_FOLDER_ID` changed (folder was deleted and recreated) — update `CONFIG.ROOT_FOLDER_ID` in Code.gs
2. Root folder name changed — update `CONFIG.ROOT_FOLDER_NAME`
3. Selected date range has no PDFs yet (pipeline hasn't generated them)
4. User doesn't have Drive access to the folder

### "Metrics data: NOT FOUND"
- Run `python email_only.py` to repopulate
- Check the Available Weeks tab for valid week_start values

### PDFs not attaching
- Verify the PDF follows format: `{Teacher Name} - {start} - {end}.pdf`
- Check teacher name spelling matches roster (use NAME_ALIASES for mismatches)

### New templates don't appear in the Config Template dropdown
The Config B4 data validation is set once (manually or via `setupTemplateDropdown()`) and does NOT auto-update when `TEMPLATE_NAMES` changes in Code.gs.
- After adding/removing any template in Code.gs, run **Email Tools > Refresh Template Dropdown**
- The "Set Template" popup reads `TEMPLATE_NAMES` directly, so it always shows the current list — if the popup shows more templates than the B4 dropdown, the data validation is stale and needs refreshing

## Related Project

`Studient Excel Automation` repo generates the data:
- AWS Athena -> S3 -> GCS -> BigQuery -> Google Sheets
- `email_winners.py`: `query_all_teacher_metrics()`, `write_all_metrics_to_email_sheet()`, winners (with empty-data guard)
- `email_only.py`: quick script for email data only (~30s)
