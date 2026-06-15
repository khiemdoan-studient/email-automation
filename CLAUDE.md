# Email Automation - AI Context Document

## Project Overview

Google Apps Script email automation system that generates weekly Gmail drafts for teachers with performance metrics tables and PDF attachments. Built for non-technical Implementation Managers (IMs) to run via a custom menu in Google Sheets.

**v2.0**: IMs can select any available week and any email template before generating drafts. Metrics are preloaded for all weeks so no pipeline re-run is needed when switching weeks. (Originally launched with 10 templates: Week 0-8 + Wrap Up. Now 15.)

**v2.0.3**: Bulletproof root folder lookup via folder ID + comprehensive Drive diagnostic. Drive structure verified against live production Drive (April 2026).

**v2.1-v2.3**: Hardening releases. Added 3 new templates (4/20 Jasper, 4/20 Math+ELA, 4/27 Last Week of Motivention) bringing total to 13. `TEMPLATE_NAMES` auto-derived from `TEMPLATES` (drift-proof). `lookupByName` smart-prefix match closes cross-teacher data leak edge case. School folder caching across validation + per-teacher loops eliminates ~50% of redundant Drive API calls. LockService guard against duplicate drafts on double-click. v2.3.0 also removed `buildTrendAlert` from 4/27 template (end-of-year context).

**v2.4-v2.5**: Drive error hardening (4 attempts at "Service error: Drive") culminating in v2.5.0 architectural pivot: PDF lookup now uses Drive's search API (`DriveApp.getFilesByName`) as primary path, folder traversal as fallback. Search API works for any file the user can see, regardless of parent permissions. v2.5.0 also added structured error logging (Error Log tab), unit test runner (17 cases). v2.5.1 added cross-school PDF mix-up defense + dual-keyed cache. v2.5.2 added NAME_ALIASES + `checkTeacherNames()` validator + Python validator (`scripts/check_email_data.py`). v2.5.3 audit + 16 fixes incl. `[DRAFT]` template suffixes + `name_aliases.json` single-source-of-truth.

**v2.6.0-v2.8.0**: Audit follow-up + ongoing hardening. v2.6.0 extracted shared helpers, introduced `CONFIG.THRESHOLDS`/`CONFIG.LIMITS`, smoke test menu item, retry-failed-teachers menu item, clasp deploy docs (test count: 30 -> 45). v2.6.1 swapped smoke test fixture (`vipul singhal` replaces always-failing `faith armstrong`). v2.6.2 added `validateAllPdfs()` Apps Script menu item (system-wide PDF coverage check). v2.6.3 fixed search-vs-traversal-fallback parity in validator. v2.6.4 narrowed validator to Config week. v2.6.5 added 14th template `SC Final Email: Growth & Hardwork = Results` (year-cumulative summary, paired with parent v3.41.4). v2.6.6 added 2 BQ cross-validation probes. v2.6.7 fixed multi-campus teacher row collision (paired with parent v3.41.6). v2.6.8 routed year-cumulative readers through `lookupByName` for multi-token teacher names. v2.6.9 hardened the roster campus filter via `campusMatchesAnyDisplay` (replaces exact-match `indexOf` with `normalizeFolderName`-based comparison), improved `checkTeacherNames` + `generateDraftsForCurrentUser` empty-roster diagnostics, and added `_probe_no_silently_dropped_school` to `scripts/check_email_data.py` to catch the JRES-class upstream-Campus-wipe bug proactively. v2.7.0 added `partitionTeachersByDataAvailability` so `generateDraftsForCurrentUser` skips drafts for teachers without metrics rows for the selected week (template-aware: weekly metrics for Week 0-8/Wrap Up/4/20s/4/27; year-cumulative for SC Final Email). Backward compat: when `metricsExist === false`, no filtering (preserves "send to all with placeholder" path for template-only emails). v2.8.0 added the live-data "Spring 2026 MAP Scores" template: parent `generate_report_v3.py` Step 5 writes a new "Spring 2026 MAP Scores" tab via `query_map_scores_for_email` + `write_map_scores_to_email_sheet` (sourced from `studient_growth_inputs` JOIN `weekly_dashboard`); Apps Script reads via `getMapScoresForTeacher()` reader; `generateSpring2026MapBody` renders a 4-col table (Student Name | Subject | Winter Score | Spring Score) per teacher. Partition skips teachers with zero MAP students. New `_probe_map_scores_tab_populated` in `scripts/check_email_data.py`. v2.8.2 dropped state-testing copy + replaced "live data" framing with "tests completed as of yesterday". v2.8.3 added 3-band Spring-vs-Winter row colors (green/yellow/red). v2.9.0 overhauled the template: replaced the post-intro paragraph with a "Please prioritize the following today:" 4-bullet action list (with one nested bullet) + italic re-testing blurb + yellow IM-editable callout; extended the data table from 4 cols -> 6 cols (added Projected Growth + X Growth, computed client-side with the floor-at-1 rule matching parent `sheets_builder._compute_x_growth`); rewrote row colors as 5-band X-Growth buckets (darker green X>=2, medium green 1.5<=X<2, very light green 0<X<1.5, very light red -2<=X<=0, bright red X<-2); added "We will finalize all the growth calculations and growth prizes by Friday." before the Thank you. Cross-repo: parent `queries_v3.py` + `email_winners.py` extended to emit 8-col tab including `winter_to_spring_projected_growth` + `winter_to_spring_observed_growth`. Test count: 45 -> 84 (v2.9.0 added X Growth + 5-band color tests; v2.9.1 added X = -2 boundary test). v2.9.2 (copy-only) refined the Spring 2026 MAP template per user feedback: removed the Review students + Retest on 5/28 bullets, added a new sub-bullet "Some students who have been identified as re-test candidates will be testing again today" below the existing Ensure Language sub-bullet, removed the yellow STUDIENT IM ACTION callout entirely, and changed the conclusion from "We will finalize all the growth calculations and growth prizes by Friday." to "Growth calculations and prizes will be handed out today.". v2.9.1 refined the template per first-look feedback: merged the last prioritize bullet with the trailing italic re-testing blurb into a single bullet (`<u>Language</u>` underlined on first occurrence, "Retest on 5/28..." prefix), added italic `(especially dark red)` to the "Review students" bullet, renamed the yellow callout label to `STUDIENT IM ACTION [DO THIS]: ...`, moved the dark-red boundary to `X <= -2.0` (inclusive) with color `#cc0000` (darker than v2.9.0 `#e06666`), simplified interpretation notes from 6 bullets to 4 (dropped Winter Score + Subjects), and reduced the conclusion to the single "finalize by Friday" sentence (dropped Thank you). Test count: 83 -> 84.

