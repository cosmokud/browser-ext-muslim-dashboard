$ErrorActionPreference = "Stop"

$stylesPath = Join-Path $PSScriptRoot "..\css\styles.css"
$styles = Get-Content -Path $stylesPath -Raw

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

function Assert-NotMatches {
  param(
    [string] $Haystack,
    [string] $Pattern,
    [string] $Message
  )

  if ($Haystack -match $Pattern) {
    throw $Message
  }
}

function Assert-Contains {
  param(
    [string] $Haystack,
    [string] $Needle,
    [string] $Message
  )

  if (-not $Haystack.Contains($Needle)) {
    throw $Message
  }
}

Assert-Contains `
  -Haystack $styles `
  -Needle '--theme-highlight-bg-hover: linear-gradient(' `
  -Message "Theme hover and active highlights must use the primary theme gradient."

Assert-Matches `
  -Haystack $styles `
  -Pattern '--theme-highlight-bg-hover:\s*linear-gradient\(\s*135deg,\s*var\(--primary-dark\),\s*var\(--primary-color\)\s*\);' `
  -Message "Theme hover highlight must use primary dark to primary color."

Assert-Matches `
  -Haystack $styles `
  -Pattern '--theme-highlight-active-bg:\s*linear-gradient\(\s*135deg,\s*var\(--primary-dark\),\s*var\(--primary-color\)\s*\);' `
  -Message "Theme active highlight must use primary dark to primary color."

Assert-NotMatches `
  -Haystack $styles `
  -Pattern '--theme-highlight-bg-hover:[^;]*var\(--glass-bg-hover\)' `
  -Message "Theme hover highlight must not mix in glass hover colors."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.quote-pause-btn\[aria-pressed="true"\],[\s\S]*\.quote-shuffle-btn\[aria-pressed="true"\]\s*\{[\s\S]*background:\s*linear-gradient\([^}]*?var\(--primary-dark\)[^}]*?var\(--primary-color\)[\s\S]*border-color:\s*color-mix\([^}]*?var\(--primary-light\)' `
  -Message "Quote pause and shuffle pressed states must use stable primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern ':where\([\s\S]*\.card-header-actions > button[\s\S]*\.pocket-quran-header-meta[\s\S]*\.adhkar-set-selector-btn[\s\S]*\):hover:not\(:disabled\)[\s\S]*background:\s*var\(--theme-highlight-bg-hover\);[\s\S]*border-color:\s*var\(--theme-highlight-border\);' `
  -Message "Common button, chip, selector, and card header hover states must use primary theme highlights."

$headerActionButtonBlockMatch = [regex]::Match(
  $styles,
  ':where\(\s*\.card-header-actions > button,\s*\.card-header-actions > \.notes-header-actions > button,\s*\.card-header-actions > \.card-blur-menu > \.card-blur-btn,[\s\S]*?\.quote-shuffle-btn,[\s\S]*?\)\s*\{(?<body>[\s\S]*?)\n\}'
)

if (-not $headerActionButtonBlockMatch.Success) {
  throw "Header and quote action button base block must exist."
}

$headerActionButtonBlock = $headerActionButtonBlockMatch.Groups["body"].Value

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.quote-top-actions\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?visibility:\s*hidden;[\s\S]*?pointer-events:\s*none;[\s\S]*?transition:\s*[\s\S]*?opacity var\(--transition-normal\),[\s\S]*?transform var\(--transition-fast\);' `
  -Message "Quote top actions must match v0.1.11 hidden-by-default reveal behavior."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.quote-section:hover \.quote-top-actions\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?visibility:\s*visible;[\s\S]*?pointer-events:\s*auto;[\s\S]*?\}' `
  -Message "Quote top actions must reveal when the quote component is hovered."

Assert-NotMatches `
  -Haystack $styles `
  -Pattern '@media \(hover:\s*hover\) and \(pointer:\s*fine\)\s*\{[\s\S]*?\.quote-section \.quote-top-actions,' `
  -Message "Quote top actions must not be folded into the card header media reveal group."

Assert-Matches `
  -Haystack $styles `
  -Pattern ':where\(\s*\.card-header-actions > button,\s*\.card-header-actions > \.notes-header-actions > button,\s*\.card-header-actions > \.card-blur-menu > \.card-blur-btn,[\s\S]*?\.quote-shuffle-btn,[\s\S]*?\)\s*\{[\s\S]*?animation:\s*none;[\s\S]*?transition:\s*transform var\(--transition-fast\),\s*border-color var\(--transition-fast\),\s*box-shadow var\(--transition-fast\),\s*color var\(--transition-fast\);' `
  -Message "Header and quote action buttons must disable animation and avoid background/opacity/blur transitions."

