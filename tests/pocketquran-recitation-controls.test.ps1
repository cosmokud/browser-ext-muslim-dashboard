$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\source.ps1")
$sourcePath = Join-Path $PSScriptRoot "..\js\pocketquran.js"
$source = Get-SourceText -Path $sourcePath
$storagePath = Join-Path $PSScriptRoot "..\js\storage.js"
$storage = Get-SourceText -Path $storagePath
$popupPath = Join-Path $PSScriptRoot "..\popup.html"
$popup = Get-SourceText -Path $popupPath
$popupScriptPath = Join-Path $PSScriptRoot "..\js\popup.js"
$popupScript = Get-SourceText -Path $popupScriptPath
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

function Assert-NotContains {
  param(
    [string] $Haystack,
    [string] $Needle,
    [string] $Message
  )

  if ($Haystack.Contains($Needle)) {
    throw $Message
  }
}

Assert-Matches `
  -Haystack $source `
  -Pattern 'getRecitationControlTargetAyah\(\)[\s\S]*?_popupSyncStateKey[\s\S]*?recitationAyah' `
  -Message "Dashboard recitation controls must resolve the current target from synced popup/offscreen recitation state."

Assert-Matches `
  -Haystack $source `
  -Pattern 'playPreviousAyah\(\{[\s\S]*?const fallbackTarget = this\.getRecitationControlTargetAyah\(\);' `
  -Message "Previous ayah control must not fall back directly to stale active ayah state."

Assert-Matches `
  -Haystack $source `
  -Pattern 'playNextAyah\(\{[\s\S]*?const fallbackTarget = this\.getRecitationControlTargetAyah\(\);' `
  -Message "Next ayah control must not fall back directly to stale active ayah state."

Assert-Matches `
  -Haystack $source `
  -Pattern '\.querySelector\("\.pq-prev-btn"\)[\s\S]*?const target = this\.getRecitationControlTargetAyah\(\);[\s\S]*?this\.playPreviousAyah\(\{[\s\S]*?targetSurah: target\.surah,[\s\S]*?targetAyah: target\.ayah,' `
  -Message "Main and floating previous controls must pass the resolved current recitation target."

Assert-Matches `
  -Haystack $source `
  -Pattern '\.querySelector\("\.pq-next-btn"\)[\s\S]*?const target = this\.getRecitationControlTargetAyah\(\);[\s\S]*?this\.playNextAyah\(\{[\s\S]*?targetSurah: target\.surah,[\s\S]*?targetAyah: target\.ayah,' `
  -Message "Main and floating next controls must pass the resolved current recitation target."

Assert-Matches `
  -Haystack $source `
  -Pattern 'const syncState = this\.storage\?\.get\(this\._popupSyncStateKey, null\);[\s\S]*?syncState\?\.isPlaying === true[\s\S]*?!this\.isDashboardRecitationActivelyPlaying\(\)' `
  -Message "Dashboard controls must prefer a playing synced recitation target over stale local state."

Assert-Matches `
  -Haystack $source `
  -Pattern 'hasUsableSyncedRecitationTarget\(state\)[\s\S]*?state\?\.recitationAyah[\s\S]*?Number\.isFinite\(ayah\)' `
  -Message "Pocket Quran sync needs a reusable guard for valid existing recitation targets."

Assert-Matches `
  -Haystack $source `
  -Pattern 'this\._lastPocketQuranControlAt <= 0 && this\._isPlaying !== true[\s\S]*?this\.hasUsableSyncedRecitationTarget\(existingState\)[\s\S]*?return;' `
  -Message "Passive dashboard startup must not overwrite an existing paused recitation target."

Assert-Matches `
  -Haystack $source `
  -Pattern 'getPreviousSurahNumber\(currentSurah\)[\s\S]*?this\._chapters\[currentIndex - 1\]\?\.id[\s\S]*?return surah > 1 \? surah - 1 : null;' `
  -Message "Across Surahs navigation needs a previous-surah resolver."

Assert-Matches `
  -Haystack $source `
  -Pattern 'getSurahAyahCount\(surah\)[\s\S]*?this\._chapters\.find\(\(c\) => c\.id === surahNumber\)[\s\S]*?Number\.isFinite\(count\)' `
  -Message "Across Surahs navigation must resolve the target surah's ayah count."

