$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\source.ps1")
$settingsPath = Join-Path $PSScriptRoot "..\js\settings.js"
$settingsSource = Get-SourceText -Path $settingsPath
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
  -Haystack $settingsSource `
  -Pattern 'saveSettings\(options = \{\}\) \{[\s\S]*?const settings = this\.storage\.getSettings\(\);\s*const previousSettings = this\.cloneSettingsSnapshot\(settings\);[\s\S]*?isOnlyPocketQuranHighlighterDelayChanged\(\s*previousSettings,\s*settings,' `
  -Message "Manual Save must snapshot previous settings before mutation so save completion can close the modal."

Assert-Matches `
  -Haystack $settingsSource `
  -Pattern 'if \(closeModal\) \{[\s\S]*?this\.showSaveButtonSavedState\(\);[\s\S]*?setTimeout\(\(\) => this\.closeModal\(\), 420\)' `
  -Message "Manual Save must show a saved indicator before closing the settings modal."

Assert-Matches `
  -Haystack $settingsSource `
  -Pattern 'isVisualPreviewSettingsTab\(tabName\)[\s\S]*?\["background", "heading", "themes"\]\.includes\(tabName\)' `
  -Message "Settings visual preview mode must be limited to dashboard visual tabs."

Assert-Matches `
  -Haystack $settingsSource `
  -Pattern 'updateSettingsVisualPreviewMode\(tabName\)[\s\S]*?this\.modal\.classList\.toggle\("settings-visual-preview", enabled\)' `
  -Message "Settings modal must toggle visual preview mode on visual tabs."

Assert-Matches `
  -Haystack $settingsSource `
  -Pattern 'switchTab\(tabName\)[\s\S]*?this\.updateSettingsVisualPreviewMode\(tabName\);' `
  -Message "Switching settings tabs must refresh visual preview backdrop mode."

Assert-Matches `
  -Haystack $styles `
  -Pattern '#settingsModal\.modal-overlay\.settings-visual-preview\s*\{[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*0\.18\);[^}]*backdrop-filter:\s*blur\(0\);[^}]*-webkit-backdrop-filter:\s*blur\(0\);' `
  -Message "Visual settings preview must cheaply unblur and lighten the settings backdrop."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.save-btn\.is-saved\s*\{[^}]*background:\s*linear-gradient\([^}]*var\(--accent-bg\)[^}]*var\(--primary-light\)' `
  -Message "Save button must have a visible saved state."

Write-Host "Settings save and visual preview regression tests passed."
