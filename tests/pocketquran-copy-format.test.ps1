$ErrorActionPreference = "Stop"

$sourcePath = Join-Path $PSScriptRoot "..\js\pocketquran.js"
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
  -Pattern 'normalizePocketQuranCopyNestedQuotes\(text\)[\s\S]*?replace\(/"/g,[\s\S]*?\)[\s\S]*?replace\(/“/g,\s*"‘"\)[\s\S]*?replace\(/”/g,\s*"’"\)' `
  -Message "Pocket Quran copy formatter must convert nested double quotes to single quotes."

Assert-Matches `
  -Haystack $source `
  -Pattern 'const translation = this\.normalizePocketQuranCopyNestedQuotes\([\s\S]*?this\.stripHtmlToText\(rawTranslation \|\| ""\)\.trim\(\),[\s\S]*?\);[\s\S]*?const translatedLine = `"\$\{translation\}" \$\{reference\}`;' `
  -Message "Pocket Quran copied ayah text must normalize nested quotes before adding outer double quotes."

Write-Host "Pocket Quran copy formatting regression tests passed."
