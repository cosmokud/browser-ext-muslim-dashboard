$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\source.ps1")
$themePath = Join-Path $PSScriptRoot "..\js\themes.js"
$themeSource = Get-SourceText -Path $themePath
$tokensPath = Join-Path $PSScriptRoot "..\js\theme-tokens.js"
$tokensSource = Get-SourceText -Path $tokensPath
$stylesPath = Join-Path $PSScriptRoot "..\css\styles.css"
$styleSource = Get-SourceText -Path $stylesPath

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
  -Haystack $themeSource `
  -Pattern 'const sidebarContainers = \[[\s\S]*?document\.getElementById\("sidebarLeft"\),[\s\S]*?document\.getElementById\("sidebarRight"\),[\s\S]*?\]\.filter\(Boolean\);' `
  -Message "Component opacity live updates must discover both sidebar containers."

Assert-Matches `
  -Haystack $themeSource `
  -Pattern 'const isInSidebar = sidebarContainers\.some\(\(container\) =>[\s\S]*?container\.contains\(component\),[\s\S]*?\);[\s\S]*?if \(!isInMainLayout && !isInSidebar && !isFloating\) return;' `
  -Message "Component opacity live updates must apply to components currently placed in sidebars."

Assert-Matches `
  -Haystack $tokensSource `
  -Pattern 'extractRgbChannels\(value\)\s*\{[\s\S]*?const normalizedHex = ThemeTokens\.normalizeHexColor\(value\);[\s\S]*?parseInt\(normalizedHex\.slice\(1,\s*3\),\s*16\)' `
  -Message "Component opacity alpha conversion must support hex theme palette colors."

Assert-Matches `
  -Haystack $themeSource `
  -Pattern 'component\.style\.setProperty\("--theme-highlight-bg-hover",\s*highlightHoverBg\);[\s\S]*?component\.style\.setProperty\("--theme-highlight-active-bg",\s*highlightActiveBg\);[\s\S]*?component\.style\.setProperty\("--theme-highlight-border",\s*highlightBorder\);[\s\S]*?component\.style\.setProperty\("--theme-highlight-light-bg",\s*highlightLightBg\);' `
  -Message "Component opacity must apply to primary highlight variables on each component."

Assert-Matches `
  -Haystack $themeSource `
  -Pattern 'component\.style\.removeProperty\("--theme-highlight-bg-hover"\);[\s\S]*?component\.style\.removeProperty\("--theme-highlight-active-bg"\);[\s\S]*?component\.style\.removeProperty\("--theme-highlight-border"\);[\s\S]*?component\.style\.removeProperty\("--theme-highlight-light-bg"\);' `
  -Message "Disabling glass must remove component-scoped primary highlight opacity overrides."

