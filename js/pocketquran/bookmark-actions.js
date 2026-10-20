/**
 * PocketQuranManager: bookmark selection, jumps and pagination.
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
