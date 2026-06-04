// 高级待办应用主逻辑

// 数据模型
const todoModel = {
  // 默认分类
  defaultCategories: ['work', 'personal', 'shopping', 'other'],

  // 从localStorage获取分类列表
  getCategories: () => {
    const categories = localStorage.getItem('categories');
    return categories ? JSON.parse(categories) : todoModel.defaultCategories;
  },

  // 保存分类列表到localStorage
  saveCategories: (categories) => {
    localStorage.setItem('categories', JSON.stringify(categories));
  },

  // 添加新分类
  addCategory: (name) => {
    const categories = todoModel.getCategories();
    if (!categories.includes(name)) {
      categories.push(name);
      todoModel.saveCategories(categories);
    }
    return categories;
  },

  // 更新分类名称
  updateCategory: (oldName, newName) => {
    const categories = todoModel.getCategories();
    const index = categories.indexOf(oldName);
    if (index !== -1) {
      categories[index] = newName;
      todoModel.saveCategories(categories);

      // 更新关联事项的分类
      const todos = todoModel.getTodos();
      const updatedTodos = todos.map(todo =>
        todo.category === oldName ? { ...todo, category: newName } : todo
      );
      todoModel.saveTodos(updatedTodos);
    }
    return categories;
  },

  // 删除分类
  deleteCategory: (name) => {
    // 不能删除默认分类
    if (todoModel.defaultCategories.includes(name)) {
      return false;
    }

    const categories = todoModel.getCategories();
    const index = categories.indexOf(name);
    if (index !== -1) {
      categories.splice(index, 1);
      todoModel.saveCategories(categories);

      // 将关联事项的分类设为默认
      const todos = todoModel.getTodos();
      const updatedTodos = todos.map(todo =>
        todo.category === name ? { ...todo, category: 'other' } : todo
      );
      todoModel.saveTodos(updatedTodos);
    }
    return categories;
  },

  // 从localStorage获取待办事项
  getTodos: () => {
    const todos = localStorage.getItem('todos');
    return todos ? JSON.parse(todos) : [];
  },

  // 保存待办事项到localStorage
  saveTodos: (todos) => {
    localStorage.setItem('todos', JSON.stringify(todos));
  },

  // 添加新待办事项
  addTodo: (text, category, dueDate) => {
    const todos = todoModel.getTodos();
    const newTodo = {
      id: Date.now(),
      text,
      completed: false,
      category: category || 'other',
      dueDate: dueDate || null,
      createdAt: new Date().toISOString()
    };
    todos.push(newTodo);
    todoModel.saveTodos(todos);
    return newTodo;
  },

  // 切换待办事项状态
  toggleTodo: (id) => {
    const todos = todoModel.getTodos();
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    todoModel.saveTodos(updatedTodos);
  },

  // 删除待办事项
  deleteTodo: (id) => {
    const todos = todoModel.getTodos();
    const updatedTodos = todos.filter(todo => todo.id !== id);
    todoModel.saveTodos(updatedTodos);
  },

  // 更新待办事项
  updateTodo: (id, updates) => {
    const todos = todoModel.getTodos();
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, ...updates } : todo
    );
    todoModel.saveTodos(updatedTodos);
  },

  // 按分类过滤待办事项
  filterTodos: (filter) => {
    const todos = todoModel.getTodos();
    if (filter === 'all') return todos;
    return todos.filter(todo => todo.category === filter);
  }
};