Assert-NotMatches `
  -Haystack $headerActionButtonBlock `
  -Pattern 'transition:[\s\S]*?(background|opacity|filter|backdrop-filter)\s+var\(--transition-fast\)' `
  -Message "Header and quote action button transitions must not animate background, opacity, filter, or backdrop-filter."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.card-header-actions\s*>\s*button:hover:not\(:disabled\),\s*\.card-header-actions\s*>\s*\.notes-header-actions\s*>\s*button:hover:not\(:disabled\),\s*\.card-blur-menu\s+\.card-blur-btn:hover:not\(:disabled\),\s*\.card-header-actions\s*>\s*\.card-blur-menu\s*>\s*\.card-blur-btn:hover:not\(:disabled\)\s*\{[^}]*?background:\s*var\(--action-btn-bg\)\s*!important;[^}]*?border-color:\s*var\(--theme-highlight-border\)\s*!important;[^}]*?color:\s*var\(--on-primary-text\)\s*!important;[^}]*?box-shadow:\s*var\(--action-btn-shadow-hover\)\s*!important;' `
  -Message "Header action button hover states must keep the same base background color."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.quote-top-actions\s*>\s*button:hover:not\(:disabled\)\s*\{[^}]*?background:\s*var\(--action-btn-bg\)\s*!important;[^}]*?border-color:\s*var\(--theme-highlight-border\)\s*!important;[^}]*?color:\s*var\(--on-primary-text\)\s*!important;[^}]*?box-shadow:\s*var\(--action-btn-shadow-hover\)\s*!important;' `
  -Message "Quote action button hover states must keep the same base background color."

Assert-NotMatches `
  -Haystack $styles `
  -Pattern '\.quote-top-actions\s*>\s*button::before|\.card-header-actions\s*>\s*button::before|\.card-blur-menu\s+\.card-blur-btn::before' `
  -Message "Header and quote action button hover must not use the rejected overlay hover approach."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.fab-menu :is\([\s\S]*\):hover\s*\{[\s\S]*background:\s*var\(--theme-highlight-bg-hover\);[\s\S]*color:\s*var\(--on-primary-text\);' `
  -Message "FAB menu hover states must use primary highlights with primary text."

