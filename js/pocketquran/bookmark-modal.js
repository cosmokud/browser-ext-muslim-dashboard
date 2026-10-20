/**
 * PocketQuranManager: bookmark and category modals.
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
});
