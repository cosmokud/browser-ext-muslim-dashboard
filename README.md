# Muslim Dashboard

Muslim Dashboard is a customizable Islamic new-tab dashboard extension for Chromium browsers. It brings prayer and calendar tools, Quran and Hadith reading, study modules, personalization controls, and day-to-day utilities into one focused workspace.

The project targets Chromium-based browsers with Manifest V3.

## Feature Inventory

### Core Islamic tools

- Prayer Times with automatic geolocation and manual city/coordinates entry.
- Multiple prayer calculation methods, including regional presets and a custom-angle mode.
- Asr juristic method selection, high-latitude adjustment modes, and midnight calculation variants.
- Per-prayer minute offsets and configurable prayer visibility.
- Real-time next-prayer countdown in both the dashboard header and prayer card.
- Qibla compass with directional bearing.
- Calendar card with Hijri and Gregorian views, month navigation, and current-date details.
- Fasting card with day progress and date-aware fasting context.
- Lunar phase card with current phase and metadata.

### Quran, Hadith, and Adhkar

- Pocket Quran reader with surah and ayah navigation.
- Quran translation and recitation support.
- Tajweed display mode and Arabic font options for Quran reading.
- Adjustable Arabic and translation font sizes.
- Hadith card with bundled datasets and pagination controls.
- Adhkar card with multiple bundled collections, script/romanization toggle, repeat metadata, and auto-advance controls.

### Learning and productivity modules

- Flashcards with bundled datasets (including 99 Names) and custom-set workflows.
- Flashcard study controls: flip, jump-to-index, autoplay, quiz/study behavior, and Arabic font scaling.
- CSV import/export for custom flashcard sets.
- To-Do list with create/read/update/delete, filters, pagination, and clear-completed actions.
- Notes module with rich-text editing, markdown-oriented workflows, list and checklist support, table actions, link/image insertion, and undo/redo.
- Sticky notes support for lightweight freeform note capture.

### Personalization and layout

- Dynamic backgrounds with category and rotation configuration.
- Theme system with palette controls, glass/blur tuning, component opacity, and color customization.
- Icon theme system for dashboard icon styling.
- Card-level blur/glass controls for selected modules.
- Multiple dashboard modes: grid layout, sidebar mode, floating cards, moment mode, and Quran focus mode.
- Drag-and-drop layout editing with persisted card placement.
- Performance mode to reduce animation/effect cost on lower-end hardware.

### Navigation and discovery

- Pinned Apps strip with add/edit/remove, favicon handling, and reorder support.
- Search Bar with configurable engines and custom engine management.
- Unified content search across quotes, adhkar, hadith, notes, and todo content.

### Extension platform features

- Dedicated popup page focused on prayer times.
- Service worker integration for extension background tasks and prayer-related notifications.
- Local persistent settings and user data storage.
- Localized data bundles in JSON/CSV for quotes, adhkar, flashcards, and hadith content.

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

Example: `muslim-dashboard-v0.1.2.zip`

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

## Governance and Community Files

- Code of Conduct: `CODE_OF_CONDUCT.md`
- Contributing Guide: `CONTRIBUTING.md`
- Security Policy: `SECURITY.md`
- License: `LICENSE` (MIT)

## Changelog

Release history and notable updates are documented in `CHANGELOG.md`.
