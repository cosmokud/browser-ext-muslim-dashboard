/**
 * SearchBarManager: add/edit engine modal and favicon tools.
 * Part of the class declared in js/searchbar/index.js; load this after it.
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
})(SearchBarManager.prototype, class {

  showAddModal() {
    if (!this.addModal) return;
    try {
      this.addModalForm?.reset();
    } catch (e) {}
    this.addModal.classList.add("active");
    this.newName?.focus();
  }

  hideAddModal() {
    if (!this.addModal) return;
    this.addModal.classList.remove("active");
  }

  showEditModal(engineId) {
    const engine = this.searches.find((s) => String(s.id) === String(engineId));
    if (!engine || !this.editModal) return;

    // Reset pending favicon
    this.pendingFaviconDataUrl = null;

    if (this.editName) this.editName.value = engine.name;
    if (this.editUrl) this.editUrl.value = engine.url;
    if (this.editIdInput) this.editIdInput.value = String(engine.id);

    // Update favicon preview
    this.updateEditFaviconPreview(
      engine.url,
      engine.cachedFavicon || engine.favicon,
    );

    // Clear status
    if (this.editFaviconStatus) {
      this.editFaviconStatus.textContent = "";
      this.editFaviconStatus.className = "favicon-status";
    }

    // Reset file input
    if (this.editFaviconFileInput) {
      this.editFaviconFileInput.value = "";
    }

    this.editModal.classList.add("active");
    this.editName?.focus();
  }

  async updateEditFaviconPreview(url, cachedFavicon) {
    if (!this.editFaviconPreview) return;

    // Try to get cached favicon
    let faviconUrl = cachedFavicon;

    if (!faviconUrl && window.faviconCache) {
      faviconUrl = await window.faviconCache.getCached(url, "search");
    }

    if (!faviconUrl) {
      // Fallback to Google API
      faviconUrl = this.getFaviconUrlFromTemplate(url);
    }

    this._renderFaviconPreview(this.editFaviconPreview, faviconUrl);
  }

  async handleRefreshFavicon() {
    const rawUrl = this.editUrl?.value.trim();
    if (!rawUrl) {
      this.showFaviconStatus("Please enter a URL first", "error");
      return;
    }

    // Search templates must remain valid URL templates.
    const normalized = this._normalizeAndValidateTemplate("Search", rawUrl);
    if (!normalized) return;
    const url = normalized.url;

    this.showFaviconStatus("Fetching favicon...", "loading");

    try {
      let refreshedFaviconUrl = null;

      if (window.faviconCache) {
        const dataUrl = await window.faviconCache.refreshFromGoogle(
          url,
          "search",
        );
        if (dataUrl) {
          refreshedFaviconUrl = dataUrl;
        }
      }

      // Fallback: use direct URL even when cache refresh fails.
      if (!refreshedFaviconUrl) {
        refreshedFaviconUrl = this.getFaviconUrlFromTemplate(url);
      }

      if (refreshedFaviconUrl) {
        this.pendingFaviconDataUrl = refreshedFaviconUrl;
        this._renderFaviconPreview(this.editFaviconPreview, refreshedFaviconUrl);
        this.showFaviconStatus("Favicon refreshed!", "success");
      } else {
        this.showFaviconStatus("Could not fetch favicon", "error");
      }
    } catch (e) {
      this.showFaviconStatus("Error refreshing favicon", "error");
    }
  }

  async handleFaviconFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = this.editUrl?.value.trim();
    if (!url) {
      this.showFaviconStatus("Please enter a URL first", "error");
      return;
    }

    this.showFaviconStatus("Processing image...", "loading");

    try {
      if (window.faviconCache) {
        const dataUrl = await window.faviconCache.importFromFile(
          file,
          url,
          "search",
        );
        this.pendingFaviconDataUrl = dataUrl;
        this._renderFaviconPreview(this.editFaviconPreview, dataUrl);
        this.showFaviconStatus("Custom icon imported!", "success");
      } else {
        // Fallback: just show the image without caching
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          this.pendingFaviconDataUrl = dataUrl;
          this._renderFaviconPreview(this.editFaviconPreview, dataUrl);
          this.showFaviconStatus("Custom icon imported!", "success");
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      this.showFaviconStatus(err.message || "Error importing image", "error");
    }

    // Reset file input so same file can be selected again
    if (this.editFaviconFileInput) {
      this.editFaviconFileInput.value = "";
    }
  }

  async handleImportFaviconFromUrl() {
    const url = this.editUrl?.value.trim();
    if (!url) {
      this.showFaviconStatus("Please enter a URL first", "error");
      return;
    }

    const imageUrl = await this.openUrlInputModal({
      title: "Import Favicon by URL",
      description:
        "Paste a direct icon/image URL. Only HTTP(S) links are supported.",
      label: "Favicon image URL",
      placeholder: "https://example.com/favicon.png",
      submitLabel: "Import",
      initialValue: "https://",
      validate: (value) => {
        let normalized = String(value || "").trim();
        if (!normalized) return "";
        if (!/^https?:\/\//i.test(normalized)) {
          normalized = `https://${normalized}`;
        }

        try {
          const parsed = new URL(normalized);
          if (!["http:", "https:"].includes(parsed.protocol)) {
            return "";
          }
          return parsed.href;
        } catch (_error) {
          return "";
        }
      },
      invalidMessage: "Please enter a valid HTTP(S) image URL.",
    });

    if (!imageUrl) {
      this.showFaviconStatus("Please enter an image URL", "error");
      return;
    }

    this.showFaviconStatus("Importing icon from URL...", "loading");

    try {
      if (!window.faviconCache?.importFromImageUrl) {
        throw new Error("Favicon manager is unavailable.");
      }

      const dataUrl = await window.faviconCache.importFromImageUrl(
        imageUrl,
        url,
        "search",
      );

      this.pendingFaviconDataUrl = dataUrl;
      this._renderFaviconPreview(this.editFaviconPreview, dataUrl);
      this.showFaviconStatus("Icon imported from URL!", "success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error importing icon from image URL";
      this.showFaviconStatus(message, "error");
    }
  }

  showFaviconStatus(message, type = "info") {
    if (!this.editFaviconStatus) return;

    this.editFaviconStatus.textContent = message;
    this.editFaviconStatus.className = `favicon-status favicon-status-${type}`;

    // Auto-clear success messages
    if (type === "success") {
      setTimeout(() => {
        if (this.editFaviconStatus?.textContent === message) {
          this.editFaviconStatus.textContent = "";
          this.editFaviconStatus.className = "favicon-status";
        }
      }, 3000);
    }
  }

  hideEditModal() {
    if (!this.editModal) return;
    this.editModal.classList.remove("active");
    this.pendingFaviconDataUrl = null;
    try {
      this.editModalForm?.reset();
    } catch (e) {}
  }
});
