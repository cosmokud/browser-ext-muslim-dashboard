/**
 * Todo Manager
 * Handles todo list with CRUD operations
 */

class TodoManager {
  constructor(storage) {
    this.storage = storage;
    this.todos = [];
    this.filter = "all";
    this.editingId = null;

    // Pagination
    this.itemsPerPage = 10;
    this.currentPage = 1;

    // Elements
    this.todoInput = document.getElementById("todoInput");
    this.todoAddBtn = document.getElementById("todoAddBtn");
    this.todoList = document.getElementById("todoList");
    this.todoCount = document.getElementById("todoCount");
    this.clearCompletedBtn = document.getElementById("clearCompletedBtn");
    this.filterBtns = document.querySelectorAll(".filter-btn");

    this.todoPagination = document.getElementById("todoPagination");

    // Edit modal elements
    this.editModal = document.getElementById("editTodoModal");
    this.editInput = document.getElementById("editTodoInput");
    this.editIdInput = document.getElementById("editTodoId");
    this.editSaveBtn = document.getElementById("editTodoSave");
    this.editCancelBtn = document.getElementById("editTodoCancel");
    this.editCloseBtn = document.getElementById("editTodoClose");
  }

  /**
   * Initialize todo manager
   */
  init() {
    this.loadTodos();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Load todos from storage
   */
  loadTodos() {
    this.todos = this.storage.getTodos();
  }

  /**
   * Save todos to storage
   */
  saveTodos() {
    this.storage.saveTodos(this.todos);
  }

  /**
   * Add new todo
   */
  addTodo(text) {
    if (!text.trim()) return null;

    const todo = {
      id: Date.now(),
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    this.todos.unshift(todo);
    this.saveTodos();
    this.render();

    return todo;
  }

  /**
   * Update todo
   */
  updateTodo(id, updates) {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      Object.assign(todo, updates);
      this.saveTodos();
      this.render();
    }
  }

  /**
   * Delete todo
   */
  deleteTodo(id) {
    this.todos = this.todos.filter((t) => t.id !== id);
    this.saveTodos();
    this.render();
  }

  /**
   * Toggle todo completion
   */
  toggleTodo(id) {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.saveTodos();
      this.render();
    }
  }

  /**
   * Clear completed todos
   */
  clearCompleted() {
    this.todos = this.todos.filter((t) => !t.completed);
    this.saveTodos();
    this.render();
  }

