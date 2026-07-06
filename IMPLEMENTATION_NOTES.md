# Email Automation - Implementation Notes (loaded on demand)

This doc holds full per-version history, color thresholds, testing workflow, and troubleshooting recipes. CLAUDE.md has condensed evolution summaries; this doc has the deep details. Consult when investigating regressions, debugging Drive errors, or onboarding to the codebase deeply.

## Detailed Version History

### v2.0 - v2.3.1 (initial release + hardening)

**v2.0**: IMs can select any available week and any email template before generating drafts. Metrics preloaded for all weeks. Originally 10 templates (Week 0-8 + Wrap Up).

**v2.0.3**: Bulletproof root folder lookup via folder ID + comprehensive Drive diagnostic. Drive structure verified against live production Drive (April 2026).

**v2.1.0**: Added `Avg Lessons/Student` column to shared teacher metrics table. Added 2 "Finishing Strong" templates (`4/20 Jasper` and `4/20 Math+ELA`) bringing total to 12. Added `setupTemplateDropdown()` menu item.

**v2.2.0**: Added end-of-year `4/27: Last Week of Motivention` template covering FastMath +200 bonus reminder, May 8 store close, May 26 raffle, AIM Launches Weeks 8-11. Total: 13. Per source intent, this template OMITS standard "Your Actions This Week" / "Weekly Challenge" / "Reflection Prompt" sections.

**v2.3.0**: Audit-driven hardening. 4/27 template now also omits `buildTrendAlert` (end-of-year context made coaching message out of place). Default template changed from Week 6 to 4/27. `lookupByName` last-name fallback tightened (requires first-letter match) to prevent cross-teacher data leak. LockService guard against duplicate drafts on double-click. `TEMPLATE_NAMES` auto-derived from `TEMPLATES` (drift impossible). 8+ defensive fixes (null guards, error truncation, file-count caps, dead code removal, diagnostic cap bumps).

**v2.3.1**: Tightening + perf. `lookupByName` smart-prefix match closes v2.3.0 narrow edge (`Liam` vs `Lisa` no longer collides). School folder caching across validation + per-teacher loops eliminates ~50% of redundant Drive API calls. Parent repo `CLAUDE.md` Cross-project dependencies row corrected (was stale; now matches actual 12-col `All Teacher Metrics` schema).

### v2.4.0 - v2.4.3 (Drive error hardening)

**v2.4.0**: Improved "No data available" message. Was ambiguous one-liner; now a yellow callout that distinguishes upstream-data-gap (most common) vs roster-mismatch vs pipeline-not-yet-run. Pairs with parent v3.32.0 fix (FastMath-inclusive `Avg Minutes` aggregation).

**v2.4.1**: Drive error hardening + diagnostic improvements. Wraps every Drive surface call in `createDraftForTeacher` with named try/catch (now any "Service error: Drive" identifies the specific phase + file + size). Stale-Folder-cache detection via `getId()` probe drops cache entries that became invalid mid-run. Dropped `getAs(MimeType.PDF)` coercion (was a no-op). New `withDriveRetry(fn)` helper retries once after 2s on transient 5xx / rate-limit blips. Pairs with parent v3.33.0 (raw_data injection extended to all 5 connector apps).

**v2.4.2**: ROOT CAUSE fix for "Service error: Drive". Stack trace pinpointed `findFolderByName` line 614 (the `parentFolder.getFolders()` iteration). User screenshot confirmed cause: account has Drive folders via "Shared with me" only, no explicit parent-folder membership. Drive's `getFoldersByName` (search) works for shared-with-me users, but `getFolders` (children-list) does NOT - requires explicit Editor/Viewer on the parent. Three fixes: (1) wrap both Drive calls in `findFolderByName` with try/catch returning null on failure; (2) try `displayName` FIRST in schoolFolderCache build to exact-match via search API (skips the failing iteration entirely); (3) new `diagnoseDriveAuth()` menu item that isolates failure to one of 3 specific Drive operations.

**v2.4.3**: Comprehensive iteration wrap (FOURTH attempt at this class of bug). User reported same error returning at JHMS - stack trace pinpointed `checkDriveFolderExists:538` (mid-iteration at `files.hasNext()`). v2.4.x audited ALL 10 `getFolders()`/`getFiles()` callsites - every iterator step (`hasNext`, `next`, `getFiles`) now inside try/catch. Plus FAIL-OPEN by design.

