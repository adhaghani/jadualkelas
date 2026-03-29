# Weekview.my Website Feature Reference

Last updated: 2026-03-25
Primary URL: https://weekview.my/app/

## Purpose Summary

Weekview is a UiTM-focused class timetable generator designed to make timetable creation easier and friendlier, with multiple import paths and manual editing.

## Source Evidence Used

1. Live app UI at https://weekview.my/app/
2. Site root at https://weekview.my/
3. Official Telegram channel web feed at https://t.me/s/myweekview

## Reliability Model (Important for AI Agent Use)

- Verified: Explicitly visible in UI text or explicitly stated in official channel posts.
- Strong inference: Highly likely based on UI controls and wording, but implementation details are not directly visible.
- Unknown: Not publicly visible from fetched content; do not assume.

## Product Scope (Verified)

- Domain: Class timetable generation.
- Primary audience: UiTM students.
- Input data sources mentioned: UiTM iCress, MyStudent, course registration slip text, and manual entry.
- Delivery format: Interactive weekly timetable view with export capability.

## UI Information Architecture (Verified)

Top actions visible in app header/nav:

- Support me
- Telegram
- Manage Courses
- Customize
- Export

Main timetable canvas:

- Weekly columns: Mon, Tue, Wed, Thu, Fri.
- Time axis displayed: 08:00 through 18:00.
- Empty-state instruction appears when no classes are loaded.

Onboarding CTAs in empty state:

- Import from UiTM
- Add Manually

Footer attribution:

- Copyright line shows year 2026 and creator handle/name reference.

## Feature Catalog With Detailed Explanation

### 1) Weekly timetable visualization

Status: Verified

What it is:

- A week-based schedule grid showing weekdays (Mon-Fri) against hourly time slots (08:00-18:00).

Why it matters:

- Converts raw class/course information into a visual timetable that is easier to understand at a glance.

Likely behavior:

- Courses appear as blocks in day/time positions.
- Empty state is shown until data is imported or entered.

Confidence:

- Visualization structure: High
- Block-rendering specifics (colors, conflict markers, etc.): Unknown

### 2) UiTM import flow (iCress-linked workflow)

Status: Verified + Strong inference

What is verified:

- UI shows "Import from UiTM" action.
- Channel updates mention iCress integration, restoration, and performance caching.

Detailed interpretation:

- Weekview fetches/derives timetable data from UiTM systems (specifically iCress in updates), then maps it to the weekly view.

Operational notes from channel:

- iCress integration was restored after an interruption.
- iCress data before course registration may not be final.
- Fetch performance was improved via caching.

Agent guidance:

- Treat iCress-derived schedules as potentially provisional before registration finalization windows.

### 3) Manual course entry

Status: Verified

What it is:

- A direct "Add Manually" path for users who cannot or do not want to import automatically.

Why it matters:

- Fallback path when source systems are unavailable, incomplete, or campus-specific parsing fails.

Likely behavior:

- User inputs course/session day/time details manually and updates timetable rendering.

Confidence:

- Existence of manual flow: High
- Exact fields and validation rules: Unknown

### 4) Manage Courses workspace

Status: Verified label + Strong inference

What is verified:

- "Manage Courses" is visible in navigation.

Likely purpose:

- View, add, edit, remove, or reorganize imported/manual courses.

Potential operations (inferred):

- Deduplication/section switching
- Enabling/disabling classes
- Conflict adjustment

Confidence:

- Entry point exists: High
- Sub-feature set: Medium/Unknown (not publicly visible)

### 5) Customization controls

Status: Verified label + Strong inference

What is verified:

- "Customize" control exists.

Likely scope:

- Visual adjustments and layout preferences for timetable output (theme/style/display choices).

Why it matters:

- Helps students personalize readability and export-ready appearance.

Confidence:

- Feature entry exists: High
- Exact options: Unknown

### 6) Export capability

Status: Verified label + Strong inference

What is verified:

- "Export" control exists.

Likely purpose:

- Generate sharable output (image/PDF/print-like form) of the timetable.

Why it matters:

- Enables sharing with classmates and personal offline reference.

Confidence:

- Export action exists: High
- File formats and quality settings: Unknown

### 7) Paste-based quick import (registration slip)

Status: Verified (official channel post)

What is stated:

- Users can copy course registration slip content and paste into Weekview.
- Claimed import time: under ~20 seconds.

Constraints noted:

- Some campuses may still require manual selections, especially Selangor branch (per post text).

Value:

- Reduces manual setup friction significantly.

### 8) MyStudent import by Student ID

Status: Verified (official channel post)

What is stated:

- Timetable import from MyStudent is supported using only Student ID.

Value:

- Simplified identity-based import flow compared with manual data entry.

Unknowns:

- Whether additional verification (OTP/login) is required is not visible.

### 9) Mobile UX optimization

Status: Verified (official channel post)

What is stated:

- Product improvements focused on mobile experience were made.

Likely impact:

- Better interaction and readability on phones for timetable management.

Unknowns:

- Specific responsive breakpoints/gestures not visible.

### 10) Free access model (paywall removed)

Status: Verified (official channel post)

What is stated:

- Paywall was removed and all features are free.

Agent implication:

- No paid/locked feature assumptions should be encoded unless future updates contradict this.

### 11) Support and feedback loop via Telegram

Status: Verified

What is visible/stated:

- "Telegram" link in app nav.
- Channel requests suggestions and bug reports via DM.

Why it matters:

- Primary community/support channel and release-note source.

## End-to-End User Journeys (Derived)

### Journey A: Fast import and generate timetable

1. Open app.
2. Choose import path (UiTM, MyStudent, or paste registration slip).
3. Resolve any campus-specific/manual selection needs.
4. Review generated weekly timetable.
5. Adjust via Manage Courses / Customize.
6. Export final timetable.

### Journey B: Fully manual setup

1. Open app.
2. Select Add Manually.
3. Enter classes one by one.
4. Validate visual arrangement in weekly grid.
5. Customize appearance.
6. Export/share.

## Functional Constraints and Caveats

- Data freshness caveat: iCress schedules before registration may change.
- Campus variability caveat: some branches can require manual corrections.
- Service reliability caveat: channel history includes temporary outage/recovery updates.

## Non-Functional Signals (Observed)

- Performance optimization is actively handled (caching update mention).
- Product is actively maintained with iterative updates.
- Mobile usability receives explicit development focus.

## Unknowns (Do Not Assume Without Revalidation)

- Authentication and account model
- Data retention/storage policy
- Export formats and fidelity controls
- Conflict detection algorithm details
- Accessibility implementation details
- Browser compatibility guarantees
- Privacy/security policy details

## AI-Agent Ready Facts (Compact)

- Product: Weekview
- URL: https://weekview.my/app/
- Core job: Generate UiTM student timetable quickly
- Inputs: UiTM/iCress, MyStudent (Student ID), paste registration slip, manual entry
- Main actions: Manage Courses, Customize, Export
- Support channel: Telegram (@myweekview)
- Current pricing signal: Fully free (as of channel update referenced in March)
- Important caveat: Pre-registration iCress data may be non-final

## Suggested Monitoring Sources

- App URL: https://weekview.my/app/
- Channel feed: https://t.me/s/myweekview

If this file is used for automation, treat every "Strong inference" section as provisional and periodically re-fetch evidence.
