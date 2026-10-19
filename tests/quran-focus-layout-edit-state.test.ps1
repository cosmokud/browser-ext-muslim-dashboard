$ErrorActionPreference = "Stop"

$gridLayoutPath = Join-Path $PSScriptRoot "..\js\gridlayout.js"
$source = Get-Content -Path $gridLayoutPath -Raw

function Get-MethodBlock {
  param(
    [string] $Source,
    [string] $Signature
  )

  $start = $Source.IndexOf($Signature)
  if ($start -lt 0) {
    throw "Missing method signature: $Signature"
  }

  $braceStart = $Source.IndexOf("{", $start)
  if ($braceStart -lt 0) {
    throw "Missing method opening brace: $Signature"
  }

  $depth = 0
  for ($i = $braceStart; $i -lt $Source.Length; $i++) {
    $char = $Source[$i]
    if ($char -eq "{") {
      $depth++
    } elseif ($char -eq "}") {
      $depth--
      if ($depth -eq 0) {
        return $Source.Substring($start, $i - $start + 1)
      }
    }
  }

  throw "Missing method closing brace: $Signature"
}

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

$setQuranFocusModeActive = Get-MethodBlock `
  -Source $source `
  -Signature "setQuranFocusModeActive(active)"

$resetFocusEditModePattern = 'if\s*\(\s*this\.isQuranFocusModeContext\s*\)\s*\{[\s\S]*settings\[editModeStorageKey\]\s*=\s*false;[\s\S]*this\.storage\.saveSettings\(settings\);[\s\S]*this\.isEditModeEnabled\s*=\s*false;'

Assert-Matches `
  -Haystack $setQuranFocusModeActive `
  -Pattern $resetFocusEditModePattern `
  -Message "Entering Quran Focus Mode must reset focus edit mode so the shared Layout Editor FAB is not toggled on."

$restoreMainEditModePattern = 'else\s*\{[\s\S]*this\.isEditModeEnabled\s*=\s*settings\[editModeStorageKey\]\s*===\s*true;[\s\S]*\}'

Assert-Matches `
  -Haystack $setQuranFocusModeActive `
  -Pattern $restoreMainEditModePattern `
  -Message "Leaving Quran Focus Mode must still restore the saved main-layout edit mode state."

Write-Host "Quran focus layout edit state regression tests passed."