### v2.5.0 - v2.5.3 (architectural pivot + audit)

**v2.5.0**: ARCHITECTURAL PIVOT - PDF lookup now uses Drive's **search API** (`DriveApp.getFilesByName`) as primary path, folder traversal as fallback. The "Service error: Drive" root cause (parent-folder iteration permission gap for shared-with-me users) is removed from the happy path entirely. Plus structured error logging (Error Log tab auto-populates with timestamp/run_id/severity/function/teacher/message/stack on every failure). Plus Run Unit Tests menu item with 17 test cases covering pure helpers (lookupByName, normalizeFolderName, dateRangeToPdfPattern, buildPdfCandidateFilenames). Zero parent-pipeline coupling.

**v2.5.1**: Audit-driven hardening (5 of 13 audit findings addressed). C-1: cross-school PDF mix-up defense - when `DriveApp.getFilesByName` returns 2+ matches, walk `file->teacherFolder->schoolFolder` and verify against `schoolFolderCache[teacher.campus]` ID. C-2: `schoolFolderCache` now dual-keyed by both `displayName` AND `folderName`. C-3: Error Log trim hysteresis (`ERROR_LOG_TRIM_TRIGGER=600`, target=500) - eliminates v2.5.0 perf cliff. I-5: `_runIdCache=null` reset at top of `generateDraftsForCurrentUser`. I-8: backward-compat traversal path (legacy `dateFolder + 00_SUMMARY.PDF`) iterators now wrapped. Test count: 17 -> 26.

**v2.5.2**: Post-mortem fix from AFMS production report. After v2.5.1 shipped, an IM running AFMS reported (a) Aston Haughton's email had no metrics, (b) `Debug: Check Teacher Folders` showed all 18 teachers MISSING. Investigation: BOTH were PRE-EXISTING bugs, not v2.5.x regressions. Aston/Anton root cause: BigQuery has "Anton Haughton" (one-letter typo); roster + Drive folder + email use "Aston". `lookupByName` correctly refused the partial match per v2.3.1's cross-leak guard. All-MISSING root cause: `checkTeacherFolders` searched only the underscored form, but Drive folders are SPACED. Fixes: NAME_ALIASES additions, `checkTeacherFolders` now dual-checks spaced AND underscored, NEW `checkTeacherNames()` Apps Script function, NEW `scripts/check_email_data.py` Python validator. Test count: 26 -> 30. **Lesson**: ALWAYS run `python scripts/check_email_data.py --week YYYY-MM-DD` before shipping any v2.x change.

**v2.5.3**: Full project audit + 16 fixes (3 parallel agents). Highlights: `[DRAFT]` suffix added to template names with placeholder content. Removed `checkDriveFolderExists` (~100 LOC dead code). Renamed `withDriveRetry -> withGmailRetry`. NAME_ALIASES single-source-of-truth (`scripts/name_aliases.json`). Build/dep hardening (requirements.txt + package.json + .gitignore + STUDIENT_SA_KEY env var). Code health micro-fixes.

### v2.6.0 - v2.6.8 (audit follow-up + cross-repo features)

**v2.6.0**: 6 of 6 deferred items per user-approved scope. Phase A (helpers) extracted shared functions. Phase B (magic numbers) introduced `CONFIG.THRESHOLDS` + `CONFIG.LIMITS`. Phase C (smoke test) NEW `Test Mode: Generate Smoke Test` menu item. Phase D (retry multi-select) NEW `Retry Last Run's Failed Teachers` menu item with checkbox modal + `deleteExistingDraft` helper. Phase E (clasp docs) NEW `docs/CLASP_SETUP.md` + npm scripts. Phase F (tests) 30 -> 45 cases.

**v2.6.1**: Smoke test fixture swap. Faith Armstrong (always failing - low-activity cohort) replaced with `vipul singhal` (multi-grade 9+10, 13 students, real ongoing activity).

**v2.6.2**: NEW `validateAllPdfs()` menu item runs as the active IM (whose Drive auth has shared-with-me access, unlike SA). Iterates ALL teachers across ALL schools, checks each for metrics + PDF presence, reports MISSING in HTML modal. LockService-guarded.

