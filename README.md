# Muslim Dashboard

[![Chrome Web Store](https://developer.chrome.com/static/docs/webstore/branding/image/tbyBjqi7Zu733AAKA5n4.png)](https://chromewebstore.google.com/detail/muslim-dashboard-islamic/mdhjkocbmiiekkfeghjnmbbaipdcmijg)

Muslim Dashboard is a customizable Islamic new-tab dashboard extension for Chromium browsers. It brings prayer and calendar tools, Quran and Hadith reading, study modules, personalization controls, and day-to-day utilities into one focused workspace, including a Pocket Quran player that can continue playback across tabs.

The project targets Chromium-based browsers with Manifest V3.

## Feature Inventory

### Core Islamic tools

- Prayer Times with automatic geolocation and manual city/coordinates entry.
- Multiple prayer calculation methods, including regional presets and a custom-angle mode.
- Asr juristic method selection, high-latitude adjustment modes, and midnight calculation variants.
- Per-prayer minute offsets and configurable prayer visibility.
- Prayer notifications with per-prayer before/after reminders and minute tuning.
- Real-time next-prayer countdown in both the dashboard header and prayer card, with optional browser action badge timer.
- Qibla compass with directional bearing.
- Calendar card with Hijri and Gregorian views, month navigation, and current-date details.
- Fasting card with day progress and date-aware fasting context.
- Forbidden-day aware fasting countdowns that skip prohibited fast dates (Eid and Tashreeq).
- Monday and Thursday fasting countdowns include their upcoming Hijri dates.
- Fasting notifications with configurable Suhur lead-time and per-fast toggles (including Monday/Thursday, Ayyam al-Beed, Ashura, Arafah, Ramadan, and Dhu al-Hijjah windows).
- Lunar phase card with current phase and metadata.

### Quran, Hadith, and Adhkar

- Pocket Quran reader with surah and ayah navigation, bookmarks, and audio playback that can continue across tabs.
- Recitation controls support previous/next across surahs when Across Surahs (autoplay next surah) is enabled, with synced targets between dashboard and popup playback.
- Recitation playback can highlight synchronized words with Tajweed-aware Arabic clustering, ayah markers, a per-reciter toggle, and an adjustable timing delay.
- Pocket Quran translation search with highlighted matches, pagination, and jump-to-ayah results, plus adjustable Arabic and translation sizes in the search modal.
- Ayah copy controls with optional Arabic inclusion, plus copy actions inside search results.
- Quran translation and recitation support.
- Tajweed display mode and Arabic/translation font options for Quran reading (card and popup).
- Tajweed toggle availability adapts to the selected Arabic font.
- Recitation play/pause button uses `aria-pressed` and an `active` class to convey playback state to assistive technology.
- Translation font pickers for the Pocket Quran card and popup.
- Adjustable Arabic and translation font sizes.
- Virtualized Quran scrolling now preserves position more reliably during refreshes.
- Hadith card with bundled datasets and pagination controls.
- Adhkar card with multiple bundled collections, script/romanization toggle, repeat metadata, and auto-advance controls.

### Learning and productivity modules

- Flashcards with bundled datasets (including 99 Names) and custom-set workflows.
- Flashcard study controls: flip, jump-to-index, autoplay, quiz/study behavior, and Arabic font scaling.
- CSV import/export for custom flashcard sets.
- Quotes module with deterministic cycling or shuffle playlists, previous/next navigation, and typography controls.
- To-Do list with create/read/update/delete, filters, pagination, and clear-completed actions.
- Notes module with rich-text editing, markdown-oriented workflows, list and checklist support, table actions, link/image insertion, and undo/redo.
- Sticky notes support for lightweight freeform note capture.

### Personalization and layout

- Dynamic backgrounds with category and rotation configuration.
- Theme system with palette controls, glass/blur tuning, main-grid and modal opacity control, and color customization.
- Header Quick Controls include per-item visibility, surface, whole-component surface, text color, glow color, and reset controls.
- Settings visual preview and save-state feedback help validate theme changes more clearly.
- Content typography settings now include Arabic and translation font pickers for Quotes, Flashcards, Hadith, and Adhkar, with preview samples.
- Icon theme system for dashboard icon styling.
- Card-level blur/glass controls for selected modules.
- Multiple dashboard modes: grid layout, sidebar mode, floating cards, moment mode, and Quran focus mode.
- Drag-and-drop layout editing with persisted card placement; edit mode is automatically disabled in Quran focus context to keep state separate.
- Active grid-draggable elements are hidden by default with smooth transitions when not in edit mode.
- Pinned Apps reordering includes row-aware placement and boundary guards for responsive layouts.
- Sidebar mode auto-recovers on wake/visibility changes and preserves user preference across viewport changes.
- Performance mode to reduce animation/effect cost on lower-end hardware.

### Navigation and discovery

- Pinned Apps strip with add/edit/remove, cached favicon handling, and reorder support.
- Search Bar with configurable engines, custom engine management, and favicon-derived accent colors.
- Unified content search across quotes, adhkar, hadith, notes, and todo content.

### Accessibility and UX

- FAB quick menu uses focus-safe visibility handling and custom tooltips.
- Recitation play/pause controls expose playback state via `aria-pressed` and CSS state classes.

### Extension platform features

- Dedicated popup tabs for Prayer Times and Pocket Quran, with Pocket Quran playback that can continue across tabs in Chromium Browsers.
- Service worker integration for extension background tasks, prayer reminders, fasting reminders, and badge countdown updates.
- Local persistent settings and user data storage.
- Localized data bundles in JSON/CSV for quotes, adhkar, flashcards, and hadith content.

### Data management and controls

- Full backup/export and restore/import for settings and user data.
- Module-level import/export for supported features (Quotes, Flashcards, Adhkar, Hadith, Notes, Search Engines, and Pocket Quran bookmarks).
- Reset controls for grid layout, full settings reset, and full data wipe.

## Known Issue

- On first run/new installation, drag-and-drop into sidebar columns may require one manual page refresh before it starts working.

## Installation (Unpacked)

### Google Chrome

1. Clone this repository.
2. Open `chrome://extensions/`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the repository root folder.

### Microsoft Edge

1. Clone this repository.
2. Open `edge://extensions/`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the repository root folder.

## Build and Package for Web Store

Use the PowerShell packaging script rather than manually zipping the repository.

### Command

```powershell
.\build-webstore.ps1
```

### What the script does

1. Reads `manifest.json` to determine the extension version.
2. Ensures `js/config.js` contains a debug assignment and automatically forces `globalThis.ENABLE_DEBUG_MODE = false;` for release packaging.
3. Creates a clean `dist/chrome-webstore/` package directory.
4. Copies only runtime files and runtime directories needed by the extension.
5. Runs safety checks to detect remote script/style/font/code-import references inside packaged assets.
6. Produces a versioned archive in `dist/` named:

```text
muslim-dashboard-v<manifest-version>.zip
```

Example: `muslim-dashboard-v0.1.12.zip`

### Build output

- `dist/chrome-webstore/` (staged package contents)
- `dist/muslim-dashboard-v<manifest-version>.zip` (upload-ready archive)

## Repository Structure

```text
.
|- manifest.json
|- index.html
|- popup.html
|- build-webstore.ps1
|- js/
|- css/
|- data/
|- assets/
|- fonts/
|- icons/
|- dist/
```

## Data and External Services

- Weather data: Open-Meteo APIs.
- Geocoding: OpenStreetMap Nominatim and Open-Meteo geocoding.
- Quran APIs/recitation sources are accessed via host permissions declared in `manifest.json`.
- Pocket Quran search uses Quran.com search and translation endpoints, with cached translation fallback.

## Permissions Rationale

- `storage`: Persist dashboard settings, layout state, notes, and content preferences.
- `geolocation`: Resolve prayer-time and weather location when automatic location mode is enabled.
- `alarms`: Schedule prayer, fasting, and badge refresh background tasks.
- `notifications`: Display prayer and fasting notifications.
- `https://api.quran.com/*`: Fetch Quran chapters, verses, reciters, and translation metadata.
- `https://download.quranicaudio.com/*` and `https://verses.quran.com/*`: Fetch Quran recitation audio sources.
- `https://api.open-meteo.com/*` and `https://geocoding-api.open-meteo.com/*`: Fetch weather and geocoding data.
- `https://nominatim.openstreetmap.org/*`: Reverse geocode user location names.
- `https://www.google.com/s2/*` and `https://www.gstatic.com/*`: Resolve fallback favicons for custom search/pinned app entries.

## Governance and Community Files

- Code of Conduct: `CODE_OF_CONDUCT.md`
- Contributing Guide: `CONTRIBUTING.md`
- Architecture: `ARCHITECTURE.md`
- Security Policy: `SECURITY.md`
- License: `LICENSE` (MIT)

## Changelog

Release history and notable updates are documented in `CHANGELOG.md`.
