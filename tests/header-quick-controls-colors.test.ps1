$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\source.ps1")
$indexPath = Join-Path $PSScriptRoot "..\index.html"
$index = Get-SourceText -Path $indexPath
$settingsPath = Join-Path $PSScriptRoot "..\js\settings.js"
$settings = Get-SourceText -Path $settingsPath
$appPath = Join-Path $PSScriptRoot "..\js\app.js"
$app = Get-SourceText -Path $appPath
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
  -Pattern '<span class="header-control-cell center">Show</span>[\s\S]*<span class="header-control-cell center">Surface</span>[\s\S]*<span class="header-control-cell center">Text</span>[\s\S]*<span class="header-control-cell center">Glow</span>' `
  -Message "Header Quick Controls must expose Show, Surface, Text, and Glow columns."

Assert-Matches `
  -Haystack $index `
  -Pattern '<button(?=[^>]*class="header-color-reset-btn")[\s\S]*class="lucide lucide-rotate-ccw-icon lucide-rotate-ccw"[\s\S]*<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>' `
  -Message "Header color reset buttons must use the Lucide rotate-ccw SVG icon."

foreach ($id in @(
  "headerGreetingTextColor",
  "headerTimeTextColor",
  "headerDateTextColor",
  "headerCompactWeatherTextColor",
  "headerNextPrayerTextColor"
)) {
  Assert-Matches `
    -Haystack $index `
    -Pattern "id=`"$id`"[\s\S]*class=`"header-text-color`"" `
    -Message "Missing Header Quick Controls text color picker: $id"
}

foreach ($id in @(
  "headerGreetingTextColorReset",
  "headerTimeTextColorReset",
  "headerDateTextColorReset",
  "headerCompactWeatherTextColorReset",
  "headerNextPrayerTextColorReset",
  "headerGreetingGlowColorReset",
  "headerTimeGlowColorReset",
  "headerDateGlowColorReset",
  "headerCompactWeatherGlowColorReset",
  "headerNextPrayerGlowColorReset"
)) {
  Assert-Matches `
    -Haystack $index `
    -Pattern "(?s)<button(?=[^>]*class=`"header-color-reset-btn`")[^>]*id=`"$id`"[^>]*>" `
    -Message "Missing Header Quick Controls reset button: $id"
}

Assert-Matches `
  -Haystack $settings `
  -Pattern 'getHeaderTextColorControlConfigs\(\)[\s\S]*settingKey: "greetingTextColor"[\s\S]*settingKey: "compactWeatherTextColor"' `
  -Message "Settings manager must define header text color controls and storage keys."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'resetHeaderColorControlToTheme\(config\)[\s\S]*input\.dataset\.themeDefault = "true";[\s\S]*this\.applyHeaderQuickControlsInstantly\(\);' `
  -Message "Header color reset must mark the control as theme-aware and preview immediately."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'refreshThemeDefaultHeaderTextColorControls\(\)[\s\S]*getHeaderTextColorControlConfigs\(\)\.forEach[\s\S]*input\.dataset\.themeDefault !== "true"[\s\S]*loadHeaderColorControlValue\(config, ""\)' `
  -Message "Theme-aware Header Quick Controls text colors must refresh from the active theme."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'document\.addEventListener\("md:theme-change", \(\) => \{[\s\S]*this\.refreshThemeDefaultHeaderTextColorControls\(\);[\s\S]*\}\);' `
  -Message "Header Quick Controls text colors must refresh after theme and mode changes."

Assert-Matches `
  -Haystack $settings `
  -Pattern 'settings\.heading\.greetingTextColor = this\.getHeaderColorControlSaveValue\([\s\S]*this\.headerGreetingTextColor' `
  -Message "Header text colors must save empty when theme-aware and hex when customized."

Assert-Matches `
  -Haystack $app `
  -Pattern 'applyHeaderTextColor\(targets, preferredColor\)[\s\S]*target\.style\.removeProperty\("color"\)[\s\S]*target\.style\.color = normalized;' `
  -Message "Dashboard must apply or clear custom header text colors."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.header-control-row\s*\{[\s\S]*minmax\(176px, max-content\)[\s\S]*\.header-color-reset-btn\s*\{[\s\S]*width:\s*18px;[\s\S]*height:\s*18px;[\s\S]*border:\s*1px solid var\(--glass-border\);[\s\S]*\.header-color-reset-btn svg\s*\{[\s\S]*width:\s*11px;' `
  -Message "Header color columns need compact layout and 70% height reset buttons."

Write-Host "Header Quick Controls color regression tests passed."
