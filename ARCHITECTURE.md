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
- Visual systems: ThemeManager, IconThemeManager, and BackgroundManager. Background visual changes notify ThemeManager so optional background-aware text contrast can refresh. Theme and dynamic icon refreshes are batched per animation frame to avoid redundant style and DOM work during rapid updates.
- Feature managers: PrayerTimes, Qibla, Calendar, Fasting, Weather, LunarPhase, Quotes, Adhkar, Hadith, Flashcards, Notes, Todo, Pinned Apps, Search Bar, and Pocket Quran (recitation, bookmarks, translation search, and caching).

## Layout and mode orchestration

Dashboard modes are mutually exclusive where needed (sidebar mode, Quran focus mode, moment mode). Layout edit mode cooperates with the sidebar and grid layout systems to preserve card placement and mode state.

Recent updates add wake/visibility synchronization that re-asserts sidebar layout state after the tab becomes active and preserves the user preference when viewport constraints temporarily force a collapse, plus Pocket Quran translation search (Quran.com search with cached translation fallback), ayah copy controls (optional Arabic inclusion), Tajweed toggle gating based on font support, and shared font picker modals for Arabic/translation typography across content cards. The Pocket Quran recitation control flow now resolves a validated target ayah from synced popup state or local playback, activates the target surah before play/pause and explicit navigation actions, supports previous/next across surah boundaries when Across Surahs is enabled, and synchronizes optional word highlighting with audio timing through Tajweed-aware Arabic clusters and ayah markers.

Pinned Apps drag-and-drop measures responsive rows and guards container boundaries before persisting order. The header clock reuses one settings snapshot per tick and skips unchanged time and next-prayer DOM writes while keeping the countdown current.

## Accessibility and UI behavior

The FAB menu uses focus-safe visibility handling and custom tooltips to avoid hidden focused controls and to improve keyboard/assistive navigation. Header Quick Controls expose visibility, surface, text color, and glow customization with reset actions. Settings provides visual preview and save-state feedback for configuration changes.

## Data and assets

Static datasets live in data/ (adhkar, hadith, quotes, flashcards, changelog). Visual assets are stored in assets/, icons/, fonts/, and css/. BaseManager resolves relative resource URLs to extension URLs before fetching. PocketQuranCacheManager uses IndexedDB to cache Quran.com JSON and audio assets; search reuses cached JSON when available and falls back to full translation data when direct search yields no hits.
