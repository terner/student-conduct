# Design Notes

## Classrooms Pagination Parity With Students

If `/classrooms` should match `/students`, the page needs the same pagination pattern, not just a generic pager.

Required pieces:

1. Summary and pagination must sit on the same row.
   - Left side: results summary such as `{total} ... {from}–{to}`
   - Right side: rows-per-page label, page-size select, previous button, `page / totalPages`, next button

2. The page must use the same pagination state model as `/students`.
   - `total`
   - `page`
   - `pageSize`
   - `totalPages`
   - `from`
   - `to`
   - reset page when filters, search, or page size change
   - clamp page when it exceeds `totalPages`

3. The layout must follow the students toolbar pattern.
   - `rowsPerPage` label is visible
   - page-size select stays compact
   - previous/next use the same outline small buttons
   - page indicator stays between the two buttons
   - pagination controls stay visible even when there is only one page; in that state they show `1 / 1` and both navigation buttons are disabled

4. Summary copy must live in the `classroom` i18n namespace.
   - add a dedicated key such as `classroom.resultsSummary`
   - do not rely only on a generic pagination string when the students page already has a page-level summary pattern

5. No fallback and no hardcoded UI copy.
   - all labels must come from `messages/th.json` and `messages/en.json`
   - do not add inline Thai or English text in the page component
   - numeric page-size options like `10/20/50/100` are control values, not UI copy

6. Behavior needs a clear decision.
   - If only visual parity is needed, client-side filtered pagination is acceptable for now.
   - If behavior parity is required too, `/classrooms` should eventually use the same server-driven pagination model as `/students`.

Current gap:
- `/classrooms` has pagination controls, but it still uses a generic block pattern.
- `/students` uses a custom summary + pagination toolbar.
- Matching `/students` means replacing the generic pagination presentation with that toolbar pattern.

## Shared Table Standard

Not every table in the app should use the same behavior. The current rule set is:

1. Shared data tables
   - Examples: `/students`, `/teachers`, `/classrooms`, `/score/record`, `/interventions`, `/settings/logs`, `/reports/individual`, `/reports/bond`, `/reports/threshold`
   - Must use:
     - shared pagination toolbar
     - rows-per-page select
     - previous / page / next controls
     - visible pagination controls even for single-page results
     - sortable headers unless the domain order is intentionally fixed
     - shared table helper functions
     - no hardcoded UI copy
     - no fallback literals in cells
   - Current audit status:
     - page-level pagination toolbar pattern is now aligned across `/classrooms`, `/teachers`, `/score/record`, `/score/history`, `/interventions`, `/settings/logs`, `/reports/individual`, `/reports/bond`, and `/reports/threshold`
     - the toolbar sits outside the table card; the card holds the table surface only

2. Fixed-order report/detail tables
   - Examples: `/reports/classroom`, `/reports/statistics`, `/student/dashboard`, student detail dialog
   - May keep fixed order when rank, chronology, or print/export layout is the domain behavior
   - Do not need pagination toolbar unless the page is acting like a browse/list screen

3. Preview/sample/config tables
   - Examples: `/settings/import` sample tables
   - Do not need shared pagination or sorting if they are reference examples rather than operational lists

4. Small admin tables
   - Examples: `/settings/academic-years`, `/settings/teacher-positions`
   - Use shared sort/helper rules where relevant
   - Pagination is optional when row counts stay small and the page is primarily an edit/config surface

## Shared Detail Modal Pattern

Detail views opened from operational list pages should use one modal pattern across the app.

Canonical reference:
- `/students` detail modal
- `/teachers` detail modal

Required behavior:

1. Mobile uses a full-screen sheet.
   - `inset-0 top-0 left-0 h-dvh w-screen`
   - no floating centered card on mobile
   - no rounded outer corners on mobile
   - modal content scrolls inside the sheet, not on the page behind it

2. Desktop uses a centered modal.
   - `top-1/2 left-1/2`
   - `-translate-x-1/2 -translate-y-1/2`
   - constrained width per screen type
   - rounded outer corners on desktop

3. Header, actions, and scroll behavior must be consistent.
   - top header is sticky in structure, visually separated with a border
   - primary identity data belongs in the header:
     - avatar
     - name
     - status
     - short secondary meta such as id, classroom, role, or position
   - desktop actions live in the header action row
   - mobile actions live in a bottom action bar
   - internal content area uses:
     - `overflow-y-auto`
     - `overflow-x-hidden`
     - `overscroll-y-contain`
     - `touch-pan-y`

4. Do not duplicate header data in the body.
   - if name, status, id, classroom, role, or similar summary is already in the header, do not render the same summary block again below
   - body sections should start from the next level of detail

5. Modal close affordance must be explicit.
   - mobile must have:
     - back button
     - visible close button
   - desktop may rely on standard close button, but explicit close remains acceptable
   - closing through overlay / `onOpenChange` is not enough by itself for this app pattern

6. Body layout should feel like an internal tool, not a landing page.
   - use structured sections for detail data
   - avoid oversized hero compositions
   - avoid nested decorative cards when a section block is enough
   - keep high-signal summary metrics in a side panel on desktop when relevant, and stack them naturally on mobile

7. No fallback and no hardcoded copy rules still apply.
   - all visible labels and action text must come from i18n
   - do not introduce inline Thai or English strings while implementing modal shells
