## [0.1.2] - 2026-04-04

### Added

- Expanded Notes editor workflow with richer markdown handling, table row/column actions, checklist item toggles, improved selection restoration, and enhanced copy/paste behavior between HTML and markdown.
- Added TipTap-backed NotesManager enhancements, including alignment controls, toolbar improvements, better focus retention, link/image URL prompts, and improved delete confirmations.
- Added fasting/calendar enhancements: fasting markers and tooltips, Ashura and Laylat al-Qadr visibility options, and Ramadan-only marker logic during Ramadan.
- Added Performance Mode to reduce animation and effect cost for smoother operation on lower-end devices.
- Added flashcard editor improvements including default-set notices and a custom-set creation path.
- Added open-source governance documents: Code of Conduct, Contributing guide, and Security policy.
- Added tag-triggered GitHub Actions deploy workflow for automated release creation and artifact upload.

### Changed

- Improved theme system with theme-aware modals/popovers, header surface background options, glass opacity controls, component opacity controls, accent/background/font color controls, and storage normalization for blur-related settings.
- Enhanced favicon import flow in pinned apps/search with better URL normalization and clearer import hints.
- Refined flashcard, fasting, and calendar layouts for better readability and responsiveness.
- Standardized page size to 10 items for Adhkar, Flashcard, and Hadith managers.
- Updated webstore packaging to auto-disable debug mode and emit versioned archives named `muslim-dashboard-v<version>.zip`.

### Fixed

- Fixed multiple notes editor edge cases around caret behavior, selection scrolling, inline code handling, list boundaries, and markdown preview synchronization.
- Fixed translation and data cleanup issues including Indonesian text updates, Arabic diacritic corrections, and romanization formatting fixes.
- Fixed styling and compatibility issues across theme palettes, blur normalization, and card surface rendering.
- Removed deprecated dashboard scale behavior after temporary rollout.
- Reverted unstable liquid glass experiments to keep 0.1.2 stable.

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

### Fixed

- Fixed compact weather CSS selector issues and prayer icon mismatches.
- Fixed service worker and fasting countdown formatting regressions.
- Fixed HTML/JS formatting and interaction inconsistencies in popup and settings flows.

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

### Fixed

- Fixed repeated drag-and-drop, scroll alignment, and viewport persistence edge cases across cards and managers.
- Fixed multiple modal overlay close behaviors and interaction conflicts.
- Fixed styling regressions, icon substitutions, and accessibility issues during rapid UI iteration.
- Fixed data/content quality issues in adhkar, hadith, and localization resources.
- Reverted unstable iterations where needed to preserve working behavior while continuing feature development.
