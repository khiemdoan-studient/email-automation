# Email Automation - AI Context Document

## Project Overview

Google Apps Script email automation system that generates weekly Gmail drafts for teachers with performance metrics tables and PDF attachments. Built for non-technical Implementation Managers (IMs) to run via a custom menu in Google Sheets.

## Architecture

```
Google Sheet (4 tabs)  -->  Apps Script  -->  Gmail Drafts + PDF attachments
       |                        |
  Config / Mapping         Google Drive
  Teacher Emails           (folder hierarchy)
  Teacher Metrics
```

### Google Sheet

**Spreadsheet ID:** `1GKtoNumk363StPb2HZ1suiXNB3rHzA_wDLKgRiGj6f8`
**Apps Script Project ID:** `1IbokxMbI7i3FrGGFEQfVtnYHB7ir8vRMcpX9Fs7xDTG3Vlrtuy65ubaP`

### Sheet Tabs

1. **Config** (A1:B3)
   - `Date Range` - e.g., `2026-03-23_to_2026-03-29` (matches Drive folder names)
   - `Root Folder Name` - informational only; code uses hardcoded constant

2. **School-IM Mapping** (A1:C11)
   - Column A: School Folder Name (underscored, matches Drive folder names)
   - Column B: School Display Name (human-readable, matches Campus column in Teacher Emails)
   - Column C: IM Email (determines which schools each IM generates drafts for)

3. **Teacher Emails** (A1:AA, dynamically populated via IMPORTRANGE)
   - Pulls from a separate master roster spreadsheet
   - Key columns: Campus (C/index 2), Teacher First (Y/24), Teacher Last (Z/25), Teacher Email (AA/26)
   - **Exception:** Reading Community City School District uses columns AD/AE/AF (indices 29/30/31) for teacher info

4. **Teacher Metrics** (A1:K, manually populated)
   - Columns: Teacher, Grade, # Students, Avg Active Days, % Logged In, % Everyday, Avg Minutes, Tests Mastered, Avg Tests, Lessons Mastered, Avg Lessons

### Google Drive Folder Structure

```
Bruna and Mark's Schools - Weekly Report/
  ├── AASP_-_Allendale_Aspire_Academy/
  │   ├── FirstName_LastName/
  │   │   ├── 2026-03-23_to_2026-03-29/
  │   │   │   ├── 00_SUMMARY_....PDF    <-- attached to email
  │   │   │   └── other files...
  │   │   └── ...
  │   └── ...
  ├── Reading_Community_City_School_District/
  │   └── ...
  └── ...
```

## Key Functions

### `generateDraftsForCurrentUser()`
Main entry point. Called from the "Email Tools" menu. Flow:
1. Gets current user's email
2. Finds their assigned schools from School-IM Mapping
3. Builds teacher list from Teacher Emails sheet
4. Loads Teacher Metrics
5. For each teacher: finds PDF in Drive, generates HTML email, creates Gmail draft

### `generateEmailBody(teacher, metricsArray)`
Builds the HTML email template. Sections:
1. Greeting ("Hi {firstName},")
2. Data table (Teacher, Grade, Avg Active Days, Avg Minutes) with color-coded cells
3. Color legend (Green 4+, Yellow 3, Red 1-2)
4. **Conditional Current Trend** - based on overall avg active days across grade rows
5. Weekly Focus, Why It Matters, Actions This Week
6. Resources (AIM Launches links, Goal Tracker sheets)
7. Weekly Challenge + Reflection Prompt

### `getOverallTrendColor(metricsArray)`
Calculates average of activeDays across all grade rows for a teacher:
- `>= 3.95` → green: "Great work! Your students are on track..."
- `>= 2.95` → yellow: "You're close — schedule at least 35 minutes daily..."
- `< 2.95` → red: "Your class isn't meeting time goals yet..."

### `createDraftForTeacher(teacher, rootFolder, dateRange, metrics)`
Navigates Drive folder hierarchy: root → school → teacher → date range → finds `00*SUMMARY*.PDF`

## Color Thresholds

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Avg Active Days | >= 3.95 | >= 2.95 | < 2.95 |
| Avg Minutes | >= 99.5 | >= 79.5 | < 79.5 |

Cell background colors: Green `#d9ead3`, Yellow `#fff2cc`, Red `#f4cccc`

## Schools & IMs

| School Folder | Display Name | IM |
|---|---|---|
| AASP_-_Allendale_Aspire_Academy | AASP - Allendale Aspire Academy | frank.galindo |
| AFES_-_Allendale_Fairfax_Elementary_School | AFES - Allendale Fairfax Elementary School | alicia.westcot |
| AFMS_-_Allendale_Fairfax_Middle_School | AFMS - Allendale Fairfax Middle School | margaret.olah |
| JHES_-_Hardeeville_Elementary_School | JHES - Hardeeville Elementary School | kelli.helle |
| JHMS_-_Hardeeville_Junior_Senior_High_School | JHMS - Hardeeville Junior Senior High School | gaston.griffin |
| JRES_-_Ridgeland_Elementary_School | JRES - Ridgeland Elementary School | tony.disario |
| JRHS_-_Ridgeland_Secondary_Academy_of_Excellence | JRHS - Ridgeland Secondary Academy of Excellence | allison.atkins |
| Metro_Schools | Metro Schools | margaret.olah |
| Reading_Community_City_School_District | Reading Community City School District | frank.galindo |

## Important Implementation Details

- **Reading Community exception:** Uses different column indices (29/30/31) for teacher first/last/email instead of the standard (24/25/26)
- **Teacher folder naming:** `FirstName_LastName` with spaces replaced by underscores
- **PDF matching:** File must start with `00`, contain `SUMMARY`, and end with `.PDF` (case-insensitive)
- **Email HTML:** Uses only inline CSS (no `<style>` blocks) for email client compatibility
- **Colored dots:** Rendered as inline `<span>` elements with `border-radius:50%`, not emoji (for reliability)
- **ROOT_FOLDER_NAME constant:** Hardcoded as `"Bruna and Mark's Schools - Weekly Report"` - the Config sheet's `Root Folder Name` value is informational only

## Testing

1. Add test user email to School-IM Mapping with a school that has data
2. Ensure Teacher Metrics has data for teachers at that school
3. Ensure Drive has the folder hierarchy with PDF files for the current date range
4. Run "Email Tools > Generate My Email Drafts" from the Google Sheet
5. Check Gmail Drafts for correct formatting, table data, trend color, and PDF attachment

## Related Project

The `Studient Excel Automation` project (separate repo) generates the underlying data pipeline:
- AWS Athena → S3 → GCS → BigQuery → Google Sheets dashboards
- The PDF reports attached to emails come from this pipeline's output
