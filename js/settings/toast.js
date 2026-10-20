/**
 * SettingsManager: settings toast.
 * Part of the class declared in js/settings/index.js; load this after it.
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
})(SettingsManager.prototype, class {

  showToast(message, type = "info") {
    // Create toast container if not exists
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    // Create toast
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const iconSpan = document.createElement("span");
    const iconEmoji = type === "success" ? "✓" : type === "error" ? "✗" : "ℹ";
    iconSpan.innerHTML = this._getIcon(iconEmoji, { size: 16 });

    const msgSpan = document.createElement("span");
    msgSpan.textContent = String(message ?? "");

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);

    container.appendChild(toast);

    let hideTimer = null;

    const removeToast = () => {
      try {
        toast.remove();
      } catch (e) {
        // ignore
      }
    };

    const hideToast = () => {
      if (toast.classList.contains("toast-hiding")) return;

      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }

      toast.classList.add("toast-hiding");

      // Remove after transition; also keep a safety timeout.
      const fallbackMs = 350;
      const t = setTimeout(removeToast, fallbackMs);

      toast.addEventListener(
        "transitionend",
        (e) => {
          if (e && e.propertyName && e.propertyName !== "opacity") return;
          clearTimeout(t);
          removeToast();
        },
        { once: true },
      );
    };

    const scheduleHide = (delayMs) => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      hideTimer = setTimeout(hideToast, delayMs);
    };

    // If the user hovers over a toast (often near the FAB region), hide it quickly.
    toast.addEventListener(
      "mouseenter",
      () => {
        scheduleHide(120);
      },
      { once: true },
    );

    scheduleHide(2500);
  }
});
