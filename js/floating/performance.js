/**
 * FloatingModeManager: performance mode and persistence suppression.
 * Part of the class declared in js/floating/index.js; load this after it.
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
})(FloatingModeManager.prototype, class {

  isPerformanceModeEnabled() {
    if (typeof window !== "undefined") {
      if (typeof window.__MD_PERFORMANCE_MODE__ === "boolean") {
        return window.__MD_PERFORMANCE_MODE__ === true;
      }
    }

    try {
      return this.storage.getSettings()?.performanceModeEnabled === true;
    } catch (e) {
      return false;
    }
  }

  isPersistenceSuppressed(key) {
    const st = this.runtime.get(key);
    return !!st && (st.persistenceSuppressed || 0) > 0;
  }

  withPersistenceSuppressedThroughNextFrame(key, fn) {
    const st = this.runtime.get(key);
    if (!st) return fn();

    st.persistenceSuppressed = (st.persistenceSuppressed || 0) + 1;
    try {
      return fn();
    } finally {
      requestAnimationFrame(() => {
        const st2 = this.runtime.get(key);
        if (!st2) return;
        st2.persistenceSuppressed = Math.max(
          0,
          (st2.persistenceSuppressed || 0) - 1,
        );
      });
    }
  }
});
