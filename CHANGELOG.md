## [0.1.7] - 2026-04-27

### What is New

- Improved Prayer Times and Pocket Quran translation panel styling with better overflow handling.
- Expanded Pocket Quran fallback translation coverage and refined fallback lookup behavior.
- Improved favicon handling in Pinned Apps and Search with consistent domain-based URL normalization.
- Updated Sticky Notes scrollbar behavior to stay hidden until the note is hovered, focused, or active.

### Bug Fixes

- Fixed overflow clipping issues in prayer and translation list panels at constrained heights.
- Fixed fallback translation retrieval edge cases where available translation text was not selected reliably.
- Fixed favicon refresh reliability by validating URL/template inputs and using a direct favicon fallback when cache refresh misses.
- Fixed Sticky Notes paste behavior to always strip external formatting and insert plain text only.

### Other Improvements

- Refined popup label generation logic for cleaner UI wording.
- Updated extension version references to 0.1.7 across runtime metadata and project documentation.

## [0.1.6] - 2026-04-24

### What is New

- Enhanced sidebar auto-enable logic during window resize events for a smoother user experience.
- Updated README with detailed Pocket Quran features and playback capabilities documentation.

### Bug Fixes

- Fixed sidebar not automatically enabling after window resize when viewport space becomes available.

### Other Improvements

- Renamed internal changelog file from `Changelog.txt` to `changelog.txt` for consistency.
- Updated extension version references to 0.1.6 across runtime metadata and project documentation.

## [0.1.5] - 2026-04-15

### What is New

- You can now click the version text in Settings (`v0.1.5`) to open release notes instantly.
- Added a cleaner in-app Changelog modal so updates are easier to read without leaving the dashboard.

### Bug Fixes

- Fixed an issue where the version label in Settings was not interactive.
- Fixed the release-notes access flow so users no longer need to manually open `CHANGELOG.md`.
- Fixed changelog readability in-app by presenting updates in clearer sections.

### Other Improvements

- Updated extension version references to 0.1.5 across runtime metadata and project documentation.

## [0.1.4] - 2026-04-13

### Added

- Added extension version label (`v0.1.4`) to the main Settings modal header.

### Changed

- Updated project documentation references for release packaging examples to reflect version 0.1.4.
- Updated security policy supported-version table to mark 0.1.4 as current.
- Documented known first-run behavior where sidebar drag-and-drop may require one manual refresh after new installation.

### Bug Fixes

- Fixed Pocket Quran playback command routing when dashboard tabs were open but not actively controlling playback.
- Fixed Pocket Quran previous/next behavior while paused, so ayah selection updates correctly without unintended playback jumps.
- Fixed popup playback continuity by adding an offscreen audio execution path with safer fallback handling.
- Fixed stale dashboard state from overriding newer popup commands by validating interaction timing and pending command timestamps.
- Fixed prayer/location updates saved from the popup not refreshing dashboard prayer cards until a manual reload.
- Fixed drag-and-drop final placement race conditions that could insert cards into the wrong row after delayed drop animations.
- Fixed fasting countdown copy for one day remaining to show "Tonight".

## [0.1.3] - 2026-04-08

### Added

- Added Sticky Notes custom color presets and preview improvements for faster personalization.
- Added sidebar and middle-component resizing in Layout Editor, including reset controls and visual handles.
- Added Pocket Quran focus-mode sizing refinements, fixed positioning behavior, and related focus transitions.
- Added background controls for display mode, shuffle behavior, dim level, blur level, and custom media management.
- Added quote action controls (pause/shuffle) with improved non-repeating shuffle behavior.

### Changed

- Improved grid layout flexibility with updated component span settings and quote card alignment behavior.
- Tuned GridLayoutManager auto-scroll speed and drag response for smoother layout editing.
- Strengthened sidebar state management and floating-card restoration flows, including deferred settings application in Quran Focus mode and stricter non-floating enforcement.
- Expanded settings auto-save and reset behavior for layout and component visibility state.
- Refined floating card controls with custom resize handles and reset affordances.
- Improved notes editor alignment and overflow handling when used with floating cards.
- Enhanced sidebar mode integration and layout persistence during edit mode transitions.
- Hardened release runtime reliability by improving service-worker alarm error reporting and storage quota handling.
- Hardened weather and popup Quran API handling with stricter response validation and cache-based fallback behavior.
- Consolidated default dataset loading paths by introducing shared BaseManager fetch helpers for JSON/text resources.
- Narrowed favicon-related host permission scope from wildcard gstatic subdomains to explicit `www.gstatic.com`.

