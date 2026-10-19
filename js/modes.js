/**
 * Modes
 *
 * The one place that knows which presentation modes are on, which ones exclude
 * which, and which body classes the page wears.
 *
 * Modes are a set, not one current mode: a layout edit can be on while the
 * sidebar is. What a mode intends (on) is separate from what it gets
 * (isActive), because an active mode suppresses the ones it excludes. Two
 * exclusive overlays that are somehow both on both read inactive, so the page
 * falls back to the plain layout instead of two fighting ones.
 *
 * Callers read isActive and excludes() instead of another module's private
 * state. The caller that enters a mode drives the teardown of what it
 * excludes, because only that caller knows how to put its own layout back;
 * nothing here cascades behind the caller's back.
 *
 * Built from one settings snapshot. Persisting a mode change stays with the
 * caller that made it.
 */
class Modes {
  constructor(settings = {}) {
    const focus = settings.quranFocusModeEnabled === true;

    this.on = {
      quranFocus: focus,
      moment: settings.momentModeEnabled === true,
      sidebar: settings.sidebarModeEnabled === true,
      // Edit mode keeps one state per layout context, so returning to the main
      // layout restores the main layout's own edit state.
      edit:
        (focus
          ? settings.gridEditModeEnabledQuranFocus
          : settings.gridEditModeEnabled) === true,
    };
  }

  /** What entering this mode switches off. */
  static EXCLUDES = {
    quranFocus: ["moment", "sidebar"],
    moment: ["quranFocus", "sidebar"],
  };

  /** The class each mode wears on the body. */
  static CLASSES = {
    quranFocus: "quran-focus-mode",
    moment: "moment-mode",
    sidebar: "sidebar-mode",
    edit: "grid-edit-mode",
  };

  /** The modes entering this one switches off, as its call site must tear them down. */
  excludes(name) {
    return Modes.EXCLUDES[name] || [];
  }

  /** Whether this mode counts right now: on, and not suppressed by another. */
  isActive(name) {
    if (this.on[name] !== true) return false;

    return !Object.keys(Modes.EXCLUDES).some(
      (other) =>
        this.on[other] === true && Modes.EXCLUDES[other].includes(name),
    );
  }

  /** The modes that count right now. */
  active() {
    return Object.keys(this.on).filter((name) => this.isActive(name));
  }

  enter(name) {
    this.set(name, true);
  }

  exit(name) {
    this.set(name, false);
  }

  toggle(name) {
    this.set(name, this.on[name] !== true);
  }

  set(name, on) {
    if (!(name in this.on)) return;

    this.on[name] = on === true;
    this.syncClasses();
  }

  /** Make the page wear exactly the classes of the modes that count. */
  syncClasses() {
    for (const [name, className] of Object.entries(Modes.CLASSES)) {
      document.body.classList.toggle(className, this.isActive(name));
    }
  }
}

globalThis.Modes = Modes;
