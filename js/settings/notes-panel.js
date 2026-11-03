/**
 * SettingsManager: notes count, export and import.
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

  updateNotesCountHint() {
    if (!this.notesCountHint) return;
    const notes = this.storage.get("notes", []);
    const count = Array.isArray(notes) ? notes.length : 0;
    this.notesCountHint.textContent = `Currently stored: ${count} note${
      count === 1 ? "" : "s"
    }.`;
  }

  exportNotes() {
    const notes = this.storage.get("notes", []);
    const payload = {
      exportType: "notes",
      version: 1,
      exportDate: new Date().toISOString(),
      notes: Array.isArray(notes) ? notes : [],
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `muslim-dashboard-notes-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Notes exported successfully!", "success");
  }

  handleNotesImport(e) {
    const input = e && e.target;
    const file = input && input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const data = JSON.parse(text);

        const incoming = Array.isArray(data)
          ? data
          : data && Array.isArray(data.notes)
            ? data.notes
            : null;

        if (!incoming) {
          this.showToast("Invalid notes JSON format.", "error");
          return;
        }

        const existing = Array.isArray(this.storage.get("notes", []))
          ? this.storage.get("notes", [])
          : [];

        const byId = new Set(
          existing.map((n) => String(n && n.id ? n.id : "")),
        );
        const now = Date.now();

        const normalized = incoming
          .filter((n) => n && typeof n === "object")
          .map((n) => {
            let id = String(n.id || "").trim();
            if (!id || byId.has(id)) {
              id = this._generateNotesId();
            }
            byId.add(id);

            const title = String(n.title || "Untitled").slice(0, 120);
            const html = typeof n.html === "string" ? n.html : "";
            const rawScale =
              typeof n.scale === "number" || typeof n.scale === "string"
                ? parseFloat(n.scale)
                : 1;
            const scale = Number.isNaN(rawScale)
              ? 1
              : Math.max(1, Math.min(5, rawScale));
            const createdAt =
              typeof n.createdAt === "number" ? n.createdAt : now;
            const updatedAt =
              typeof n.updatedAt === "number" ? n.updatedAt : createdAt;

            return { id, title, html, scale, createdAt, updatedAt };
          });

        const merged = existing.concat(normalized);
        merged.sort(
          (a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0),
        );

        this.storage.set("notes", merged);

        this.updateNotesCountHint();

        try {
          window.dashboard?.notes?.reloadFromStorage?.();
        } catch (err) {
          // ignore
        }

        this.showToast(
          `Imported ${normalized.length} note${
            normalized.length === 1 ? "" : "s"
          }.`,
          "success",
        );
      } catch (err) {
        console.error("Notes import error:", err);
        this.showToast("Failed to import notes JSON.", "error");
      } finally {
        try {
          input.value = "";
        } catch (e2) {}
      }
    };

    reader.onerror = () => {
      this.showToast("Failed to read file.", "error");
      try {
        input.value = "";
      } catch (e2) {}
    };

    reader.readAsText(file);
  }

  _generateNotesId() {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    ).slice(0, 24);
  }
});
