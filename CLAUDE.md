# Email Automation - AI Context Document

## Project Overview

Google Apps Script email automation system that generates weekly Gmail drafts for teachers with performance metrics tables and PDF attachments. Built for non-technical Implementation Managers (IMs) to run via a custom menu in Google Sheets.

**v2.0**: IMs can select any available week and any email template before generating drafts. Metrics are preloaded for all weeks so no pipeline re-run is needed when switching weeks. (Originally launched with 10 templates: Week 0-8 + Wrap Up. Now 29, incl. the SY26-27 Weeks 1-9.)

**v2.0.3**: Bulletproof root folder lookup via folder ID + comprehensive Drive diagnostic. Drive structure verified against live production Drive (April 2026).

**v2.1-v2.3**: Hardening releases. Added 3 new templates (4/20 Jasper, 4/20 Math+ELA, 4/27 Last Week of Motivention) bringing total to 13. `TEMPLATE_NAMES` auto-derived from `TEMPLATES` (drift-proof). `lookupByName` smart-prefix match closes cross-teacher data leak edge case. School folder caching across validation + per-teacher loops eliminates ~50% of redundant Drive API calls. LockService guard against duplicate drafts on double-click. v2.3.0 also removed `buildTrendAlert` from 4/27 template (end-of-year context).

**v2.4-v2.5**: Drive error hardening (4 attempts at "Service error: Drive") culminating in v2.5.0 architectural pivot: PDF lookup now uses Drive's search API (`DriveApp.getFilesByName`) as primary path, folder traversal as fallback. Search API works for any file the user can see, regardless of parent permissions. v2.5.0 also added structured error logging (Error Log tab), unit test runner (17 cases). v2.5.1 added cross-school PDF mix-up defense + dual-keyed cache. v2.5.2 added NAME_ALIASES + `checkTeacherNames()` validator + Python validator (`scripts/check_email_data.py`). v2.5.3 audit + 16 fixes incl. `[DRAFT]` template suffixes + `name_aliases.json` single-source-of-truth.

**v2.6.0-v2.8.0**: Audit follow-up + ongoing hardening. v2.6.0 extracted shared helpers, introduced `CONFIG.THRESHOLDS`/`CONFIG.LIMITS`, smoke test menu item, retry-failed-teachers menu item, clasp deploy docs (test count: 30 -> 45). v2.6.1 swapped smoke test fixture (`vipul singhal` replaces always-failing `faith armstrong`). v2.6.2 added `validateAllPdfs()` Apps Script menu item (system-wide PDF coverage check). v2.6.3 fixed search-vs-traversal-fallback parity in validator. v2.6.4 narrowed validator to Config week. v2.6.5 added 14th template `SC Final Email: Growth & Hardwork = Results` (year-cumulative summary, paired with parent v3.41.4). v2.6.6 added 2 BQ cross-validation probes. v2.6.7 fixed multi-campus teacher row collision (paired with parent v3.41.6). v2.6.8 routed year-cumulative readers through `lookupByName` for multi-token teacher names. v2.6.9 hardened the roster campus filter via `campusMatchesAnyDisplay` (replaces exact-match `indexOf` with `normalizeFolderName`-based comparison), improved `checkTeacherNames` + `generateDraftsForCurrentUser` empty-roster diagnostics, and added `_probe_no_silently_dropped_school` to `scripts/check_email_data.py` to catch the JRES-class upstream-Campus-wipe bug proactively. v2.7.0 added `partitionTeachersByDataAvailability` so `generateDraftsForCurrentUser` skips drafts for teachers without metrics rows for the selected week (template-aware: weekly metrics for Week 0-8/Wrap Up/4/20s/4/27; year-cumulative for SC Final Email). Backward compat: when `metricsExist === false`, no filtering (preserves "send to all with placeholder" path for template-only emails). v2.8.0 added the live-data "Spring 2026 MAP Scores" template: parent `generate_report_v3.py` Step 5 writes a new "Spring 2026 MAP Scores" tab via `query_map_scores_for_email` + `write_map_scores_to_email_sheet` (sourced from `studient_growth_inputs` JOIN `weekly_dashboard`); Apps Script reads via `getMapScoresForTeacher()` reader; `generateSpring2026MapBody` renders a 4-col table (Student Name | Subject | Winter Score | Spring Score) per teacher. Partition skips teachers with zero MAP students. New `_probe_map_scores_tab_populated` in `scripts/check_email_data.py`. v2.8.2 dropped state-testing copy + replaced "live data" framing with "tests completed as of yesterday". v2.8.3 added 3-band Spring-vs-Winter row colors (green/yellow/red). v2.9.0 overhauled the template: replaced the post-intro paragraph with a "Please prioritize the following today:" 4-bullet action list (with one nested bullet) + italic re-testing blurb + yellow IM-editable callout; extended the data table from 4 cols -> 6 cols (added Projected Growth + X Growth, computed client-side with the floor-at-1 rule matching parent `sheets_builder._compute_x_growth`); rewrote row colors as 5-band X-Growth buckets (darker green X>=2, medium green 1.5<=X<2, very light green 0<X<1.5, very light red -2<=X<=0, bright red X<-2); added "We will finalize all the growth calculations and growth prizes by Friday." before the Thank you. Cross-repo: parent `queries_v3.py` + `email_winners.py` extended to emit 8-col tab including `winter_to_spring_projected_growth` + `winter_to_spring_observed_growth`. Test count: 45 -> 84 (v2.9.0 added X Growth + 5-band color tests; v2.9.1 added X = -2 boundary test). v2.9.2 (copy-only) refined the Spring 2026 MAP template per user feedback: removed the Review students + Retest on 5/28 bullets, added a new sub-bullet "Some students who have been identified as re-test candidates will be testing again today" below the existing Ensure Language sub-bullet, removed the yellow STUDIENT IM ACTION callout entirely, and changed the conclusion from "We will finalize all the growth calculations and growth prizes by Friday." to "Growth calculations and prizes will be handed out today.". v2.9.1 refined the template per first-look feedback: merged the last prioritize bullet with the trailing italic re-testing blurb into a single bullet (`<u>Language</u>` underlined on first occurrence, "Retest on 5/28..." prefix), added italic `(especially dark red)` to the "Review students" bullet, renamed the yellow callout label to `STUDIENT IM ACTION [DO THIS]: ...`, moved the dark-red boundary to `X <= -2.0` (inclusive) with color `#cc0000` (darker than v2.9.0 `#e06666`), simplified interpretation notes from 6 bullets to 4 (dropped Winter Score + Subjects), and reduced the conclusion to the single "finalize by Friday" sentence (dropped Thank you). Test count: 83 -> 84.

