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
- Visual systems: ThemeManager, IconThemeManager, and BackgroundManager. Theme and dynamic icon refreshes are batched per animation frame to avoid redundant style and DOM work during rapid updates, while theme settings split main-grid and modal opacity controls and header surfaces can be applied per item or across whole components. Button styling across FAB menus, recitation controls, and card actions has been refactored to use `color-mix()` theme variables, replacing hardcoded gradients and shadows for consistent dynamic theming. Note background gradients include `--accent-bg` for broader accent participation.
- Feature managers: PrayerTimes, Qibla, Calendar, Fasting, Weather, LunarPhase, Quotes, Adhkar, Hadith, Flashcards, Notes, Todo, Pinned Apps, Search Bar, and Pocket Quran (recitation, bookmarks, translation search, and caching).

## Layout and mode orchestration

Dashboard modes are mutually exclusive where needed (sidebar mode, Quran focus mode, moment mode). Layout edit mode cooperates with the sidebar and grid layout systems to preserve card placement and mode state.

Recent updates add wake/visibility synchronization that re-asserts sidebar layout state after the tab becomes active and preserves the user preference when viewport constraints temporarily force a collapse, plus Pocket Quran translation search (Quran.com search with cached translation fallback), ayah copy controls (optional Arabic inclusion), Tajweed toggle gating based on font support, and shared font picker modals for Arabic/translation typography across content cards. The Pocket Quran recitation control flow now resolves a validated target ayah from synced popup state or local playback, activates the target surah before play/pause and explicit navigation actions, supports previous/next across surah boundaries when Across Surahs is enabled, and synchronizes optional word highlighting with audio timing through Tajweed-aware Arabic clusters, ayah markers, and an adjustable playback delay. The recitation play/pause button also exposes playback state via `aria-pressed` and an active CSS class for accessibility and visual feedback. Quotes now support deterministic cycling or shuffle playlists with previous navigation in shuffle mode, and SearchBarManager can persist custom engine accents or derive them from normalized, cached favicon sampling.

Edit mode is automatically disabled when entering Quran focus context, keeping focus mode and main layout edit-mode state independent. Active grid-draggable elements are hidden by default with opacity/transform transitions, becoming visible only in edit mode for cleaner layout interaction. Sidebar action buttons have refined hover/transition behavior for more responsive controls and standardized hover backgrounds using `--action-btn-bg`.

Pinned Apps drag-and-drop measures responsive rows and guards container boundaries before persisting order. The header clock reuses one settings snapshot per tick and skips unchanged time and next-prayer DOM writes while keeping the countdown current.

## Accessibility and UI behavior

The FAB menu uses focus-safe visibility handling and custom tooltips to avoid hidden focused controls and to improve keyboard/assistive navigation. FAB menu buttons (layout-edit, quran-focus, sticky-note-toggle) use `color-mix()` theme variables with dedicated active, hover, and highlight states when the menu is open. Header Quick Controls expose visibility, surface, whole-component surface, text color, and glow customization with reset actions. Settings provides visual preview and save-state feedback for configuration changes, including modal-only opacity tuning.

Recitation play/pause controls use `aria-pressed` and CSS `active` class to communicate playback state clearly to assistive technologies. Quote-top-actions, card-header-actions, and card-blur-menu buttons have consistent hover styles with themed backgrounds, borders, shadows, and a subtle translateY lift. Focus shadows have been reduced in intensity and the layoutEditPulse animation is disabled for subtler focus feedback.

## Data and assets

Static datasets live in data/ (adhkar, hadith, quotes, flashcards, changelog). Visual assets are stored in assets/, icons/, fonts/, and css/. BaseManager resolves relative resource URLs to extension URLs before fetching. FaviconCacheManager caches pinned-app/search-engine favicons and feeds the dominant-color pipeline used for search-bar accents. PocketQuranCacheManager uses IndexedDB to cache Quran.com JSON and audio assets; search reuses cached JSON when available and falls back to full translation data when direct search yields no hits.
