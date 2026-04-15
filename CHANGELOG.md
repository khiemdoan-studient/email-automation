# Changelog

All notable changes to this project will be documented in this file.

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