**Critical drift markers (v2.9.0)**: the Spring 2026 MAP Scores template depends on the parent pipeline writing the `Spring 2026 MAP Scores` tab with the **8-column header** (`campus_name, teacher_name, student_name, subject, winter_rit, spring_rit, winter_to_spring_projected_growth, winter_to_spring_observed_growth`). If the parent renames the tab, changes the header, or removes the writer call from `generate_report_v3.py` Step 5, the email template silently renders zero teachers OR renders X Growth as "--" for every row. The `_probe_map_scores_tab_populated` validator catches header mismatch pre-cycle. X Growth is computed client-side in `buildMapScoresTable` using `observed_growth / max(projected_growth, 1)` - the floor-at-1 rule MUST stay in sync with parent `sheets_builder._compute_x_growth` (v3.43.7 + v3.44.1). Underlying BQ refresh remains manual NWEA CSV + `--full` build (no daily auto-ingest yet).

**v2.10.0**: New "Summer School Week 1+2" email on a SEPARATE external-source path (not the TEMPLATES dropdown). Reads three external resources via `CONFIG.SUMMER_SCHOOL` (Summer Performance Dashboard + MAP Master Roster + the nested "Public School Summer Camp" Drive tree, the last inside `ROOT_FOLDER_ID`), and drafts one email per teacher/group across all 6 SC summer schools (combined two-week data table + both weekly XP PDFs attached). Matching is normalized (campus, teacher); To = roster email or BLANK with a fill-in banner when a folder has no roster match; one `Unassigned` draft per school. Menu items: `Generate Summer School Drafts (Wk 1+2)` + `Summer School: Smoke Test (to me)`. 2026-06-15 reconciliation: 21 teacher/group folders, 11 addressed + 10 blank-To, all 21 with both-week data. Test count: 84 -> 105.

