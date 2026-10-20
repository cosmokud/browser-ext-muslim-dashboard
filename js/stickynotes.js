/**
 * Sticky Notes Manager
 * Beautiful, fully animated, interactive sticky notes with WYSIWYG editing
 * Features: infinite notes, local storage, customization, drag/resize, responsive
 */

class StickyNotesManager {

  constructor(storage) {
    this.storage = storage;
    this.notes = [];
    this.maxZIndex = 1000;
    this.isVisible = true;
    this.activeNote = null;
    this.dragState = null;
    this.resizeState = null;

    // Sticky-note blur popup state (mirrors card blur popup behavior)
    this.noteBlurPopupByNoteId = new Map();
    this.noteBlurPopupPortalled = new WeakSet();
    this.noteBlurPopupPositionRaf = null;

    // Delete confirmation modal state
    this.deleteModal = null;
    this.deletePreviewEl = null;
    this.confirmDeleteBtn = null;
    this.cancelDeleteBtn = null;
    this.pendingDeleteId = null;

    // Custom color picker performance controls.
    this.customColorPreviewTimers = new Map();
    this.customColorSaveTimers = new Map();
    this.customColorPreviewLatestHex = new Map();
    this.customColorPreviewDelayMs = 80;
    this.customColorSaveDelayMs = 220;

    // Color presets for notes (top-left remains the dashboard-linked glass default)
    this.colorPresets = [
      {
        name: "Glass (Default)",
        bg: "var(--glass-bg)",
        text: "var(--text-primary)",
        glass: true,
        blur: 20,
        transparency: 1,
      },
      {
        name: "Canary Yellow",
        bg: "rgba(255, 246, 165, 0.95)",
        text: "#3b3313",
      },
      {
        name: "Sunflower Amber",
        bg: "rgba(255, 211, 110, 0.95)",
        text: "#3a2a05",
      },
      { name: "Tangerine", bg: "rgba(255, 181, 115, 0.95)", text: "#3e250b" },
      {
        name: "Peach Sorbet",
        bg: "rgba(255, 199, 154, 0.95)",
        text: "#3d281a",
      },
      { name: "Rose Blush", bg: "rgba(255, 179, 205, 0.95)", text: "#3a2231" },
      { name: "Mint Leaf", bg: "rgba(183, 244, 209, 0.95)", text: "#1f3a31" },
      { name: "Pistachio", bg: "rgba(203, 232, 154, 0.95)", text: "#253815" },
      { name: "Aqua Breeze", bg: "rgba(158, 236, 230, 0.95)", text: "#123a39" },
      { name: "Sky Blue", bg: "rgba(168, 217, 255, 0.95)", text: "#17344b" },
      { name: "Periwinkle", bg: "rgba(184, 200, 255, 0.95)", text: "#232d4a" },
      { name: "Lavender", bg: "rgba(214, 188, 255, 0.95)", text: "#2f2448" },
      { name: "Kraft Paper", bg: "rgba(232, 209, 164, 0.95)", text: "#3c2f18" },
      { name: "Sticky Blue", bg: "rgba(77, 137, 217, 0.95)", text: "#ffffff" },
      { name: "Slate", bg: "rgba(206, 213, 224, 0.95)", text: "#243243" },
      { name: "Coral Pop", bg: "rgba(255, 154, 138, 0.95)", text: "#40241b" },
      { name: "Neon Lime", bg: "rgba(210, 251, 112, 0.95)", text: "#2a3a0f" },
      { name: "Teal Wave", bg: "rgba(128, 226, 205, 0.95)", text: "#123a33" },
      { name: "Violet Pop", bg: "rgba(193, 168, 246, 0.95)", text: "#2f2550" },
      {
        name: "Custom",
        bg: "linear-gradient(135deg, rgba(255, 246, 165, 0.95), rgba(183, 244, 209, 0.95), rgba(168, 217, 255, 0.95))",
        text: "#27303a",
        custom: true,
        defaultHex: "#fff6a5",
      },
    ];

    this.init();
  }
}

// Export for use
window.StickyNotesManager = StickyNotesManager;
