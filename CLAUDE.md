# Email Automation - AI Context Document

## Project Overview

Google Apps Script email automation system that generates weekly Gmail drafts for teachers with performance metrics tables and PDF attachments. Built for non-technical Implementation Managers (IMs) to run via a custom menu in Google Sheets.

**v2.0**: IMs can select any available week and any email template (Week 0-8 + Wrap Up) before generating drafts. Metrics are preloaded for all weeks so no pipeline re-run is needed when switching weeks.

**v2.0.3**: Bulletproof root folder lookup via folder ID + comprehensive Drive diagnostic. Drive structure verified against live production Drive (April 2026).

**v2.1.0 (current)**: Added `Avg Lessons/Student` column to the shared teacher metrics table (cascades to every template). Added 2 new "Finishing Strong" templates (`4/20 Jasper` and `4/20 Math+ELA`) bringing the total to 12. Added `setupTemplateDropdown()` menu item to sync the Config Template dropdown with `TEMPLATE_NAMES` without manual sheet editing.

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
   - `Template` - dropdown of 10 templates (Week 0-8 + Wrap Up)

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
- All 13 school folders visible under root
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

`Studient Excel Automation` repo (`studient-dashboard-pipeline`) generates the data:
- AWS Athena -> S3 -> GCS -> BigQuery -> Google Sheets
- `email_winners.py`: `query_all_teacher_metrics()`, `write_all_metrics_to_email_sheet()`, winners (with empty-data guard)
- `email_only.py`: quick script for email data only (~30s)
