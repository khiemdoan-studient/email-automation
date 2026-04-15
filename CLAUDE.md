# Email Automation - AI Context Document

## Project Overview

Google Apps Script email automation system that generates weekly Gmail drafts for teachers with performance metrics tables and PDF attachments. Built for non-technical Implementation Managers (IMs) to run via a custom menu in Google Sheets.

**v2.0**: IMs can now select any available week and any email template (Week 0-8 + Wrap Up) before generating drafts. Metrics are preloaded for all weeks so no pipeline re-run is needed when switching weeks.

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

### Sheet Tabs

1. **Config** (A1:B4)
   - `Date Range` - dropdown from Available Weeks tab (e.g., `2026-03-30_to_2026-04-05`)
   - `Root Folder Name` - informational only; code uses hardcoded constant
   - `Template` - dropdown of 10 templates (Week 0-8 + Wrap Up)

2. **School-IM Mapping** (A1:C11)
   - Column A: School Folder Name (underscored, matches Drive)
   - Column B: School Display Name (human-readable)
   - Column C: IM Email

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

### Google Drive Folder Structure

```
Bruna and Mark's Schools - Weekly Report/
  +-- AASP_-_Allendale_Aspire_Academy/
  |   +-- FirstName_LastName/
  |   |   +-- 2026-03-30_to_2026-04-05/
  |   |   |   +-- 00_SUMMARY_....PDF    <-- attached to email
  +-- Reading_Community_City_School_District/
  +-- ...
```

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
| Week 4: Diagnosing Habits | [placeholder] | No |
| Week 5: Re-Engagement | [placeholder] | No |
| Week 6: Culture & Shoutouts | Data drop: culture, shoutouts, & Rewards | **Yes** |
| Week 7: I'm Stuck Protocol | [placeholder] | No |
| Week 8: Growth Mindset | [placeholder] | No |
| Wrap Up: Celebrate Wins | Celebrating your students' wins... | **Yes** |

### Shared Components
- `buildGreeting(teacher)` - "Hi {firstName},"
- `buildMetricsTable(teacher, metricsArray)` - color-coded data table
- `buildColorLegend()` - green/yellow/red thresholds
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
3. **Confirmation dialog**: shows date range, template, teacher count, validates Drive folders (blocks if missing) and metrics availability
4. Loads metrics for selected week via `getTeacherMetricsForWeek()`
5. For each teacher: finds PDF, generates HTML via template function, creates Gmail draft

### `getTeacherMetricsForWeek(weekStart)`
Filters "All Teacher Metrics" by week_start column A. Returns teacher-keyed object. Handles Date-to-ISO conversion guard for Sheets auto-parsing.

### `checkDriveFolderExists(rootFolder, schools, dateRange)`
Pre-validates that at least one school has teacher folders with the selected date range subfolder. Blocks generation if not found.

### `lookupByName(obj, firstName, lastName, fullName)`
Fuzzy name matching: exact -> first+last -> unique last -> NAME_ALIASES

## Color Thresholds

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Avg Active Days | >= 3.95 | >= 2.95 | < 2.95 |
| Avg Minutes | >= 99.5 | >= 79.5 | < 79.5 |

## Important Implementation Details

- **No emojis in Code.gs** - causes "could not save" errors. Use `dotSpan()` colored CSS dots
- **Reading Community exception** - uses "Reading Teachers" tab
- **PDF matching** - starts with `00`, contains `SUMMARY`, ends with `.PDF`
- **Email HTML** - inline CSS only (no `<style>` blocks)
- **Drive validation blocks generation** if no matching folders exist
- **Winners table only in Week 6 and Wrap Up** templates

## Testing

1. Run `python email_only.py` to populate All Teacher Metrics + Available Weeks + Winners
2. Set Config: Date Range (dropdown) + Template (dropdown)
3. Copy Code.gs to Apps Script editor (paste, no emojis)
4. Email Tools > Generate My Email Drafts
5. Confirmation dialog shows settings -> confirm -> check Gmail Drafts

## Related Project

`Studient Excel Automation` repo (`studient-dashboard-pipeline`) generates the data:
- AWS Athena -> S3 -> GCS -> BigQuery -> Google Sheets
- `email_winners.py`: `query_all_teacher_metrics()`, `write_all_metrics_to_email_sheet()`, winners
- `email_only.py`: quick script for email data only (~30s)
