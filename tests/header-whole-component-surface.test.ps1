$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\source.ps1")
$indexPath = Join-Path $PSScriptRoot "..\index.html"
$index = Get-SourceText -Path $indexPath
$settingsPath = Join-Path $PSScriptRoot "..\js\settings.js"
$settings = Get-SourceText -Path $settingsPath
$storagePath = Join-Path $PSScriptRoot "..\js\storage.js"
$storage = Get-SourceText -Path $storagePath
$appPath = Join-Path $PSScriptRoot "..\js\app.js"
$app = Get-SourceText -Path $appPath
$themesPath = Join-Path $PSScriptRoot "..\js\themes.js"
$themes = Get-SourceText -Path $themesPath
$stylesPath = Join-Path $PSScriptRoot "..\css\styles.css"
$styles = Get-SourceText -Path $stylesPath

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
  -Haystack $index `
  -Pattern '<input type="checkbox" id="headerWholeComponentSurfaceEnabled" />[\s\S]*<span>Whole Component Surface</span>' `
  -Message "Header Quick Controls must expose the Whole Component Surface checkbox."

Assert-Matches `
  -Haystack $index `
  -Pattern '<header class="header" id="header">' `
  -Message "Theme component opacity updates need the header component ID."

Assert-Matches `
  -Haystack $storage `
  -Pattern 'wholeComponentSurfaceEnabled:\s*false' `
  -Message "Whole Component Surface must default to disabled."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'this\.headerWholeComponentSurfaceEnabled = document\.getElementById\(\s*"headerWholeComponentSurfaceEnabled",?\s*\);' `
  -Message "Settings manager must cache the Whole Component Surface checkbox."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'this\.headerWholeComponentSurfaceEnabled\.checked =\s*heading\.wholeComponentSurfaceEnabled === true;' `
  -Message "Heading settings must load Whole Component Surface state."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'settings\.heading\.wholeComponentSurfaceEnabled =\s*this\.headerWholeComponentSurfaceEnabled\?\.checked === true;' `
  -Message "Header Quick Controls preview and full save must persist Whole Component Surface state."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'const wholeComponentSurfaceEnabled =\s*this\.headerWholeComponentSurfaceEnabled\?\.checked === true;[\s\S]*control\.disabled = wholeComponentSurfaceEnabled;[\s\S]*control[\s\S]*closest\("\.header-surface-cell"\)[\s\S]*classList\.toggle\(\s*"disabled",\s*wholeComponentSurfaceEnabled' `
  -Message "Whole Component Surface must gray and disable per-item surface toggles without changing their values."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'this\.headerWholeComponentSurfaceEnabled\.addEventListener\("change", \(\) => \{[\s\S]*this\.updateHeaderSurfaceBackgroundsLockState\(\);[\s\S]*this\.applyHeaderQuickControlsInstantly\(\);' `
  -Message "Whole Component Surface changes must update lock state and preview instantly."

Assert-Matches `
  -Haystack $app `
  -Pattern 'const header = document\.querySelector\("\.header"\);[\s\S]*const wholeComponentSurfaceEnabled =\s*headingSettings\.wholeComponentSurfaceEnabled === true;[\s\S]*header\?\.classList\.toggle\(\s*"header-whole-surface-enabled",\s*wholeComponentSurfaceEnabled[\s\S]*toggleHeaderSurface\(\s*this\.greeting,\s*!wholeComponentSurfaceEnabled &&[\s\S]*headingSettings\.greetingBackgroundEnabled === true' `
  -Message "Dashboard must toggle the whole-header surface class from heading settings."

Assert-Matches `
  -Haystack (Get-Content -Path (Join-Path $PSScriptRoot "..\js\weather.js") -Raw) `
  -Pattern 'const compactWeatherBgEnabled =\s*headingSettings\.wholeComponentSurfaceEnabled !== true &&\s*headingSettings\.compactWeatherBackgroundEnabled === true;' `
  -Message "Compact weather refreshes must keep per-item surfaces hidden while Whole Component Surface is enabled."

Assert-Matches `
  -Haystack $themes `
  -Pattern 'MAIN_GRID_COMPONENT_IDS = \[\s*"header",' `
  -Message "Theme component opacity updates must include the header."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.header\.header-whole-surface-enabled\s*\{[\s\S]*background:\s*var\(--glass-bg\);[\s\S]*border:\s*1px solid var\(--glass-border\);[\s\S]*border-radius:\s*var\(--radius-lg\);[\s\S]*backdrop-filter:\s*blur\(calc\(10px \* var\(--ui-blur-multiplier\)\)\);' `
  -Message "Whole Component Surface must style the header with the shared component glass surface."

Write-Host "Header Whole Component Surface regression tests passed."
