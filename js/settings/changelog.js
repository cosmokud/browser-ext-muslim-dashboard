/**
 * SettingsManager: changelog modal.
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

  getChangelogResourceUrl() {
    if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
      return chrome.runtime.getURL("data/changelog.txt");
    }

    if (typeof browser !== "undefined" && browser.runtime?.getURL) {
      return browser.runtime.getURL("data/changelog.txt");
    }

    return "data/changelog.txt";
  }

  renderChangelogInlineMarkdown(value) {
    const escaped = this.escapeHtml(value);
    return escaped
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  renderChangelogMarkdown(markdown) {
    const lines = String(markdown || "").split(/\r?\n/);
    const html = [];
    let hasEntry = false;
    let entryOpen = false;
    let listOpen = false;

    const closeList = () => {
      if (!listOpen) return;
      html.push("</ul>");
      listOpen = false;
    };

    const closeEntry = () => {
      closeList();
      if (!entryOpen) return;
      html.push("</section>");
      entryOpen = false;
    };

    const ensureEntry = () => {
      if (entryOpen) return;
      html.push('<section class="changelog-entry">');
      entryOpen = true;
      hasEntry = true;
    };

    lines.forEach((rawLine) => {
      const line = String(rawLine || "").trim();

      if (!line) {
        closeList();
        return;
      }

      if (line.startsWith("## ")) {
        closeEntry();
        ensureEntry();
        html.push(
          `<h3 class="changelog-entry-title">${this.renderChangelogInlineMarkdown(line.slice(3).trim())}</h3>`,
        );
        return;
      }

      if (line.startsWith("### ")) {
        ensureEntry();
        closeList();
        html.push(
          `<h4 class="changelog-entry-subtitle">${this.renderChangelogInlineMarkdown(line.slice(4).trim())}</h4>`,
        );
        return;
      }

      if (line.startsWith("- ")) {
        ensureEntry();
        if (!listOpen) {
          html.push('<ul class="changelog-list">');
          listOpen = true;
        }

        html.push(
          `<li>${this.renderChangelogInlineMarkdown(line.replace(/^-\s+/, ""))}</li>`,
        );
        return;
      }

      ensureEntry();
      closeList();
      html.push(
        `<p class="changelog-text">${this.renderChangelogInlineMarkdown(line)}</p>`,
      );
    });

    closeEntry();

    if (!hasEntry) {
      return '<p class="changelog-empty">No changelog entries found.</p>';
    }

    return html.join("");
  }

  async ensureChangelogContentLoaded() {
    if (!this.changelogContent) {
      return;
    }

    if (this._changelogHtmlCache) {
      this.changelogContent.innerHTML = this._changelogHtmlCache;
      return;
    }

    if (!this._changelogLoadPromise) {
      this.changelogContent.innerHTML =
        '<p class="changelog-empty">Loading changelog...</p>';

      this._changelogLoadPromise = this.fetchTextResource(
        this.getChangelogResourceUrl(),
        { label: "Changelog" },
      )
        .then((markdown) => {
          const rendered = this.renderChangelogMarkdown(markdown);
          this._changelogHtmlCache = rendered;
          return rendered;
        })
        .catch((error) => {
          console.warn("Unable to load changelog:", error);
          return '<p class="changelog-empty">Unable to load data/changelog.txt right now.</p>';
        })
        .finally(() => {
          this._changelogLoadPromise = null;
        });
    }

    const rendered = await this._changelogLoadPromise;
    if (this.changelogContent) {
      this.changelogContent.innerHTML = rendered;
    }
  }

  async openChangelogModal() {
    if (!this.changelogModal) {
      return;
    }

    this.changelogModal.classList.add("active");
    this.changelogModal.setAttribute("aria-hidden", "false");
    this.changelogCloseBtn?.focus?.();

    await this.ensureChangelogContentLoaded();
  }

  closeChangelogModal() {
    if (!this.changelogModal) {
      return;
    }

    this.changelogModal.classList.remove("active");
    this.changelogModal.setAttribute("aria-hidden", "true");
  }
});