**v2.11.0**: Wired Summer School Week 1+2 into the standard Config Template + "Generate My Email Drafts" path so non-technical IMs use the same one-button flow as every other template, scoped to their School-IM Mapping schools (drafts addressed to teacher emails, landing in the IM's Gmail). Registered in TEMPLATES with a `summerSchool` routing flag; `generateDraftsForCurrentUser` short-circuits to a school-scoped `_runSummerSchoolCore` (the old `_runSummerSchool` is now a thin locking wrapper around that core). Removed the all-schools "Generate Summer School Drafts (Wk 1+2)" menu item (footgun); kept "Summer School: Smoke Test (to me)" for admin preview. Test count: 105 -> 110.

**v2.11.1**: Split the Summer School data table into two labeled rows, Week 1 (6/1-6/7) and Week 2 (6/8-6/14), instead of one combined row. `readSummerTeacherData` now returns per-week metrics per (campus, teacher) (`_summerWeeklyByTeacher`), and `buildSummerSchoolTable` renders a 5-column, 2-row table from `CONFIG.SUMMER_SCHOOL.WEEK_STARTS` + `WEEK_LABELS` (a missing week shows dashes). Test count: 110 -> 111.

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
**Root Drive Folder ID:** `1cDnSQ2P8EmmvC1bb4CuRPIdG9XNfozgR` (stored in `CONFIG.ROOT_FOLDER_ID`)

### Sheet Tabs

1. **Config** (A1:B4)
   - `Date Range` - dropdown from Available Weeks tab (e.g., `2026-03-30_to_2026-04-05`)
   - `Root Folder Name` - informational only; code uses hardcoded constants
   - `Template` - dropdown of 15 templates (incl. Summer School Week 1+2, v2.11.0). Refresh via `Email Tools > Refresh Template Dropdown` after Code.gs changes.

2. **School-IM Mapping** (A1:C11)
   - Column A: School Folder Name (legacy underscored form - kept for backward compat)
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

9. **Year Teacher Totals** (v2.6.5+, year-cumulative since 2025-09-01)
   - Used only by SC Final Email template

10. **Student Year Highlights** (v2.6.5+, top 2 per teacher)
    - Used only by SC Final Email template

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
| Run Unit Tests | (test runner) | 111 test cases (v2.11.1) |

## Important Implementation Details

- **No emojis in Code.gs** - causes "could not save" errors. Use `dotSpan()` colored CSS dots.
- **Reading Community exception** - uses "Reading Teachers" tab.
- **PDF matching (v2.0.3)** - filename contains `YYYY-MM-DD - YYYY-MM-DD` and ends with `.PDF`. Old format (`00_SUMMARY_...PDF` inside date subfolder) still supported as fallback.
- **Folder lookup is flexible** - `findFolderByName` treats underscores/spaces as equivalent, case-insensitive, normalizes apostrophe variants.
- **Root folder is bulletproof** - `getFolderById()` first, name lookup as fallback.
- **Email HTML** - inline CSS only (no `<style>` blocks).
- **Drive validation blocks generation** if no matching PDF found.
- **Winners table** only in Week 6 and Wrap Up templates.

For color thresholds, testing workflow, and troubleshooting recipes, see `IMPLEMENTATION_NOTES.md`.

## Related Project

`Studient Excel Automation` repo generates the data:
- AWS Athena -> S3 -> GCS -> BigQuery -> Google Sheets
- `email_winners.py`: `query_all_teacher_metrics()`, `write_all_metrics_to_email_sheet()`, `query_year_teacher_totals()`, `query_student_year_highlights()` (v3.41.4+)
- `email_only.py`: quick script for email data only (~30s)

**Critical drift markers** (do NOT remove from this CLAUDE.md):
- Sheet ID, Apps Script Project ID, Root Drive Folder ID
- Sheet tab names + column letters (Y/Z/AA for Teacher Email)
- Drive folder structure (school name format)
- Related-project function names (changes upstream break this app)
- **Summer School (v2.10.0)** `CONFIG.SUMMER_SCHOOL` IDs/gids: Data `1pbVCjxsn...` (gid 1749344035), Roster `1scEay0a...` (gid 1317754525), PDF Camp folder `1wY4sMo0...`. PDF tree is nested Camp -> School -> Teacher -> `{Teacher}_XP_Report_{YYYY-MM-DD}.pdf` (weeks `2026-06-01` + `2026-06-08`). Match key = normalized (campus, teacher). Roster columns matched by HEADER NAME (Campus / Summer School Teacher / Summer School Teacher Email); dashboard tab found by header signature (`teacher_name` + `avg_active_days` + `doom_loop_pct`). If the dashboard renames those headers or the roster drops the "Summer School Teacher Email" column, teachers silently draft blank-To / no-table. JHES teachers + JRHS groups have no roster email by design (blank-To).