### Bug Fixes

- Fixed floating cards sometimes re-enabling themselves after geometry saves; your floating ON/OFF preference now stays respected.
- Fixed sidebar resize handles in Layout Editor not always activating because of selector issues.
- Fixed empty grid rows leaving blank vertical gaps after cards were hidden or moved to floating mode.
- Fixed custom uploaded background images breaking when query parameters were appended to data/blob URLs.
- Fixed live weather/layout sync edge cases that could delay card layout updates while resizing.

## [0.1.2] - 2026-04-05

### Added

- Expanded Notes editor workflow with richer markdown handling, table row/column actions, checklist item toggles, improved selection restoration, and enhanced copy/paste behavior between HTML and markdown.
- Added TipTap-backed NotesManager enhancements, including alignment controls, toolbar improvements, better focus retention, link/image URL prompts, and improved delete confirmations.
- Added fasting/calendar enhancements: fasting markers and tooltips, Ashura and Laylat al-Qadr visibility options, and Ramadan-only marker logic during Ramadan.
- Added Performance Mode to reduce animation and effect cost for smoother operation on lower-end devices.
- Added Highest Visual Fidelity quality mode to preserve richer motion/effects while allowing controlled fallbacks.
- Added flashcard editor improvements including default-set notices and a custom-set creation path.
- Added popup tab navigation for Prayer Times and Pocket Quran, including expanded Pocket Quran controls (ayah list/selection, autoplay-next-surah, and loading-state-aware recitation actions).
- Added floating recitation controls with draggable positioning, visibility toggles, appearance options, and optional auto-dock behavior.
- Added Pocket Quran display controls for Tajweed mode, Arabic/translation visibility toggles, and per-script font family/size settings.
- Added location detection actions in settings and reverse-geocoding support to improve weather location naming.
- Added open-source governance documents: Code of Conduct, Contributing guide, and Security policy.
- Added tag-triggered GitHub Actions deploy workflow for automated release creation and artifact upload.

### Changed

- Improved theme system with theme-aware modals/popovers, header surface background options, glass opacity controls, component opacity controls, accent/background/font color controls, and storage normalization for blur-related settings.
- Improved Pocket Quran popup/card rendering with virtualization updates, stronger ayah visibility/scroll behavior, content refresh scroll restoration, and more consistent HTML decoding.
- Refined recitation controls and popup layout across multiple iterations for better readability, responsiveness, and state consistency.
- Enhanced favicon import flow in pinned apps/search with better URL normalization and clearer import hints.
- Refined flashcard, fasting, and calendar layouts for better readability and responsiveness.
- Enhanced settings visibility handling, locked-option labels, and event-listener/performance behavior (passive listeners and debounce usage).
- Improved accessibility and UX polish in key controls, including SVG-based text-size icons and better floating/grid restoration behavior.
- Standardized page size to 10 items for Adhkar, Flashcard, and Hadith managers.
- Updated webstore packaging to auto-disable debug mode and emit versioned archives named `muslim-dashboard-v<version>.zip`.

### Bug Fixes

- Fixed many Notes editor edge cases around caret visibility, selection restore, inline code handling, list boundaries, and markdown preview sync.
- Fixed checklist/list indentation and placeholder behavior in markdown mode to prevent broken list formatting.
- Fixed Pocket Quran Arabic/translation hide-show layouts so text and controls no longer overlap or clip.
- Fixed recitation reliability by removing unstable popup/service-worker global force-sync behavior.
- Fixed translation/content data quality issues (Indonesian wording, Arabic diacritics, and romanization cleanup).
- Fixed theme/readability issues for text contrast, blur opacity normalization, accent handling, and card rendering consistency.
- Removed unstable experiments (dashboard scale and liquid-glass variants) that caused inconsistent behavior.

## [0.1.1] - 2026-03-07

### Added

- Added popup prayer times page with shortcut actions, blur/glass controls, color customization, and popup-specific layout/state handling.
- Added next-prayer countdown support with service-worker badge visibility logic.
- Added BaseManager shared class to centralize common manager logic.
- Added debug date simulation controls for testing date-driven features.
- Added Arabic font selection controls for Adhkar and Flashcards.
- Added Chrome Web Store packaging script and additional local WOFF2 font assets.

### Changed

