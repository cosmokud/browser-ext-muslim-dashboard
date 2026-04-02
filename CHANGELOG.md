## [0.1.2] - 2026-04-02

### Changed

- Bumped extension version to 0.1.2.
- Updated flashcard scene styling so the flip surface is no longer driven by the global Component Opacity slider.
- Simplified bundled Google-font definitions to a straightforward local `@font-face` setup for maintainability.

### Fixed

- Replaced inline `onerror` handler strings in favicon markup with CSP-safe event listeners.
- Removed unused legacy pinned-app drag/drop methods that were no longer referenced.
- Cleaned stale wording in background-image metadata comments.

### Compliance

- Rechecked MV3-compatible CSP usage and dynamic markup paths used by extension pages.
- Revalidated packaging guardrails for remote script/style/code loading.
