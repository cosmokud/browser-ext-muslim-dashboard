$ErrorActionPreference = "Stop"

$htmlPath = Join-Path $PSScriptRoot "..\index.html"
$htmlSource = Get-Content -Path $htmlPath -Raw
$settingsPath = Join-Path $PSScriptRoot "..\js\settings.js"
$settingsSource = Get-Content -Path $settingsPath -Raw
$themePath = Join-Path $PSScriptRoot "..\js\themes.js"
$themeSource = Get-Content -Path $themePath -Raw
$stylesPath = Join-Path $PSScriptRoot "..\css\styles.css"
$styleSource = Get-Content -Path $stylesPath -Raw

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

Assert-Matches `
  -Haystack $htmlSource `
  -Pattern 'id="themeComponentOpacityGroup"[\s\S]*?id="themeModalOpacityGroup"[\s\S]*?<label class="setting-label">Modal Opacity</label>[\s\S]*?id="themeModalOpacity"[\s\S]*?value="97"[\s\S]*?id="themeModalOpacityValue"[\s\S]*?>97%</span\s*>' `
  -Message "Themes settings must show Modal Opacity directly below Component Opacity."

Assert-Matches `
  -Haystack $themeSource `
  -Pattern 'this\._modalOpacity = SettingsRegistry\.coerce\(\s*"modalOpacity",\s*themeSettings\.modalOpacity,\s*\);' `
  -Message "Theme manager must load persisted modal opacity with the fresh-install 97% surface default."

Assert-Matches `
  -Haystack $themeSource `
  -Pattern 'modalOpacity:\s*this\._modalOpacity' `
  -Message "Theme manager must persist modal opacity."

Assert-Matches `
  -Haystack $themeSource `
  -Pattern 'getModalOpacity\(\)\s*\{\s*return this\._modalOpacity;\s*\}[\s\S]*?setModalOpacity\(opacityPercent, save = true\)\s*\{[\s\S]*?this\._modalOpacity = SettingsRegistry\.coerce\([\s\S]*?this\.applyTheme\(\);' `
  -Message "Theme manager must expose modal opacity live updates."

Assert-Matches `
  -Haystack $themeSource `
  -Pattern '_applyModalOpacity\(\)\s*\{[\s\S]*?root\.style\.setProperty\("--modal-opacity",\s*String\(this\._modalOpacity\) \+ "%"\);' `
  -Message "Theme manager must expose modal surface alpha variables at the root."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '--modal-opacity:\s*97%;[\s\S]*?--modal-gradient-start-opacity:\s*var\(--modal-opacity\);[\s\S]*?--modal-gradient-end-opacity:\s*min\(100%, calc\(var\(--modal-opacity\) \+ 3%\)\);[\s\S]*?--modal-gradient-start:[\s\S]*?transparent calc\(100% - var\(--modal-gradient-start-opacity\)\)[\s\S]*?--modal-gradient-end:[\s\S]*?transparent calc\(100% - var\(--modal-gradient-end-opacity\)\)[\s\S]*?--modal-surface-bg:[\s\S]*?var\(--modal-surface-base\) var\(--modal-opacity\),[\s\S]*?transparent calc\(100% - var\(--modal-opacity\)\)' `
  -Message "Modal gradient variables must use the configurable modal opacity."

Assert-Matches `
  -Haystack $settingsSource `
  -Pattern 'this\.themeModalOpacity = document\.getElementById\(\s*"themeModalOpacity",?\s*\);[\s\S]*?this\.themeModalOpacityValue = document\.getElementById\(\s*"themeModalOpacityValue",?\s*\);' `
  -Message "Settings manager must bind the modal opacity controls."

Assert-Matches `
  -Haystack $settingsSource `
  -Pattern 'SettingsRegistry\.coerce\(\s*"modalOpacity",[\s\S]*?themeSettings\.modalOpacity,\s*window\.dashboard\?\.themes\?\.getModalOpacity\?\.\(\) \?\? 97[,)][\s\S]*?this\.updateThemeModalOpacityLabel\(\);' `
  -Message "Settings panel must load modal opacity."

Assert-Matches `
  -Haystack $settingsSource `
  -Pattern 'themeSliderDefaults = \{[\s\S]*?modalOpacity:\s*97,[\s\S]*?applyThemeModalOpacity[\s\S]*?setModalOpacity\(opacity, false\)[\s\S]*?if \(this\.themeModalOpacity\)[\s\S]*?scheduleThemeSliderUpdate\("modalOpacity"[\s\S]*?flushThemeSliderUpdate\("modalOpacity"' `
  -Message "Modal opacity slider must live-preview and reset like the component opacity slider."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.blur-settings-popup\s*\{[\s\S]*?background:\s*var\(--modal-surface-bg\);[\s\S]*?\.pq-bookmark-modal-content\s*\{[\s\S]*?background:\s*var\(--modal-surface-bg\);[\s\S]*?\.flashcard-set-modal-content\s*\{[\s\S]*?background:\s*var\(--modal-surface-bg\);[\s\S]*?\.adhkar-set-modal-content\s*\{[\s\S]*?background:\s*var\(--modal-surface-bg\);[\s\S]*?\.adhkar-lang-modal-content\s*\{[\s\S]*?background:\s*var\(--modal-surface-bg\);' `
  -Message "Portal modal panels and blur settings popup must consume modal opacity surface variables."

Assert-Matches `
  -Haystack $settingsSource `
  -Pattern 'modalOpacity:\s*modalOpacity' `
  -Message "Settings manager must persist modal opacity."

if ($themeSource -match 'modal-overlay') {
  throw "Theme manager modal opacity must not modify the modal overlay backdrop."
}

Write-Host "Theme modal opacity regression tests passed."
