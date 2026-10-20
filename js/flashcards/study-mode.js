/**
 * FlashcardManager: study mode and mode switching.
 * Part of the class declared in js/flashcards/index.js; load this after it.
 */
(function (prototype, members) {
  for (const name of Object.getOwnPropertyNames(members.prototype)) {
    if (name === "constructor") continue;
    Object.defineProperty(
      prototype,
      name,
      Object.getOwnPropertyDescriptor(members.prototype, name),
    );
  }
})(FlashcardManager.prototype, class {

  normalizeMode(mode) {
    return mode === "quiz" ? "quiz" : "study";
  }

  getMode() {
    const settings = this.getFlashcardSettings();
    return this.normalizeMode(settings.mode);
  }

  isStudyMode() {
    return this.getMode() === "study";
  }

  setMode(mode) {
    const next = this.normalizeMode(mode);
    this.setFlashcardSettings({ mode: next });

    // Study mode doesn't flip; keep the card in a consistent state.
    this.isFlipped = false;
    this.cancelDashboardAnimation();
    this.applyModeToDashboard();
    this.renderDashboard();
    this.ensureAutoAdvanceState({ reset: true });
  }

  toggleMode() {
    const current = this.getMode();
    this.setMode(current === "study" ? "quiz" : "study");
  }
});