  /**
   * Set filter
   */
  setFilter(filter) {
    this.filter = filter;
    this.currentPage = 1;
    this.render();

    // Update filter buttons
    this.filterBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === filter);
    });
  }

  /**
   * Get filtered todos
   */
  getFilteredTodos() {
    switch (this.filter) {
      case "active":
        return this.todos.filter((t) => !t.completed);
      case "completed":
        return this.todos.filter((t) => t.completed);
      default:
        return this.todos;
    }
  }

  /**
   * Render todo list
   */
  render() {
    const filteredTodos = this.getFilteredTodos();

    const totalPages = Math.max(
      1,
      Math.ceil(filteredTodos.length / this.itemsPerPage)
    );
    this.currentPage = Math.max(1, Math.min(totalPages, this.currentPage));

    const shouldPaginate = filteredTodos.length > this.itemsPerPage;
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const pageTodos = shouldPaginate
      ? filteredTodos.slice(start, start + this.itemsPerPage)
      : filteredTodos;

    if (filteredTodos.length === 0) {
      this.todoList.innerHTML = `
        <li class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p>${
            this.filter === "all"
              ? "No tasks yet. Add one above!"
              : this.filter === "active"
              ? "No active tasks!"
              : "No completed tasks!"
          }</p>
        </li>
      `;

      this.renderPagination({ totalPages: 1, visible: false });
    } else {
      this.todoList.innerHTML = pageTodos
        .map((todo) => this.renderTodoItem(todo))
        .join("");

      this.renderPagination({ totalPages, visible: shouldPaginate });
    }

    // Update count
    const activeCount = this.todos.filter((t) => !t.completed).length;
    const totalCount = this.todos.length;
    this.todoCount.textContent = `${activeCount}/${totalCount} tasks`;

    // Show/hide clear button
    const hasCompleted = this.todos.some((t) => t.completed);
    this.clearCompletedBtn.style.display = hasCompleted ? "block" : "none";
  }

  renderPagination({ totalPages, visible }) {
    if (!this.todoPagination) return;

    if (!visible) {
      this.todoPagination.hidden = true;
      this.todoPagination.innerHTML = "";
      return;
    }

    this.todoPagination.hidden = false;

    const page = this.currentPage;

    const mkBtn = ({
      label,
      pageValue,
      disabled = false,
      ariaLabel,
      active = false,
    }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `todo-page-btn${active ? " active" : ""}`;
      btn.textContent = label;
      if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
      btn.disabled = !!disabled;
      btn.dataset.page = String(pageValue);
      return btn;
    };

    const container = document.createElement("div");
    container.className = "todo-pagination-inner";

    container.appendChild(
      mkBtn({
        label: "❮",
        pageValue: page - 1,
        disabled: page <= 1,
        ariaLabel: "Previous todo page",
      })
    );

    const pagesWrap = document.createElement("div");
    pagesWrap.className = "todo-page-numbers";

    const maxButtons = 5;
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

    let start = clamp(page - 2, 1, Math.max(1, totalPages - (maxButtons - 1)));
    let end = clamp(start + (maxButtons - 1), 1, totalPages);
    start = clamp(end - (maxButtons - 1), 1, totalPages);

    const appendEllipsis = () => {
      const el = document.createElement("span");
      el.className = "todo-page-ellipsis";
      el.textContent = "…";
      pagesWrap.appendChild(el);
    };

    if (start > 1) {
      pagesWrap.appendChild(
        mkBtn({
          label: "1",
          pageValue: 1,
          active: page === 1,
          ariaLabel: "Todo page 1",
        })
      );
      if (start > 2) appendEllipsis();
    }

    for (let p = start; p <= end; p += 1) {
      pagesWrap.appendChild(
        mkBtn({
          label: String(p),
          pageValue: p,
          active: p === page,
          ariaLabel: `Todo page ${p}`,
        })
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) appendEllipsis();
      pagesWrap.appendChild(
        mkBtn({
          label: String(totalPages),
          pageValue: totalPages,
          active: page === totalPages,
          ariaLabel: `Todo page ${totalPages}`,
        })
      );
    }

    container.appendChild(pagesWrap);

    const info = document.createElement("div");
    info.className = "todo-page-info";
    info.textContent = `Page ${page} / ${totalPages}`;
    container.appendChild(info);

    container.appendChild(
      mkBtn({
        label: "❯",
        pageValue: page + 1,
        disabled: page >= totalPages,
        ariaLabel: "Next todo page",
      })
    );

    this.todoPagination.innerHTML = "";
    this.todoPagination.appendChild(container);

    if (!this._paginationBound) {
      this._paginationBound = true;
      this.todoPagination.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-page]");
        if (!btn) return;
        const target = parseInt(btn.dataset.page, 10);
        if (!Number.isFinite(target)) return;
        this.currentPage = target;
        this.render();
      });
    }
  }

  /**
   * Render single todo item
   */
  renderTodoItem(todo) {
    return `
      <li class="todo-item ${todo.completed ? "completed" : ""}" data-id="${
      todo.id
    }">
        <div class="todo-checkbox ${
          todo.completed ? "checked" : ""
        }" data-action="toggle"></div>
        <span class="todo-text">${this.escapeHtml(todo.text)}</span>
        <div class="todo-actions-btns">
          <button class="todo-action-btn edit" data-action="edit" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="todo-action-btn delete" data-action="delete" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
          </button>
        </div>
      </li>
    `;
  }

  /**
   * Open edit modal
   */
  openEditModal(id) {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return;

    this.editingId = id;
    this.editInput.value = todo.text;
    this.editModal.classList.add("active");
    this.editInput.focus();
  }

  /**
   * Close edit modal
   */
  closeEditModal() {
    this.editingId = null;
    this.editInput.value = "";
    this.editModal.classList.remove("active");
  }

  /**
   * Save edit
   */
  saveEdit() {
    if (this.editingId && this.editInput.value.trim()) {
      this.updateTodo(this.editingId, { text: this.editInput.value.trim() });
    }
    this.closeEditModal();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Add todo
    this.todoAddBtn.addEventListener("click", () => {
      if (this.todoInput.value.trim()) {
        this.addTodo(this.todoInput.value);
        this.todoInput.value = "";
        this.todoInput.focus();
      }
    });

    this.todoInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && this.todoInput.value.trim()) {
        this.addTodo(this.todoInput.value);
        this.todoInput.value = "";
      }
    });

    // Todo list actions (event delegation)
    this.todoList.addEventListener("click", (e) => {
      const todoItem = e.target.closest(".todo-item");
      if (!todoItem) return;

      const id = parseInt(todoItem.dataset.id);
      const action = e.target.closest("[data-action]")?.dataset.action;

      switch (action) {
        case "toggle":
          this.toggleTodo(id);
          break;
        case "edit":
          this.openEditModal(id);
          break;
        case "delete":
          this.deleteTodo(id);
          break;
      }
    });

    // Filter buttons
    this.filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setFilter(btn.dataset.filter);
      });
    });

    // Clear completed
    this.clearCompletedBtn.addEventListener("click", () => {
      this.clearCompleted();
    });

    // Edit modal
    this.editSaveBtn.addEventListener("click", () => this.saveEdit());
    this.editCancelBtn.addEventListener("click", () => this.closeEditModal());
    this.editCloseBtn.addEventListener("click", () => this.closeEditModal());

    this.editInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.saveEdit();
      }
    });

    this.editModal.addEventListener("click", (e) => {
      if (e.target === this.editModal) {
        this.closeEditModal();
      }
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use
window.TodoManager = TodoManager;