Assert-Matches `
  -Haystack $source `
  -Pattern 'async playPreviousAyah\(\{[\s\S]*?if \(ayah <= 1 && this\._isAutoplayNextSurah\)[\s\S]*?const previousSurah = this\.getPreviousSurahNumber\(surah\);[\s\S]*?const previousSurahMaxAyah = this\.getSurahAyahCount\(previousSurah\) \|\| 286;[\s\S]*?await this\.activateRecitationTargetSurah\(previousSurah\);[\s\S]*?await this\.playAyah\(previousSurah, previousSurahMaxAyah' `
  -Message "Previous control must cross to the previous surah's last ayah when Across Surahs is enabled."

Assert-Matches `
  -Haystack $source `
  -Pattern 'async playNextAyah\(\{[\s\S]*?if \(nextAyah === ayah && this\._isAutoplayNextSurah\)[\s\S]*?const nextSurah = this\.getNextSurahNumber\(surah\);[\s\S]*?await this\.activateRecitationTargetSurah\(nextSurah\);[\s\S]*?await this\.playAyah\(nextSurah, 1' `
  -Message "Next control must cross to the next surah's first ayah when Across Surahs is enabled."

Assert-Matches `
  -Haystack $source `
  -Pattern 'activateRecitationTargetSurah\(surah\)[\s\S]*?await this\.setActiveSurah\(targetSurah,[\s\S]*?preserveAyah: false,[\s\S]*?autoScroll: false,[\s\S]*?preserveDashboardScroll: true' `
  -Message "Manual cross-surah controls must switch the main layout to the target surah."

Assert-Matches `
  -Haystack $source `
  -Pattern 'case "playPreviousAyah":[\s\S]*?await this\.activateRecitationTargetSurah\(targetSurah\);[\s\S]*?await this\.playAyah\(targetSurah, explicitAyah\);[\s\S]*?await this\.playPreviousAyah\(\{ desiredIsPlaying \}\);' `
  -Message "Popup previous commands must load target surahs and await cross-surah navigation."

Assert-Matches `
  -Haystack $source `
  -Pattern 'case "playNextAyah":[\s\S]*?await this\.activateRecitationTargetSurah\(targetSurah\);[\s\S]*?await this\.playAyah\(targetSurah, explicitAyah\);[\s\S]*?await this\.playNextAyah\(\{ desiredIsPlaying \}\);' `
  -Message "Popup next commands must load target surahs and await cross-surah navigation."

Assert-Matches `
  -Haystack $popupScript `
  -Pattern 'getPocketQuranPreviousSurahId\(surah\)[\s\S]*?pocketQuranChapters\[currentIndex - 1\]\?\.id[\s\S]*?return currentSurah > 1 \? currentSurah - 1 : null;' `
  -Message "Popup needs a previous-surah resolver for Across Surahs."

Assert-Matches `
  -Haystack $popupScript `
  -Pattern 'popupPqPrevBtn\?\.addEventListener\("click"[\s\S]*?target\.ayah <= 1 &&[\s\S]*?pocketQuranState\?\.isAutoplayNextSurah === true[\s\S]*?getPocketQuranPreviousSurahId\(target\.surah\)[\s\S]*?getPocketQuranSurahMaxAyah\(previousSurah\)[\s\S]*?sendPocketQuranCommand\(pocketQuranCommandTypes\.playPreviousAyah,[\s\S]*?surah: targetSurah,[\s\S]*?ayah: targetAyah,' `
  -Message "Popup previous button must send the previous surah's last ayah when Across Surahs is enabled."

Assert-Matches `
  -Haystack $popupScript `
  -Pattern 'popupPqNextBtn\?\.addEventListener\("click"[\s\S]*?target\.ayah >= getPocketQuranSurahMaxAyah\(target\.surah\) &&[\s\S]*?pocketQuranState\?\.isAutoplayNextSurah === true[\s\S]*?getPocketQuranNextSurahId\(target\.surah\)[\s\S]*?targetAyah = 1[\s\S]*?sendPocketQuranCommand\(pocketQuranCommandTypes\.playNextAyah,[\s\S]*?surah: targetSurah,[\s\S]*?ayah: targetAyah,' `
  -Message "Popup next button must send the next surah's first ayah when Across Surahs is enabled."

