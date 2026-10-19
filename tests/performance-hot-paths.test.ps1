$ErrorActionPreference = "Stop"

$themesPath = Join-Path $PSScriptRoot "..\js\themes.js"
$themes = Get-Content -Path $themesPath -Raw
$iconThemesPath = Join-Path $PSScriptRoot "..\js\iconthemes.js"
$iconThemes = Get-Content -Path $iconThemesPath -Raw
$appPath = Join-Path $PSScriptRoot "..\js\app.js"
$app = Get-Content -Path $appPath -Raw

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
  -Haystack $themes `
  -Pattern 'queueBackgroundAwareFontColorRefresh\(\)[\s\S]*requestAnimationFrame[\s\S]*this\.applyTheme\(\)' `
  -Message "Background-aware font color refreshes must batch theme application per animation frame."

Assert-Matches `
  -Haystack $themes `
  -Pattern 'md:background-visual-change[\s\S]*this\.queueBackgroundAwareFontColorRefresh\(\)' `
  -Message "Background visual changes must use the batched theme refresh queue."

Assert-Matches `
  -Haystack $iconThemes `
  -Pattern '_queueDomIconify\(root\)[\s\S]*this\._pendingDomIconifyRoots\.add\(root\)[\s\S]*requestAnimationFrame[\s\S]*this\.applyDomIconReplacements\(pendingRoot\)' `
  -Message "Dynamic icon replacements must batch added DOM roots per animation frame."

Assert-Matches `
  -Haystack $iconThemes `
  -Pattern 'for \(const n of m\.addedNodes\)[\s\S]*this\._queueDomIconify\(n\)' `
  -Message "The icon observer must enqueue added roots instead of rescanning them immediately."

Assert-Matches `
  -Haystack $app `
  -Pattern 'setCurrentTimeParts\(hoursText, minutesText\)[\s\S]*this\.currentTime\.dataset\.timeText === timeText[\s\S]*return' `
  -Message "Clock rendering must skip unchanged hours and minutes markup."

Assert-Matches `
  -Haystack $app `
  -Pattern 'updateHeaderNextPrayer\(settings = this\.storage\.getSettings\(\)\)' `
  -Message "Next-prayer refresh must accept an existing settings snapshot."

Assert-Matches `
  -Haystack $app `
  -Pattern 'updateTime\(\)[\s\S]*const settings = this\.storage\.getSettings\(\)[\s\S]*this\.updateHeaderNextPrayer\(settings\)' `
  -Message "Clock ticks must reuse their settings snapshot for the next-prayer refresh."

Assert-Matches `
  -Haystack $app `
  -Pattern 'updateHeaderNextPrayer\(settings = this\.storage\.getSettings\(\)\)[\s\S]*this\.headerNextPrayer\.style\.display !== display[\s\S]*this\.headerNextPrayerName\.textContent !== name[\s\S]*this\.headerNextPrayerCountdown\.textContent !== countdown' `
  -Message "Next-prayer rendering must skip unchanged DOM writes."

Write-Host "Performance hot-path regression tests passed."
