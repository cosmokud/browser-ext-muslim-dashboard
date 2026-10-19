$ErrorActionPreference = "Stop"

$stylesPath = Join-Path $PSScriptRoot "..\css\styles.css"
$styles = Get-Content -Path $stylesPath -Raw

function Assert-Matches {
  param(
    [string] $Haystack,
    [string] $Pattern,
    [string] $Message
  )

  if ($Haystack -notmatch $Pattern) {
    throw $Message
  }
}

$fabSurfacePattern = @'
\.fab-menu\s+:is\(\s*
\s*\.fab-menu-toggle,\s*
\s*\.fab-menu-items\s+button,\s*
\s*\.sticky-note-fab,\s*
\s*\.moment-mode-btn,\s*
\s*\.quran-focus-btn,\s*
\s*\.layout-edit-btn,\s*
\s*\.refresh-bg-btn,\s*
\s*\.settings-btn\s*
\)(?::not\([^)]*\))*\s*\{[^}]*background:\s*var\(--glass-bg\);[^}]*border:\s*1px\s+solid\s+var\(--glass-border\);[^}]*color:\s*var\(--text-primary\);[^}]*box-shadow:\s*var\(--glass-shadow\);
'@

Assert-Matches `
  -Haystack $styles `
  -Pattern $fabSurfacePattern `
  -Message "FAB menu controls must share one theme-aware surface using glass/theme variables."

$fabHoverPattern = @'
\.fab-menu\s+:is\(\s*
\s*\.fab-menu-toggle,\s*
\s*\.fab-menu-items\s+button,\s*
\s*\.sticky-note-fab,\s*
\s*\.moment-mode-btn,\s*
\s*\.quran-focus-btn,\s*
\s*\.layout-edit-btn,\s*
\s*\.refresh-bg-btn,\s*
\s*\.settings-btn\s*
\)(?::not\([^)]*\))*:hover\s*\{[^}]*background:\s*var\(--theme-highlight-bg-hover\);[^}]*color:\s*var\(--on-primary-text\);
'@

Assert-Matches `
  -Haystack $styles `
  -Pattern $fabHoverPattern `
  -Message "FAB menu hover state must use the primary theme hover surface."

$fabGlassDisabledPattern = @'
\[data-glass-enabled="false"\]\s+\.fab-menu\s+:is\(\s*
\s*\.fab-menu-toggle,\s*
\s*\.fab-menu-items\s+button,\s*
\s*\.sticky-note-fab,\s*
\s*\.moment-mode-btn,\s*
\s*\.quran-focus-btn,\s*
\s*\.layout-edit-btn,\s*
\s*\.refresh-bg-btn,\s*
\s*\.settings-btn\s*
\)\s*\{[^}]*backdrop-filter:\s*none;[^}]*-webkit-backdrop-filter:\s*none;
'@

Assert-Matches `
  -Haystack $styles `
  -Pattern $fabGlassDisabledPattern `
  -Message "FAB menu controls must disable blur when dashboard glass is disabled."

$fabFinalHoverPattern = @'
\.fab-menu\.open\s+:is\(\s*
\s*\.fab-menu-toggle,\s*
\s*\.fab-menu-items\s+button,\s*
\s*\.sticky-note-fab,\s*
\s*\.moment-mode-btn,\s*
\s*\.quran-focus-btn,\s*
\s*\.layout-edit-btn,\s*
\s*\.refresh-bg-btn,\s*
\s*\.settings-btn\s*
\):hover\s*\{[^}]*background:\s*var\(--theme-highlight-bg-hover\)\s*!important;[^}]*color:\s*var\(--on-primary-text\)\s*!important;
'@

Assert-Matches `
  -Haystack $styles `
  -Pattern $fabFinalHoverPattern `
  -Message "Open FAB menu buttons must keep primary hover highlights after button-specific hover rules."

$fabInactiveHoverPattern = '\.fab-menu[\s\S]*?:not\(\.active\):not\(\.is-locked\):hover\s*\{[\s\S]*?background:\s*var\(--theme-highlight-bg-hover\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);[\s\S]*?color:\s*var\(--on-primary-text\);'

Assert-Matches `
  -Haystack $styles `
  -Pattern $fabInactiveHoverPattern `
  -Message "Inactive FAB controls, including the closed toggle, must use primary hover highlights."

$fabOpenTogglePattern = @'
\.fab-menu\.open\s+\.fab-menu-toggle\s*\{[^}]*background:\s*var\(--theme-highlight-active-bg\)\s*!important;[^}]*border-color:\s*var\(--theme-highlight-border\)\s*!important;[^}]*color:\s*var\(--on-primary-text\)\s*!important;
'@

Assert-Matches `
  -Haystack $styles `
  -Pattern $fabOpenTogglePattern `
  -Message "Open FAB toggle must use primary theme colors even when not hovered."

$fabSubtleLayoutActivePattern = @'
\.fab-menu\.open\s+:is\(\s*
\s*\.layout-edit-btn\.active,\s*
\s*\.layout-edit-btn\[aria-pressed="true"\]:not\(\.is-locked\)\s*
\)\s*\{[^}]*color-mix\(in srgb, var\(--accent-bg\) 68%, var\(--primary-color\) 32%\)[^}]*box-shadow:\s*[^;]*inset 0 0 0 1px color-mix\(in srgb, var\(--on-primary-text\) 18%, transparent\),\s*0 0 0 2px color-mix\(in srgb, var\(--primary-light\) 24%, transparent\),\s*0 8px 18px color-mix\(in srgb, var\(--primary-dark\) 34%, transparent\)\s*!important;[^}]*animation:\s*none\s*!important;
'@

Assert-Matches `
  -Haystack $styles `
  -Pattern $fabSubtleLayoutActivePattern `
  -Message "Layout Editor active state must use a subtle theme glow while toggled on."

$fabSubtleQuranFocusActivePattern = @'
\.fab-menu\.open\s+:is\(\s*
\s*\.quran-focus-btn\.active,\s*
\s*\.quran-focus-btn\[aria-pressed="true"\]\s*
\)\s*\{[^}]*box-shadow:\s*[^;]*inset 0 0 0 1px color-mix\(in srgb, var\(--on-primary-text\) 18%, transparent\),\s*0 0 0 2px color-mix\(in srgb, var\(--accent-bg\) 24%, transparent\),\s*0 8px 18px color-mix\(in srgb, var\(--primary-dark\) 34%, transparent\)\s*!important;
'@

Assert-Matches `
  -Haystack $styles `
  -Pattern $fabSubtleQuranFocusActivePattern `
  -Message "Quran Focus active state must use a subtle theme glow while toggled on."

$stickyNoteSubtleActivePattern = @'
\.fab-menu\.open\s+:is\(\s*
\s*\.sticky-note-toggle-btn\[aria-pressed="true"\],\s*
\s*\.sticky-note-toggle-btn\[data-sticky-notes-state="visible"\]\s*
\)\s*\{[^}]*box-shadow:\s*[^;]*inset 0 0 0 1px color-mix\(in srgb, var\(--on-primary-text\) 18%, transparent\),\s*0 0 0 2px color-mix\(in srgb, var\(--accent-bg\) 22%, transparent\),\s*0 8px 18px color-mix\(in srgb, var\(--primary-dark\) 34%, transparent\)\s*!important;
'@

Assert-Matches `
  -Haystack $styles `
  -Pattern $stickyNoteSubtleActivePattern `
  -Message "Sticky Notes active state must use a subtle theme glow while toggled on."

Write-Host "FAB menu theme regression tests passed."
