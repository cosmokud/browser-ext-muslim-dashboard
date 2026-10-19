$ErrorActionPreference = "Stop"

$indexPath = Join-Path $PSScriptRoot "..\index.html"
$index = Get-Content -Path $indexPath -Raw
$storagePath = Join-Path $PSScriptRoot "..\js\storage.js"
$storage = Get-Content -Path $storagePath -Raw
$settingsPath = Join-Path $PSScriptRoot "..\js\settings.js"
$settings = Get-Content -Path $settingsPath -Raw
$themesPath = Join-Path $PSScriptRoot "..\js\themes.js"
$themes = Get-Content -Path $themesPath -Raw
$backgroundsPath = Join-Path $PSScriptRoot "..\js\backgrounds.js"
$backgrounds = Get-Content -Path $backgroundsPath -Raw

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

function Assert-NotMatches {
  param(
    [string] $Haystack,
    [string] $Pattern,
    [string] $Message
  )

  if ($Haystack -match $Pattern) {
    throw $Message
  }
}

Assert-NotMatches `
  -Haystack $index `
  -Pattern 'theme-background-aware-toggle|themeBackgroundAwareFontColorEnabled|Background Aware Font Color' `
  -Message "Themes panel must not expose Background Aware Font Color in the settings menu."

Assert-Matches `
  -Haystack $storage `
  -Pattern 'backgroundAwareFontColorEnabled:\s*false' `
  -Message "Default theme settings must store backgroundAwareFontColorEnabled."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'this\.themeBackgroundAwareFontColorEnabled = document\.getElementById\([\s\S]*"themeBackgroundAwareFontColorEnabled"[\s\S]*\)' `
  -Message "Settings manager must bind the background-aware font color checkbox."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'this\.themeBackgroundAwareFontColorEnabled\.checked =\s*themeSettings\.backgroundAwareFontColorEnabled === true' `
  -Message "Settings manager must load the background-aware font color checkbox state."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'backgroundAwareFontColorEnabled:\s*backgroundAwareFontColorEnabled' `
  -Message "Settings manager must save backgroundAwareFontColorEnabled."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'const backgroundAwareFontColorEnabled =\s*this\.themeBackgroundAwareFontColorEnabled\?\.checked === true;' `
  -Message "Missing Background Aware Font Color checkbox must save the same value as unchecked."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'setBackgroundAwareFontColorEnabled\([\s\S]*enabled,[\s\S]*false[\s\S]*\)' `
  -Message "Settings manager must apply background-aware font color changes immediately."

Assert-Matches `
  -Haystack $themes `
  -Pattern '_backgroundAwareFontColorEnabled = false' `
  -Message "Theme manager must track background-aware font color state."

Assert-Matches `
  -Haystack $themes `
  -Pattern 'setBackgroundAwareFontColorEnabled\(enabled, save = true\)[\s\S]*this\._backgroundAwareFontColorEnabled = enabled === true[\s\S]*this\.applyTheme\(\)' `
  -Message "Theme manager must expose an immediate background-aware font color setter."

Assert-Matches `
  -Haystack $themes `
  -Pattern 'resolveBackgroundAwareTextColors\(colors\)[\s\S]*calculateApcaContrast[\s\S]*calculateWcagContrastRatio[\s\S]*estimateEffectiveTextBackgroundColor' `
  -Message "Theme manager must choose text colors with APCA, WCAG, and effective background estimation."

Assert-Matches `
  -Haystack $themes `
  -Pattern 'clampNumber\(value, min, max, fallback\)[\s\S]*Number\.isFinite' `
  -Message "Background-aware theme changes must not call a missing clampNumber helper."

Assert-Matches `
  -Haystack $themes `
  -Pattern 'setupBackgroundAwareFontColorListeners\(\)[\s\S]*md:background-visual-change[\s\S]*this\.applyTheme\(\)' `
  -Message "Theme manager must refresh text colors when background visuals change."

Assert-Matches `
  -Haystack $backgrounds `
  -Pattern 'md:background-visual-change' `
  -Message "Background manager must notify theme code when background image, dim, or blur changes."

Write-Host "Background-aware font color regression tests passed."