**Critical drift markers (v2.9.0)**: the Spring 2026 MAP Scores template depends on the parent pipeline writing the `Spring 2026 MAP Scores` tab with the **8-column header** (`campus_name, teacher_name, student_name, subject, winter_rit, spring_rit, winter_to_spring_projected_growth, winter_to_spring_observed_growth`). If the parent renames the tab, changes the header, or removes the writer call from `generate_report_v3.py` Step 5, the email template silently renders zero teachers OR renders X Growth as "--" for every row. The `_probe_map_scores_tab_populated` validator catches header mismatch pre-cycle. X Growth is computed client-side in `buildMapScoresTable` using `observed_growth / max(projected_growth, 1)` - the floor-at-1 rule MUST stay in sync with parent `sheets_builder._compute_x_growth` (v3.43.7 + v3.44.1). Underlying BQ refresh remains manual NWEA CSV + `--full` build (no daily auto-ingest yet).

**v2.10.0**: New "Summer School Week 1+2" email on a SEPARATE external-source path (not the TEMPLATES dropdown). Reads three external resources via `CONFIG.SUMMER_SCHOOL` (Summer Performance Dashboard + MAP Master Roster + the nested "Public School Summer Camp" Drive tree, the last inside `ROOT_FOLDER_ID`), and drafts one email per teacher/group across all 6 SC summer schools (combined two-week data table + both weekly XP PDFs attached). Matching is normalized (campus, teacher); To = roster email or BLANK with a fill-in banner when a folder has no roster match; one `Unassigned` draft per school. Menu items: `Generate Summer School Drafts (Wk 1+2)` + `Summer School: Smoke Test (to me)`. 2026-06-15 reconciliation: 21 teacher/group folders, 11 addressed + 10 blank-To, all 21 with both-week data. Test count: 84 -> 105.