// UI渲染
const todoView = {
  // 获取DOM元素
  elements: {
    form: document.getElementById('todo-form'),
    input: document.getElementById('todo-input'),
    category: document.getElementById('todo-category'),
    due: document.getElementById('todo-due'),
    list: document.getElementById('todo-list'),
    filterControls: document.querySelector('.filter-controls'),
    manageCategoriesBtn: document.getElementById('manage-categories'),
    modal: document.getElementById('category-modal'),
    modalContent: document.querySelector('.modal-content'),
    closeModalBtn: document.querySelector('.close-btn'),
    newCategory: document.getElementById('new-category'),
    addCategoryBtn: document.getElementById('add-category'),
    categoryList: document.getElementById('category-list')
  },

  // 控制模态窗口
  toggleModal: (show) => {
    const modal = todoView.elements.modal;
    if (show) {
      modal.classList.add('show');
      todoView.elements.newCategory.focus();
    } else {
      modal.classList.remove('show');
    }
  },

  // 渲染分类下拉框
  renderCategorySelect: (categories) => {
    const select = todoView.elements.category;
    select.innerHTML = '';

    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
  },

  // 渲染分类列表
  renderCategoryList: (categories) => {
    const list = todoView.elements.categoryList;
    list.innerHTML = '';

    categories.forEach(category => {
      const li = document.createElement('li');
      li.className = 'category-item';
      li.innerHTML = `
                <span class="category-name">${category}</span>
                <div class="category-actions">
                    <button class="edit-category-btn" data-category="${category}">编辑</button>
                    ${!todoModel.defaultCategories.includes(category) ?
          `<button class="delete-category-btn" data-category="${category}">删除</button>` : ''}
                </div>
            `;
      list.appendChild(li);
    });
  },

  // 渲染过滤按钮
  renderFilterButtons: (categories) => {
    const container = todoView.elements.filterControls;
    container.innerHTML = `
            <button class="filter-btn active" data-filter="all">全部</button>
            ${categories.map(category =>
      `<button class="filter-btn" data-filter="${category}">${category}</button>`
    ).join('')}
        `;
  },

  // 格式化日期时间
  formatDateTime: (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // 检查是否紧急（1小时内到期）
  isUrgent: (dueDate) => {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    return due - now <= 3600000; // 1小时 = 3600000毫秒
  },

  // 渲染单个待办事项
  renderTodo: (todo) => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.dataset.id = todo.id;

    const dueClass = todo.dueDate && todoView.isUrgent(todo.dueDate) ? 'urgent' : '';
    const dueDateText = todo.dueDate ? `截止: ${todoView.formatDateTime(todo.dueDate)}` : '无截止时间';

    li.innerHTML = `
            <div class="todo-content">
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="todo-text">${todo.text}</span>
            </div>
            <div class="todo-meta">
                <span class="todo-category category-${todo.category}">${todo.category}</span>
                <span class="todo-due ${dueClass}">${dueDateText}</span>
            </div>
            <div class="todo-actions">
                <button class="edit-btn">编辑</button>
                <button class="delete-btn">删除</button>
            </div>
        `;

    return li;
  },

  // 渲染整个待办事项列表
  renderTodoList: (todos) => {
    todoView.elements.list.innerHTML = '';
    todos.forEach(todo => {
      const todoElement = todoView.renderTodo(todo);
      todoView.elements.list.appendChild(todoElement);
    });
  },

  // 清空输入框
  clearInput: () => {
    todoView.elements.input.value = '';
    todoView.elements.due.value = '';
  },

  // 切换过滤按钮状态
  setActiveFilter: (filter) => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  }
};