- Refined Moment Mode layout, visibility, and interaction behavior across multiple iterations, including debug gating for production.
- Improved compact weather presentation and location display options.
- Improved UI accessibility and consistency for buttons, icon usage, and modal interactions.
- Enhanced blur popup positioning/portalling and reset-to-default layout behavior in settings.
- Updated manifest metadata and corrected extension version in manifest from 1.0.0 to 0.1.1.

### Bug Fixes

- Fixed compact weather location text not appearing correctly because of selector mismatches.
- Fixed swapped Duha and Dhuhr icons in prayer lists.
- Fixed fasting countdown and service-worker scheduling regressions caused by malformed function arguments.
- Fixed popup/settings markup inconsistencies that could cause unreliable interactions.
- Fixed release metadata mismatch by correcting the manifest version from 1.0.0 to 0.1.1.

## [0.1.0] - 2026-01-28

### Added

- Initial browser extension foundation with dashboard UI, settings modal, local storage wiring, service worker integration, and packaged assets.
- Prayer times engine with method configuration, offsets, visibility toggles, and notification support.
- Pinned Apps system with add/edit/remove/import, drag-and-drop reordering, responsive layout controls, and favicon handling.
- Calendar support with Hijri/Gregorian options and Islamic-date-oriented display improvements.
- Weather module with current conditions, hourly chart, 7-day forecast, refresh behavior, and responsive card layouts.
- Quote system with default/user quote sources, style variants, pagination, and language controls.
- Todo component and early productivity tooling integration.
- Sticky Notes with draggable/resizable behavior, blur/glass styling, and per-note controls.
- Flashcards feature with multiple datasets, quiz/study behaviors, auto-advance, jump controls, export/import, and set management.
- Notes component with rich editing support, markdown tooling, formatting controls, and synchronization improvements.
- Search bar manager with custom engines, engine reordering, import/export, and accent-color/favicon enhancements.
- Pocket Quran reader with sidebar integration, surah/ayah navigation, virtualization/windowing, bookmarks, and translation selection/search.
- Quran recitation support with reciter selection, ayah playback controls, preload behavior, and auto-scroll options.
- Tajweed mode with color customization, Arabic font options, and Quran-focused readability improvements.
- Adhkar manager with multiple JSON sets, repeat/title/reference metadata, and multilingual title/translation support.
- Hadith card integration with bundled Nawawi 40 content and dataset refresh support.
- Theme system with mode switching, Pure theme customization, custom palettes, accent controls, and glass behavior tuning.
- Icon theme system with dynamic icon rendering, picker UI, and emoji-to-icon migration paths.
- Grid layout management with edit mode, drag-and-drop placement, breakpoint responsiveness, and persisted layout state.
- Sidebar mode for dashboard cards with sticky multi-column behavior and drag/drop compatibility.
- Floating card mode with persistence, collapse controls, insertion logic, and animation refinements.
- Moment Mode with minimalist layout, dedicated styling, and auto-hide exit controls.
- Content search modal spanning quotes, adhkar, hadith, and later todo/notes sources.
- Support/feedback surfaces including Ko-fi section and settings-linked help affordances.
- Additional Islamic datasets and resources: 99 Names sets, adhkar collections, hadith JSON data, and related localization files.

### Changed

- Iteratively improved responsiveness, spacing, and card composition across grid, sidebar, floating, and moment layouts.
- Reworked settings panel structure, tab sizing behavior, and component ordering for usability.
- Improved startup behavior with faster non-blocking UI initialization and async data loading paths.
- Expanded notification flows and messaging for prayers and fasting-related features.

### Bug Fixes

- Fixed dashboard card layout gaps at medium screen widths by forcing key cards to full-width when needed.
- Fixed floating card position drift/jumps by using inline position values as the source of truth during drag/clamp.
- Fixed dropdown layering and click-through issues on blurred surfaces by portalling dropdowns above overlay stacks.
- Fixed Pocket Quran content clipping by reworking shell/content sizing with flex and min-height constraints.
- Fixed moon phase SVG illumination rendering so lit and shadowed portions display correctly.
- Fixed sidebar drag rectangle calculation so dragged items keep correct dimensions and drop behavior.
- Fixed multiple runtime/syntax issues in sticky notes and related UI scripts that caused inconsistent behavior.
- Reverted unstable experiments (dock layouts, bookmark flows, scroll-sync attempts, and moment-mode variants) to keep core flows stable.