Assert-Matches `
  -Haystack $styles `
  -Pattern ':where\([\s\S]*\.calendar-day\.selected[\s\S]*\.notes-tool-btn\.active[\s\S]*\.todo-page-btn\.active[\s\S]*\)[\s\S]*background:\s*var\(--theme-highlight-active-bg\);' `
  -Message "Common active and selected chip states must use primary theme active highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-tajweed-toggle\.active,\s*\.pq-tajweed-toggle\[aria-pressed="true"\]\s*\{[\s\S]*?background:\s*var\(--theme-highlight-active-bg\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);[\s\S]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran Tajweed and text visibility toggles must use primary theme active highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-tajweed-toggle:not\(\.active\):not\(:disabled\):hover,\s*\.pq-tajweed-toggle\[aria-pressed="false"\]:not\(:disabled\):hover\s*\{[\s\S]*?background:\s*var\(--theme-highlight-bg-hover\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);[\s\S]*?color:\s*var\(--on-primary-text\);' `
  -Message "Inactive Pocket Quran toggles must use primary theme hover highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '#(?:pocketQuranTajweedToggle|adhkarScriptToggleBtn)\[aria-pressed="true"\]:not\(:disabled\)\s*\{[\s\S]*?background:\s*var\(--theme-highlight-active-bg\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);' `
  -Message "Specific aria-pressed script/tajweed toggles must use primary theme active highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-ayah-play-btn:hover\s*\{[\s\S]*?background:\s*var\(--theme-highlight-bg-hover\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);[\s\S]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran ayah play hover must use primary theme hover highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-ayah-play-btn\.playing\s*\{[\s\S]*?background:\s*linear-gradient\([^}]*?var\(--primary-dark\)[^}]*?var\(--primary-color\)[\s\S]*?color:\s*var\(--on-primary-text\);[\s\S]*?border-color:\s*color-mix\([^}]*?var\(--primary-light\)' `
  -Message "Pocket Quran ayah playing state must use stable primary theme active highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-recitation-btn:hover\s*\{[\s\S]*?background:\s*var\(--theme-highlight-bg-hover\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);[\s\S]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran recitation button hover must use primary theme hover highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-recitation-btn\.active\s*\{[\s\S]*?background:\s*linear-gradient\([^}]*?var\(--primary-dark\)[^}]*?var\(--primary-color\)[\s\S]*?color:\s*var\(--on-primary-text\);[\s\S]*?border-color:\s*color-mix\([^}]*?var\(--primary-light\)' `
  -Message "Pocket Quran recitation active buttons must use stable primary theme active highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pocket-quran-combobox-with-nav:is\(:focus-within,\s*\.pq-open\)\s*\{[\s\S]*?background:\s*var\(--theme-highlight-bg-hover\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);[\s\S]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran combobox focused/open state must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '#pocketQuranSurahList,\s*#pocketQuranAyahList\s*\{[\s\S]*?background:\s*var\(--theme-highlight-active-bg\);[\s\S]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran surah and ayah dropdown lists must use primary theme palette backgrounds."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pocket-quran-inline-nav-btn:hover,\s*\.pocket-quran-inline-nav-btn:focus-visible\s*\{[\s\S]*?background:\s*var\(--theme-highlight-bg-hover\);[\s\S]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran inline nav hover and focus states must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pocket-quran-nav-btn:hover\s*\{[\s\S]*?background:\s*var\(--theme-highlight-bg-hover\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);[\s\S]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran nav button hover states must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pocket-quran-surah-item:hover,\s*\.pocket-quran-ayah-option:hover\s*\{[\s\S]*?background:\s*var\(--theme-highlight-light-bg\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);[\s\S]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran dropdown option hover states must use the lighter primary theme palette color."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pocket-quran-surah-item\.active,\s*\.pocket-quran-ayah-option\.active\s*\{[\s\S]*?background:\s*var\(--theme-highlight-light-bg\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);[\s\S]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran dropdown selected states must use the lighter primary theme palette color."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.todo-item:hover\s*\{[\s\S]*?background:\s*var\(--theme-highlight-bg-hover\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);[\s\S]*?color:\s*var\(--on-primary-text\);' `
  -Message "Todo item hover state must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.todo-item:is\(\.active,\s*\.selected,\s*\[aria-selected="true"\]\)\s*\{[\s\S]*?background:\s*var\(--theme-highlight-active-bg\);[\s\S]*?border-color:\s*var\(--theme-highlight-border\);[\s\S]*?color:\s*var\(--on-primary-text\);' `
  -Message "Todo item selected state must use primary theme active highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.todo-input:focus\s*\{[^}]*?border-color:\s*var\(--theme-highlight-border\);[^}]*?background:\s*var\(--theme-highlight-bg-hover\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Todo input focus state must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.notes-list-item:hover\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);[^}]*?border-color:\s*var\(--theme-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Notes list item hover state must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.notes-list-item\.active\s*\{[^}]*?background:\s*var\(--theme-highlight-active-bg\);[^}]*?border-color:\s*var\(--theme-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Notes list item active state must use primary theme active highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.notes-title-input:focus\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);[^}]*?border-color:\s*var\(--theme-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Notes title input focus state must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.prayer-item:hover\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);[^}]*?border-color:\s*var\(--theme-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Prayer item hover state must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.prayer-item\.active\s*\{[^}]*?background:\s*var\(--theme-highlight-active-bg\);[^}]*?border-color:\s*var\(--theme-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Prayer item active state must use primary theme active highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.flashcard-nav:hover\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);[^}]*?border-color:\s*var\(--theme-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Flashcard and adhkar nav hover states must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.calendar-nav-btn:hover\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);[^}]*?border-color:\s*var\(--theme-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Calendar nav hover states must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pocket-quran-size-step-btn:hover\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);[^}]*?border-color:\s*var\(--theme-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran size step button hover states must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pocket-quran-size-step-btn:focus-visible\s*\{[^}]*?outline:\s*2px solid var\(--theme-highlight-border\);[^}]*?background:\s*var\(--theme-highlight-bg-hover\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran size step button focus states must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.flashcard-auto-toggle-btn\s*\{[^}]*?border:\s*1px solid var\(--theme-highlight-border\);[^}]*?background:\s*var\(--theme-highlight-active-bg\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Flashcard, adhkar, and hadith auto toggle buttons must use primary theme backgrounds."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.flashcard-auto-toggle-btn:hover\s*\{[^}]*?background:\s*var\(--theme-highlight-bg-hover\);[^}]*?border-color:\s*var\(--theme-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Flashcard, adhkar, and hadith auto toggle hover states must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.flashcard-auto-toggle-btn:is\(\s*:active,\s*\[data-paused="true"\],\s*\[aria-pressed="true"\]\s*\)\s*\{[^}]*?background:\s*var\(--theme-highlight-active-bg\);[^}]*?border-color:\s*var\(--theme-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Flashcard, adhkar, and hadith auto toggle pressed states must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.flashcard-auto-toggle-btn:focus-visible\s*\{[^}]*?outline:\s*3px solid var\(--theme-highlight-border\);[^}]*?background:\s*var\(--theme-highlight-bg-hover\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Flashcard, adhkar, and hadith auto toggle focus states must use primary theme highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-translation-item:hover,\s*\.pq-translation-item:focus-visible\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Quran translation and font item hover states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-translation-item\.active\s*\{[^}]*?background:\s*var\(--component-highlight-active-bg\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Quran translation and font item active states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-bookmark-category:hover\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Quran bookmark category hover states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-bookmark-category\.active\s*\{[^}]*?background:\s*var\(--component-highlight-active-bg\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Quran bookmark category active states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.adhkar-set-item:hover\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Adhkar and hadith set item hover states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.adhkar-set-item\.active\s*\{[^}]*?background:\s*var\(--component-highlight-active-bg\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Adhkar and hadith set item active states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.flashcard-set-item:hover\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Flashcard set item hover states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.flashcard-set-item\.active\s*\{[^}]*?background:\s*var\(--component-highlight-active-bg\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Flashcard set item active states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.adhkar-lang-item:hover\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Adhkar, hadith, and quote language item hover states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.adhkar-lang-item\.active\s*\{[^}]*?background:\s*var\(--component-highlight-active-bg\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Adhkar, hadith, and quote language item active states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.content-search-result:hover,\s*\.content-search-result:focus-within\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Content search result hover and focus states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-search-input\s*\{[^}]*?border:\s*1px solid var\(--component-highlight-border\);[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran search input idle state must use readable component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-search-input::placeholder\s*\{[^}]*?color:\s*var\(--on-primary-text\);[^}]*?opacity:\s*0\.78;' `
  -Message "Pocket Quran search input placeholder must remain readable while idle."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-search-input:hover,\s*\.pq-search-input:focus-visible\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);[^}]*?box-shadow:\s*0 0 0 2px var\(--component-highlight-border\),\s*var\(--component-highlight-shadow\);' `
  -Message "Pocket Quran search input hover and focus states must add an opacity-aware primary border glow."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-search-submit-btn\s*\{[^}]*?border:\s*1px solid var\(--component-highlight-border\);[^}]*?background:\s*var\(--component-highlight-active-bg\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran search submit button must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-search-submit-btn:hover:not\(:disabled\),\s*\.pq-search-submit-btn:focus-visible\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran search submit hover and focus states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-search-submit-btn:active:not\(:disabled\)\s*\{[^}]*?background:\s*var\(--component-highlight-active-bg\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);' `
  -Message "Pocket Quran search submit active state must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.adhkar-set-page-btn:hover:not\(:disabled\),\s*\.adhkar-set-page-btn:focus-visible\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);[^}]*?box-shadow:\s*var\(--component-highlight-shadow\);' `
  -Message "Shared content, adhkar, and hadith pagination hover and focus states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.adhkar-set-page-btn\.active\s*\{[^}]*?background:\s*var\(--component-highlight-active-bg\);[^}]*?color:\s*var\(--on-primary-text\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?box-shadow:\s*var\(--component-highlight-shadow\);' `
  -Message "Shared content, adhkar, and hadith pagination active states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-bookmark-page-btn:hover:not\(:disabled\),\s*\.pq-bookmark-page-btn:focus-visible\s*\{[^}]*?background:\s*var\(--component-highlight-bg-hover\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?color:\s*var\(--on-primary-text\);[^}]*?box-shadow:\s*var\(--component-highlight-shadow\);' `
  -Message "Pocket Quran pagination hover and focus states must use component-opacity-aware primary highlights."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-bookmark-page-btn\.active\s*\{[^}]*?background:\s*var\(--component-highlight-active-bg\);[^}]*?color:\s*var\(--on-primary-text\);[^}]*?border-color:\s*var\(--component-highlight-border\);[^}]*?box-shadow:\s*var\(--component-highlight-shadow\);' `
  -Message "Pocket Quran pagination active states must use component-opacity-aware primary highlights."

Write-Host "Theme primary highlight regression tests passed."
