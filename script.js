// Initialize local storage
const initializeApp = () => {
    loadTodos();
    setupEventListeners();
};

// Load todos from local storage
const loadTodos = () => {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    renderTodos(todos);
    updateTaskCount(todos);
};

// Save todos to local storage
const saveTodos = (todos) => {
    localStorage.setItem('todos', JSON.stringify(todos));
};

// Get all todos from local storage
const getTodos = () => {
    return JSON.parse(localStorage.getItem('todos')) || [];
};

// Add new todo
const addTodo = () => {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();

    if (text === '') {
        alert('Please enter a task!');
        return;
    }

    const todos = getTodos();
    const newTodo = {
        id: Date.now(),
        text: text,
        completed: false
    };

    todos.push(newTodo);
    saveTodos(todos);
    renderTodos(todos);
    updateTaskCount(todos);
    input.value = '';
    input.focus();
};

// Toggle todo completion
const toggleTodo = (id) => {
    const todos = getTodos();
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos(todos);
        renderTodos(todos);
    }
};

// Delete todo
const deleteTodo = (id) => {
    const todos = getTodos().filter(t => t.id !== id);
    saveTodos(todos);
    renderTodos(todos);
    updateTaskCount(todos);
};

// Render todos
const renderTodos = (todos) => {
    const list = document.getElementById('todo-list');
    const filter = document.querySelector('.filter-btn.active').dataset.filter;
    
    list.innerHTML = '';

    const filteredTodos = todos.filter(todo => {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true;
    });

    if (filteredTodos.length === 0) {
        list.innerHTML = '<div class="empty-state">No tasks yet. Add one to get started!</div>';
        return;
    }

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = todo.completed ? 'completed' : '';
        li.innerHTML = `
            <input type="checkbox" class="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <button class="delete-btn" onclick="deleteTodo(${todo.id})">Delete</button>
        `;
        list.appendChild(li);
    });
};

// Update task counter
const updateTaskCount = (todos) => {
    const count = todos.filter(t => !t.completed).length;
    document.getElementById('task-count').textContent = count;
};

// Filter todos
const setFilter = (filter) => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    renderTodos(getTodos());
};

// Prevent XSS attacks
const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// Setup event listeners
const setupEventListeners = () => {
    document.getElementById('add-todo').addEventListener('click', addTodo);
    document.getElementById('todo-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', setFilter);
    });
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