// 控制器
const todoController = {
  currentFilter: 'all',

  // 初始化应用
  init: () => {
    // 初始化分类
    const categories = todoModel.getCategories();
    todoView.renderCategorySelect(categories);
    todoView.renderCategoryList(categories);
    todoView.renderFilterButtons(categories);

    // 加载并显示待办事项
    todoController.applyFilter('all');

    // 管理分类按钮点击事件
    todoView.elements.manageCategoriesBtn.addEventListener('click', () => {
      todoView.toggleModal(true);
    });

    // 关闭模态窗口事件
    todoView.elements.closeModalBtn.addEventListener('click', () => {
      todoView.toggleModal(false);
    });

    // 点击模态窗口外部关闭
    todoView.elements.modal.addEventListener('click', (e) => {
      if (e.target === todoView.elements.modal) {
        todoView.toggleModal(false);
      }
    });

    // ESC键关闭模态窗口
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && todoView.elements.modal.classList.contains('show')) {
        todoView.toggleModal(false);
      }
    });

    // 表单提交事件
    todoView.elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = todoView.elements.input.value.trim();
      if (text) {
        const category = todoView.elements.category.value || 'other';
        const dueDate = todoView.elements.due.value;
        todoModel.addTodo(text, category, dueDate);
        todoController.applyFilter(todoController.currentFilter);
        todoView.clearInput();
      }
    });

    // 添加分类事件
    todoView.elements.addCategoryBtn.addEventListener('click', () => {
      const name = todoView.elements.newCategory.value.trim();
      if (name && !todoModel.getCategories().includes(name)) {
        const updatedCategories = todoModel.addCategory(name);
        todoView.renderCategorySelect(updatedCategories);
        todoView.renderCategoryList(updatedCategories);
        todoView.renderFilterButtons(updatedCategories);
        todoView.elements.newCategory.value = '';
      }
    });

    // 分类列表事件委托
    todoView.elements.categoryList.addEventListener('click', (e) => {
      const categoryItem = e.target.closest('.category-item');
      if (!categoryItem) return;

      const category = e.target.dataset.category;
      if (!category) return;

      // 处理编辑分类
      if (e.target.classList.contains('edit-category-btn')) {
        const newName = prompt('输入新的分类名称:', category);
        if (newName && newName !== category) {
          const updatedCategories = todoModel.updateCategory(category, newName);
          todoView.renderCategorySelect(updatedCategories);
          todoView.renderCategoryList(updatedCategories);
          todoView.renderFilterButtons(updatedCategories);
          todoController.applyFilter(todoController.currentFilter);
        }
      }

      // 处理删除分类
      else if (e.target.classList.contains('delete-category-btn')) {
        if (confirm(`确定要删除分类"${category}"吗？关联事项将移动到"其他"分类`)) {
          const updatedCategories = todoModel.deleteCategory(category);
          todoView.renderCategorySelect(updatedCategories);
          todoView.renderCategoryList(updatedCategories);
          todoView.renderFilterButtons(updatedCategories);
          todoController.applyFilter(todoController.currentFilter);
        }
      }
    });

    // 过滤按钮点击事件
    todoView.elements.filterControls.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        const filter = e.target.dataset.filter;
        todoController.applyFilter(filter);
      }
    });

    // 列表点击事件委托
    todoView.elements.list.addEventListener('click', (e) => {
      const li = e.target.closest('.todo-item');
      if (!li) return;

      const id = parseInt(li.dataset.id);

      // 处理删除按钮点击
      if (e.target.classList.contains('delete-btn')) {
        todoModel.deleteTodo(id);
        todoController.applyFilter(todoController.currentFilter);
      }
      // 处理编辑按钮点击
      else if (e.target.classList.contains('edit-btn')) {
        todoController.startEditing(li, id);
      }
      // 处理复选框点击
      else if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
        todoModel.toggleTodo(id);
        li.classList.toggle('completed');
      }
    });

    // 双击编辑功能
    todoView.elements.list.addEventListener('dblclick', (e) => {
      const li = e.target.closest('.todo-item');
      if (li) {
        const id = parseInt(li.dataset.id);
        todoController.startEditing(li, id);
      }
    });
  },

  // 应用分类过滤
  applyFilter: (filter) => {
    todoController.currentFilter = filter;
    const todos = todoModel.filterTodos(filter);
    todoView.renderTodoList(todos);
    todoView.setActiveFilter(filter);
  },

  // 开始编辑待办事项
  startEditing: (li, id) => {
    const todos = todoModel.getTodos();
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const contentDiv = li.querySelector('.todo-content');
    const originalContent = contentDiv.innerHTML;

    const editForm = document.createElement('div');
    editForm.className = 'edit-form';
    editForm.innerHTML = `
            <input type="text" class="edit-input" value="${todo.text}">
            <button class="save-btn">保存</button>
            <button class="cancel-btn">取消</button>
        `;

    contentDiv.innerHTML = '';
    contentDiv.appendChild(editForm);

    const saveBtn = contentDiv.querySelector('.save-btn');
    const cancelBtn = contentDiv.querySelector('.cancel-btn');
    const editInput = contentDiv.querySelector('.edit-input');

    editInput.focus();

    const saveEdit = () => {
      const newText = editInput.value.trim();
      if (newText) {
        todoModel.updateTodo(id, { text: newText });
        todoController.applyFilter(todoController.currentFilter);
      }
    };

    const cancelEdit = () => {
      contentDiv.innerHTML = originalContent;
    };

    saveBtn.addEventListener('click', saveEdit);
    cancelBtn.addEventListener('click', cancelEdit);
    editInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveEdit();
    });
  }
};

// 启动应用
document.addEventListener('DOMContentLoaded', todoController.init);