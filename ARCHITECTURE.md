# Architecture

## Overview

Muslim Dashboard is a Manifest V3 new-tab extension. The new-tab surface (index.html) loads the UI shell and bootstraps the app runtime in js/app.js, which orchestrates feature managers, layout modes, and settings state.

## Runtime surfaces

- New tab UI: index.html loads the dashboard experience and app.js.
- Popup UI: popup.html provides quick controls and status.
- Service worker: js/service-worker.js handles alarms, notifications, and background tasks.
- Offscreen document: offscreen.html + js/pocketquran-offscreen.js provide background audio playback support.

## Core managers and modules

The main app initializes and coordinates the following major modules:

- Storage and settings: StorageManager provides persisted settings and data.
- Layout: GridLayoutManager, sidebar mode, floating mode, and layout edit mode.
- Visual systems: ThemeManager, IconThemeManager, and BackgroundManager.
- Feature managers: PrayerTimes, Qibla, Calendar, Fasting, Weather, LunarPhase, Quotes, Adhkar, Hadith, Flashcards, Notes, Todo, Pinned Apps, Search Bar, and Pocket Quran (recitation, bookmarks, translation search, and caching).

## Layout and mode orchestration

Dashboard modes are mutually exclusive where needed (sidebar mode, Quran focus mode, moment mode). Layout edit mode cooperates with the sidebar and grid layout systems to preserve card placement and mode state.

Version 0.1.9 adds a wake/visibility synchronization pass that re-asserts sidebar layout state after the tab becomes active and preserves the user preference when viewport constraints temporarily force a collapse. The same release adds Pocket Quran translation search (Quran.com search with cached translation fallback) and shared font picker modals for Arabic/translation typography across content cards.

## Accessibility and UI behavior

The FAB menu uses focus-safe visibility handling and custom tooltips to avoid hidden focused controls and to improve keyboard/assistive navigation.

## Data and assets

Static datasets live in data/ (adhkar, hadith, quotes, flashcards, changelog). Visual assets are stored in assets/, icons/, fonts/, and css/. PocketQuranCacheManager uses IndexedDB to cache Quran.com JSON and audio assets; search reuses cached JSON when available and falls back to full translation data when direct search yields no hits.
