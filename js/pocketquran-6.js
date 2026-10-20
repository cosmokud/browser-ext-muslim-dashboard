/**
 * PocketQuranManager, part 6 of 6.
 * Moved out of js/pocketquran.js at method boundaries, so no single file carries the
 * whole class. The class itself is declared in js/pocketquran.js; load this after it.
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

  createBookmarkModals() {
    // Main bookmark list modal
    if (!document.getElementById("pqBookmarkModal")) {
      const modal = document.createElement("div");
      modal.id = "pqBookmarkModal";
      modal.className = "pq-bookmark-modal";
      modal.innerHTML = `
        <div class="pq-bookmark-modal-content">
          <div class="pq-bookmark-modal-header">
            <h3 class="pq-bookmark-modal-title">${this._getIcon("📑", {
              size: 20,
            })} Bookmarked Ayahs</h3>
            <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="pq-bookmark-modal-body">
            <div class="pq-bookmark-search">
              <input type="text" class="pq-bookmark-search-input" placeholder="Search categories..." />
              <button type="button" class="pq-bookmark-add-category" title="Add category">${this._getIcon(
                "➕",
                { size: 16 },
              )}</button>
            </div>
            <div class="pq-bookmark-categories"></div>
            <div class="pq-bookmark-ayahs"></div>
            <div class="pq-bookmark-pagination"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      this._bookmarkModal = modal;

      // Event listeners
      modal
        .querySelector(".pq-bookmark-modal-close")
        .addEventListener("click", () => {
          this.closeBookmarkModal();
        });

      this._bindOverlayCloseBehavior(modal, () => this.closeBookmarkModal());

      modal
        .querySelector(".pq-bookmark-search-input")
        .addEventListener("input", (e) => {
          this._bookmarkSearchQuery = e.target.value;
          this._bookmarkCurrentPage = 1;
          this.renderBookmarkModal();
        });

      modal
        .querySelector(".pq-bookmark-add-category")
        .addEventListener("click", () => {
          const name = prompt("Enter category name:");
          if (name) {
            const cat = this.createBookmarkCategory(name);
            if (cat) {
              this.renderBookmarkModal();
            }
          }
        });
    }

    // Category selection modal (for bookmarking an ayah)
    if (!document.getElementById("pqBookmarkCategoryModal")) {
      const modal = document.createElement("div");
      modal.id = "pqBookmarkCategoryModal";
      modal.className = "pq-bookmark-modal";
      modal.innerHTML = `
        <div class="pq-bookmark-modal-content" style="max-width: 450px;">
          <div class="pq-bookmark-modal-header">
            <h3 class="pq-bookmark-modal-title">${this._getIcon("⭐", {
              size: 20,
            })} Bookmark Ayah</h3>
            <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="pq-bookmark-modal-body">
            <div class="pq-bookmark-search">
              <input type="text" class="pq-bookmark-search-input" placeholder="Search categories..." />
              <button type="button" class="pq-bookmark-add-category" title="Add category">${this._getIcon(
                "➕",
                { size: 16 },
              )}</button>
            </div>
            <div class="pq-bookmark-categories"></div>
            <div class="pq-bookmark-pagination"></div>
          </div>
          <div class="pq-bookmark-modal-footer">
            <button type="button" class="pq-bookmark-modal-btn">Cancel</button>
            <button type="button" class="pq-bookmark-modal-btn primary">Save</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      this._bookmarkCategoryModal = modal;

      // Event listeners
      modal
        .querySelector(".pq-bookmark-modal-close")
        .addEventListener("click", () => {
          this.closeCategorySelectionModal();
        });

      this._bindOverlayCloseBehavior(modal, () =>
        this.closeCategorySelectionModal(),
      );

      modal
        .querySelector(".pq-bookmark-search-input")
        .addEventListener("input", (e) => {
          this._bookmarkCategorySearchQuery = e.target.value;
          this._bookmarkCategoryPage = 1;
          this.renderCategorySelectionModal();
        });

      modal
        .querySelector(".pq-bookmark-add-category")
        .addEventListener("click", () => {
          const name = prompt("Enter category name:");
          if (name) {
            const cat = this.createBookmarkCategory(name);
            if (cat) {
              this.renderCategorySelectionModal();
            }
          }
        });

      const buttons = modal.querySelectorAll(
        ".pq-bookmark-modal-footer .pq-bookmark-modal-btn",
      );
      buttons[0].addEventListener("click", () =>
        this.closeCategorySelectionModal(),
      );
      buttons[1].addEventListener("click", () => this.saveBookmarkSelection());
    }
  }

  createTranslationModal() {
    if (document.getElementById("pqTranslationModal")) return;

    const modal = document.createElement("div");
    modal.id = "pqTranslationModal";
    modal.className = "pq-bookmark-modal";
    modal.innerHTML = `
      <div class="pq-bookmark-modal-content pq-translation-modal-content">
        <div class="pq-bookmark-modal-header">
          <h3 class="pq-bookmark-modal-title">🌐 Select Translation</h3>
          <button type="button" class="pq-bookmark-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="pq-bookmark-modal-body">
          <div class="pq-bookmark-search">
            <input type="text" class="pq-bookmark-search-input pq-translation-search" placeholder="Search by language or translator..." />
          </div>
          <div class="pq-translation-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._translationModal = modal;

    // Close button
    modal
      .querySelector(".pq-bookmark-modal-close")
      .addEventListener("click", () => {
        this.closeTranslationModal();
      });

    // Click outside to close
    this._bindOverlayCloseBehavior(modal, () => this.closeTranslationModal());

    // Search input
    const searchInput = modal.querySelector(".pq-translation-search");
    searchInput.addEventListener("input", () => {
      this.renderTranslationList(searchInput.value);
    });

    // Keyboard navigation
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeTranslationModal();
      }
    });

    // Make header meta clickable
    if (this.headerMeta) {
      this.headerMeta.style.cursor = "pointer";
      this.headerMeta.title = "Click to change translation";
      this.headerMeta.addEventListener("click", () => {
        this.openTranslationModal();
      });
    }
  }

  openTranslationModal() {
    const modal = document.getElementById("pqTranslationModal");
    if (!modal) return;

    const searchInput = modal.querySelector(".pq-translation-search");
    if (searchInput) searchInput.value = "";

    this.renderTranslationList("");
    modal.classList.add("active");

    // Focus search input
    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 100);
  }

  closeTranslationModal() {
    const modal = document.getElementById("pqTranslationModal");
    if (modal) modal.classList.remove("active");
  }

  renderTranslationList(query = "") {
    const modal = document.getElementById("pqTranslationModal");
    if (!modal) return;

    const container = modal.querySelector(".pq-translation-list");
    if (!container) return;

    const q = String(query || "")
      .toLowerCase()
      .trim();

    // Group translations by language
    const byLanguage = {};
    for (const [id, info] of Object.entries(PocketQuranManager.TRANSLATIONS)) {
      const lang = info.language || "Other";
      if (!byLanguage[lang]) byLanguage[lang] = [];
      byLanguage[lang].push({ id: parseInt(id, 10), ...info });
    }

    // Sort languages alphabetically
    const sortedLanguages = Object.keys(byLanguage).sort((a, b) =>
      a.localeCompare(b),
    );

    // Filter languages and translations by query
    const filteredLanguages = [];
    for (const lang of sortedLanguages) {
      const langMatches = lang.toLowerCase().includes(q);
      const translations = byLanguage[lang].filter(
        (t) => langMatches || t.label.toLowerCase().includes(q),
      );
      if (translations.length > 0) {
        filteredLanguages.push({ language: lang, translations });
      }
    }

    // Build HTML
    let html = "";
    for (const group of filteredLanguages) {
      html += `<div class="pq-translation-group">
        <div class="pq-translation-lang-header">${this.escapeHtml(
          group.language,
        )}</div>
        <div class="pq-translation-items">`;

      for (const t of group.translations) {
        const isActive = t.id === this._activeTranslationId;
        html += `<button type="button" class="pq-translation-item ${
          isActive ? "active" : ""
        }" data-translation-id="${t.id}">
          <span class="pq-translation-name">${this.escapeHtml(t.label)}</span>
          ${
            isActive
              ? `<span class="pq-translation-check">${this._getIcon("✓", {
                  size: 14,
                })}</span>`
              : ""
          }
        </button>`;
      }

      html += `</div></div>`;
    }

    if (!html) {
      html = `<div class="pq-translation-empty">No translations found for "${this.escapeHtml(
        query,
      )}"</div>`;
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll(".pq-translation-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.translationId, 10);
        if (Number.isFinite(id)) {
          this.selectTranslation(id);
        }
      });
    });

    // Scroll active translation into view
    const activeItem = container.querySelector(".pq-translation-item.active");
    if (activeItem && !q) {
      setTimeout(() => {
        activeItem.scrollIntoView({ block: "center", behavior: "auto" });
      }, 50);
    }
  }

  selectTranslation(translationId) {
    const id = this.normalizeTranslationId(translationId);

    // Close modal
    this.closeTranslationModal();

    // Notify listeners (e.g. Settings UI) that translation changed
    try {
      document.dispatchEvent(
        new CustomEvent("md:pq-translation-selected", {
          detail: { translationId: id },
        }),
      );
    } catch (e) {}

    // Persist and reload
    this.persistPocketQuranSettings({ translationResourceId: id });
    this.reloadTranslation(id);
  }

  openBookmarkModal() {
    this._bookmarkSearchQuery = "";
    this._bookmarkCurrentPage = 1;
    this._selectedCategoryId = null;

    const modal = document.getElementById("pqBookmarkModal");
    if (modal) {
      modal.classList.add("active");
      modal.querySelector(".pq-bookmark-search-input").value = "";
      this.renderBookmarkModal();
    }
  }

  closeBookmarkModal() {
    const modal = document.getElementById("pqBookmarkModal");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  renderBookmarkModal() {
    const modal = document.getElementById("pqBookmarkModal");
    if (!modal) return;

    const categoriesContainer = modal.querySelector(".pq-bookmark-categories");
    const ayahsContainer = modal.querySelector(".pq-bookmark-ayahs");
    const paginationContainer = modal.querySelector(".pq-bookmark-pagination");

    let categories = this.getBookmarkCategories();
    const searchQuery = this._bookmarkSearchQuery.toLowerCase();

    if (searchQuery) {
      categories = categories.filter((c) =>
        c.name.toLowerCase().includes(searchQuery),
      );
    }

    // If a category is selected, show its bookmarks
    if (this._selectedCategoryId) {
      const category = categories.find(
        (c) => c.id === this._selectedCategoryId,
      );
      if (category) {
        categoriesContainer.innerHTML = `
          <div class="pq-bookmark-category active">
            <div class="pq-bookmark-category-info">
              <button type="button" class="pq-bookmark-category-btn back" title="Back to categories">${this._getIcon(
                "←",
                { size: 14 },
              )}</button>
              <span class="pq-bookmark-category-name">${this.escapeHtml(
                category.name,
              )}</span>
              <span class="pq-bookmark-category-count">(${this.getBookmarkCount(
                category.id,
              )} ayahs)</span>
            </div>
          </div>
        `;

        categoriesContainer
          .querySelector(".back")
          .addEventListener("click", () => {
            this._selectedCategoryId = null;
            this._bookmarkCurrentPage = 1;
            this.renderBookmarkModal();
          });

        // Render bookmarks
        const bookmarks = this.getBookmarksForCategory(
          this._selectedCategoryId,
          this._bookmarkSearchQuery,
        );
        const totalPages = Math.ceil(
          bookmarks.length / PocketQuranManager.BOOKMARKS_PER_PAGE,
        );
        const start =
          (this._bookmarkCurrentPage - 1) *
          PocketQuranManager.BOOKMARKS_PER_PAGE;
        const pageBookmarks = bookmarks.slice(
          start,
          start + PocketQuranManager.BOOKMARKS_PER_PAGE,
        );

        if (pageBookmarks.length === 0) {
          ayahsContainer.innerHTML = `
            <div class="pq-bookmark-empty">
              <div class="pq-bookmark-empty-icon">📭</div>
              <div>No bookmarks in this category</div>
            </div>
          `;
        } else {
          ayahsContainer.innerHTML = pageBookmarks
            .map(
              (b) => `
            <div class="pq-bookmark-ayah" data-bookmark-id="${
              b.id
            }" data-surah="${b.surah}" data-ayah="${b.ayah}">
              <div class="pq-bookmark-ayah-badge">${b.surah}:${b.ayah}</div>
              <div class="pq-bookmark-ayah-text">
                <div class="pq-bookmark-ayah-arabic">${this.escapeHtml(
                  b.arabicText || "",
                ).slice(0, 100)}${
                  (b.arabicText || "").length > 100 ? "..." : ""
                }</div>
                <div class="pq-bookmark-ayah-translation">${this.escapeHtml(
                  b.translationText || "",
                ).slice(0, 150)}${
                  (b.translationText || "").length > 150 ? "..." : ""
                }</div>
              </div>
              <button type="button" class="pq-bookmark-ayah-remove" title="Remove bookmark">${this._getIcon(
                "🗑️",
                { size: 16 },
              )}</button>
            </div>
          `,
            )
            .join("");

          // Click handlers for ayahs
          ayahsContainer.querySelectorAll(".pq-bookmark-ayah").forEach((el) => {
            el.addEventListener("click", (e) => {
              if (e.target.closest(".pq-bookmark-ayah-remove")) return;
              const surah = parseInt(el.dataset.surah, 10);
              const ayah = parseInt(el.dataset.ayah, 10);
              this.closeBookmarkModal();
              this.goToBookmarkedAyah(surah, ayah);
            });
          });

          ayahsContainer
            .querySelectorAll(".pq-bookmark-ayah-remove")
            .forEach((btn) => {
              btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const ayahEl = btn.closest(".pq-bookmark-ayah");
                const bookmarkId = ayahEl.dataset.bookmarkId;
                if (confirm("Remove this bookmark?")) {
                  this.removeBookmark(bookmarkId);
                  this.renderBookmarkModal();
                  this.refreshAyahStars();
                }
              });
            });
        }

        // Render pagination
        this.renderPagination(
          paginationContainer,
          totalPages,
          this._bookmarkCurrentPage,
          (page) => {
            this._bookmarkCurrentPage = page;
            this.renderBookmarkModal();
          },
        );
      }
    } else {
      // Show categories list
      ayahsContainer.innerHTML = "";

      const totalPages = Math.ceil(
        categories.length / PocketQuranManager.CATEGORIES_PER_PAGE,
      );
      const start =
        (this._bookmarkCurrentPage - 1) *
        PocketQuranManager.CATEGORIES_PER_PAGE;
      const pageCategories = categories.slice(
        start,
        start + PocketQuranManager.CATEGORIES_PER_PAGE,
      );

      if (pageCategories.length === 0) {
        categoriesContainer.innerHTML = `
          <div class="pq-bookmark-empty">
            <div class="pq-bookmark-empty-icon">${this._getIcon("📁", {
              size: 32,
            })}</div>
            <div>No categories found</div>
          </div>
        `;
      } else {
        categoriesContainer.innerHTML = pageCategories
          .map(
            (c) => `
          <div class="pq-bookmark-category" data-category-id="${c.id}">
            <div class="pq-bookmark-category-info">
              <span class="pq-bookmark-category-name">${this.escapeHtml(
                c.name,
              )}</span>
              <span class="pq-bookmark-category-count">(${this.getBookmarkCount(
                c.id,
              )} ayahs)</span>
            </div>
            <div class="pq-bookmark-category-actions">
              ${
                c.id !== "default"
                  ? `<button type="button" class="pq-bookmark-category-btn rename" title="Rename">${this._getIcon(
                      "✏️",
                      { size: 16 },
                    )}</button>`
                  : ""
              }
              ${
                c.id !== "default"
                  ? `<button type="button" class="pq-bookmark-category-btn delete" title="Delete">${this._getIcon(
                      "🗑️",
                      { size: 16 },
                    )}</button>`
                  : ""
              }
            </div>
          </div>
        `,
          )
          .join("");

        // Click handlers
        categoriesContainer
          .querySelectorAll(".pq-bookmark-category")
          .forEach((el) => {
            el.addEventListener("click", (e) => {
              if (e.target.closest(".pq-bookmark-category-btn")) return;
              this._selectedCategoryId = el.dataset.categoryId;
              this._bookmarkCurrentPage = 1;
              this.renderBookmarkModal();
            });
          });

        categoriesContainer.querySelectorAll(".rename").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const categoryEl = btn.closest(".pq-bookmark-category");
            const categoryId = categoryEl.dataset.categoryId;
            const category = this.getBookmarkCategories().find(
              (c) => c.id === categoryId,
            );
            const newName = prompt("Enter new name:", category?.name);
            if (newName) {
              this.renameBookmarkCategory(categoryId, newName);
              this.renderBookmarkModal();
            }
          });
        });

        categoriesContainer.querySelectorAll(".delete").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const categoryEl = btn.closest(".pq-bookmark-category");
            const categoryId = categoryEl.dataset.categoryId;
            if (confirm("Delete this category and all its bookmarks?")) {
              this.deleteBookmarkCategory(categoryId);
              this.renderBookmarkModal();
              this.refreshAyahStars();
            }
          });
        });
      }

      this.renderPagination(
        paginationContainer,
        totalPages,
        this._bookmarkCurrentPage,
        (page) => {
          this._bookmarkCurrentPage = page;
          this.renderBookmarkModal();
        },
      );
    }
  }

  openCategorySelectionModal(surah, ayah, verse) {
    this._pendingBookmarkAyah = {
      surah,
      ayah,
      arabicText: verse?.text_uthmani || "",
      translationText: this.stripHtmlToText(
        Array.isArray(verse?.translations) ? verse.translations[0]?.text : "",
      ),
    };
    this._bookmarkCategorySearchQuery = "";
    this._bookmarkCategoryPage = 1;

    const modal = document.getElementById("pqBookmarkCategoryModal");
    if (modal) {
      modal.classList.add("active");
      modal.querySelector(".pq-bookmark-search-input").value = "";
      this.renderCategorySelectionModal();
    }
  }

  closeCategorySelectionModal() {
    const modal = document.getElementById("pqBookmarkCategoryModal");
    if (modal) {
      modal.classList.remove("active");
    }
    this._pendingBookmarkAyah = null;
  }

  renderCategorySelectionModal() {
    const modal = document.getElementById("pqBookmarkCategoryModal");
    if (!modal || !this._pendingBookmarkAyah) return;

    const categoriesContainer = modal.querySelector(".pq-bookmark-categories");
    const paginationContainer = modal.querySelector(".pq-bookmark-pagination");

    let categories = this.getBookmarkCategories();
    const searchQuery = this._bookmarkCategorySearchQuery.toLowerCase();

    if (searchQuery) {
      categories = categories.filter((c) =>
        c.name.toLowerCase().includes(searchQuery),
      );
    }

    const totalPages = Math.ceil(
      categories.length / PocketQuranManager.CATEGORIES_PER_PAGE,
    );
    const start =
      (this._bookmarkCategoryPage - 1) * PocketQuranManager.CATEGORIES_PER_PAGE;
    const pageCategories = categories.slice(
      start,
      start + PocketQuranManager.CATEGORIES_PER_PAGE,
    );

    const { surah, ayah } = this._pendingBookmarkAyah;

    if (pageCategories.length === 0) {
      categoriesContainer.innerHTML = `
        <div class="pq-bookmark-empty">
          <div class="pq-bookmark-empty-icon">${this._getIcon("📁", {
            size: 32,
          })}</div>
          <div>No categories found</div>
        </div>
      `;
    } else {
      categoriesContainer.innerHTML = pageCategories
        .map((c) => {
          const isChecked = this.isAyahBookmarkedInCategory(c.id, surah, ayah);
          return `
            <div class="pq-bookmark-category ${
              isChecked ? "active" : ""
            }" data-category-id="${c.id}">
              <div class="pq-bookmark-category-info">
                <div class="pq-bookmark-checkbox ${
                  isChecked ? "checked" : ""
                }"></div>
                <span class="pq-bookmark-category-name">${this.escapeHtml(
                  c.name,
                )}</span>
              </div>
            </div>
          `;
        })
        .join("");

      // Click handlers
      categoriesContainer
        .querySelectorAll(".pq-bookmark-category")
        .forEach((el) => {
          el.addEventListener("click", () => {
            const categoryId = el.dataset.categoryId;
            const checkbox = el.querySelector(".pq-bookmark-checkbox");
            const isCurrentlyChecked = checkbox.classList.contains("checked");

            if (isCurrentlyChecked) {
              this.removeBookmarkByAyah(categoryId, surah, ayah);
              checkbox.classList.remove("checked");
              el.classList.remove("active");
            } else {
              const { arabicText, translationText } = this._pendingBookmarkAyah;
              this.addBookmark(
                categoryId,
                surah,
                ayah,
                arabicText,
                translationText,
              );
              checkbox.classList.add("checked");
              el.classList.add("active");
            }
          });
        });
    }

    this.renderPagination(
      paginationContainer,
      totalPages,
      this._bookmarkCategoryPage,
      (page) => {
        this._bookmarkCategoryPage = page;
        this.renderCategorySelectionModal();
      },
    );
  }

  saveBookmarkSelection() {
    this.closeCategorySelectionModal();
    this.refreshAyahStars();
  }

  goToBookmarkedAyah(surah, ayah) {
    if (surah !== this._activeSurah) {
      this.setActiveSurah(surah, { preserveAyah: false }).then(() => {
        setTimeout(() => {
          this.scrollToAyah(ayah, { persist: true, smooth: true });
        }, 300);
      });
    } else {
      this.scrollToAyah(ayah, { persist: true, smooth: true });
    }
  }

  refreshAyahStars() {
    if (!this._virtualContent) return;

    const starButtons = this._virtualContent.querySelectorAll(
      ".pocket-quran-ayah-star",
    );
    starButtons.forEach((btn) => {
      const ayahEl = btn.closest(".pocket-quran-ayah");
      if (!ayahEl) return;

      const ayahNumber = parseInt(ayahEl.dataset.ayah, 10);
      const isBookmarked = this.isAyahBookmarked(this._activeSurah, ayahNumber);

      btn.classList.toggle("bookmarked", isBookmarked);
      btn.innerHTML = isBookmarked
        ? this._getIcon("⭐", { size: 18 })
        : this._getIcon("☆", { size: 18 });
      btn.title = isBookmarked ? "Manage bookmark" : "Bookmark this ayah";
    });
  }

  renderPagination(container, totalPages, currentPage, onPageChange) {
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }

    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 2) {
        end = Math.min(totalPages - 1, 4);
      } else if (currentPage >= totalPages - 1) {
        start = Math.max(2, totalPages - 3);
      }

      if (start > 2) pages.push("...");

      for (let i = start; i <= end; i++) pages.push(i);

      if (end < totalPages - 1) pages.push("...");

      pages.push(totalPages);
    }

    container.innerHTML = `
      <button type="button" class="pq-bookmark-page-btn" data-page="${
        currentPage - 1
      }" ${currentPage === 1 ? "disabled" : ""}>${this._getIcon("←", {
        size: 14,
      })}</button>
      ${pages
        .map((p) =>
          p === "..."
            ? `<span class="pq-bookmark-page-btn" style="cursor: default; border: none;">...</span>`
            : `<button type="button" class="pq-bookmark-page-btn ${
                p === currentPage ? "active" : ""
              }" data-page="${p}">${p}</button>`,
        )
        .join("")}
      <button type="button" class="pq-bookmark-page-btn" data-page="${
        currentPage + 1
      }" ${currentPage === totalPages ? "disabled" : ""}>${this._getIcon("→", {
        size: 14,
      })}</button>
    `;

    container.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = parseInt(btn.dataset.page, 10);
        if (Number.isFinite(page) && page >= 1 && page <= totalPages) {
          onPageChange(page);
        }
      });
    });
  }
});
