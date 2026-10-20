/**
 * SettingsManager, part 5 of 9.
 * Moved out of js/settings.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/settings.js; load this after it.
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

  ensureBackgroundThumbObserver() {
    if (this._backgroundThumbObserver) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    this._backgroundThumbObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const img = entry.target;
          this.loadBackgroundThumbImage(img);

          observer.unobserve(img);
        });
      },
      {
        root: this.customBgList || null,
        rootMargin: "120px 0px",
        threshold: 0.01,
      },
    );
  }

  observeBackgroundThumbImage(imgEl) {
    if (!(imgEl instanceof HTMLImageElement)) {
      return;
    }

    this.ensureBackgroundThumbObserver();
    if (this._backgroundThumbObserver) {
      this._backgroundThumbObserver.observe(imgEl);
      return;
    }

    this.loadBackgroundThumbImage(imgEl);
  }

  getBackgroundImageSelectionMap(settings = null) {
    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();

    const rawMap = resolvedSettings.backgroundImageSelections;
    if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
      return {};
    }

    const normalizedMap = {};
    Object.entries(rawMap).forEach(([category, urls]) => {
      if (!Array.isArray(urls)) return;
      const normalizedCategory = this.normalizeBackgroundCategory(category);

      const dedupedUrls = [];
      const seen = new Set();
      urls.forEach((value) => {
        const normalizedUrl = this.normalizeBackgroundImageUrl(value);
        if (!normalizedUrl || seen.has(normalizedUrl)) return;
        seen.add(normalizedUrl);
        dedupedUrls.push(normalizedUrl);
      });

      const existing = Array.isArray(normalizedMap[normalizedCategory])
        ? normalizedMap[normalizedCategory]
        : [];
      const merged = [];
      const mergedSeen = new Set();
      [...existing, ...dedupedUrls].forEach((url) => {
        if (mergedSeen.has(url)) return;
        mergedSeen.add(url);
        merged.push(url);
      });

      normalizedMap[normalizedCategory] = merged;
    });

    return normalizedMap;
  }

  getAllBackgroundImagesForCategory(category, settings) {
    if (!this.backgrounds) return [];

    if (typeof this.backgrounds.getAllImagesForCategory === "function") {
      return this.backgrounds.getAllImagesForCategory(category, settings);
    }

    if (typeof this.backgrounds.getImagesForCategory === "function") {
      return this.backgrounds.getImagesForCategory(category, settings);
    }

    return [];
  }

  updateBackgroundPoolAddButtonVisibility() {
    const selectedCategory = this.normalizeBackgroundCategory(
      this.bgCategory?.value || "all",
    );

    if (!this.addCustomBgBtn && !this.addCustomBgUrlBtn) {
      this.updateBackgroundPoolModeUi(selectedCategory);
      return;
    }

    const displayValue = selectedCategory === "custom" ? "inline-flex" : "none";
    if (this.addCustomBgBtn) {
      this.addCustomBgBtn.style.display = displayValue;
    }
    if (this.addCustomBgUrlBtn) {
      this.addCustomBgUrlBtn.style.display = displayValue;
    }

    this.updateBackgroundPoolModeUi(selectedCategory);
  }

  updateBackgroundPoolModeUi(category = null) {
    const selectedCategory = this.normalizeBackgroundCategory(
      category || this.bgCategory?.value || "all",
    );
    const isSolid = selectedCategory === "solid";

    if (this.backgroundPoolLabel) {
      this.backgroundPoolLabel.textContent = isSolid
        ? "Solid Color Pool"
        : "Background Image Pool";
    }

    if (this.backgroundPoolHint) {
      this.backgroundPoolHint.textContent = isSolid
        ? "Select which colors are included when the background rotates or refreshes."
        : "Select which images are included when the background rotates or refreshes.";
    }

    if (this.solidColorControls) {
      this.solidColorControls.hidden = !isSolid;
      this.solidColorControls.style.display = isSolid ? "grid" : "none";
    }

    if (isSolid && this.solidColorPicker && this.solidColorHexInput) {
      const pickerValue = this.normalizeSolidColorHex(
        this.solidColorPicker.value || this.solidColorHexInput.value,
      );
      if (pickerValue) {
        this.solidColorPicker.value = pickerValue;
        this.solidColorHexInput.value = pickerValue;
      }
    }
  }

  ensureBackgroundCategorySelectionInitialized(category, allImages, settings) {
    const normalizedCategory = this.normalizeBackgroundCategory(category);
    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();

    const selectionMap = this.getBackgroundImageSelectionMap(resolvedSettings);
    if (
      Object.prototype.hasOwnProperty.call(selectionMap, normalizedCategory)
    ) {
      return selectionMap[normalizedCategory];
    }

    const allUrls = allImages
      .map((image) => this.normalizeBackgroundImageUrl(image.url))
      .filter(Boolean);

    selectionMap[normalizedCategory] = allUrls;
    resolvedSettings.backgroundImageSelections = selectionMap;
    this.storage.saveSettings(resolvedSettings);
    return allUrls;
  }

  saveBackgroundSelectionForCategory(category, selectedUrls, settings = null) {
    if (!category) return;
    const normalizedCategory = this.normalizeBackgroundCategory(category);

    const resolvedSettings =
      settings && typeof settings === "object"
        ? settings
        : this.storage.getSettings();
    const selectionMap = this.getBackgroundImageSelectionMap(resolvedSettings);

    const dedupedUrls = [];
    const seen = new Set();
    selectedUrls.forEach((value) => {
      const normalizedUrl = this.normalizeBackgroundImageUrl(value);
      if (!normalizedUrl || seen.has(normalizedUrl)) return;
      seen.add(normalizedUrl);
      dedupedUrls.push(normalizedUrl);
    });

    selectionMap[normalizedCategory] = dedupedUrls;
    resolvedSettings.backgroundImageSelections = selectionMap;
    this.storage.saveSettings(resolvedSettings);
  }

  updateBackgroundPoolCount(selectedCount, totalCount) {
    if (this.customBgCount) {
      this.customBgCount.textContent = `${selectedCount}/${totalCount} selected`;
    }

    if (this.selectAllBgPoolBtn) {
      this.selectAllBgPoolBtn.disabled =
        totalCount === 0 || selectedCount === totalCount;
    }

    if (this.deselectAllBgPoolBtn) {
      this.deselectAllBgPoolBtn.disabled =
        totalCount === 0 || selectedCount === 0;
    }
  }

  applyBackgroundPoolSelectionToRenderedItems(selectedSet) {
    if (!(selectedSet instanceof Set)) {
      return;
    }

    const items = this.customBgList?.querySelectorAll(".custom-bg-item") || [];
    let selectedCount = 0;

    items.forEach((item, index) => {
      const url = this.normalizeBackgroundImageUrl(
        this._activeBgPoolImages?.[index]?.url,
      );
      const isSelected = Boolean(url) && selectedSet.has(url);
      if (isSelected) {
        selectedCount += 1;
      }

      item.classList.toggle("is-selected", isSelected);
      item.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });

    this.updateBackgroundPoolCount(
      selectedCount,
      this._activeBgPoolImages.length,
    );
  }

  renderBackgroundImagePool() {
    if (!this.customBgList) return;

    this.resetBackgroundThumbObserver();

    const settings = this.storage.getSettings();
    const selectedCategory = this.normalizeBackgroundCategory(
      this.bgCategory?.value || settings.bgCategory || "all",
    );
    this.updateBackgroundPoolModeUi(selectedCategory);

    const rawImages = this.getAllBackgroundImagesForCategory(
      selectedCategory,
      settings,
    );

    const images = (Array.isArray(rawImages) ? rawImages : [])
      .map((entry) => {
        if (
          this.backgrounds &&
          typeof this.backgrounds.normalizeImage === "function"
        ) {
          const normalized = this.backgrounds.normalizeImage(entry);
          return {
            ...normalized,
            isCustomSolid:
              Boolean(entry?.isCustomSolid) ||
              Boolean(normalized?.isCustomSolid),
          };
        }

        if (typeof entry === "string") {
          return { url: entry, credit: "", href: "", isCustomSolid: false };
        }

        return {
          url: entry?.url || "",
          credit: entry?.credit || "",
          href: entry?.href || "",
          isCustomSolid: entry?.isCustomSolid === true,
        };
      })
      .map((entry) => ({
        ...entry,
        url: this.normalizeBackgroundImageUrl(entry.url),
        isCustomSolid: entry?.isCustomSolid === true,
      }))
      .filter((entry) => Boolean(entry.url));

    const solidCustomTemplateSet = new Set(
      selectedCategory === "solid" &&
        Array.isArray(settings.solidColorTemplates)
        ? settings.solidColorTemplates
            .map((entry) => this.normalizeSolidColorHex(entry))
            .filter(Boolean)
        : [],
    );

    this._activeBgPoolCategory = selectedCategory;
    this._activeBgPoolImages = images;

    if (images.length === 0) {
      const emptyHint = document.createElement("p");
      emptyHint.className = "empty-hint";
      emptyHint.textContent =
        selectedCategory === "custom"
          ? "No custom backgrounds yet. Use Import or URL to create your pool."
          : selectedCategory === "solid"
            ? "No solid colors available yet. Add one with the color selector."
            : "No backgrounds available for this category.";
      this.customBgList.replaceChildren(emptyHint);
      this.updateBackgroundPoolCount(0, 0);
      return;
    }

    const selectedUrls = this.ensureBackgroundCategorySelectionInitialized(
      selectedCategory,
      images,
      settings,
    );
    const selectedSet = new Set(selectedUrls);

    const fragment = document.createDocumentFragment();
    const thumbsToObserve = [];
    let selectedCount = 0;

    images.forEach((entry, index) => {
      const isSelected = selectedSet.has(entry.url);
      if (isSelected) selectedCount += 1;

      const item = document.createElement("button");
      item.type = "button";
      item.className = `custom-bg-item${isSelected ? " is-selected" : ""}`;
      item.dataset.index = String(index);
      item.setAttribute("aria-pressed", isSelected ? "true" : "false");

      let thumb = null;
      let solidHex = "";
      let isCustomSolidTemplate = false;
      if (selectedCategory === "solid") {
        solidHex = this.solidColorBackgroundUrlToHex(entry.url) || "#000000";
        isCustomSolidTemplate =
          entry?.isCustomSolid === true || solidCustomTemplateSet.has(solidHex);
        const swatch = document.createElement("span");
        swatch.className = "custom-bg-color-swatch";
        swatch.style.background = solidHex;

        const code = document.createElement("span");
        code.className = "custom-bg-color-code";
        code.textContent = solidHex;
        code.setAttribute("aria-hidden", "true");

        item.setAttribute("aria-label", `Solid color ${solidHex}`);
        item.appendChild(swatch);
        item.appendChild(code);
      } else {
        thumb = document.createElement("img");
        thumb.src = this.getBackgroundThumbnailPlaceholder();
        thumb.dataset.thumbSrc = this.getBackgroundThumbnailUrl(entry.url);
        thumb.dataset.bgSourceUrl = entry.url;
        thumb.alt = `Background ${index + 1}`;
        thumb.className = "custom-bg-thumb";
        thumb.loading = "lazy";
        thumb.decoding = "async";
        thumb.fetchPriority = "low";
        thumbsToObserve.push(thumb);
      }

      const check = document.createElement("span");
      check.className = "custom-bg-item-check";
      check.textContent = "✓";
      check.setAttribute("aria-hidden", "true");

      const canDeleteCustomBg = selectedCategory === "custom";
      const canDeleteCustomSolid =
        selectedCategory === "solid" && isCustomSolidTemplate;

      if (canDeleteCustomBg || canDeleteCustomSolid) {
        const deleteBtn = document.createElement("span");
        deleteBtn.className = "custom-bg-item-delete";
        deleteBtn.innerHTML = this._getIcon("🗑️", {
          size: 14,
          inline: true,
        });
        deleteBtn.setAttribute("role", "button");
        deleteBtn.setAttribute("tabindex", "0");
        deleteBtn.setAttribute(
          "title",
          canDeleteCustomSolid
            ? "Remove custom solid color"
            : "Remove from custom backgrounds",
        );
        deleteBtn.setAttribute(
          "aria-label",
          canDeleteCustomSolid
            ? `Remove custom solid color ${solidHex || index + 1}`
            : `Remove custom background ${index + 1}`,
        );

        const deleteHandler = (event) => {
          event.preventDefault();
          event.stopPropagation();
          void (async () => {
            const confirmed = await this.openConfirmModal({
              icon: "🗑️",
              title: canDeleteCustomSolid
                ? "Remove Custom Solid Color?"
                : "Remove Background?",
              text: canDeleteCustomSolid
                ? "This custom solid color will be removed from your palette."
                : "This background will be removed from your custom pool.",
              hint: "You can import it again anytime.",
              confirmLabel: "Remove",
              cancelLabel: "Keep",
            });

            if (!confirmed) return;
            if (canDeleteCustomSolid) {
              await this.removeSolidColorTemplate(entry.url);
              return;
            }

            await this.removeCustomBackgroundFromPool(entry.url);
          })();
        };

        deleteBtn.addEventListener("click", deleteHandler);
        deleteBtn.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            deleteHandler(event);
          }
        });

        item.appendChild(deleteBtn);
      }

      if (thumb) {
        item.appendChild(thumb);
      }
      item.appendChild(check);
      item.addEventListener("click", () => {
        this.toggleBackgroundPoolImageSelection(index);
      });

      fragment.appendChild(item);
    });

    this.customBgList.replaceChildren(fragment);
    if (selectedCategory !== "solid") {
      thumbsToObserve.forEach((thumb) => {
        this.observeBackgroundThumbImage(thumb);
      });
      this.applyCustomBackgroundThumbsToRenderedPool();
    }
    this.updateBackgroundPoolCount(selectedCount, images.length);
  }

  toggleBackgroundPoolImageSelection(index) {
    const category = this.normalizeBackgroundCategory(
      this._activeBgPoolCategory || this.bgCategory?.value || "all",
    );
    const entry = this._activeBgPoolImages?.[index];
    const imageUrl = this.normalizeBackgroundImageUrl(entry?.url);
    if (!imageUrl) return;

    const settings = this.storage.getSettings();
    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const currentSelection = Object.prototype.hasOwnProperty.call(
      selectionMap,
      category,
    )
      ? selectionMap[category]
      : this._activeBgPoolImages
          .map((image) => this.normalizeBackgroundImageUrl(image.url))
          .filter(Boolean);

    const selectedSet = new Set(currentSelection);
    if (selectedSet.has(imageUrl)) selectedSet.delete(imageUrl);
    else selectedSet.add(imageUrl);

    this.saveBackgroundSelectionForCategory(
      category,
      Array.from(selectedSet),
      settings,
    );
    this.applyBackgroundPoolSelectionToRenderedItems(selectedSet);
    this._backgroundSettingsDirty = true;
  }

  selectAllBackgroundPoolImages() {
    const category = this.normalizeBackgroundCategory(
      this._activeBgPoolCategory || this.bgCategory?.value || "all",
    );
    const urls = this._activeBgPoolImages
      .map((image) => this.normalizeBackgroundImageUrl(image.url))
      .filter(Boolean);
    this.saveBackgroundSelectionForCategory(category, urls);
    this.applyBackgroundPoolSelectionToRenderedItems(new Set(urls));
    this._backgroundSettingsDirty = true;
  }

  deselectAllBackgroundPoolImages() {
    const category = this.normalizeBackgroundCategory(
      this._activeBgPoolCategory || this.bgCategory?.value || "all",
    );
    this.saveBackgroundSelectionForCategory(category, []);
    this.applyBackgroundPoolSelectionToRenderedItems(new Set());
    this._backgroundSettingsDirty = true;
  }

  async addSolidColorTemplate(rawColor) {
    const solidHex = this.normalizeSolidColorHex(rawColor);
    if (!solidHex) {
      this.showToast("Please enter a valid hex color.", "error");
      return false;
    }

    const solidUrl = this.solidColorHexToBackgroundUrl(solidHex);
    if (!solidUrl) {
      this.showToast("Failed to build solid color template.", "error");
      return false;
    }

    const settings = this.storage.getSettings();

    const customTemplates = Array.isArray(settings.solidColorTemplates)
      ? settings.solidColorTemplates
          .map((entry) => this.normalizeSolidColorHex(entry))
          .filter(Boolean)
      : [];

    if (!customTemplates.includes(solidHex)) {
      customTemplates.push(solidHex);
    }
    settings.solidColorTemplates = customTemplates;

    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const solidSelection = Array.isArray(selectionMap.solid)
      ? selectionMap.solid
          .map((entry) => this.normalizeBackgroundImageUrl(entry))
          .filter(Boolean)
      : [];

    if (!solidSelection.includes(solidUrl)) {
      solidSelection.push(solidUrl);
    }
    selectionMap.solid = solidSelection;
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;

    if (this.solidColorPicker) {
      this.solidColorPicker.value = solidHex;
    }
    if (this.solidColorHexInput) {
      this.solidColorHexInput.value = solidHex;
    }

    this.showToast("Solid color template added!", "success");
    return true;
  }

  async removeSolidColorTemplate(value) {
    const solidHex = this.normalizeSolidColorHex(value);
    if (!solidHex) {
      return false;
    }

    const settings = this.storage.getSettings();
    const customTemplates = Array.isArray(settings.solidColorTemplates)
      ? settings.solidColorTemplates
          .map((entry) => this.normalizeSolidColorHex(entry))
          .filter(Boolean)
      : [];

    if (!customTemplates.includes(solidHex)) {
      this.showToast("Only custom solid colors can be removed.", "error");
      return false;
    }

    settings.solidColorTemplates = customTemplates.filter(
      (entry) => entry !== solidHex,
    );

    const solidUrl = this.solidColorHexToBackgroundUrl(solidHex);
    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const currentSolidSelection = Array.isArray(selectionMap.solid)
      ? selectionMap.solid
          .map((entry) => this.normalizeBackgroundImageUrl(entry))
          .filter(Boolean)
      : [];

    if (solidUrl) {
      selectionMap.solid = currentSolidSelection.filter(
        (entry) => entry !== solidUrl,
      );
    } else {
      selectionMap.solid = currentSolidSelection;
    }
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;

    const currentBgUrl = this.normalizeBackgroundImageUrl(
      (typeof this.backgrounds?.getCurrentImageUrl === "function"
        ? this.backgrounds.getCurrentImageUrl(settings)
        : this.backgrounds?.currentImageUrl) || "",
    );

    if (solidUrl && currentBgUrl === solidUrl) {
      const availableSolidUrls = new Set(
        (this.getAllBackgroundImagesForCategory("solid", settings) || [])
          .map((entry) =>
            this.normalizeBackgroundImageUrl(
              typeof entry === "string" ? entry : entry?.url,
            ),
          )
          .filter(Boolean),
      );

      if (!availableSolidUrls.has(solidUrl)) {
        this.refreshBackgroundAfterSettingsSave(settings);
      }
    }

    this.showToast("Custom solid color removed.", "success");
    return true;
  }

  async removeCustomBackgroundFromPool(imageUrl) {
    const normalizedUrl = this.normalizeBackgroundImageUrl(imageUrl);
    if (!normalizedUrl) {
      return false;
    }

    const settings = this.storage.getSettings();
    const customBgRefs = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
          .map((entry) => this.normalizeBackgroundImageUrl(entry))
          .filter((entry) => this.isValidCustomBackgroundReference(entry))
      : [];

    const removalCandidates = new Set([normalizedUrl]);
    const mappedImage = this.normalizeBackgroundImageUrl(
      this._customBackgroundImageByToken?.get(normalizedUrl),
    );
    if (mappedImage) {
      removalCandidates.add(mappedImage);
    }

    const nextRefs = customBgRefs.filter(
      (entry) => !removalCandidates.has(entry),
    );
    if (nextRefs.length === customBgRefs.length) {
      this.showToast("Background not found in pool.", "error");
      return false;
    }

    settings.customBackgrounds = nextRefs.slice(
      0,
      SettingsManager.CUSTOM_BACKGROUND_LIMIT,
    );

    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    Object.keys(selectionMap).forEach((category) => {
      const urls = Array.isArray(selectionMap[category])
        ? selectionMap[category]
        : [];

      selectionMap[category] = urls
        .map((value) => this.normalizeBackgroundImageUrl(value))
        .filter((value) => Boolean(value) && !removalCandidates.has(value));
    });
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);

    for (const candidate of removalCandidates) {
      this._backgroundThumbUrlCache?.delete(candidate);
      this._backgroundThumbPendingLoads?.delete(candidate);
      const blobThumb = this._backgroundThumbBlobUrlCache?.get(candidate);
      if (blobThumb) {
        this._backgroundThumbBlobUrlCache.delete(candidate);
        this.revokeBackgroundThumbBlobUrl(blobThumb);
      }
    }

    if (this.isCustomBackgroundToken(normalizedUrl)) {
      await this.deleteCustomBackgroundMediaByToken(normalizedUrl);
    }

    void this.syncCustomBackgroundMediaFromSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;

    const currentBgUrl = this.normalizeBackgroundImageUrl(
      (typeof this.backgrounds?.getCurrentImageUrl === "function"
        ? this.backgrounds.getCurrentImageUrl(settings)
        : this.backgrounds?.currentImageUrl) || "",
    );
    if (currentBgUrl && removalCandidates.has(currentBgUrl)) {
      this.refreshBackgroundAfterSettingsSave(settings);
    }

    this.showToast("Background removed from pool.", "success");
    return true;
  }

  readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event?.target?.result || "");
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async addCustomBackground(file) {
    const settings = this.storage.getSettings();
    const customBgRefs = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
      : [];

    let base64 = "";
    try {
      base64 = this.normalizeBackgroundImageUrl(
        await this.readFileAsDataUrl(file),
      );
    } catch (e) {
      this.showToast("Failed to read image.", "error");
      return false;
    }

    if (!base64) {
      this.showToast("Failed to read image.", "error");
      return false;
    }

    const thumbnailDataUrl =
      await this.buildCustomBackgroundThumbnailDataUrl(base64);
    const token = await this.saveCustomBackgroundMediaToIndexedDb(
      base64,
      thumbnailDataUrl,
    );
    if (!token) {
      this.showToast("Failed to save background.", "error");
      return false;
    }

    const alreadyExists = customBgRefs.includes(token);
    if (
      !alreadyExists &&
      customBgRefs.length >= SettingsManager.CUSTOM_BACKGROUND_LIMIT
    ) {
      this.showToast(
        `Maximum ${SettingsManager.CUSTOM_BACKGROUND_LIMIT} custom backgrounds allowed`,
        "error",
      );
      return false;
    }

    if (!alreadyExists) {
      customBgRefs.push(token);
    }
    settings.customBackgrounds = customBgRefs.slice(
      0,
      SettingsManager.CUSTOM_BACKGROUND_LIMIT,
    );

    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const customSelection = Array.isArray(selectionMap.custom)
      ? selectionMap.custom.slice()
      : [];
    if (!customSelection.includes(token)) {
      customSelection.push(token);
    }
    selectionMap.custom = customSelection;
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);
    void this.syncCustomBackgroundMediaFromSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;
    this.showToast(
      alreadyExists ? "Background already in pool." : "Background added!",
      "success",
    );
    return true;
  }

  async addCustomBackgroundFromUrl(imageUrl) {
    const normalizedUrl = this.normalizeBackgroundImageImportUrl(imageUrl);
    if (!normalizedUrl) {
      this.showToast("Please enter a valid HTTP(S) image URL.", "error");
      return false;
    }

    const settings = this.storage.getSettings();
    const customBgRefs = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
          .map((entry) => this.normalizeBackgroundImageUrl(entry))
          .filter((entry) => this.isValidCustomBackgroundReference(entry))
      : [];

    const alreadyExists = customBgRefs.includes(normalizedUrl);
    if (
      !alreadyExists &&
      customBgRefs.length >= SettingsManager.CUSTOM_BACKGROUND_LIMIT
    ) {
      this.showToast(
        `Maximum ${SettingsManager.CUSTOM_BACKGROUND_LIMIT} custom backgrounds allowed`,
        "error",
      );
      return false;
    }

    if (!alreadyExists) {
      customBgRefs.push(normalizedUrl);
    }
    settings.customBackgrounds = customBgRefs.slice(
      0,
      SettingsManager.CUSTOM_BACKGROUND_LIMIT,
    );

    const selectionMap = this.getBackgroundImageSelectionMap(settings);
    const customSelection = Array.isArray(selectionMap.custom)
      ? selectionMap.custom.slice()
      : [];
    if (!customSelection.includes(normalizedUrl)) {
      customSelection.push(normalizedUrl);
    }
    selectionMap.custom = customSelection;
    settings.backgroundImageSelections = selectionMap;

    this.storage.saveSettings(settings);
    void this.syncCustomBackgroundMediaFromSettings(settings);
    this.renderBackgroundImagePool();
    this._backgroundSettingsDirty = true;
    this.showToast(
      alreadyExists ? "Background already in pool." : "Background URL added!",
      "success",
    );
    return true;
  }

  async promptAndAddCustomBackgroundFromUrl() {
    const imageUrl = await this.openUrlInputModal({
      title: "Import Background by URL",
      description:
        "Paste a direct image URL. Only HTTP(S) image links are supported.",
      label: "Background image URL",
      placeholder: "https://example.com/wallpaper.jpg",
      submitLabel: "Import",
      initialValue: "https://",
      validate: (value) => {
        const normalized = this.normalizeBackgroundImageImportUrl(value);
        if (!normalized) return "";
        return this.isRemoteBackgroundImageUrl(normalized) ? normalized : "";
      },
      invalidMessage: "Please enter a valid HTTP(S) image URL.",
    });

    if (!imageUrl) {
      return false;
    }

    return this.addCustomBackgroundFromUrl(imageUrl);
  }

  exportAllSettings() {
    this.exportFullExport();
  }

  exportCustomSearches() {
    const searches = this.storage.getCustomSearches
      ? this.storage.getCustomSearches()
      : this.storage.get("customSearches", []);

    const lastId = this.storage.getLastCustomSearchId
      ? this.storage.getLastCustomSearchId()
      : this.storage.get("customSearchLastId", null);

    const exportData = {
      exportType: "customSearches",
      version: 1,
      exportDate: new Date().toISOString(),
      searches: Array.isArray(searches) ? searches : [],
      lastSelectedId: lastId ?? null,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `muslim-dashboard-custom-searches-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Custom searches exported!", "success");
  }

  importCustomSearches(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      const searches = Array.isArray(data)
        ? data
        : Array.isArray(data?.searches)
          ? data.searches
          : null;

      if (!searches) {
        throw new Error(
          "Invalid format: expected an array or { searches: [] }",
        );
      }

      const valid = searches
        .filter(
          (s) =>
            s &&
            typeof s.name === "string" &&
            s.name.trim() !== "" &&
            typeof s.url === "string" &&
            s.url.trim() !== "",
        )
        .map((s) => ({
          id: s.id ?? Date.now() + Math.random(),
          name: String(s.name).trim().slice(0, 40),
          url: String(s.url).trim(),
          favicon: typeof s.favicon === "string" ? s.favicon : null,
        }));

      if (this.storage.saveCustomSearches) {
        this.storage.saveCustomSearches(valid);
      } else {
        this.storage.set("customSearches", valid);
      }

      const incomingLast = data?.lastSelectedId ?? null;
      if (this.storage.saveLastCustomSearchId) {
        this.storage.saveLastCustomSearchId(incomingLast);
      } else {
        this.storage.set("customSearchLastId", incomingLast);
      }

      this.showToast("Custom searches imported! Reloading...", "success");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      this.showToast("Import failed: " + e.message, "error");
    }
  }

  exportFullExport() {
    // Complete export of ALL user data and settings
    const settings = this.storage.getSettings();
    const todos = this.storage.getTodos();
    const userQuotes = this.storage.getUserQuotes();
    const pinnedApps = this.storage.getPinnedApps();
    const lastLocation = this.storage.getLastLocation();

    const customSearches = this.storage.getCustomSearches
      ? this.storage.getCustomSearches()
      : this.storage.get("customSearches", []);

    const customSearchLastId = this.storage.getLastCustomSearchId
      ? this.storage.getLastCustomSearchId()
      : this.storage.get("customSearchLastId", null);

    const notes = this.storage.getNotes
      ? this.storage.getNotes()
      : this.storage.get("notes", []);
    const notesActiveId = this.storage.get("notes_active", null);
    const notesPage = this.storage.get("notes_page", 1);

    const pocketQuranBookmarkCategories = this.storage.get(
      "pocketQuran_bookmarkCategories",
      [],
    );
    const pocketQuranBookmarks = this.storage.get("pocketQuran_bookmarks", []);

    let stickyNotes = [];
    let stickyNotesVisible = null;
    try {
      const rawSticky = localStorage.getItem("stickyNotes");
      stickyNotes = rawSticky ? JSON.parse(rawSticky) : [];
    } catch (e) {
      stickyNotes = [];
    }
    try {
      stickyNotesVisible = localStorage.getItem("stickyNotesVisible");
    } catch (e) {
      stickyNotesVisible = null;
    }

    // Custom backgrounds
    const customBackgrounds = Array.isArray(settings.customBackgrounds)
      ? settings.customBackgrounds
      : [];

    // Flashcard sets - export ALL sets (including defaults with user progress)
    const allFlashcardSets = this.flashcards?.getSets
      ? this.flashcards.getSets()
      : this.storage.get("flashcardSets", []);

    const flashcardProtectedIds =
      typeof FlashcardManager !== "undefined" &&
      Array.isArray(FlashcardManager.PROTECTED_SET_IDS)
        ? FlashcardManager.PROTECTED_SET_IDS
        : [
            "default_top300wordforms",
            "default_99names_ar",
            "default_99names_en",
          ];

    // Separate custom sets and protected set references
    const customFlashcardSets = (
      Array.isArray(allFlashcardSets) ? allFlashcardSets : []
    )
      .filter((s) => s && s.id && !flashcardProtectedIds.includes(s.id))
      .map((s) => ({
        id: String(s.id),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || null,
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter((c) => c && (c.question || c.answer))
              .map((c) => ({
                question: String(c.question || ""),
                answer: String(c.answer || ""),
              }))
          : [],
      }));

    // Flashcard card index positions (remembers which card user was on)
    const flashcardCardIndexBySet = this.storage.get(
      "flashcardCardIndexBySet",
      {},
    );

    // Adhkar sets - export custom sets
    const allAdhkarSets = this.adhkar?.getSets
      ? this.adhkar.getSets()
      : this.storage.get("adhkarSets", []);

    const adhkarProtectedIds =
      typeof AdhkarManager !== "undefined" &&
      Array.isArray(AdhkarManager.PROTECTED_SET_IDS)
        ? AdhkarManager.PROTECTED_SET_IDS
        : [
            "default_adhkar_morning",
            "default_adhkar_evening",
            "default_adhkar_general",
          ];

    const customAdhkarSets = (Array.isArray(allAdhkarSets) ? allAdhkarSets : [])
      .filter((s) => s && s.id && !adhkarProtectedIds.includes(s.id))
      .map((s) => ({
        id: String(s.id),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || null,
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter(
                (c) =>
                  c &&
                  (c.arabic ||
                    c.romanization ||
                    c.english ||
                    c.title ||
                    c.reference),
              )
              .map((c) => ({
                title: String(c.title || ""),
                arabic: String(c.arabic || ""),
                romanization: String(c.romanization || ""),
                english: String(c.english || ""),
                reference: String(c.reference || ""),
                repeat:
                  Number.isFinite(parseInt(c.repeat, 10)) &&
                  parseInt(c.repeat, 10) > 0
                    ? parseInt(c.repeat, 10)
                    : 1,
              }))
          : [],
      }));

    // Adhkar card index positions
    const adhkarCardIndexBySet = this.storage.get("adhkarCardIndexBySet", {});

    // Hadith sets - export custom sets
    const allHadithSets = this.hadith?.getSets
      ? this.hadith.getSets()
      : this.storage.get("hadithSets", []);

    const hadithProtectedIds =
      typeof HadithManager !== "undefined" &&
      Array.isArray(HadithManager.PROTECTED_SET_IDS)
        ? HadithManager.PROTECTED_SET_IDS
        : ["default_hadith_nawawi40", "default_hadith_random200"];

    const customHadithSets = (Array.isArray(allHadithSets) ? allHadithSets : [])
      .filter((s) => s && s.id && !hadithProtectedIds.includes(s.id))
      .map((s) => ({
        id: String(s.id),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || null,
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter((c) => c && (c.text || c.title || c.narrator))
              .map((c) => ({
                title: String(c.title || ""),
                text: String(c.text || ""),
                narrator: String(c.narrator || ""),
                source: String(c.source || ""),
                grade: String(c.grade || ""),
                arabicText: String(c.arabicText || ""),
                reference: String(c.reference || ""),
                book: String(c.book || ""),
                chapter: String(c.chapter || ""),
                number: c.number ?? null,
              }))
          : [],
      }));

    // Hadith card index positions
    const hadithCardIndexBySet = this.storage.get("hadithCardIndexBySet", {});

    const exportData = {
      exportType: "full",
      version: 3,
      exportDate: new Date().toISOString(),
      settings,
      todos,
      userQuotes: Array.isArray(userQuotes) ? userQuotes : [],
      pinnedApps,
      lastLocation,

      // Search Bar
      customSearches: Array.isArray(customSearches) ? customSearches : [],
      customSearchLastId: customSearchLastId ?? null,

      // Notes
      notes: Array.isArray(notes) ? notes : [],
      notesActiveId: notesActiveId ?? null,
      notesPage: Number.isFinite(Number(notesPage)) ? Number(notesPage) : 1,

      // Pocket Quran bookmarks
      pocketQuranBookmarks: {
        categories: Array.isArray(pocketQuranBookmarkCategories)
          ? pocketQuranBookmarkCategories
          : [],
        bookmarks: Array.isArray(pocketQuranBookmarks)
          ? pocketQuranBookmarks
          : [],
      },

      // Flashcards - custom sets only (defaults are auto-loaded)
      flashcards: {
        activeSetId:
          this.flashcards?.getActiveSetId?.() ||
          settings.flashcards?.activeSetId ||
          null,
        sets: customFlashcardSets,
        cardIndexBySet: flashcardCardIndexBySet,
      },

      // Adhkar - custom sets only (defaults are auto-loaded)
      adhkar: {
        activeSetId:
          this.adhkar?.getActiveSetId?.() ||
          settings.adhkar?.activeSetId ||
          null,
        sets: customAdhkarSets,
        cardIndexBySet: adhkarCardIndexBySet,
      },

      // Hadith - custom sets only (defaults are auto-loaded)
      hadith: {
        activeSetId:
          this.hadith?.getActiveSetId?.() ||
          settings.hadith?.activeSetId ||
          null,
        sets: customHadithSets,
        cardIndexBySet: hadithCardIndexBySet,
      },

      // Custom backgrounds (also in settings.customBackgrounds but kept for clarity)
      customBackgrounds,

      // Sticky Notes (not prefixed under StorageManager)
      stickyNotes: {
        notes: Array.isArray(stickyNotes) ? stickyNotes : [],
        visible:
          stickyNotesVisible === null ? null : stickyNotesVisible !== "false",
      },
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `muslim-dashboard-full-export-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Full export created!", "success");
  }

  _importSharedBackupData(data, { includeUserQuotes = false } = {}) {
    if (data.settings) {
      this.storage.saveSettings(data.settings);
    }

    if (data.todos) {
      this.storage.saveTodos(data.todos);
    }

    if (includeUserQuotes && data.userQuotes) {
      this.storage.saveUserQuotes(data.userQuotes);
    }

    if (data.pinnedApps) {
      this.storage.savePinnedApps(data.pinnedApps);
    }

    if (data.lastLocation) {
      this.storage.saveLastLocation(data.lastLocation);
    }

    if (Array.isArray(data.customSearches)) {
      if (this.storage.saveCustomSearches) {
        this.storage.saveCustomSearches(data.customSearches);
      } else {
        this.storage.set("customSearches", data.customSearches);
      }
    }

    if ("customSearchLastId" in (data || {})) {
      if (this.storage.saveLastCustomSearchId) {
        this.storage.saveLastCustomSearchId(data.customSearchLastId ?? null);
      } else {
        this.storage.set("customSearchLastId", data.customSearchLastId ?? null);
      }
    }

    if (Array.isArray(data.notes)) {
      if (this.storage.saveNotes) this.storage.saveNotes(data.notes);
      else this.storage.set("notes", data.notes);
    }
    if ("notesActiveId" in (data || {})) {
      this.storage.set("notes_active", data.notesActiveId ?? null);
    }
    if ("notesPage" in (data || {})) {
      const n = parseInt(data.notesPage, 10);
      this.storage.set("notes_page", Number.isFinite(n) && n > 0 ? n : 1);
    }

    if (
      data.pocketQuranBookmarks &&
      typeof data.pocketQuranBookmarks === "object"
    ) {
      const cats = data.pocketQuranBookmarks.categories;
      const bms = data.pocketQuranBookmarks.bookmarks;
      if (Array.isArray(cats))
        this.storage.set("pocketQuran_bookmarkCategories", cats);
      if (Array.isArray(bms)) this.storage.set("pocketQuran_bookmarks", bms);
    }
  }

  importFullExport(data) {
    const maxSets =
      typeof FlashcardManager !== "undefined" &&
      typeof FlashcardManager.MAX_SETS === "number"
        ? FlashcardManager.MAX_SETS
        : 10;

    this._importSharedBackupData(data);

    // Sticky notes (replace)
    if (data.stickyNotes && typeof data.stickyNotes === "object") {
      try {
        const incomingNotes = Array.isArray(data.stickyNotes.notes)
          ? data.stickyNotes.notes
          : [];
        localStorage.setItem("stickyNotes", JSON.stringify(incomingNotes));
      } catch (e) {
        // ignore
      }
      try {
        if (typeof data.stickyNotes.visible === "boolean") {
          localStorage.setItem(
            "stickyNotesVisible",
            String(data.stickyNotes.visible),
          );
        }
      } catch (e) {
        // ignore
      }
    }

    // Continue with a fresh settings object so we can safely patch fields below.
    const settings = this.storage.getSettings();

    // Backgrounds (full export supports overriding these explicitly)
    if (Array.isArray(data.customBackgrounds)) {
      const filtered = data.customBackgrounds
        .map((x) => this.normalizeBackgroundImageUrl(x))
        .filter((x) => this.isValidCustomBackgroundReference(x))
        .slice(0, SettingsManager.CUSTOM_BACKGROUND_LIMIT);
      settings.customBackgrounds = filtered;
    }

    // Quotes (replace)
    if (Array.isArray(data.userQuotes)) {
      const validQuotes = data.userQuotes
        .filter((q) => q && typeof q.text === "string" && q.text.trim() !== "")
        .map((q) => ({
          id: q.id || Date.now() + Math.random(),
          text: String(q.text),
          source: String(q.source || ""),
          isArabic: !!q.isArabic,
        }));
      this.storage.saveUserQuotes(validQuotes);
    }

    // Flashcards (replace custom sets, keep default)
    const existingSets = this.storage.get("flashcardSets", []);

    const protectedIds =
      typeof FlashcardManager !== "undefined" &&
      Array.isArray(FlashcardManager.PROTECTED_SET_IDS)
        ? FlashcardManager.PROTECTED_SET_IDS
        : ["default"];

    const defaultDefs = Array.isArray(FlashcardManager.DEFAULT_SETS)
      ? FlashcardManager.DEFAULT_SETS
      : [{ id: "default", name: "Default" }];

    const protectedSetsOrdered = defaultDefs.map((def) => {
      const existing = Array.isArray(existingSets)
        ? existingSets.find((s) => s && s.id === def.id)
        : null;
      if (existing) return existing;
      return {
        id: def.id,
        name: def.name || "Default",
        createdAt: new Date().toISOString(),
        cards: [],
      };
    });

    const incomingSetsRaw =
      data.flashcards?.sets || data.flashcardSets || data.flashcards || [];
    const incomingSets = Array.isArray(incomingSetsRaw) ? incomingSetsRaw : [];

    const cleanedCustomSets = incomingSets
      .filter((s) => s && s.id && !protectedIds.includes(s.id))
      .map((s, i) => ({
        id: String(s.id || `set_${Date.now()}_${i}`),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter((c) => c && (c.question || c.answer))
              .map((c) => ({
                question: String(c.question || ""),
                answer: String(c.answer || ""),
              }))
          : [],
      }))
      .slice(0, Math.max(0, maxSets - protectedSetsOrdered.length));

    // Keep only custom sets in storage; protected defaults are loaded from bundled files at runtime.
    this.storage.set("flashcardSets", cleanedCustomSets);

    // Flashcards active set (optional)
    const incomingActiveSetId = data.flashcards?.activeSetId;
    if (
      incomingActiveSetId &&
      typeof incomingActiveSetId === "string" &&
      (protectedIds.includes(incomingActiveSetId) ||
        cleanedCustomSets.some((s) => s.id === incomingActiveSetId))
    ) {
      settings.flashcards = {
        ...(settings.flashcards || {}),
        activeSetId: incomingActiveSetId,
      };
    } else {
      settings.flashcards = {
        ...(settings.flashcards || {}),
        activeSetId: protectedSetsOrdered[0]?.id || "default",
      };
    }

    // Adhkar (replace custom sets; keep existing protected defaults if present;
    // missing defaults will be restored by AdhkarManager.ensureDefaultSets on reload)
    const maxAdhkarSets =
      typeof AdhkarManager !== "undefined" &&
      typeof AdhkarManager.MAX_SETS === "number"
        ? AdhkarManager.MAX_SETS
        : 100;

    const existingAdhkarSets = this.storage.get("adhkarSets", []);

    const adhkarProtectedIds =
      typeof AdhkarManager !== "undefined" &&
      Array.isArray(AdhkarManager.PROTECTED_SET_IDS)
        ? AdhkarManager.PROTECTED_SET_IDS
        : [
            "default_adhkar_morning",
            "default_adhkar_evening",
            "default_adhkar_general",
          ];

    const adhkarDefaultDefs =
      typeof AdhkarManager !== "undefined" &&
      Array.isArray(AdhkarManager.DEFAULT_SETS)
        ? AdhkarManager.DEFAULT_SETS
        : [];

    const reservedAdhkarDefaultCount =
      adhkarDefaultDefs.length || adhkarProtectedIds.length;

    const incomingAdhkarSetsRaw =
      data.adhkar?.sets ||
      data.adhkarSets ||
      (Array.isArray(data.adhkar) ? data.adhkar : []);
    const incomingAdhkarSets = Array.isArray(incomingAdhkarSetsRaw)
      ? incomingAdhkarSetsRaw
      : [];

    const cleanedCustomAdhkarSets = incomingAdhkarSets
      .filter((s) => s && s.id && !adhkarProtectedIds.includes(s.id))
      .map((s, i) => ({
        id: String(s.id || `set_${Date.now()}_${i}`),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter(
                (c) =>
                  c &&
                  (c.arabic ||
                    c.romanization ||
                    c.english ||
                    c.title ||
                    c.reference),
              )
              .map((c) => ({
                title: String(c.title || ""),
                arabic: String(c.arabic || ""),
                romanization: String(c.romanization || ""),
                english: String(c.english || ""),
                reference: String(c.reference || ""),
                repeat: (() => {
                  const n = parseInt(c.repeat, 10);
                  return Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : 1;
                })(),
              }))
          : [],
      }))
      .slice(0, Math.max(0, maxAdhkarSets - reservedAdhkarDefaultCount));

    this.storage.set("adhkarSets", cleanedCustomAdhkarSets);

    const incomingAdhkarActiveSetId = data.adhkar?.activeSetId;
    const validActiveAdhkarId =
      typeof incomingAdhkarActiveSetId === "string" &&
      (adhkarProtectedIds.includes(incomingAdhkarActiveSetId) ||
        cleanedCustomAdhkarSets.some(
          (s) => s && s.id === incomingAdhkarActiveSetId,
        ))
        ? incomingAdhkarActiveSetId
        : adhkarDefaultDefs[0]?.id || "default_adhkar_morning";

    settings.adhkar = {
      ...(settings.adhkar || {}),
      activeSetId: validActiveAdhkarId,
    };

    // Hadith (import custom sets; defaults will be restored by HadithManager.ensureDefaultSets on reload)
    const maxHadithSets =
      typeof HadithManager !== "undefined" &&
      typeof HadithManager.MAX_SETS === "number"
        ? HadithManager.MAX_SETS
        : 100;

    const existingHadithSets = this.storage.get("hadithSets", []);

    const hadithProtectedIds =
      typeof HadithManager !== "undefined" &&
      Array.isArray(HadithManager.PROTECTED_SET_IDS)
        ? HadithManager.PROTECTED_SET_IDS
        : ["default_hadith_nawawi40", "default_hadith_random200"];

    const hadithDefaultDefs =
      typeof HadithManager !== "undefined" &&
      Array.isArray(HadithManager.DEFAULT_SETS)
        ? HadithManager.DEFAULT_SETS
        : [];

    const reservedHadithDefaultCount =
      hadithDefaultDefs.length || hadithProtectedIds.length;

    const incomingHadithSetsRaw =
      data.hadith?.sets ||
      data.hadithSets ||
      (Array.isArray(data.hadith) ? data.hadith : []);
    const incomingHadithSets = Array.isArray(incomingHadithSetsRaw)
      ? incomingHadithSetsRaw
      : [];

    const cleanedCustomHadithSets = incomingHadithSets
      .filter((s) => s && s.id && !hadithProtectedIds.includes(s.id))
      .map((s, i) => ({
        id: String(s.id || `set_${Date.now()}_${i}`),
        name: String(s.name || "Imported").slice(0, 40),
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || null,
        cards: Array.isArray(s.cards)
          ? s.cards
              .filter((c) => c && (c.text || c.title || c.narrator))
              .map((c) => ({
                title: String(c.title || ""),
                text: String(c.text || ""),
                narrator: String(c.narrator || ""),
                source: String(c.source || ""),
                grade: String(c.grade || ""),
                arabicText: String(c.arabicText || ""),
                reference: String(c.reference || ""),
                book: String(c.book || ""),
                chapter: String(c.chapter || ""),
                number: c.number ?? null,
              }))
          : [],
      }))
      .slice(0, Math.max(0, maxHadithSets - reservedHadithDefaultCount));

    this.storage.set("hadithSets", cleanedCustomHadithSets);

    const incomingHadithActiveSetId = data.hadith?.activeSetId;
    const validActiveHadithId =
      typeof incomingHadithActiveSetId === "string" &&
      (hadithProtectedIds.includes(incomingHadithActiveSetId) ||
        cleanedCustomHadithSets.some(
          (s) => s && s.id === incomingHadithActiveSetId,
        ))
        ? incomingHadithActiveSetId
        : hadithDefaultDefs[0]?.id || "default_hadith_nawawi40";

    settings.hadith = {
      ...(settings.hadith || {}),
      activeSetId: validActiveHadithId,
    };

    // Import card index positions (which card user was on in each set)
    if (
      data.flashcards?.cardIndexBySet &&
      typeof data.flashcards.cardIndexBySet === "object"
    ) {
      this.storage.set(
        "flashcardCardIndexBySet",
        data.flashcards.cardIndexBySet,
      );
    }

    if (
      data.adhkar?.cardIndexBySet &&
      typeof data.adhkar.cardIndexBySet === "object"
    ) {
      this.storage.set("adhkarCardIndexBySet", data.adhkar.cardIndexBySet);
    }

    if (
      data.hadith?.cardIndexBySet &&
      typeof data.hadith.cardIndexBySet === "object"
    ) {
      this.storage.set("hadithCardIndexBySet", data.hadith.cardIndexBySet);
    }

    this.storage.saveSettings(settings);
    void this.syncCustomBackgroundMediaFromSettings(settings);
  }

  importAllSettings(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // Full export import
      if (data && data.exportType === "full") {
        this.importFullExport(data);
        this.showToast("Full export imported! Reloading...", "success");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        return;
      }

      if (!data.version || !data.settings) {
        throw new Error("Invalid backup file format");
      }

      this._importSharedBackupData(data, { includeUserQuotes: true });

      this.showToast("Settings imported! Reloading...", "success");

      // Reload page to apply all settings
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      this.showToast("Import failed: " + e.message, "error");
    }
  }
});