Assert-Matches `
  -Haystack $themeSource `
  -Pattern 'root\.style\.setProperty\("--component-highlight-bg-hover",\s*highlightHoverBg\);[\s\S]*?root\.style\.setProperty\("--component-highlight-active-bg",\s*highlightActiveBg\);[\s\S]*?root\.style\.setProperty\("--component-highlight-border",\s*highlightBorder\);[\s\S]*?root\.style\.setProperty\("--component-highlight-shadow",\s*highlightShadow\);' `
  -Message "Component opacity must expose opacity-aware highlight variables for portaled modal content."

Assert-Matches `
  -Haystack $themeSource `
  -Pattern 'root\.style\.removeProperty\("--component-highlight-bg-hover"\);[\s\S]*?root\.style\.removeProperty\("--component-highlight-active-bg"\);[\s\S]*?root\.style\.removeProperty\("--component-highlight-border"\);[\s\S]*?root\.style\.removeProperty\("--component-highlight-shadow"\);' `
  -Message "Disabling glass must remove portaled modal component highlight opacity overrides."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.next-prayer\s*\{[\s\S]*?background:\s*var\(--theme-highlight-active-bg\);' `
  -Message "Next prayer must use the opacity-aware primary highlight background."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.notes-toolbar\.ql-toolbar\.ql-snow\s*\{[\s\S]*?border:\s*1px solid var\(--theme-highlight-border\);[\s\S]*?background:\s*var\(--theme-highlight-active-bg\);' `
  -Message "Notes toolbar must use opacity-aware primary highlight variables."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.weather-forecast-day\.selected\s*\{[\s\S]*?border-color:\s*var\(--theme-highlight-border\);[\s\S]*?background:\s*var\(--theme-highlight-active-bg\);' `
  -Message "Selected weather forecast day must use opacity-aware primary highlight variables."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '#pocketQuranSurahList,\s*#pocketQuranAyahList\s*\{[^}]*?background:\s*var\(--component-highlight-active-bg\);' `
  -Message "Portaled Pocket Quran dropdown lists must use the root-level component opacity highlight background."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.pocket-quran-surah-item:hover,\s*\.pocket-quran-ayah-option:hover\s*\{[\s\S]*?background:\s*var\(--theme-highlight-light-bg\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);' `
  -Message "Pocket Quran dropdown item hover must use opacity-aware lighter primary highlight variables."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '#pocketQuranTajweedToggle\[aria-pressed="true"\] \.pq-tajweed-toggle-icon\s*\{[\s\S]*?var\(--theme-highlight-light-bg\)' `
  -Message "Pocket Quran pressed icon glow must use the opacity-aware lighter primary highlight variable."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.pq-ayah-play-btn\.playing\s*\{[\s\S]*?background:\s*linear-gradient\([^}]*?var\(--primary-dark\)[^}]*?var\(--primary-color\)' `
  -Message "Active Pocket Quran ayah play button must use stable theme palette colors so it remains visible at zero component opacity."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '@keyframes pqPulse\s*\{[\s\S]*?var\(--primary-light\)' `
  -Message "Pocket Quran active pulse glow must use stable theme palette colors so it remains visible at zero component opacity."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.todo-input:focus\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);' `
  -Message "Todo input focus must use opacity-aware primary highlight variables."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.notes-list-item\.active\s*\{[^}]*?background:\s*var\(--theme-highlight-active-bg\);' `
  -Message "Notes list active state must use opacity-aware primary highlight variables."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.notes-title-input:focus\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);' `
  -Message "Notes title focus must use opacity-aware primary highlight variables."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.prayer-item\.active\s*\{[^}]*?background:\s*var\(--theme-highlight-active-bg\);' `
  -Message "Prayer active state must use opacity-aware primary highlight variables."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.flashcard-nav:hover\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);' `
  -Message "Flashcard and adhkar nav hover must use opacity-aware primary highlight variables."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.calendar-nav-btn:hover\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);' `
  -Message "Calendar nav hover must use opacity-aware primary highlight variables."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.pocket-quran-size-step-btn:hover\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);[^}]*?border-color:\s*var\(--theme-highlight-border\);' `
  -Message "Pocket Quran size step hover must use opacity-aware primary highlight variables."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.pocket-quran-size-step-btn:focus-visible\s*\{[^}]*?outline:\s*2px solid var\(--theme-highlight-border\);[^}]*?background:\s*var\(--theme-highlight-bg-hover\);' `
  -Message "Pocket Quran size step focus must use opacity-aware primary highlight variables."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.flashcard-auto-toggle-btn\s*\{[^}]*?background:\s*var\(--theme-highlight-active-bg\);' `
  -Message "Flashcard, adhkar, and hadith auto toggle buttons must use opacity-aware primary backgrounds."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.flashcard-auto-toggle-btn:hover\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);[^}]*?border-color:\s*var\(--theme-highlight-border\);' `
  -Message "Flashcard, adhkar, and hadith auto toggle hover must use opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.flashcard-auto-toggle-btn:is\(\s*:active,\s*\[data-paused="true"\],\s*\[aria-pressed="true"\]\s*\)\s*\{[^}]*?background:\s*var\(--theme-highlight-active-bg\);[^}]*?border-color:\s*var\(--theme-highlight-border\);' `
  -Message "Flashcard, adhkar, and hadith auto toggle pressed states must use opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.pq-translation-item:hover,\s*\.pq-translation-item:focus-visible\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);' `
  -Message "Portaled Quran translation and font item hover states must use component opacity highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.pq-bookmark-category:hover\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);' `
  -Message "Portaled Quran bookmark category hover states must use component opacity highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.adhkar-set-item:hover\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);' `
  -Message "Portaled adhkar and hadith set item hover states must use component opacity highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.flashcard-set-item:hover\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);' `
  -Message "Portaled flashcard set item hover states must use component opacity highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.adhkar-lang-item:hover\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);' `
  -Message "Portaled language item hover states must use component opacity highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.content-search-result:hover,\s*\.content-search-result:focus-within\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);' `
  -Message "Content search result hover and focus states must use component opacity highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.pq-search-input\s*\{[^}]*?border:\s*1px solid var\(--component-highlight-border\);[^}]*?background:\s*var\(--component-highlight-bg-hover\);' `
  -Message "Portaled Pocket Quran search input idle state must use component opacity highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.pq-search-input:hover,\s*\.pq-search-input:focus-visible\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?box-shadow:\s*0 0 0 2px var\(--component-highlight-border\),\s*var\(--component-highlight-shadow\);' `
  -Message "Portaled Pocket Quran search input hover and focus must add a component-opacity-aware border glow."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.pq-search-submit-btn\s*\{[^}]*?background:\s*var\(--component-highlight-active-bg\);' `
  -Message "Portaled Pocket Quran search submit button must use component opacity highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.pq-search-submit-btn:hover:not\(:disabled\),\s*\.pq-search-submit-btn:focus-visible\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);' `
  -Message "Portaled Pocket Quran search submit hover and focus must use component opacity highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.adhkar-set-page-btn:hover:not\(:disabled\),\s*\.adhkar-set-page-btn:focus-visible\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);' `
  -Message "Shared content, adhkar, and hadith pagination hover and focus must use component opacity highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.adhkar-set-page-btn\.active\s*\{[^}]*?background:\s*var\(--component-highlight-active-bg\);[^}]*?border-color:\s*var\(--component-highlight-border\);' `
  -Message "Shared content, adhkar, and hadith pagination active states must use component opacity highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.pq-bookmark-page-btn:hover:not\(:disabled\),\s*\.pq-bookmark-page-btn:focus-visible\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);' `
  -Message "Portaled Pocket Quran pagination hover and focus must use component opacity highlights."

Assert-Matches `
  -Haystack $styleSource `
  -Pattern '\.pq-bookmark-page-btn\.active\s*\{[^}]*?background:\s*var\(--component-highlight-active-bg\);[^}]*?border-color:\s*var\(--component-highlight-border\);' `
  -Message "Portaled Pocket Quran pagination active states must use component opacity highlights."

Write-Host "Theme component opacity regression tests passed."
