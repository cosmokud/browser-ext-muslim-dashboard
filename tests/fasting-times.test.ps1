$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\source.ps1")
$sourcePath = Join-Path $PSScriptRoot "..\js\fasting.js"
$source = Get-SourceText -Path $sourcePath

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

# The formatter's output is covered by tests/fasting-card.test.mjs; what is left
# here is the row wiring, which has no behavioural seam without a DOM.
Assert-Matches `
  -Haystack $source `
  -Pattern 'const mondayHijriDate = this\._formatHijriDayMonth\([\s\S]*?monday\.target,[\s\S]*?adjustment,[\s\S]*?\);[\s\S]*?title: "Monday Fast",[\s\S]*?subtitle: "Weekly Sunnah",[\s\S]*?aria: `Monday fast \(\$\{mondayHijriDate\}\): \$\{this\._daysLeftText\(monday\.daysLeft\)\}`,[\s\S]*?badge: mondayHijriDate,' `
  -Message "Monday Fast must show its exact Hijri date."

Assert-Matches `
  -Haystack $source `
  -Pattern 'const thursdayHijriDate = this\._formatHijriDayMonth\([\s\S]*?thursday\.target,[\s\S]*?adjustment,[\s\S]*?\);[\s\S]*?title: "Thursday Fast",[\s\S]*?subtitle: "Weekly Sunnah",[\s\S]*?aria: `Thursday fast \(\$\{thursdayHijriDate\}\): \$\{this\._daysLeftText\(thursday\.daysLeft\)\}`,[\s\S]*?badge: thursdayHijriDate,' `
  -Message "Thursday Fast must show its exact Hijri date."

Write-Host "Fasting Times regression tests passed."
