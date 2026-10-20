/**
 * Floating Mode Manager
 * Detaches select components into draggable, resizable, persistent floating windows.
 *
 * Design goals:
 * - Minimal DOM intrusion: uses a placeholder node to restore original order.
 * - No external deps.
 * - Persistence stored in settings.floating[componentKey].
 * - Responsive safety: floating is suspended on small viewports.
 */

class FloatingModeManager {

  constructor(storage) {
    this.storage = storage;

    this.viewportDisableQuery = window.matchMedia("(max-width: 699px)");
    this.isViewportSuspended = false;
    this.hasAppliedOnce = false;

    this.viewportPadding = 8;

    this.targets = {
      quotes: {
        cardId: "quoteSection",
        buttonId: "floatingQuotesBtn",
        // Quotes does not use .card-header, so drag from its container.
        handleSelector: ".quote-container",
      },
      prayerTimes: {
        cardId: "prayerTimesCard",
        buttonId: "floatingPrayerTimesBtn",
        // Use header as the drag handle (match other floating components)
        handleSelector: ".card-header",
      },
      hijriCalendar: {
        cardId: "calendarCard",
        buttonId: "floatingHijriCalendarBtn",
      },
      qiblaDirection: {
        cardId: "qiblaCard",
        buttonId: "floatingQiblaDirectionBtn",
      },
      lunarPhase: {
        cardId: "lunarPhaseCard",
        buttonId: "floatingLunarPhaseBtn",
      },
      fasting: {
        cardId: "fastingCard",
        buttonId: "floatingFastingBtn",
      },
      flashcards: {
        cardId: "flashcardCard",
        buttonId: "floatingFlashcardsBtn",
      },
      adhkar: {
        cardId: "adhkarCard",
        buttonId: "floatingAdhkarBtn",
      },
      hadith: {
        cardId: "hadithCard",
        buttonId: "floatingHadithBtn",
      },
      todoList: {
        cardId: "todoCard",
        buttonId: "floatingTodoListBtn",
      },
    };

    this.runtime = new Map();

    this._resizeRaf = null;
    this._performanceResizeTimer = null;

    // Animation tuning (ms)
    this.collapseOutMs = 260;
    this.collapseInMs = 90;
  }
}

// Export for debugging
window.FloatingModeManager = FloatingModeManager;
