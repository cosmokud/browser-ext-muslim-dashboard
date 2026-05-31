# Header Whole Component Surface Design

## Goal

Add a `Whole Component Surface` checkbox under Dashboard Settings > Header >
Header Quick Controls. When enabled, the dashboard header receives one
container-level surface matching other main-grid components.

## Settings UI

Place the checkbox above the existing Header Quick Controls item rows.

Default state: off.

When enabled:

- Keep each existing per-item Surface checkbox value unchanged.
- Disable the five `.header-surface-cell` checkboxes so they cannot be toggled.
- Use the existing disabled toggle styling to gray the controls.

When disabled:

- Restore the five per-item Surface checkboxes to their normal interactive state.
- Continue applying the existing clock-style lock for boxed and pill clock styles.

## Persistence

Store the option as `settings.heading.wholeComponentSurfaceEnabled`.

Add a default value of `false` in storage. Load the value into the settings
checkbox, save it during instant Header Quick Controls previews, and save it
during the full settings save flow.

The new option must not overwrite or clear any saved per-item surface flags.

## Dashboard Rendering

In `applyHeadingSettings()`, toggle a class named
`.header-whole-surface-enabled` on the `.header` element according to
`settings.heading.wholeComponentSurfaceEnabled`.

Register `header` in `ThemeManager.MAIN_GRID_COMPONENT_IDS` so the existing
main-grid component opacity flow writes the same `--glass-bg`,
`--glass-bg-hover`, and `--glass-border` variables used by other components.

Style `.header-whole-surface-enabled` with the shared glass background and
border variables, blur, shadow, card-like radius, and padding.

## Tests

Add a PowerShell regression test covering:

- Checkbox markup and label.
- Storage default.
- Element caching.
- Load, instant-preview save, and full-save persistence.
- Disabled-state logic for all five per-item surface toggles.
- Header class toggling in `applyHeadingSettings()`.
- Theme component registration for `header`.
- CSS for the whole-header surface.