**v2.11.0**: Wired Summer School Week 1+2 into the standard Config Template + "Generate My Email Drafts" path so non-technical IMs use the same one-button flow as every other template, scoped to their School-IM Mapping schools (drafts addressed to teacher emails, landing in the IM's Gmail). Registered in TEMPLATES with a `summerSchool` routing flag; `generateDraftsForCurrentUser` short-circuits to a school-scoped `_runSummerSchoolCore` (the old `_runSummerSchool` is now a thin locking wrapper around that core). Removed the all-schools "Generate Summer School Drafts (Wk 1+2)" menu item (footgun); kept "Summer School: Smoke Test (to me)" for admin preview. Test count: 105 -> 110.

**v2.11.1**: Split the Summer School data table into two labeled rows, Week 1 (6/1-6/7) and Week 2 (6/8-6/14), instead of one combined row. `readSummerTeacherData` now returns per-week metrics per (campus, teacher) (`_summerWeeklyByTeacher`), and `buildSummerSchoolTable` renders a 5-column, 2-row table from `CONFIG.SUMMER_SCHOOL.WEEK_STARTS` + `WEEK_LABELS` (a missing week shows dashes). Test count: 110 -> 111.

**v2.12.0**: JRHS (and any campus in `CONFIG.SUMMER_SCHOOL.CONSOLIDATE_CAMPUSES`) now gets ONE consolidated Summer School email for all its groups (one teacher runs them) instead of one draft per group: every group PDF attached + a single Group x Week table (`buildSummerConsolidatedTable` / `generateSummerSchoolConsolidatedBody`), blank-To with a fill-in banner. `_runSummerSchoolCore` partitions consolidate-campuses out of the per-teacher loop; the shared body copy was extracted to `_summerBodyCopySections`. Test count: 111 -> 122.

**v2.13.0**: Added a second summer template, "Summer School Week 3", that is PER-DISTRICT: Jasper schools (JHMS/JHES/JRHS/JRES) get a "Finish Strong" body + subject, Allendale schools (AFMS/AFES) get "Push Through the Slump". Single week 6/15-6/21. Generalized the summer flow to be TEMPLATE-DRIVEN: each summer TEMPLATES entry carries a `summerConfig` (`weekStarts`/`weekLabels` + a single `variant` or `byDistrict` `variants`); `_runSummerSchoolCore(opts.templateName)` resolves it and picks subject+copy by `_summerDistrict(campus)` (via `CONFIG.SUMMER_SCHOOL.JASPER_CAMPUSES`). Readers/table builders take optional `weekStarts`/`weekLabels` (default to CONFIG so Week 1+2 is byte-identical). Traversal skips camp folders whose name contains "archive". New: `_summerWeek3JasperCopy`, `_summerWeek3AllendaleCopy`, `_summerComposeBody`, `_summerVariant`, `_summerTemplateConfig`. Test count: 121 -> 139.

**v2.13.1**: Audit hardening (6 defensive fixes, no happy-path behavior change). `test_runner.js` wraps `runUnitTests()` so a mid-suite throw is an explicit FAIL + exit 1. `_collectSummerPdfs` matches `XP_Report` case-insensitively. `_findSummerRosterTab` returns null instead of a known-bad gid-hinted tab. `processRetry` guards a null `Date Range` before `.split`. `readSummerTeacherData` WARNs (non-fatal) when the Students/Lessons columns vanish. `scripts/check_email_data.py` requires `--week` (dropped the stale 2026-04-20 default). Test count unchanged: 139 (defensive IO-path guards, not unit-testable). Skipped as non-bugs: schoolFolderMap-from-all-rows (unique displayNames), em-dash comments (cosmetic), student-name in check_email_data over-examples (FERPA hard-rule disabled + diagnostic value).

**v2.14.0**: Added a third summer template, "Summer School Final Week" (subject "Studient - Final Week: You Made It"), for ALL summer campuses (Jasper + Allendale), week of 6/22. Unlike Week 1+2 / Week 3 it adds a Student Achievement Awards section (Week-6 style categorized shout-outs: Hit Fidelity Goal / 125+ Minutes / High Accuracy 90%+) sourced from the live Summer Performance Dashboard helper tabs (`_SummerFAData` for cumulative minutes/days/accuracy + `_SummerFAStud` for the authoritative At-fidelity status, joined by student_id; the visible "Summer Fidelity" tab is filter-dependent so it is NOT used). New `summerConfig.showStudentAwards` flag wires `readSummerStudentFidelity` (byKey per teacher + byCampus for consolidated JRHS) + `buildSummerStudentAwards` into the core's per-teacher AND consolidated paths; Week 1+2 / Week 3 stay byte-identical (flag absent). Live-verified the reader join against real data (389 students, 23 teacher groups, status join 5/5). Coverage: only AASP/AFES/AFMS/JRES have 6/22 weekly rows + PDFs (JHMS/JHES/JRHS ended 6/15); the cumulative awards + wrap-up copy still populate for all 7 campuses. New helpers: `readSummerStudentFidelity`, `buildSummerStudentAwards`, `_summerFinalWeekCopy`. Test count: 139 -> 153.

**v2.15.0**: Central click-through tracking. The script now also deploys as a Web App (`doGet`, execute-as-owner, access Anyone) that acts as a signed-redirect click tracker. Every `<a href>` in the email body plus the weekly PDF (now a LINK, not an attachment) is rewritten through the `/exec` endpoint with an HMAC-signed token (week + teacher email + campus + link_type + destination); `doGet` verifies the signature, appends to the `Engagement Log` tab, then bounces to the real destination. Tampered/unsigned tokens are refused (no open-redirect). `createDraftForTeacher` + `_createSummerDraft` set the PDF to `ANYONE_WITH_LINK` (fail-soft), inject a "View your weekly report (PDF)" CTA, drop `attachments`, and log a `Send Log` row (the CTR denominator). New tabs: `Engagement Log`, `Send Log`, `Engagement Dashboard` (per-teacher Sent / Clicked any / Clicked PDF / #clicks + PDF CTR by week, rebuilt via the new "Engagement: Rebuild Click Dashboard" menu item). Clicks only for v1 (no open-pixel: Gmail proxy inflates opens + Apps Script can't serve a binary pixel). Fail-open until the one-time deploy sets Script Property `TRACKING_WEBAPP_URL`; `TRACKING_HMAC_SECRET` auto-generates. New helpers: `signToken`/`verifyToken`, `buildTrackedUrl`, `rewriteBodyLinks_`, `classifyLink_`, `buildPdfCtaHtml_`/`_injectPdfCta`, `logEngagementEvent`, `logSendEvent`, `_ensureTab`, `doGet`, `rebuildEngagementDashboard`. Verified: 153/153 existing tests + 25/25 new tracking-core tests (mocked Apps Script globals). NOTE: the PDF-delivery + link-shape claims in this v2.15.0 entry (ANYONE_WITH_LINK on the original, drops attachments, links straight to /exec) were SUPERSEDED across v2.16.0-v2.20.0. See the consolidated entry below for current behavior.

**v2.16.0-v2.20.0 (click-tracking hardening, 2026-07-06)**: five-round fix chain to make the PDF link actually open for recipients, plus per-teacher attribution. Current behavior (what supersedes v2.15.0):
- **Delivery**: `doGet` SERVES the PDF bytes itself (`_servePdfPage` reads the Drive blob server-side as the web-app owner - works on shared-with-me originals, NO sharing or public copies needed). Fallbacks: oversize (>15MB)/unreadable -> `uc?export=download` redirect (`_driveDirectUrl`); `getUrl()` failure at draft time -> attach original. The v2.16.0 public-copy design (`_publishPublicPdfCopy`/`_ensureReportLinksFolder`/`REPORT_LINKS_FOLDER_ID`) is retired but kept because copies referenced by already-sent drafts live in that folder.
- **Link shape**: generated links point at a cookie-less GitHub Pages shim (`docs/r.html` -> `CONFIG.TRACKING_SHIM_URL`, token in the URL fragment), because Google's multi-account front-end kills direct browser hits to `/exec` (`/macros/u/N` routing) BEFORE `doGet` runs. The shim fetches `/exec?fmt=json` with `credentials:'omit'` and downloads client-side. Root cause was proven from the Engagement Log (0 rows for failed browser clicks); see [[diagnose-user-request-path-first]].
- **Redirect** (non-PDF links + fallback) targets `window.top` (v2.15.1), so nothing loads inside Apps Script's sandbox iframe.
- **Token schema** (v2.20.0) gains `t` (teacher name), so clicks attribute per-teacher even when several teachers share one recipient email (smoke tests: all drafts go to the operator). Pre-v2.20.0 tokens verify fine (`teacher: ''`) and attribute only when the (email, week) has exactly one send row.
- **Dashboard** (v2.19.0 + v2.20.0): `rebuildEngagementDashboard` renders 3 sections - Teacher Fidelity (% of report PDFs clicked, color-banded), per-(teacher, week) detail, PDF CTR by week - keyed by `email||week||teacher`.
- New helpers: `_servePdfPage`, `_driveFileId`, `_driveDirectUrl`, `_jsonOut`, `_trackingShimUrl`, `_publishPublicPdfCopy`, `_ensureReportLinksFolder`, `setupReportLinksFolder`. New file `docs/r.html` (GitHub Pages shim; excluded from `clasp push` by the `.claspignore` whitelist). Deployed through @9.

**v2.21.0**: SY26-27 weekly templates, Weeks 1-9. Nine new `TEMPLATES` keys (`26-27 Week 1: Growth Mindset Culture` .. `26-27 Week 9: Confidence Through Evidence`) registered FIRST so the current school year leads the dropdown; count 20 -> 29. Copy + links are transcribed from the shared Doc "26_27 Implementation Emails" (`1pKkcEnP-Ljt6MtZ7ukdLzsfxSrbG8nqEz4__xMyqohw`) into a single `WEEK_SPECS_2627` table that `_build2627Body` renders for all nine weeks. Standard weekly path (metrics table + legend + trend alert + tracked PDF link), no tracking-layer changes. Week 1 shows the metrics table despite having no `<<Teacher Data Table>>` doc marker; Weeks 7-9 have no AIM Launch link. Uses its own `_build2627Resources` rather than `buildResourcesSection` (that one hardcodes stale SY25-26 links and the pre-v2.16.0 "(Attached)" wording). Test count: 154 -> 163. Weeks 10-18 deferred until the doc content fills in.

**v2.22.0**: Manager-editable 26-27 templates. The shared "26_27 Implementation Emails" Doc (`CONFIG.TEMPLATE_DOC_ID`) is the authoring surface: **Email Tools > Templates: Sync from 26-27 Doc** parses the week tabs (`DocumentApp.getTabs()`, UPD_WK N beats Week N), validates, previews per-week OK/SKIPPED, writes specs to the **Template Content** tab, auto-refreshes the dropdown. Runtime template lookups now go through `resolveTemplate_(name)` / `getTemplateNames_()` (never `TEMPLATES[name]` directly): 26-27 names resolve by week number via `_getSpec2627_` (synced row first, hardcoded `WEEK_SPECS_2627` fallback). A Week 10+ tab that parses cleanly auto-appears in the dropdown with zero code. Skeleton (metrics table, legend, trend alert, tracked PDF button) stays code-owned; managers control content fields only. A week failing validation is SKIPPED, never broken. Parser is runs-model based (bold + link boundaries carry meaning); the doc structure contract lives in the sync-section comment in Code.js and IMPLEMENTATION_NOTES. Test count: 163 -> 199.

For full per-version implementation details + version-specific bug post-mortems, see `IMPLEMENTATION_NOTES.md`.

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
**Root Drive Folder ID:** `1RcD0atv_P5fApG7Kd_pNu33gFrrlZMA5` = `Weekly Reports`, in the *Studient
Reports* shared drive `0ACm8X7MRxxTaUk9PVA` (stored in `CONFIG.ROOT_FOLDER_ID` / `ROOT_FOLDER_NAME`)

> **RESOLVED 2026-07-29 (v2.27.0), but NOT the way the pending note below predicted.** The folder was
> **duplicated** into the shared drive, not moved, so the id CHANGED (a move would have preserved it) and
> the old tree still exists at `1cDnSQ2P8EmmvC1bb4CuRPIdG9XNfozgR` in Mark's personal My Drive.
>
> Two consequences that are now code:
> 1. **`ROOT_FOLDER_ID` and `ROOT_FOLDER_NAME` must always change together.** `getRootFolder()` falls back
>    to `findFolderByName(ROOT_FOLDER_NAME)` when the id lookup throws, so a stale name silently routes the
>    whole app back into the retired personal tree and still looks like it is working. A unit test now
>    fails if one is edited without the other.
> 2. **~921 filenames exist in BOTH trees, and IMs can see both** (the old folder is shared with them; the
>    new drive has `all@studient.com`). `DriveApp.getFilesByName` is corpus-scoped, not folder-scoped, so
>    `findTeacherPdfBySearch` could attach last month's PDF from the retired tree with no error. It now
>    drops any hit whose parent chain does not reach `CONFIG.ROOT_FOLDER_ID` (`_isUnderConfiguredRoot_`,
>    tri-state so a permission gap keeps the file rather than blanking every report).
>
> Still worth running once after any Drive-side change: **Email Tools > Debug: Drive Access** and
> **Debug: Validate All PDFs**. If discovery ever breaks, switch the lookups to the Advanced Drive Service
> with `supportsAllDrives: true` and `includeItemsFromAllDrives: true`.
>
> The ~921 originals in Mark's personal Drive are undecided: retire or keep as archive. Leaving them
> undocumented is how the next person finds two trees and picks the wrong one.

### Sheet Tabs

1. **Config** (A1:B4)
   - `Date Range` - dropdown from Available Weeks tab (e.g., `2026-03-30_to_2026-04-05`)
   - `Root Folder Name` - informational only; code uses hardcoded constants
   - `Template` - dropdown of 29 templates (SY26-27 Weeks 1-9 listed first, v2.21.0; incl. Summer School Week 1+2 + Week 3, v2.11-v2.13). Refresh via `Email Tools > Refresh Template Dropdown` after Code.gs changes.

2. **School-IM Mapping** (A1:C11)
   - Column A: School Folder Name (legacy underscored form - kept for backward compat)
   - Column B: School Display Name (human-readable, matches Drive folder names)
   - Column C: IM Email
   - `findFolderByName` normalizes underscores/spaces so column A still works

3. **Teacher Emails** (IMPORTRANGE mirror - NO LONGER the roster source as of v2.26.0)
   - One cell (A1) stacking 9 `(Dash)` tabs from the MAP Master Roster. It loads
     partially at random AND the source tabs have different column layouts, so the
     stack mis-columns some campuses. Kept only as a fail-soft fallback.
   - **Real source: `CONFIG.ROSTER_SOURCE_ID`** (MAP Master Roster), read directly by
     `_loadMasterRoster_` with per-tab HEADER-based column resolution. See the
     IMPLEMENTATION_NOTES gotcha before touching any of it.
   - Reading Community still uses the dedicated "Reading Teachers" tab (master roster
     is its fallback)

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

9. **Year Teacher Totals** (v2.6.5+, year-cumulative since 2025-09-01)
   - Used only by SC Final Email template

10. **Student Year Highlights** (v2.6.5+, top 2 per teacher)
    - Used only by SC Final Email template

11. **Engagement Log** (v2.15.0, auto-created on first click)
    - Raw click events: `timestamp, event, week, teacher, email, campus, link_type, destination`
    - Written by `doGet` (the web-app tracker), one row per tracked link click
    - `teacher` is populated from the token as of v2.20.0 (blank for clicks on pre-v2.20.0 links)

12. **Send Log** (v2.15.0, auto-created on first draft)
    - The CTR denominator: `timestamp, week, teacher, email, campus, template`
    - Written by `logSendEvent` at each successful draft creation

13. **Engagement Dashboard** (v2.15.0, rebuilt on demand; v2.19.0 layout; v2.20.0 per-teacher keys)
    - Keyed by `email||week||teacher` (v2.20.0) so teachers sharing one recipient email (smoke tests) don't collapse into one row
    - Section 1 (v2.19.0): **Teacher Fidelity** - per teacher across all weeks: Reports sent, PDFs clicked, Total clicks, Fidelity % (= PDFs clicked / reports sent; green >= 80% / yellow >= 40% / red below)
    - Section 2: per-(teacher, week) detail - Sent / Clicked any / Clicked PDF / #clicks / First click
    - Section 3: PDF CTR by week
    - Rebuilt by `rebuildEngagementDashboard` (Email Tools menu); formula-free snapshot off the two logs

### Google Drive Folder Structure (verified April 2026)

```
Bruna and Mark's Schools - Weekly Report/   <- ROOT_FOLDER_NAME / ROOT_FOLDER_ID
  +-- Reading Community City School District/   <- human-readable, spaces
  |   +-- Danielle Roberts/                     <- "First Last" with spaces
  |   |   +-- Danielle Roberts - 2026-04-06 - 2026-04-12.pdf   <- PDF directly here
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
- No date subfolders - PDFs sit directly in the teacher folder
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
| SC Final Email: Growth & Hardwork = Results | Motivention Store Closing Friday (+ Impressive Results) | No (year-cumulative spotlights instead) |
| Summer School Week 1+2 | Studient: Week 2: Keep the Momentum Going | No (external sources, scoped per School-IM Mapping) |
| Summer School Week 3 | Studient - Week 4: Finish Strong (Jasper) / Week 3: Push Through the Slump (Allendale) | No (per-district; external sources) |

**Summer School Week 1+2** (v2.10.0; dropdown-integrated in v2.11.0) is selectable here like any other template: set Config Template to it and run "Generate My Email Drafts", and it drafts that IM's School-IM-Mapping summer schools from EXTERNAL sources (Summer Performance Dashboard + MAP Master Roster + the Public School Summer Camp Drive tree), not the active spreadsheet. The `summerSchool` flag routes `generateDraftsForCurrentUser` to `_runSummerSchoolCore`, bypassing the normal metrics/PDF loop. "Summer School: Smoke Test (to me)" remains for an all-schools admin preview.

### Shared Components
- `buildGreeting(teacher)` - "Hi {firstName},"
- `buildMetricsTable(teacher, metricsArray)` - 5-column color-coded data table: **Teacher | Grade | Avg Active Days | Avg Minutes | Avg Lessons/Student**. Max width 640px.
- `buildColorLegend()` - green/yellow/red thresholds; "Key metrics" line includes `Average mastered lessons`
- `buildTrendAlert(metricsArray)` - conditional trend box
- `buildWinnersHtml(winnersArray)` - achievement awards table
- `buildResourcesSection(links)` - resources list with standard items
- `buildWeeklyChallenge(challenge, reflection)` - challenge + prompt
- `wrapEmailHtml(sections)` - wraps sections in email container
- `dotSpan(color)` - colored CSS dot (replaces emoji)
- `buildYearHighlightReel`, `buildYearKpiStrip`, `buildStudentSpotlights` - SC Final Email only (v2.6.5+)

## Key Functions

### `generateDraftsForCurrentUser()`
Main entry point. Flow:
1. Reads Config: Date Range + Template
2. Finds IM's assigned schools
3. `getRootFolder()` for Drive root
4. **Confirmation dialog**: shows date range, template, teacher count, validates Drive folders + metrics availability
5. Loads metrics for selected week via `getTeacherMetricsForWeek()`
6. For each teacher: finds PDF matching date pattern, generates HTML via template function, creates Gmail draft

### `getRootFolder()`
Returns the root folder. Tries `DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID)` first, falls back to `findFolderByName(CONFIG.ROOT_FOLDER_NAME)` if the ID fails.

### `getTeacherMetricsForWeek(weekStart)`
Filters "All Teacher Metrics" by week_start column A. Returns teacher-keyed object.

### `findFolderByName(folderName, parentFolder)`
Two-tier lookup: fast `getFoldersByName()` exact match, then iterate parent's folders comparing against `normalizeFolderName()`.

### `dateRangeToPdfPattern(dateRange)`
Converts `2026-04-06_to_2026-04-12` to `2026-04-06 - 2026-04-12`.

### `lookupByName(obj, firstName, lastName, fullName)`
Fuzzy name matching: exact -> first+last -> unique last -> NAME_ALIASES. v2.6.8 routes year-cumulative readers through this for multi-token names.

### `debugDriveAccess()` / `diagnoseDriveAuth()`
Debug menu items - run when "Drive folders NOT FOUND" or "Service error: Drive" appears.

## Menu (Email Tools)

| Menu Item | Function | Purpose |
|-----------|----------|---------|
| Generate My Email Drafts | `generateDraftsForCurrentUser` | Main action; also runs Summer School Week 1+2 (scoped to your schools) when that Config Template is selected (v2.11.0) |
| Debug: Check Teacher Folders | `checkTeacherFolders` | Lists missing teacher folders per school |
| Debug: Check Teacher Names | `checkTeacherNames` | Roster vs metrics name match (use this when "No metrics rows found") |
| Debug: Drive Access | `debugDriveAccess` | Full Drive visibility diagnostic |
| Debug: Drive Auth | `diagnoseDriveAuth` | Run FIRST when "Service error: Drive" appears (v2.4.2+) |
| Debug: Validate All PDFs (Config week) | `validateAllPdfs` | System-wide PDF coverage check (v2.6.4+) |
| Test Mode: Generate Smoke Test | `runSmokeTest` | ~6-8 drafts to current user's Gmail across districts (v2.6.0+) |
| Summer School: Smoke Test (to me) | `generateSummerSchoolSmokeTest` | All-schools Summer School preview, drafts to the operator (admin QA, v2.10.0+) |
| Retry Last Run's Failed Teachers | `retryFailedTeachers` | Reads Error Log for last run's ERROR rows (v2.6.0+) |
| Set Date Range | `setDateRange` | Manual override for Config Date Range |
| Set Template | `setTemplate` | Manual override for Config Template |
| Refresh Template Dropdown | `setupTemplateDropdown` | Rebuilds Config Template data validation from `TEMPLATE_NAMES` |
| Engagement: Rebuild Click Dashboard | `rebuildEngagementDashboard` | Rebuilds the Engagement Dashboard tab from Send Log + Engagement Log: 3 sections - Teacher Fidelity (% of PDFs clicked, color-banded), per-(teacher, week) detail, PDF CTR by week (v2.15.0; fidelity v2.19.0; per-teacher keys v2.20.0) |
| Engagement: Set Up Report Links Folder | `setupReportLinksFolder` | Creates/confirms the legacy "Email Report Links" folder (v2.16.0 public PDF copies) and shows its URL. Not needed for current delivery (v2.17.0+ serves bytes directly); kept for drafts sent while the copy design was live |
| Run Unit Tests | (test runner) | 153 test cases (v2.14.0) |

## Important Implementation Details

- **No emojis in Code.gs** - causes "could not save" errors. Use `dotSpan()` colored CSS dots.
- **Reading Community exception** - uses "Reading Teachers" tab.
- **PDF matching (v2.0.3)** - filename contains `YYYY-MM-DD - YYYY-MM-DD` and ends with `.PDF`. Old format (`00_SUMMARY_...PDF` inside date subfolder) still supported as fallback.
- **Folder lookup is flexible** - `findFolderByName` treats underscores/spaces as equivalent, case-insensitive, normalizes apostrophe variants.
- **Root folder is bulletproof** - `getFolderById()` first, name lookup as fallback.
- **Email HTML** - inline CSS only (no `<style>` blocks).
- **Drive validation blocks generation** if no matching PDF found.
- **Winners table** only in Week 6 and Wrap Up templates.
- **Click tracking (v2.15.0-v2.18.0)** - the weekly PDF is a **tracked link, not an attachment**. Deployed as a Web App; the `/exec` URL is baked into `CONFIG.TRACKING_WEBAPP_URL` (Script Property `TRACKING_WEBAPP_URL` overrides). RE-VERSION the SAME deployment after any `Code.js` push (`clasp deploy -i <id>`), else the live `/exec` runs stale code. **Link architecture (v2.18.0)**: generated links point at a cookie-less GitHub Pages shim (`docs/r.html` -> `CONFIG.TRACKING_SHIM_URL`, token in the URL fragment) because Google's multi-account front-end kills direct browser hits to `/exec` (`/macros/u/N` routing) BEFORE `doGet` runs. The shim fetches `/exec?fmt=json` with `credentials:'omit'` (JSON: `pdf` b64 / `redirect` / `invalid`) and downloads client-side. **PDF delivery (v2.17.0)**: `doGet` reads the blob server-side as the web-app owner - works on shared-with-me originals, NO sharing or copies needed. Fallbacks: shim fetch failure -> direct `/exec` (HTML serve page); oversize (>15MB)/unreadable -> `uc?export=download` redirect; `getUrl()` failure at draft time -> attach original.

For color thresholds, testing workflow, and troubleshooting recipes, see `IMPLEMENTATION_NOTES.md`.

## Related Project

`Studient Excel Automation` repo generates the data:
- AWS Athena -> S3 -> GCS -> BigQuery -> Google Sheets
- `email_winners.py`: `query_all_teacher_metrics()`, `write_all_metrics_to_email_sheet()`, `query_year_teacher_totals()`, `query_student_year_highlights()` (v3.41.4+)
- `email_only.py`: quick script for email data only (~30s)

**Critical drift markers** (do NOT remove from this CLAUDE.md):
- Sheet ID, Apps Script Project ID, Root Drive Folder ID
- **Click tracking (v2.15.0-v2.20.0)**: web app DEPLOYED 2026-07-06, id `AKfycbzxwauuhinj9htVMrlgPBTDCQxSGaOgLPZO8a9mRNNKBx8d9R_SeDTMBl0bh6r2IBg`, `/exec` URL baked into `CONFIG.TRACKING_WEBAPP_URL` (Script Property `TRACKING_WEBAPP_URL` overrides). **Token schema (v2.20.0)**: HMAC-signed JSON `{w: week, e: email, c: campus, l: link_type, d: dest, t: teacher}` - `t` added so clicks attribute per-teacher when several teachers share one recipient email (smoke tests: ALL drafts go to the operator); pre-v2.20.0 tokens (no `t`) verify fine, decode `teacher: ''`, and attribute only when the (email, week) has exactly one send row. Script Properties: `TRACKING_HMAC_SECRET` (auto-gen; rotating it breaks already-sent links), `REPORT_LINKS_FOLDER_ID` (legacy v2.16.0 "Email Report Links" copies folder - keep while old links are in flight). `appsscript.json` carries the `webapp` block. **After every `clasp push`, re-version the SAME deployment**: `clasp deploy -i AKfycbzx...SeDTMBl0bh6r2IBg -d "..."` - a bare `clasp deploy` mints a new `/exec` id and stales the baked URL. PDFs are tracked links (bytes served by the web app), not attached - any template copy still saying "Attached:" (Week 2 / Week 8 subjects) is now inaccurate; harmless, candidate copy fix.
- Sheet tab names + column letters (Y/Z/AA for Teacher Email)
- Drive folder structure (school name format)
- Related-project function names (changes upstream break this app)
- **Summer School (v2.10.0+)** `CONFIG.SUMMER_SCHOOL` IDs/gids: Data `1pbVCjxsn...` (gid 1749344035), Roster `1scEay0a...` (gid 1317754525), PDF Camp folder `1wY4sMo0...`. PDF tree is nested Camp -> School -> Teacher -> `{Teacher}_XP_Report_{YYYY-MM-DD}.pdf`; traversal skips camp subfolders whose name contains "archive". The week window + subject + body copy are PER-TEMPLATE (each summer TEMPLATES entry's `summerConfig`): Week 1+2 = weeks `2026-06-01`+`2026-06-08`; Week 3 = week `2026-06-15`, per-district via `JASPER_CAMPUSES` (Jasper "Finish Strong" vs Allendale "Push Through the Slump"). Match key = normalized (campus, teacher). Roster columns matched by HEADER NAME (Campus / Summer School Teacher / Summer School Teacher Email); dashboard tab found by header signature (`teacher_name` + `avg_active_days` + `doom_loop_pct`). If the dashboard renames those headers or the roster drops the "Summer School Teacher Email" column, teachers silently draft blank-To / no-table. JHES teachers + JRHS groups have no roster email by design (blank-To).
