# Contributing to Muslim Dashboard

Thank you for your interest in contributing.

This guide explains how to propose changes, submit pull requests, and keep
contributions consistent with the project's quality and release process.

## Ways to Contribute

- Report bugs
- Propose and discuss features
- Improve documentation
- Submit code fixes and enhancements
- Improve translations or content data

## Development Setup

1. Fork the repository.
2. Clone your fork locally.
3. Load the extension as unpacked in Chrome or Edge.
4. Make your changes in a feature branch.

Example branch names:

- `feat/add-hadith-filter`
- `fix/prayer-countdown-sync`
- `docs/readme-improvements`

## Local Validation Checklist

Before opening a pull request:

1. Reload the unpacked extension and verify your change in the UI.
2. Verify key flows affected by your change (settings persistence, card interactions, and navigation).
3. Run the packaging script:

```powershell
.\build-webstore.ps1
```

4. Confirm the script creates a versioned archive in `dist/`:
   `muslim-dashboard-v<manifest-version>.zip`
5. Confirm debug mode is disabled in `js/config.js` for release packaging.

## Coding Guidelines

- Keep changes focused and minimal.
- Preserve existing project conventions and naming patterns.
- Avoid unrelated refactors in the same pull request.
- Prefer clear, maintainable code over clever shortcuts.
- Add or update documentation when behavior changes.

## Commit Message Guidelines

Conventional Commit style is recommended:

- `feat: add component visibility presets`
- `fix: prevent stale qibla refresh on location change`
- `docs: update release workflow section`

## Pull Request Guidelines

Each pull request should include:

- A clear summary of what changed and why
- Screenshots or short recordings for UI changes
- Testing notes (what you validated locally)
- Any migration notes or breaking change details

## Issue Reporting

When reporting issues, include:

- Browser and version
- Extension version (from `manifest.json`)
- Steps to reproduce
- Expected result
- Actual result
- Screenshots or console errors when available

## Security Issues

Do not open public issues for sensitive vulnerabilities.

Please follow the process documented in `SECURITY.md`.
