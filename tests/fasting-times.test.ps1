$ErrorActionPreference = "Stop"

$sourcePath = Join-Path $PSScriptRoot "..\js\fasting.js"
$source = Get-Content -Path $sourcePath -Raw

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
  -Haystack $source `
  -Pattern '_formatHijriDayMonth\(date,\s*adjustment\)[\s\S]*?this\.hijri\.toHijri\(date,\s*adjustment\)[\s\S]*?return `\$\{hijriDate\.day\} \$\{monthName\}`;' `
  -Message "Fasting Times needs a Hijri day-month formatter for dated fast rows."

Assert-Matches `
  -Haystack $source `
  -Pattern 'const mondayHijriDate = this\._formatHijriDayMonth\([\s\S]*?monday\.target,[\s\S]*?adjustment,[\s\S]*?\);[\s\S]*?title: "Monday Fast",[\s\S]*?subtitle: "Weekly Sunnah",[\s\S]*?aria: `Monday fast \(\$\{mondayHijriDate\}\): \$\{this\._daysLeftText\(monday\.daysLeft\)\}`,[\s\S]*?badge: mondayHijriDate,' `
  -Message "Monday Fast must show its exact Hijri date."

Assert-Matches `
  -Haystack $source `
  -Pattern 'const thursdayHijriDate = this\._formatHijriDayMonth\([\s\S]*?thursday\.target,[\s\S]*?adjustment,[\s\S]*?\);[\s\S]*?title: "Thursday Fast",[\s\S]*?subtitle: "Weekly Sunnah",[\s\S]*?aria: `Thursday fast \(\$\{thursdayHijriDate\}\): \$\{this\._daysLeftText\(thursday\.daysLeft\)\}`,[\s\S]*?badge: thursdayHijriDate,' `
  -Message "Thursday Fast must show its exact Hijri date."

Write-Host "Fasting Times regression tests passed."