**v2.6.3**: validateAllPdfs traversal-fallback fix. After v2.6.2, validator returned 0/74 + 50/74 with PDFs visible in Drive. Root cause: validateAllPdfs only called `findTeacherPdfBySearch` but bulk-Generate flow does **search-first, traversal-fallback**. Drive's search API has known search-index lag for shared-with-me files. Fix: mirror EXACT two-phase lookup. Added `foundViaFallback` counter shown in per-week stats. **Lesson**: when mirroring an existing flow, mirror the WHOLE flow.

**v2.6.4**: validateAllPdfs respects Config Date Range. After v2.6.3, validator with hardcoded `slice(0, 2)` flagged future weeks as MISSING. Fix: validate ONLY the Config-selected week. Renamed menu item: `Debug: Validate All PDFs (Config week)`.

**v2.6.5**: NEW template `SC Final Email: Growth & Hardwork = Results` for May year-end push (Motivention store closes May 8). Year-cumulative summary per teacher: 3-metric Classroom Data Highlight Reel (Total Minutes / Total Lessons / Total Grade Levels Mastered, since 2025-09-01), 2 KPIs, 2 student spotlight cards (rank 1 by year-cumulative grade_levels with subject; rank 2 by year-cumulative lessons), state-testing transition, Mindset Mini-Launches. Cross-repo: parent v3.41.4 ships 2 new BQ queries + 2 new writers + 2 new tabs (`Year Teacher Totals`, `Student Year Highlights`). Code.js: 14th template + 2 new readers (with module-level cache + reset hooks) + 3 new HTML helpers + new `generateScFinalEmailBody`. Test count: 45 -> 51. **Lesson**: cross-repo features that need new data should use the `_xxxCache + reset hook` pattern in Apps Script to keep `buildBody` signature unchanged.

