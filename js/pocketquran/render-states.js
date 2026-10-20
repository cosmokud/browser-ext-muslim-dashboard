/**
 * PocketQuranManager: loading and error rendering.
 * Part of the class declared in js/pocketquran/index.js; load this after it.
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
})(PocketQuranManager.prototype, class {

  renderLoading(message) {
    if (!this.contentEl) return;
    this.destroyVirtualization();
    this.contentEl.innerHTML = "";

    const containerHeight =
      this._lastVirtualContainerHeightPx &&
      this._lastVirtualContainerHeightPx > 0
        ? this._lastVirtualContainerHeightPx
        : 1000;

    const contentMinHeight =
      this._lastVirtualContentHeightPx && this._lastVirtualContentHeightPx > 0
        ? this._lastVirtualContentHeightPx
        : Math.max(320, containerHeight - 120);

    const spacerHeight =
      this._lastVirtualSpacerHeightPx && this._lastVirtualSpacerHeightPx > 0
        ? this._lastVirtualSpacerHeightPx
        : Math.max(1400, containerHeight * 2);

    const virtualContainer = document.createElement("div");
    virtualContainer.className = "pq-virtual-container";
    virtualContainer.style.height = `${containerHeight}px`;

    const spacer = document.createElement("div");
    spacer.className = "pq-virtual-spacer";
    spacer.style.height = `${spacerHeight}px`;

    const content = document.createElement("div");
    content.className = "pq-virtual-content pq-virtual-content-loading";
    content.style.transform = "translateY(0px)";
    content.style.minHeight = `${contentMinHeight}px`;

    const label = document.createElement("div");
    label.className = "pq-loading-label";

    const spinner = document.createElement("div");
    spinner.className = "pocket-quran-spinner";
    spinner.setAttribute("aria-hidden", "true");

    const text = document.createElement("div");
    text.className = "pocket-quran-loading-text";
    text.textContent = message || "Loading…";

    label.appendChild(spinner);
    label.appendChild(text);
    content.appendChild(label);

    const stack = document.createElement("div");
    stack.className = "pq-skeleton-stack";

    const widths = [
      { ar: "88%", tr: "66%" },
      { ar: "92%", tr: "58%" },
      { ar: "84%", tr: "72%" },
      { ar: "90%", tr: "62%" },
      { ar: "86%", tr: "70%" },
      { ar: "94%", tr: "54%" },
    ];

    for (let i = 0; i < widths.length; i++) {
      const card = document.createElement("div");
      card.className = "pq-skeleton-ayah";

      const ar = document.createElement("div");
      ar.className = "pq-skeleton-line pq-skel-ar";
      ar.style.width = widths[i].ar;

      const tr = document.createElement("div");
      tr.className = "pq-skeleton-line pq-skel-tr";
      tr.style.width = widths[i].tr;

      card.appendChild(ar);
      card.appendChild(tr);
      stack.appendChild(card);
    }

    content.appendChild(stack);
    spacer.appendChild(content);
    virtualContainer.appendChild(spacer);
    this.contentEl.appendChild(virtualContainer);
  }

  renderError(message) {
    if (!this.contentEl) return;
    this.destroyVirtualization();
    this.contentEl.innerHTML = "";

    const div = document.createElement("div");
    div.className = "pocket-quran-error";

    const text = document.createElement("div");
    text.className = "pocket-quran-error-text";
    text.textContent = message || "Something went wrong.";

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "pocket-quran-retry-btn";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => this.loadSurah(this._activeSurah));

    div.appendChild(text);
    div.appendChild(retry);
    this.contentEl.appendChild(div);
  }
});
