/**
 * GridLayoutManager: sidebar resize handles.
 * Part of the class declared in js/gridlayout/index.js; load this after it.
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
})(GridLayoutManager.prototype, class {

  ensureSidebarResizeHandles(el) {
    if (!el) return;
    el.classList.add("sidebar-resizable-host");

    const hasLeft = !!el.querySelector(":scope > .sidebar-resize-handle-left");
    const hasRight = !!el.querySelector(
      ":scope > .sidebar-resize-handle-right",
    );

    const makeHandle = (side) => {
      const handle = document.createElement("div");
      handle.className = `sidebar-resize-handle sidebar-resize-handle-${side}`;
      handle.setAttribute("aria-hidden", "true");
      return handle;
    };

    if (!hasLeft) {
      el.appendChild(makeHandle("left"));
    }
    if (!hasRight) {
      el.appendChild(makeHandle("right"));
    }
  }

  removeSidebarResizeHandles(el) {
    if (!el) return;

    Array.from(el.querySelectorAll(":scope > .sidebar-resize-handle")).forEach(
      (handle) => {
        try {
          handle.remove();
        } catch (e) {}
      },
    );
    el.classList.remove("sidebar-resizable-host", "sidebar-resizing");
  }
});