**v2.6.6**: HOTFIX paired with parent v3.41.5. Added 2 BQ cross-validation probes to `scripts/check_email_data.py`: `_probe_year_totals_match_weekly_dashboard` (per-teacher, 1% tol) and `_probe_highlights_within_actuals` (each spotlight student's cumulative_lessons <= 1.05 * actual). Catches v3.41.4 cross-product multiplication bug class at email-automation validator layer. NO Code.js change - the data parent provided was wrong, not our code.

**v2.6.7**: HOTFIX paired with parent v3.41.6. Multi-campus teacher row collision in `Year Teacher Totals` (Muntasir Hamid teaches JHMS + JRHS -> 2 rows -> Apps Script last-write-wins picked wrong campus). Parent now GROUP BYs by `teacher_name` only. This release adds `_probe_no_duplicate_teacher_in_year_totals` validator + 3 Code.js polish items.

**v2.6.8**: HOTFIX - multi-token teacher name lookup in SC Final Email. John Bradley Apostol's email body rendered all "--" because his roster name has 3 tokens (`John Bradley Apostol`) but BQ + Year Teacher Totals tab use 2-token name `John Apostol`. `generateScFinalEmailBody` did direct-map lookup -> null. Fixed by routing both year-cumulative readers through `lookupByName` helper (same helper all 13 weekly templates use). 51 -> 52 tests.

## Color Thresholds

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Avg Active Days | >= 3.95 | >= 2.95 | < 2.95 |
| Avg Minutes | >= 99.5 | >= 79.5 | < 79.5 |

(As of v2.6.0 these live in `CONFIG.THRESHOLDS`.)

## Testing Workflow

1. Run `python email_only.py` to populate All Teacher Metrics + Available Weeks + Winners
2. Set Config: Date Range (dropdown) + Template (dropdown)
3. Copy Code.gs to Apps Script editor (paste, no emojis)
4. **Run Debug: Drive Access first** to verify Drive visibility
5. Email Tools > Generate My Email Drafts
6. Confirmation dialog shows settings -> confirm -> check Gmail Drafts

For pre-cycle alignment checks: `python scripts/check_email_data.py --week YYYY-MM-DD`

## Troubleshooting

### "Drive folders: NOT FOUND"
Run **Email Tools > Debug: Drive Access**. The report will show:
- Whether `ROOT_FOLDER_ID` lookup succeeded
- Whether `ROOT_FOLDER_NAME` lookup succeeded
- All school folders visible under root
- For each of your schools: teacher folders + PDF match status

Most common causes:
1. `ROOT_FOLDER_ID` changed (folder was deleted and recreated) - update `CONFIG.ROOT_FOLDER_ID`
2. Root folder name changed - update `CONFIG.ROOT_FOLDER_NAME`
3. Selected date range has no PDFs yet (pipeline hasn't generated them)
4. User doesn't have Drive access to the folder

### "Service error: Drive"
Run **Debug: Drive Auth** FIRST (v2.4.2+). Tests 3 Drive ops in isolation; outputs actionable fix (e.g., "have folder owner add you as Editor on parent").

### "Metrics data: NOT FOUND"
- Run `python email_only.py` to repopulate
- Check the Available Weeks tab for valid week_start values
- Run **Debug: Check Teacher Names** (NOT Debug: Check Teacher Folders) to see roster vs metrics mismatches

### PDFs not attaching
- Verify the PDF follows format: `{Teacher Name} - {start} - {end}.pdf`
- Check teacher name spelling matches roster (use NAME_ALIASES for mismatches)
- Run **Debug: Validate All PDFs (Config week)** for system-wide check

### New templates don't appear in the Config Template dropdown
The Config B4 data validation is set once (manually or via `setupTemplateDropdown()`) and does NOT auto-update when `TEMPLATE_NAMES` changes in Code.gs.
- After adding/removing any template in Code.gs, run **Email Tools > Refresh Template Dropdown**

## Click tracking (v2.15.0)

### What it does
Answers two questions centrally: (1) which teachers clicked into their weekly email, and (2) the click-through rate on the weekly PDF report. Mechanism: the script is deployed as a Web App (`doGet`); every body link + the weekly PDF (now a link, not an attachment) routes through the `/exec` endpoint carrying an HMAC-signed token; `doGet` logs the click to `Engagement Log` and redirects to the real destination. `logSendEvent` writes the denominator (`Send Log`) at draft time. `rebuildEngagementDashboard` rolls both into the `Engagement Dashboard` tab.

### Deploy + wiring
See `docs/CLASP_SETUP.md` Step 6. Short version: Deploy > New deployment > Web app (Execute as Me, Access Anyone) -> copy `/exec` URL into Script Property `TRACKING_WEBAPP_URL`. Re-version the deployment (Manage deployments > New version) after every `clasp push` or the live tracker runs stale code.

### Reading the dashboard
Run **Email Tools > Engagement: Rebuild Click Dashboard**. Top table = one row per teacher-week: `Sent`, `Clicked any`, `Clicked PDF`, `# clicks`, `First click`. Teachers with `Clicked any = N` are the "has not clicked" set. Bottom block = **PDF CTR by week** = distinct PDF-clickers / teachers sent.

### Gotchas
- **Attachment -> link, via a PUBLIC OWNED COPY (v2.16.0)**: the weekly/summer PDFs live in a shared-with-me tree we can't reshare (`setSharing` on the original throws -> file stays private -> recipients get Drive's "unable to open the file"). So the code COPIES each PDF into an owned **"Email Report Links"** folder (auto-created, `REPORT_LINKS_FOLDER_ID`), shares the COPY anyone-with-link, and links to the copy. If a copy fails (source owner disabled "viewers can copy"), it ATTACHES the original as fallback (WARN). Run **Email Tools > Engagement: Set Up Report Links Folder** to pre-create/confirm the folder. Copies are idempotent by name and accumulate - prune the folder periodically if it grows.
- **Redirect must target `window.top` (v2.15.1)**: Apps Script serves `doGet` HTML in a sandboxed iframe; `window.location` only moves the iframe, so Drive loads framed and errors. Fixed by `window.top.location` + `target="_top"`.
- **Click inflation**: corporate link-scanners / Gmail prefetch can auto-hit a redirect link (the click analog of open-pixel inflation). A single auto-click still correctly marks the teacher "engaged", which matches the ask; the dashboard counts distinct teachers, not raw hits, for CTR.
- **Fail-open**: no `TRACKING_WEBAPP_URL` set = links pass through untracked, emails still send. So a missing/rolled-back deployment degrades gracefully, it doesn't break sending.
- **Secret rotation**: `TRACKING_HMAC_SECRET` auto-generates once. If it's ever changed, links in already-sent emails fail signature verification and land on the "link unavailable" page.
- **"Attached:" copy**: a few subjects/bodies (Week 2, Week 8) still say "Attached:". Cosmetic only now; candidate copy fix, not a bug.
- The "Set Template" popup reads `TEMPLATE_NAMES` directly, so it always shows the current list