Assert-Matches `
  -Haystack $styles `
  -Pattern '\.pq-recitation-info \{[^}]*user-select: none;[^}]*-webkit-user-select: none;[^}]*\}[\s\S]*?\.pq-recitation-ayah \{[^}]*cursor: pointer;[^}]*\}[\s\S]*?\.pq-recitation-reciter \{[^}]*cursor: pointer;' `
  -Message "Pocket Quran recitation info text must not be selectable while ayah and reciter remain clickable."

Assert-Matches `
  -Haystack $source `
  -Pattern 'class="pq-recitation-btn pq-loop-btn pq-loop-ayah-btn[\s\S]*?lucide-repeat-1[\s\S]*?M11 10h1v4[\s\S]*?class="pq-recitation-btn pq-loop-btn pq-loop-surah-btn[\s\S]*?lucide-repeat-2[\s\S]*?M13 18H7a2 2 0 0 1-2-2V6[\s\S]*?class="pq-recitation-btn pq-autoplay-next-surah-btn[\s\S]*?title="Across Surahs"[\s\S]*?lucide-book-up-2' `
  -Message "Main and floating player icons must use Lucide repeat and Across Surahs icons in the requested order."

Assert-Matches `
  -Haystack $source `
  -Pattern 'class="pq-recitation-btn pq-autoscroll-btn[\s\S]*?title="Auto-scroll to next ayah"[\s\S]*?</button>[\s\S]*?class="pq-recitation-btn pq-highlighter-btn[\s\S]*?title="Highlighter"[\s\S]*?lucide-highlighter-icon lucide-highlighter[\s\S]*?m9 11-6 6v3h9l3-3' `
  -Message "Main and floating player controls must place a Lucide Highlighter button immediately after Auto-scroll."

Assert-Matches `
  -Haystack $source `
  -Pattern 'toggleRecitationHighlighter\(\)[\s\S]*?reciterHighlighter[\s\S]*?clearActiveRecitationWordHighlight[\s\S]*?syncActiveRecitationWord' `
  -Message "Highlighter button must toggle persisted recitation word highlighting and clear/sync the current highlight."

Assert-Matches `
  -Haystack $storage `
  -Pattern 'pocketQuran:\s*\{[\s\S]*?reciterHighlighter:\s*true' `
  -Message "Pocket Quran highlighter must be enabled by default on new installations."

Assert-Matches `
  -Haystack $source `
  -Pattern 'this\._isRecitationHighlighterEnabled = pq\.reciterHighlighter !== false' `
  -Message "Pocket Quran highlighter startup must treat missing legacy settings as enabled."

Assert-Matches `
  -Haystack $source `
  -Pattern '\.querySelector\("\.pq-highlighter-btn"\)[\s\S]*?addEventListener\("click", \(\) => this\.toggleRecitationHighlighter\(\)\)' `
  -Message "Dashboard highlighter button must be wired to the highlighter toggle."

Assert-Matches `
  -Haystack $source `
  -Pattern 'const highlighterBtn =[\s\S]*?querySelector\("\.pq-highlighter-btn"\)[\s\S]*?classList\.toggle\("active", this\._isRecitationHighlighterEnabled\)[\s\S]*?aria-pressed' `
  -Message "Playback UI must keep the highlighter button active state and aria-pressed in sync."

Assert-NotContains `
  -Haystack $popup `
  -Needle 'pq-highlighter-btn' `
  -Message "Popup player must not get the dashboard-only Highlighter button."

Assert-Matches `
  -Haystack $popup `
  -Pattern 'class="pq-recitation-btn pq-loop-btn pq-loop-ayah-btn"[\s\S]*?lucide-repeat-1[\s\S]*?M11 10h1v4[\s\S]*?class="pq-recitation-btn pq-loop-btn pq-loop-surah-btn"[\s\S]*?lucide-repeat-2[\s\S]*?M13 18H7a2 2 0 0 1-2-2V6[\s\S]*?class="pq-recitation-btn pq-autoplay-next-surah-btn"[\s\S]*?title="Across Surahs"[\s\S]*?lucide-book-up-2' `
  -Message "Popup player icons must use Lucide repeat and Across Surahs icons in the requested order."

Assert-Matches `
  -Haystack $source `
  -Pattern 'pq-recitation-float-toggle-btn"[\s\S]*?lucide-picture-in-picture"' `
  -Message "Floating detach button must start with the Lucide picture-in-picture icon."

Assert-Matches `
  -Haystack $source `
  -Pattern 'updateRecitationFloatingButtons\(\)[\s\S]*?lucide-picture-in-picture-2[\s\S]*?lucide-picture-in-picture"' `
  -Message "Floating toggle must use Lucide picture-in-picture icons for dock and detach states."

Write-Host "Pocket Quran recitation control regression tests passed."
