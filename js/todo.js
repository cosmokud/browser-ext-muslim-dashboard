/**
 * Todo Manager
 * Handles todo list with CRUD operations
 */

class TodoManager {
  constructor(storage) {
    this.storage = storage;
    this.todos = [];
    this.filter = 'all';
    this.editingId = null;
    
    // Elements
    this.todoInput = document.getElementById('todoInput');
    this.todoAddBtn = document.getElementById('todoAddBtn');
    this.todoList = document.getElementById('todoList');
    this.todoCount = document.getElementById('todoCount');
    this.clearCompletedBtn = document.getElementById('clearCompletedBtn');
    this.filterBtns = document.querySelectorAll('.filter-btn');
    
    // Edit modal elements
    this.editModal = document.getElementById('editTodoModal');
    this.editInput = document.getElementById('editTodoInput');
    this.editIdInput = document.getElementById('editTodoId');
    this.editSaveBtn = document.getElementById('editTodoSave');
    this.editCancelBtn = document.getElementById('editTodoCancel');
    this.editCloseBtn = document.getElementById('editTodoClose');
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
      createdAt: new Date().toISOString()
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
    const todo = this.todos.find(t => t.id === id);
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
    this.todos = this.todos.filter(t => t.id !== id);
    this.saveTodos();
    this.render();
  }

  /**
   * Toggle todo completion
   */
  toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
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
    this.todos = this.todos.filter(t => !t.completed);
    this.saveTodos();
    this.render();
  }

  /**
   * Set filter
   */
  setFilter(filter) {
    this.filter = filter;
    this.render();
    
    // Update filter buttons
    this.filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  }

  /**
   * Get filtered todos
   */
  getFilteredTodos() {
    switch (this.filter) {
      case 'active':
        return this.todos.filter(t => !t.completed);
      case 'completed':
        return this.todos.filter(t => t.completed);
      default:
        return this.todos;
    }
  }

  /**
   * Render todo list
   */
  render() {
    const filteredTodos = this.getFilteredTodos();
    
    if (filteredTodos.length === 0) {
      this.todoList.innerHTML = `
        <li class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p>${this.filter === 'all' ? 'No tasks yet. Add one above!' : 
               this.filter === 'active' ? 'No active tasks!' : 'No completed tasks!'}</p>
        </li>
      `;
    } else {
      this.todoList.innerHTML = filteredTodos.map(todo => this.renderTodoItem(todo)).join('');
    }
    
    // Update count
    const activeCount = this.todos.filter(t => !t.completed).length;
    const totalCount = this.todos.length;
    this.todoCount.textContent = `${activeCount}/${totalCount} tasks`;
    
    // Show/hide clear button
    const hasCompleted = this.todos.some(t => t.completed);
    this.clearCompletedBtn.style.display = hasCompleted ? 'block' : 'none';
  }

  /**
   * Render single todo item
   */
  renderTodoItem(todo) {
    return `
      <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
        <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-action="toggle"></div>
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
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;
    
    this.editingId = id;
    this.editInput.value = todo.text;
    this.editModal.classList.add('active');
    this.editInput.focus();
  }

  /**
   * Close edit modal
   */
  closeEditModal() {
    this.editingId = null;
    this.editInput.value = '';
    this.editModal.classList.remove('active');
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
    this.todoAddBtn.addEventListener('click', () => {
      if (this.todoInput.value.trim()) {
        this.addTodo(this.todoInput.value);
        this.todoInput.value = '';
        this.todoInput.focus();
      }
    });
    
    this.todoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && this.todoInput.value.trim()) {
        this.addTodo(this.todoInput.value);
        this.todoInput.value = '';
      }
    });
    
    // Todo list actions (event delegation)
    this.todoList.addEventListener('click', (e) => {
      const todoItem = e.target.closest('.todo-item');
      if (!todoItem) return;
      
      const id = parseInt(todoItem.dataset.id);
      const action = e.target.closest('[data-action]')?.dataset.action;
      
      switch (action) {
        case 'toggle':
          this.toggleTodo(id);
          break;
        case 'edit':
          this.openEditModal(id);
          break;
        case 'delete':
          this.deleteTodo(id);
          break;
      }
    });
    
    // Filter buttons
    this.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setFilter(btn.dataset.filter);
      });
    });
    
    // Clear completed
    this.clearCompletedBtn.addEventListener('click', () => {
      this.clearCompleted();
    });
    
    // Edit modal
    this.editSaveBtn.addEventListener('click', () => this.saveEdit());
    this.editCancelBtn.addEventListener('click', () => this.closeEditModal());
    this.editCloseBtn.addEventListener('click', () => this.closeEditModal());
    
    this.editInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveEdit();
      }
    });
    
    this.editModal.addEventListener('click', (e) => {
      if (e.target === this.editModal) {
        this.closeEditModal();
      }
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use
window.TodoManager = TodoManager;
